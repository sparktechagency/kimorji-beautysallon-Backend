import { Request, Response } from 'express';
import httpStatus from 'http-status-codes';
import catchAsync from '../../../shared/catchAsync';
import { ServiceService } from './service.service';
import fileUploadHandler from '../../middlewares/fileUploaderHandler';
import ApiError from '../../../errors/ApiError';
import { logger } from '../../../shared/logger';
import { PaginatedResult } from '../../../helpers/pagination.interface';

const createService = catchAsync(async (req: Request, res: Response) => {
  logger.info('Starting createService request');
  const barber = req.user?.id;
  logger.info(`Barber ID from token: ${barber}`);

  if (!barber) {
    logger.error('Barber ID missing in token');
    throw new ApiError(
      httpStatus.UNAUTHORIZED,
      'Authentication required: Barber ID not found in token'
    );
  }

  const upload = fileUploadHandler();

  upload(req, res, async (err) => {
    if (err) {
      logger.error(`File upload error: ${err.message}`);
      return res.status(httpStatus.BAD_REQUEST).json({
        success: false,
        message: err.message,
      });
    }

    logger.info('File upload completed, preparing service data');
    logger.debug(`Request body: ${JSON.stringify(req.body)}`);
    logger.debug(`Uploaded files: ${JSON.stringify(req.files)}`);

    let parsedDailySchedule: any = undefined;
    if (req.body?.dailySchedule) {
      try {
        const scheduleData = typeof req.body.dailySchedule === 'string'
          ? JSON.parse(req.body.dailySchedule)
          : req.body.dailySchedule;

        if (!Array.isArray(scheduleData)) {
          throw new Error("dailySchedule must be an array");
        }

        scheduleData.forEach((item: any, idx: number) => {
          if (!item.day) {
            throw new Error(`dailySchedule[${idx}] must have 'day' property`);
          }
          if (!item.timeSlot || !Array.isArray(item.timeSlot)) {
            throw new Error(`dailySchedule[${idx}] must have 'timeSlot' array`);
          }
          if (item.timeSlot.length === 0) {
            throw new Error(`dailySchedule[${idx}].timeSlot cannot be empty`);
          }
        });

        parsedDailySchedule = scheduleData;
        logger.info('dailySchedule parsed and validated successfully');
      } catch (err) {
        logger.error(`Invalid dailySchedule: ${(err as Error).message}`);
        return res.status(httpStatus.BAD_REQUEST).json({
          success: false,
          message: `Invalid dailySchedule format: ${(err as Error).message}`,
        });
      }
    }

    const serviceData = {
      ...req.body,
      dailySchedule: parsedDailySchedule ?? req.body.dailySchedule,
      barber,
      image: req.files && 'image' in req.files && req.files['image'][0]
        ? `/uploads/images/${req.files['image'][0].filename}`
        : undefined,
    };

    try {
      logger.info('Calling ServiceService.createService');
      const service = await ServiceService.createService(serviceData);
      logger.info('Service created successfully');

      res.status(httpStatus.CREATED).json({
        success: true,
        message: 'Service created successfully',
        data: service,
      });
    } catch (error) {
      logger.error(`Error creating service: ${error}`);
      throw error;
    }
  });
});



const getAllServices = catchAsync(async (req: Request, res: Response) => {
  const user = req.user;
  if (!user?.location?.coordinates) {
    return res.status(400).json({
      success: false,
      message: 'User location not available'
    });
  }

  const [lng, lat] = req.user.location.coordinates;

  const {
    page = 1,
    limit = 10,
    searchTerm = '',
    minPrice,
    maxPrice,
    category,
    title,
    sortBy = 'createdAt',
    sortOrder = 'desc'
  } = req.query;

  const filters = {
    search: searchTerm as string,
    minPrice: minPrice ? Number(minPrice) : undefined,
    maxPrice: maxPrice ? Number(maxPrice) : undefined,
    category: category as string,
    subCategory: title as string,
    sortBy: sortBy as string,
    sortOrder: sortOrder as 'asc' | 'desc'
  };

  const pagination = {
    page: Number(page),
    limit: Number(limit),
    total: 0,
    totalPage: 0
  };

  const services = await ServiceService.getAllServices(
    pagination,
    { lat, lng },
    filters
  );

  res.status(httpStatus.OK).json({
    success: true,
    message: 'Services retrieved successfully',
    data: services,
  });
});
const getAllServicesbarber = catchAsync(async (req: Request, res: Response) => {
  // Read query params (accept either ?searchTerm= or ?search=)
  const pageRaw = req.query.page as string | undefined;
  const limitRaw = req.query.limit as string | undefined;
  const searchTerm = (req.query.searchTerm as string) || (req.query.search as string) || undefined;

  let page = 1;
  let limit = 10;

  if (pageRaw) {
    const parsed = Number(pageRaw);
    if (!Number.isNaN(parsed) && parsed > 0) page = Math.floor(parsed);
  }

  if (limitRaw) {
    const parsed = Number(limitRaw);
    if (!Number.isNaN(parsed) && parsed > 0) limit = Math.floor(parsed);
  }

  // Grab barber id from authenticated user (adjust if your middleware uses a different shape)
  const barberId = (req as any).user?.id || (req as any).user?._id;
  if (!barberId) {
    logger.warn('getAllServicesbarber: missing authenticated barber id on request');
    return res.status(httpStatus.UNAUTHORIZED).json({
      success: false,
      message: 'Authentication required',
    });
  }

  logger.info(`Controller: fetching services for barber=${barberId}, page=${page}, limit=${limit}, searchTerm=${searchTerm}`);

  // Ensure barberId passed as string
  const result = await ServiceService.getAllServicesbarber({
    page,
    limit,
    searchTerm,
    barberId: String(barberId),
  }) as unknown as PaginatedResult;

  return res.status(httpStatus.OK).json({
    success: true,
    message: 'Services retrieved successfully',
    data: result.services,
    pagination: result.pagination,
  });
});


// Update a service with image upload
const updateService = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const upload = fileUploadHandler();
  upload(req, res, async (err) => {
    if (err) {
      return res.status(httpStatus.BAD_REQUEST).json({
        success: false,
        message: err.message,
      });
    }

    // Validate barber field if provided
    if (req.body.barber && !req.body.barber.match(/^[0-9a-fA-F]{24}$/)) {
      throw new ApiError(httpStatus.BAD_REQUEST, 'Invalid barber ID format');
    }

    const serviceData = {
      ...req.body,
      image: req.files && 'image' in req.files && req.files['image'][0]
        ? `/uploads/images/${req.files['image'][0].filename}`
        : undefined,
    };

    const service = await ServiceService.updateService(id, serviceData);
    res.status(httpStatus.OK).json({
      success: true,
      message: 'Service updated successfully',
      data: service,
    });
  });
});

// Delete a service
const deleteService = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  await ServiceService.deleteService(id);
  res.status(httpStatus.OK).json({
    success: true,
    message: 'Service deleted successfully',
    data: null,
  });
});

export const ServiceController = {
  createService,
  getAllServices,
  getAllServicesbarber,
  updateService,
  deleteService,
};
