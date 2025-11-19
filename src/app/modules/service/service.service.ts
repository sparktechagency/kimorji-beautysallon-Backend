import { Day } from './../../../enums/day';
import httpStatus from 'http-status-codes';
import { IService } from './service.interface';
import { Service } from './service.model';
import ApiError from '../../../errors/ApiError';
import fs from 'fs';
import { User } from '../user/user.model';
import path from 'path';
import { logger } from '../../../shared/logger';
import { SubCategory } from '../subCategory/subCategory.model';
import { isValidDay, to24Hour } from '../../../helpers/find.offer';
import { PaginatedResult, PaginationOptions } from '../../../helpers/pagination.interface';
import Redis from 'ioredis';
import { getDistanceFromLatLonInKm } from '../../../helpers/geocode.map';
import { Offer } from '../offer/offer.model';
import ShopSchedule from '../shopScheduled/scheduled.model';
const redis = new Redis();

// const createService = async (payload: Partial<IService>): Promise<IService> => {
//   logger.info('Starting createService in service layer');
//   logger.debug(`Service payload: ${JSON.stringify(payload)}`);

//   // Validate barber ID
//   if (!payload.barber) {
//     logger.error('Barber ID missing in payload');
//     throw new ApiError(httpStatus.BAD_REQUEST, 'Barber ID is required');
//   }

//   logger.info(`Validating barber ID: ${payload.barber}`);
//   const barber = await User.findById(payload.barber).select('_id name role location').lean() as { _id: string; name?: string; role?: string; location?: { coordinates?: [number, number] } } | null;

//   if (!barber) {
//     logger.error(`Barber not found: ${payload.barber}`);
//     throw new ApiError(httpStatus.NOT_FOUND, 'Barber not found');
//   }

//   if (barber.role !== 'BARBER') {
//     logger.error(`User is not a barber: ${payload.barber}`);
//     throw new ApiError(httpStatus.BAD_REQUEST, 'User is not a barber');
//   }

//   if (!barber.location || !barber.location.coordinates || barber.location.coordinates.length !== 2) {
//     logger.warn(`⚠️  Barber ${barber.name} (${payload.barber}) does not have location data!`);
//     logger.warn(`   This service will NOT appear in location-based recommendations.`);
//     logger.warn(`   To fix: Add location coordinates to the barber profile.`);

//   } else {
//     logger.info(`✓ Barber has location: [${barber.location.coordinates[0]}, ${barber.location.coordinates[1]}]`);
//   }

//   if (payload.dailySchedule) {
//     try {
//       let schedule = typeof payload.dailySchedule === 'string'
//         ? JSON.parse(payload.dailySchedule)
//         : payload.dailySchedule;

//       if (!Array.isArray(schedule)) {
//         throw new ApiError(httpStatus.BAD_REQUEST, 'dailySchedule must be an array');
//       }

//       const normalized = schedule.map((item: any, idx: number) => {
//         if (!item.day || !item.timeSlot || !Array.isArray(item.timeSlot)) {
//           throw new ApiError(
//             httpStatus.BAD_REQUEST,
//             `dailySchedule[${idx}] must include 'day' and 'timeSlot' array`
//           );
//         }

//         const day = item.day.toUpperCase() as Day;

//         if (!Object.values(Day).includes(day)) {
//           throw new ApiError(
//             httpStatus.BAD_REQUEST,
//             `Invalid day '${item.day}'. Must be one of: ${Object.values(Day).join(', ')}`
//           );
//         }

//         const timeSlot = item.timeSlot.map((time: string, timeIdx: number) => {
//           try {
//             return to24Hour(time);
//           } catch (error) {
//             throw new ApiError(
//               httpStatus.BAD_REQUEST,
//               `Invalid time format in dailySchedule[${idx}].timeSlot[${timeIdx}]: ${time}. Expected format: HH:MM AM/PM (e.g., "09:00 AM")`
//             );
//           }
//         });

//         timeSlot.sort((a: string, b: string) => {
//           const [aHour, aMin] = a.split(':').map(Number);
//           const [bHour, bMin] = b.split(':').map(Number);
//           return (aHour * 60 + aMin) - (bHour * 60 + bMin);
//         });

//         logger.info(`Normalized schedule for ${day}: ${timeSlot.join(', ')}`);

//         return {
//           day,
//           timeSlot
//         };
//       });

//       payload.dailySchedule = normalized as any;
//       logger.info('dailySchedule normalized successfully');
//     } catch (error) {
//       if (error instanceof ApiError) {
//         throw error;
//       }
//       logger.error(`Error processing dailySchedule: ${error}`);
//       throw new ApiError(
//         httpStatus.BAD_REQUEST,
//         `Error processing dailySchedule: ${(error as Error).message}`
//       );
//     }
//   }

//   try {
//     logger.info('Creating service in database');
//     const service = await Service.create(payload);
//     logger.info(`Service created with ID: ${service._id}`);

//     // Populate related fields before returning
//     const populatedService = await service.populate('category title barber');
//     return populatedService as unknown as IService;
//   } catch (error) {
//     logger.error(`Database error creating service: ${error}`);
//     throw error;
//   }
// };

const createService = async (payload: Partial<IService>): Promise<IService> => {
  logger.info('Starting createService in service layer');
  logger.debug(`Service payload: ${JSON.stringify(payload)}`);

  // Validate barber ID
  if (!payload.barber) {
    logger.error('Barber ID missing in payload');
    throw new ApiError(httpStatus.BAD_REQUEST, 'Barber ID is required');
  }

  logger.info(`Validating barber ID: ${payload.barber}`);
  const barber = await User.findById(payload.barber)
    .select('_id name role location')
    .lean() as { 
      _id: string; 
      name?: string; 
      role?: string; 
      location?: { coordinates?: [number, number] } 
    } | null;

  if (!barber) {
    logger.error(`Barber not found: ${payload.barber}`);
    throw new ApiError(httpStatus.NOT_FOUND, 'Barber not found');
  }

  if (barber.role !== 'BARBER') {
    logger.error(`User is not a barber: ${payload.barber}`);
    throw new ApiError(httpStatus.BAD_REQUEST, 'User is not a barber');
  }

  if (!barber.location || !barber.location.coordinates || barber.location.coordinates.length !== 2) {
    logger.warn(`⚠️  Barber ${barber.name} (${payload.barber}) does not have location data!`);
    logger.warn(`   This service will NOT appear in location-based recommendations.`);
    logger.warn(`   To fix: Add location coordinates to the barber profile.`);
  } else {
    logger.info(`✓ Barber has location: [${barber.location.coordinates[0]}, ${barber.location.coordinates[1]}]`);
  }

  // Check if shop schedule exists for this barber
  const shopSchedule = await ShopSchedule.findOne({ barber: payload.barber });

  if (payload.dailySchedule) {
    try {
      let schedule = typeof payload.dailySchedule === 'string'
        ? JSON.parse(payload.dailySchedule)
        : payload.dailySchedule;

      if (!Array.isArray(schedule)) {
        throw new ApiError(httpStatus.BAD_REQUEST, 'dailySchedule must be an array');
      }

      const normalized = schedule.map((item: any, idx: number) => {
        if (!item.day || !item.timeSlot || !Array.isArray(item.timeSlot)) {
          throw new ApiError(
            httpStatus.BAD_REQUEST,
            `dailySchedule[${idx}] must include 'day' and 'timeSlot' array`
          );
        }

        const day = item.day.toUpperCase() as Day;
        if (!Object.values(Day).includes(day)) {
          throw new ApiError(
            httpStatus.BAD_REQUEST,
            `Invalid day '${item.day}'. Must be one of: ${Object.values(Day).join(', ')}`
          );
        }

        // Check if shop is permanently closed on this day
        if (shopSchedule) {
          const shopDaySchedule = shopSchedule.dailySchedule?.find(
            (s) => s.day.toUpperCase() === day
          );

          if (shopDaySchedule?.isClosed) {
            logger.warn(`⚠️  Shop is permanently closed on ${day}. Service cannot have slots on this day.`);
            return {
              day,
              timeSlot: [] // Empty time slots for closed days
            };
          }
        }

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

        // Sort time slots
        timeSlot.sort((a: string, b: string) => {
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

// const getAllServices = async (
//   pagination: { page: number; totalPage: number; limit: number; total: number },
//   userCoordinates: { lat: number; lng: number }
// ) => {
//   const services = await Service.find()
//     .populate('category')
//     .populate('title')
//     .populate('serviceType')
//     .populate('barber', 'name email profile contact location');

//   const now = new Date();
//   const currentDay = getDayName(now);

//   console.log('Current time:', now);
//   console.log('Current day:', currentDay);

//   const servicesWithDiscountAndDistance = await Promise.all(
//     services.map(async (service) => {
//       const serviceObj = service.toObject();

//       // Calculate distance
//       const barber = service.barber as any;
//       let distance = null;
//       if (barber?.location?.coordinates) {
//         const [barberLng, barberLat] = barber.location.coordinates;
//         distance = getDistanceFromLatLonInKm(
//           userCoordinates.lat,
//           userCoordinates.lng,
//           barberLat,
//           barberLng
//         );
//       }

//       // Find all active offers for this service
//       const activeOffers = await Offer.find({
//         service: service._id,
//         isActive: true,
//         startTime: { $lte: now },
//         endTime: { $gte: now }
//       });

//       console.log(`Service ${service._id} - Found ${activeOffers.length} active offers:`,
//         activeOffers.map(o => ({
//           id: o._id,
//           days: o.days,
//           timeSlots: o.timeSlots,
//           percent: o.percent,
//           isActive: o.isActive,
//           startTime: o.startTime,
//           endTime: o.endTime
//         }))
//       );

//       // Build a map of day -> timeSlot -> discount
//       const discountMap = new Map<string, Map<string, { percent: number; title: string }>>();

//       activeOffers.forEach((offer) => {
//         if (offer.days && Array.isArray(offer.days)) {
//           offer.days.forEach((day: string) => {
//             if (!discountMap.has(day)) {
//               discountMap.set(day, new Map());
//             }
//             const dayMap = discountMap.get(day)!;

//             if (offer.timeSlots && Array.isArray(offer.timeSlots) && offer.timeSlots.length > 0) {
//               // Specific time slots
//               offer.timeSlots.forEach((slot: string) => {
//                 const existing = dayMap.get(slot);
//                 if (!existing || existing.percent < offer.percent) {
//                   dayMap.set(slot, {
//                     percent: offer.percent,
//                     title: offer.title || 'Special Offer'
//                   });
//                 }
//               });
//             } else {
//               // All time slots for this day
//               dayMap.set('ALL', {
//                 percent: offer.percent,
//                 title: offer.title || 'Special Offer'
//               });
//             }
//           });
//         }
//       });

//       console.log(`Service ${service._id} - Discount Map:`,
//         Array.from(discountMap.entries()).map(([day, slots]) => ({
//           day,
//           slots: Array.from(slots.entries())
//         }))
//       );

//       // Enhance dailySchedule with discount information
//       const enhancedSchedule = serviceObj.dailySchedule?.map((schedule: any) => {
//         const dayDiscounts = discountMap.get(schedule.day);
//         const allDayDiscount = dayDiscounts?.get('ALL');

//         const enhancedTimeSlots = schedule.timeSlot?.map((slot: string) => {
//           let discount = 0;
//           let offerTitle = '';

//           // Check for specific time slot discount
//           const slotDiscount = dayDiscounts?.get(slot);
//           if (slotDiscount) {
//             discount = slotDiscount.percent;
//             offerTitle = slotDiscount.title;
//           } else if (allDayDiscount) {
//             // Use all-day discount if no specific slot discount
//             discount = allDayDiscount.percent;
//             offerTitle = allDayDiscount.title;
//           }

//           return {
//             time: slot,
//             Day: schedule.day,
//             discount: discount,
//             discountedPrice: discount > 0
//               ? Math.round(serviceObj.price * (1 - discount / 100))
//               : serviceObj.price,
//             offerTitle: offerTitle
//           };
//         }) || [];

//         return {
//           day: schedule.day,
//           timeSlots: enhancedTimeSlots
//         };
//       }) || [];

//       // Calculate current discount (for the current day and time)
//       let currentDiscount = 0;
//       let currentOfferTitle = null;
//       const currentDaySchedule = enhancedSchedule.find((s: any) => s.day === currentDay);

//       if (currentDaySchedule) {
//         const currentTime = now.toTimeString().slice(0, 5); // HH:MM
//         const currentSlot = currentDaySchedule.timeSlots.find((ts: any) =>
//           ts.time === currentTime || isTimeInSlot(currentTime, ts.time)
//         );

//         if (currentSlot && currentSlot.discount > 0) {
//           currentDiscount = currentSlot.discount;
//           currentOfferTitle = currentSlot.offerTitle;
//         }
//       }

//       return {
//         ...serviceObj,
//         distance,
//         dailySchedule: enhancedSchedule,
//         discount: {
//           hasDiscount: activeOffers.length > 0,
//           currentDiscount: currentDiscount,
//           currentOfferTitle: currentOfferTitle,
//           maxDiscount: Math.max(...activeOffers.map(o => o.percent), 0)
//         }
//       };
//     })
//   );

//   const { page, limit, total, totalPage } = pagination;
//   return {
//     services: servicesWithDiscountAndDistance,
//     pagination: { page, limit, total, totalPage }
//   };
// };
interface ServiceFilters {
  searchTerm?: string;
  minPrice?: number;
  maxPrice?: number;
  category?: string;
  title?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

const getAllServices = async (
  pagination: { page: number; totalPage: number; limit: number; total: number },
  userCoordinates: { lat: number; lng: number },
  filters?: ServiceFilters
) => {
  const query: any = {};

  if (filters?.searchTerm) {
    query.$or = [
      { description: { $regex: filters.searchTerm, $options: 'i' } },
      { 'title.name': { $regex: filters.searchTerm, $options: 'i' } }
    ];
  }

  if (filters?.minPrice !== undefined || filters?.maxPrice !== undefined) {
    query.price = {};
    if (filters.minPrice !== undefined) {
      query.price.$gte = filters.minPrice;
    }
    if (filters.maxPrice !== undefined) {
      query.price.$lte = filters.maxPrice;
    }
  }

  if (filters?.category) {
    query.category = filters.category;
  }

  if (filters?.title) {
    query.serviceType = filters.title;
  }

  const sortField = filters?.sortBy || 'createdAt';
  const sortDirection = filters?.sortOrder === 'asc' ? 1 : -1;
  const sort: any = { [sortField]: sortDirection };

  const total = await Service.countDocuments(query);
  const totalPage = Math.ceil(total / pagination.limit);

  const services = await Service.find(query)
    .populate('category')
    .populate('title')
    .populate('serviceType')
    .populate('barber', 'name email profile contact location shopDiscount')
    .sort(sort)
    .skip((pagination.page - 1) * pagination.limit)
    .limit(pagination.limit);

  const now = new Date();
  const currentDay = getDayName(now);

  console.log('Current time:', now);
  console.log('Current day:', currentDay);

  const servicesWithDiscountAndDistance = await Promise.all(
    services.map(async (service) => {
      const serviceObj = service.toObject();

      // Calculate distance
      const barber = service.barber as any;
      let distance = null;
      if (barber?.location?.coordinates) {
        const [barberLng, barberLat] = barber.location.coordinates;
        distance = getDistanceFromLatLonInKm(
          userCoordinates.lat,
          userCoordinates.lng,
          barberLat,
          barberLng
        );
      }

      const activeOffers = await Offer.find({
        service: service._id,
        isActive: true,
        startTime: { $lte: now },
        endTime: { $gte: now }
      });

      console.log(`Service ${service._id} - Found ${activeOffers.length} active offers:`,
        activeOffers.map(o => ({
          id: o._id,
          days: o.days,
          timeSlots: o.timeSlots,
          percent: o.percent,
          isActive: o.isActive,
          startTime: o.startTime,
          endTime: o.endTime
        }))
      );

      const discountMap = new Map<string, Map<string, { percent: number; title: string }>>();

      activeOffers.forEach((offer) => {
        if (offer.days && Array.isArray(offer.days)) {
          offer.days.forEach((day: string) => {
            if (!discountMap.has(day)) {
              discountMap.set(day, new Map());
            }
            const dayMap = discountMap.get(day)!;

            if (offer.timeSlots && Array.isArray(offer.timeSlots) && offer.timeSlots.length > 0) {
              offer.timeSlots.forEach((slot: string) => {
                const existing = dayMap.get(slot);
                if (!existing || existing.percent < offer.percent) {
                  dayMap.set(slot, {
                    percent: offer.percent,
                    title: offer.title || 'Special Offer'
                  });
                }
              });
            } else {
              dayMap.set('ALL', {
                percent: offer.percent,
                title: offer.title || 'Special Offer'
              });
            }
          });
        }
      });

      console.log(`Service ${service._id} - Discount Map:`,
        Array.from(discountMap.entries()).map(([day, slots]) => ({
          day,
          slots: Array.from(slots.entries())
        }))
      );

      const enhancedSchedule = serviceObj.dailySchedule?.map((schedule: any) => {
        const dayDiscounts = discountMap.get(schedule.day);
        const allDayDiscount = dayDiscounts?.get('ALL');

        const enhancedTimeSlots = schedule.timeSlot?.map((slot: string) => {
          let discount = 0;
          let offerTitle = '';

          const slotDiscount = dayDiscounts?.get(slot);
          if (slotDiscount) {
            discount = slotDiscount.percent;
            offerTitle = slotDiscount.title;
          } else if (allDayDiscount) {
            discount = allDayDiscount.percent;
            offerTitle = allDayDiscount.title;
          }

          return {
            time: slot,
            Day: schedule.day,
            discount: discount,
            discountedPrice: discount > 0
              ? Math.round(serviceObj.price * (1 - discount / 100))
              : serviceObj.price,
            offerTitle: offerTitle
          };
        }) || [];

        return {
          day: schedule.day,
          timeSlots: enhancedTimeSlots
        };
      }) || [];

      let currentDiscount = 0;
      let currentOfferTitle = null;
      const currentDaySchedule = enhancedSchedule.find((s: any) => s.day === currentDay);

      if (currentDaySchedule) {
        const currentTime = now.toTimeString().slice(0, 5);
        const currentSlot = currentDaySchedule.timeSlots.find((ts: any) =>
          ts.time === currentTime || isTimeInSlot(currentTime, ts.time)
        );

        if (currentSlot && currentSlot.discount > 0) {
          currentDiscount = currentSlot.discount;
          currentOfferTitle = currentSlot.offerTitle;
        }
      }

      return {
        ...serviceObj,
        distance,
        dailySchedule: enhancedSchedule,
        discount: {
          hasDiscount: activeOffers.length > 0,
          currentDiscount: currentDiscount,
          currentOfferTitle: currentOfferTitle,
          maxDiscount: Math.max(...activeOffers.map(o => o.percent), 0)
        }
      };
    })
  );

  return {
    services: servicesWithDiscountAndDistance,
    pagination: {
      page: pagination.page,
      limit: pagination.limit,
      total,
      totalPage
    }
  };
};
const getDayName = (date: Date): string => {
  const days = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'];
  return days[date.getDay()];
};

const isTimeInSlot = (currentTime: string, slotTime: string): boolean => {
  if (slotTime.includes('-')) {
    const [start, end] = slotTime.split('-');
    const Day = getDayName(new Date());

    return currentTime >= start.trim() && currentTime <= end.trim();
  }
  return currentTime === slotTime;
};

const CACHE_TTL_SECONDS = 300

export const getAllServicesbarber = async ({
  page,
  limit,
  searchTerm,
  barberId
}: PaginationOptions): Promise<PaginatedResult> => {
  const cacheKey = `services:${barberId}:${page}:${limit}:${searchTerm || ''}`

  try {
    const cached = await redis.get(cacheKey)
    if (cached) {
      logger.info(`Cache hit for key ${cacheKey}`)
      return JSON.parse(cached)
    }
  } catch (e) {
    logger.warn(`Redis get failed: ${e}`)
  }

  const query: any = { barber: barberId }

  if (searchTerm) {
    const subCategoryIds = await SubCategory.find({
      title: { $regex: searchTerm, $options: 'i' }
    }).select('_id')

    query.$or = [
      { serviceType: { $regex: searchTerm, $options: 'i' } },
      { description: { $regex: searchTerm, $options: 'i' } },
      { title: { $in: subCategoryIds } }
    ]
  }

  const total = await Service.countDocuments(query)
  const totalPage = Math.ceil(total / limit)
  const skip = (page - 1) * limit

  const services = await Service.find(query)
    .populate('category')
    .populate('title')
    .populate('barber')
    .populate('serviceType')
    .skip(skip)
    .limit(limit)
    .sort({ createdAt: -1 })
    .lean()

  const result: PaginatedResult = {
    services,
    pagination: { page, limit, total, totalPage }
  }

  try {
    await redis.set(cacheKey, JSON.stringify(result), 'EX', CACHE_TTL_SECONDS);
    logger.info(`Cache set for key ${cacheKey}`)
  } catch (e) {
    logger.warn(`Redis set failed: ${e}`)
  }

  return result
}
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
