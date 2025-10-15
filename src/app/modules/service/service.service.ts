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

interface PaginationOptions {
  page: number;
  limit: number;
  searchTerm: string;
  barberId: string;
}

interface PaginatedResult {
  services: IService[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPage: number;
  };
}


const createService = async (payload: Partial<IService>): Promise<IService> => {
  logger.info('Starting createService in service layer');
  logger.debug(`Service payload: ${JSON.stringify(payload)}`);

  // barber validation
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

  // Normalize dailySchedule (accept either array or JSON string)
if (payload.dailySchedule) {
  let schedule = typeof payload.dailySchedule === 'string' ? JSON.parse(payload.dailySchedule) : payload.dailySchedule;

  if (!Array.isArray(schedule)) throw new ApiError(httpStatus.BAD_REQUEST, 'dailySchedule must be an array');

  const normalized = schedule.map((item: any, idx: number) => {
    if (!item.day || !item.timeSlot || !Array.isArray(item.timeSlot)) {
      throw new ApiError(httpStatus.BAD_REQUEST, `dailySchedule[${idx}] must include 'day' and 'timeSlot' array`);
    }
    const day = item.day.toUpperCase() as Day;

    return {
      day,
      timeSlot: item.timeSlot.map((t: string) => to24Hour(t)) // optional: normalize to 24-hour format
    };
  });

  payload.dailySchedule = normalized as any;
}


  try {
    const service = await Service.create(payload);
    logger.info(`Service created with ID: ${service._id}`);
    // populate fields before returning
    return (await service.populate('category title barber')) as unknown as IService;
  } catch (error) {
    logger.error(`Database error creating service: ${error}`);
    // Rethrow (catchAsync will handle)
    throw error;
  }
};

// Get all services
const getAllServices = async (pagination: { page: number, totalPage: number, limit: number, total: number }): Promise<{ services: IService[], pagination: { page: number, limit: number, total: number, totalPage: number } }> => {
  const services = await Service.find()
    .populate('category')
    .populate('title')
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
  const query: any = { barber: barberId }; // Filter by authenticated barber
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
    // Calculate pagination
    const total = await Service.countDocuments(query);
    const totalPage = Math.ceil(total / limit);
    const skip = (page - 1) * limit;

    // Fetch services
    const services = await Service.find(query)
      .populate('category')
      .populate('title')
      .populate('barber')
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 }); // Sort by newest first

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

