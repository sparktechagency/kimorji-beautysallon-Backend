import httpStatus from 'http-status-codes';
import { IService } from './service.interface';
import { Service } from './service.model';
import ApiError from '../../../errors/ApiError';
import fs from 'fs';
import { User } from '../user/user.model';
import path from 'path';
import { logger } from '../../../shared/logger';
import { SubCategory } from '../subCategory/subCategory.model';
import { Day } from '../../../enums/day';
import { isValidDay, to24Hour } from '../../../helpers/find.offer';
import { PaginatedResult, PaginationOptions } from '../../../helpers/pagination.interface';




const createService = async (payload: Partial<IService>): Promise<IService> => {
  logger.info('Starting createService in service layer');
  logger.debug(`Service payload: ${JSON.stringify(payload)}`);

  // Validate barber ID
  if (!payload.barber) {
    logger.error('Barber ID missing in payload');
    throw new ApiError(httpStatus.BAD_REQUEST, 'Barber ID is required');
  }

  logger.info(`Validating barber ID: ${payload.barber}`);
  const barberExists = await User.findById(payload.barber).select('_id');
  if (!barberExists) {
    logger.error(`Barber not found: ${payload.barber}`);
    throw new ApiError(httpStatus.NOT_FOUND, 'Barber not found');
  }

  // Process and normalize dailySchedule
  if (payload.dailySchedule) {
    try {
      // Parse if string, otherwise use as-is
      let schedule = typeof payload.dailySchedule === 'string'
        ? JSON.parse(payload.dailySchedule)
        : payload.dailySchedule;

      // Validate it's an array
      if (!Array.isArray(schedule)) {
        throw new ApiError(httpStatus.BAD_REQUEST, 'dailySchedule must be an array');
      }

      // Normalize each schedule item
      const normalized = schedule.map((item: any, idx: number) => {
        // Validate structure
        if (!item.day || !item.timeSlot || !Array.isArray(item.timeSlot)) {
          throw new ApiError(
            httpStatus.BAD_REQUEST,
            `dailySchedule[${idx}] must include 'day' and 'timeSlot' array`
          );
        }

        // Normalize day to uppercase
        const day = item.day.toUpperCase() as Day;

        // Validate day is valid enum value
        if (!Object.values(Day).includes(day)) {
          throw new ApiError(
            httpStatus.BAD_REQUEST,
            `Invalid day '${item.day}'. Must be one of: ${Object.values(Day).join(', ')}`
          );
        }

        // Convert time slots to 24-hour format
        const timeSlot = item.timeSlot.map((time: string, timeIdx: number) => {
          try {
            return to24Hour(time);
          } catch (error) {
            throw new ApiError(
              httpStatus.BAD_REQUEST,
              `Invalid time format in dailySchedule[${idx}].timeSlot[${timeIdx}]: ${time}. Expected format: HH:MM AM/PM (e.g., "09:00 AM")`
            );
          }
        });

        // Sort time slots in ascending order
        timeSlot.sort((a: { split: (arg0: string) => { (): any; new(): any; map: { (arg0: NumberConstructor): [any, any]; new(): any; }; }; }, b: { split: (arg0: string) => { (): any; new(): any; map: { (arg0: NumberConstructor): [any, any]; new(): any; }; }; }) => {
          const [aHour, aMin] = a.split(':').map(Number);
          const [bHour, bMin] = b.split(':').map(Number);
          return (aHour * 60 + aMin) - (bHour * 60 + bMin);
        });

        logger.info(`Normalized schedule for ${day}: ${timeSlot.join(', ')}`);

        return {
          day,
          timeSlot
        };
      });

      payload.dailySchedule = normalized as any;
      logger.info('dailySchedule normalized successfully');
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      logger.error(`Error processing dailySchedule: ${error}`);
      throw new ApiError(
        httpStatus.BAD_REQUEST,
        `Error processing dailySchedule: ${(error as Error).message}`
      );
    }
  }

  try {
    logger.info('Creating service in database');
    const service = await Service.create(payload);
    logger.info(`Service created with ID: ${service._id}`);

    // Populate related fields before returning
    const populatedService = await service.populate('category title barber');
    return populatedService as unknown as IService;
  } catch (error) {
    logger.error(`Database error creating service: ${error}`);
    throw error;
  }
};


// Get all services
const getAllServices = async (pagination: { page: number, totalPage: number, limit: number, total: number }): Promise<{ services: IService[], pagination: { page: number, limit: number, total: number, totalPage: number } }> => {
  const services = await Service.find()
    .populate('category')
    .populate('title')
    .populate('serviceType')
    .populate('barber');

  // Use the pagination values from the argument
  const { page, limit, total, totalPage } = pagination;

  return {
    services,
    pagination: {
      page,
      limit,
      total,
      totalPage,
    },
  };
};

// Get all services with pagination and search
const getAllServicesbarber = async ({ page, limit, searchTerm, barberId }: PaginationOptions): Promise<PaginatedResult> => {
  logger.info(`Starting getAllServices: page=${page}, limit=${limit}, searchTerm=${searchTerm}, barberId=${barberId}`);

  // Build query
  const query: any = { barber: barberId }; 
  if (searchTerm) {
    const subCategoryIds = await SubCategory.find({
      title: { $regex: searchTerm, $options: 'i' }
    }).select('_id');
    
    query.$or = [
      { serviceType: { $regex: searchTerm, $options: 'i' } },
      { description: { $regex: searchTerm, $options: 'i' } },
      { title: { $in: subCategoryIds } },
    ];
  }

  try {
    const total = await Service.countDocuments(query);
    const totalPage = Math.ceil(total / limit);
    const skip = (page - 1) * limit;

    const services = await Service.find(query)
      .populate('category')
      .populate('title')
      .populate('barber')
      .populate('serviceType')
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 }); 

    logger.info(`Retrieved ${services.length} services, total: ${total}`);
    return {
      services,
      pagination: {
        page,
        limit,
        total,
        totalPage,
      },
    };
  } catch (error) {
    logger.error(`Database error retrieving services: ${error}`);
    throw error;
  }
};

// Update a service
const updateService = async (id: string, payload: Partial<IService>): Promise<IService | null> => {
  const service = await Service.findById(id);
  if (!service) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Service not found');
  }

  // Validate barber if provided
  if (payload.barber) {
    const barberExists = await User.findById(payload.barber);
    if (!barberExists) {
      throw new ApiError(httpStatus.NOT_FOUND, 'Barber not found');
    }
  }

  // If updating with new image, delete old image
  if (payload.image && service.image && service.image !== payload.image) {
    const oldImagePath = path.join(process.cwd(), service.image.toString());
    if (fs.existsSync(oldImagePath)) {
      fs.unlinkSync(oldImagePath);
    }
  }

  const updatedService = await Service.findByIdAndUpdate(id, payload, {
    new: true,
    runValidators: true,
  })
    .populate('category')
    .populate('title')
    .populate('barber');

  return updatedService;
};

// Delete a service
const deleteService = async (id: string): Promise<void> => {
  const service = await Service.findById(id);
  if (!service) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Service not found');
  }

  // Delete associated image
  if (service.image) {
    const imagePath = path.join(process.cwd(), service.image.toString());
    if (fs.existsSync(imagePath)) {
      fs.unlinkSync(imagePath);
    }
  }

  await Service.findByIdAndDelete(id);
};

export const ServiceService = {
  createService,
  getAllServices,
  updateService,
  deleteService,
  getAllServicesbarber,
};

