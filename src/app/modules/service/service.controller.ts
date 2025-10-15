import { Request, Response } from 'express';
import httpStatus from 'http-status-codes';
import catchAsync from '../../../shared/catchAsync';
import { ServiceService } from './service.service';
import fileUploadHandler from '../../middlewares/fileUploaderHandler';
import ApiError from '../../../errors/ApiError';
import { logger } from '../../../shared/logger';

// Create a new service with image upload
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

    // Parse and validate dailySchedule
    let parsedDailySchedule: any = undefined;
    if (req.body?.dailySchedule) {
      try {
        // Parse if it's a JSON string
        const scheduleData = typeof req.body.dailySchedule === 'string'
          ? JSON.parse(req.body.dailySchedule)
          : req.body.dailySchedule;

        // Validate it's an array
        if (!Array.isArray(scheduleData)) {
          throw new Error("dailySchedule must be an array");
        }

        // Validate each schedule item
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

    // Build service data
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
      throw error; // Let catchAsync handle the error
    }
  });
});

// Get all services
const getAllServices = catchAsync(async (req: Request, res: Response) => {
  const services = await ServiceService.getAllServices( { page: 1, totalPage: 0, limit: 10, total: 0 });
  res.status(httpStatus.OK).json({
    success: true,
    message: 'Services retrieved successfully',
    data: services,
    
  });
});

const getAllServicesbarber = catchAsync(async (req: Request, res: Response) => {
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 10;
  const total = 0; 
  const totalPage = 0; 
  const services = await ServiceService.getAllServices({ page, totalPage, limit, total });
  res.status(httpStatus.OK).json({
    success: true,
    message: 'Services retrieved successfully',
    data: services,
    
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
