import httpStatus from 'http-status-codes';
import { IService } from './service.interface';
import { Service } from './service.model';
import ApiError from '../../../errors/ApiError';
import fs from 'fs';
import { User } from '../user/user.model';
import path from 'path';
import { logger } from '../../../shared/logger';


// Create a new service
const createService = async (payload: IService): Promise<IService> => {
  logger.info('Starting createService in service layer');
  logger.debug(`Service payload: ${JSON.stringify(payload)}`);

  // Validate barber existence
  if (payload.barber) {
    logger.info(`Validating barber ID: ${payload.barber}`);
    const barberExists = await User.findById(payload.barber).select('_id');
    if (!barberExists) {
      logger.error(`Barber not found: ${payload.barber}`);
      throw new ApiError(httpStatus.NOT_FOUND, 'Barber not found');
    }
  } else {
    logger.error('Barber ID missing in payload');
    throw new ApiError(httpStatus.BAD_REQUEST, 'Barber ID is required');
  }

  try {
    const service = await Service.create(payload);
    logger.info(`Service created with ID: ${service._id}`);
    return service.populate('category title barber');
  } catch (error) {
    logger.error(`Database error creating service: ${error}`);
    throw error;
  }
};


// Get all services
const getAllServices = async (): Promise<IService[]> => {
  const services = await Service.find()
    .populate('category')
    .populate('title')
    .populate('barber');
  return services;
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
};