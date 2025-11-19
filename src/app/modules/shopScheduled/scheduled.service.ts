
import httpStatus from "http-status";
import ApiError from "../../../errors/ApiError";
import ShopSchedule from "./scheduled.model";
import { Service } from "../service/service.model";
import { IScheduleItem } from "../service/service.interface";

const createOrUpdateShopSchedule = async (
  barberId: string,
  scheduleData: any
) => {
  const existingSchedule = await ShopSchedule.findOne({ barber: barberId });

  let shopSchedule;
  if (existingSchedule) {
    shopSchedule = await ShopSchedule.findOneAndUpdate(
      { barber: barberId },
      scheduleData,
      { new: true, runValidators: true }
    );
  } else {
    shopSchedule = await ShopSchedule.create({
      ...scheduleData,
      barber: barberId
    });
  }

  return shopSchedule;
};

// Add temporary closure for specific date and time slots
const addTemporaryClosure = async (
  barberId: string,
  date: string, // "2024-12-25"
  day: string, // "MONDAY"
  timeSlots: string[], // ["10:00 AM", "11:00 AM"] or [] for entire day
  reason?: string
) => {
  const shopSchedule = await ShopSchedule.findOne({ barber: barberId });

  if (!shopSchedule) {
    throw new ApiError(httpStatus.NOT_FOUND, "Shop schedule not found");
  }

  // Check if closure already exists for this date
  const existingClosure = shopSchedule.temporaryClosures?.find(
    (closure) => closure.date === date
  );

  if (existingClosure) {
    // Merge time slots if closure exists
    const mergedSlots = [...new Set([...existingClosure.timeSlots, ...timeSlots])];
    existingClosure.timeSlots = mergedSlots;
  } else {
    // Add new closure
    shopSchedule.temporaryClosures?.push({
      date,
      day,
      timeSlots,
      reason,
      createdAt: new Date()
    });
  }

  await shopSchedule.save();

  return {
    message: "Temporary closure added successfully",
    closure: { date, day, timeSlots, reason }
  };
};

// Remove temporary closure
const removeTemporaryClosure = async (
  barberId: string,
  date: string,
  timeSlots?: string[] // If not provided, remove entire day closure
) => {
  const shopSchedule = await ShopSchedule.findOne({ barber: barberId });

  if (!shopSchedule) {
    throw new ApiError(httpStatus.NOT_FOUND, "Shop schedule not found");
  }

  if (!timeSlots || timeSlots.length === 0) {
    // Remove entire day closure
    shopSchedule.temporaryClosures = shopSchedule.temporaryClosures?.filter(
      (closure) => closure.date !== date
    );
  } else {
    // Remove specific time slots
    const closure = shopSchedule.temporaryClosures?.find(
      (c) => c.date === date
    );

    if (closure) {
      closure.timeSlots = closure.timeSlots.filter(
        (slot) => !timeSlots.includes(slot)
      );

      // If no slots left, remove the closure
      if (closure.timeSlots.length === 0) {
        shopSchedule.temporaryClosures = shopSchedule.temporaryClosures?.filter(
          (c) => c.date !== date
        );
      }
    }
  }

  await shopSchedule.save();

  return { message: "Temporary closure removed successfully" };
};


const getAvailableTimeSlotsForDate = async (
  barberId: string,
  serviceId: string,
  date: string, // "2024-12-25"
  day: string // "MONDAY"
) => {
  const shopSchedule = await ShopSchedule.findOne({ barber: barberId });
  const service = await Service.findById(serviceId);

  if (!service) {
    throw new ApiError(httpStatus.NOT_FOUND, "Service not found");
  }

  // Get service's regular schedule for this day
  const serviceDaySchedule = service.dailySchedule?.find((s) => s.day === day);

  if (!serviceDaySchedule || !serviceDaySchedule.timeSlot) {
    return { availableSlots: [] };
  }

  let availableSlots = [...serviceDaySchedule.timeSlot];

  // Check for temporary closures
  if (shopSchedule && shopSchedule.temporaryClosures) {
    const temporaryClosure = shopSchedule.temporaryClosures.find(
      (closure) => closure.date === date
    );

    if (temporaryClosure) {
      if (temporaryClosure.timeSlots.length === 0) {
        // Entire day is closed
        availableSlots = [];
      } else {
        // Remove temporarily closed time slots
        availableSlots = availableSlots.filter(
          (slot) => !temporaryClosure.timeSlots.includes(slot)
        );
      }
    }
  }

  // Remove already booked slots
  if (service.bookedSlots) {
    const bookedSlotsForDate = service.bookedSlots
      .filter((booking) => booking.date === date)
      .map((booking) => booking.timeSlot);

    availableSlots = availableSlots.filter(
      (slot) => !bookedSlotsForDate.includes(slot)
    );
  }

  return { 
    availableSlots,
    date,
    day
  };
};

// Get all available slots for a service for next N days
const getAvailableSlotsForService = async (
  serviceId: string,
  days: number = 7
) => {
  const service = await Service.findById(serviceId).populate('barber');

  if (!service) {
    throw new ApiError(httpStatus.NOT_FOUND, "Service not found");
  }

  // Extract barber ID (handle both populated and non-populated cases)
  const barberId = typeof service.barber === 'object' && service.barber !== null
    ? (service.barber as any)._id
    : service.barber;

  const shopSchedule = await ShopSchedule.findOne({ barber: barberId });

  const result = [];
  const today = new Date();

  for (let i = 0; i < days; i++) {
    const currentDate = new Date(today);
    currentDate.setDate(today.getDate() + i);
    
    const dateString = currentDate.toISOString().split('T')[0];
    const dayName = currentDate.toLocaleString('en-US', { weekday: 'long' }).toUpperCase();

    const slots = await getAvailableTimeSlotsForDate(
      barberId.toString(),
      serviceId,
      dateString,
      dayName
    );

    result.push({
      date: dateString,
      day: dayName,
      availableSlots: slots.availableSlots
    });
  }

  return result;
};

// Clean up old temporary closures (past dates)
const cleanupOldClosures = async (barberId: string) => {
  const shopSchedule = await ShopSchedule.findOne({ barber: barberId });

  if (!shopSchedule) {
    // No shop schedule, nothing to clean up
    return { message: "No shop schedule found - nothing to clean up" };
  }

  const today = new Date().toISOString().split('T')[0];

  shopSchedule.temporaryClosures = shopSchedule.temporaryClosures?.filter(
    (closure) => closure.date >= today
  );

  await shopSchedule.save();

  return { message: "Old closures cleaned up" };
};

// Get all temporary closures
const getTemporaryClosures = async (barberId: string, fromDate?: string) => {
  const shopSchedule = await ShopSchedule.findOne({ barber: barberId });

  if (!shopSchedule) {
    // Return empty array instead of throwing error
    return { closures: [] };
  }

  let closures = shopSchedule.temporaryClosures || [];

  if (fromDate) {
    closures = closures.filter((closure) => closure.date >= fromDate);
  }

  return { closures };
};

const getShopSchedule = async (barberId: string) => {
  const schedule = await ShopSchedule.findOne({ barber: barberId });
  
  if (!schedule) {
    // Return null or default structure instead of throwing error
    return null;
  }

  return schedule;
};
export const ShopScheduleService = {
  createOrUpdateShopSchedule,
  addTemporaryClosure,
  removeTemporaryClosure,
  getAvailableTimeSlotsForDate,
  getAvailableSlotsForService,
  cleanupOldClosures,
  getTemporaryClosures,
  getShopSchedule
};

// const getShopSchedule = async (): Promise<ShopScheduleInterface | {}> => {
//     try {
//         const shopSchedule = await ShopSchedule.findOne().lean();
//         if (!shopSchedule) {
//             return [];
//         }
//         return shopSchedule as ShopScheduleInterface;
//     }
//     catch (error) {
//         throw new Error('Error retrieving shop schedule');
//     }
// };
// const createOrUpdateShopSchedule = async (schedule: ShopScheduleInterface): Promise<ShopScheduleInterface> => {
//     try {

//         let shopSchedule = await ShopSchedule.findOne();

//         if (shopSchedule) {
//             shopSchedule.set({
//                 dailySchedule: schedule.dailySchedule,
//                 serviceTimeSchedule: schedule.serviceTimeSchedule,
//             });
//             await shopSchedule.save();
//         } else {
//             shopSchedule = new ShopSchedule({
//                 dailySchedule: schedule.dailySchedule,
//                 serviceTimeSchedule: schedule.serviceTimeSchedule,
//             });
//             await shopSchedule.save();
//         }

//         return shopSchedule.toObject() as ShopScheduleInterface;
//     } catch (error) {
//         throw new Error('Error creating or updating shop schedule');
//     }
// };
// //barber id to get shop schedule
// const getShopScheduleByBarberId = async (barberId: string): Promise<ShopScheduleInterface | {}> => {
//     try {
//         const shopSchedule = await ShopSchedule.findOne().lean(); `  11`
//         if (!shopSchedule) {
//             return [];
//         }
//         return shopSchedule as ShopScheduleInterface;
//     }
//     catch (error) {
//         throw new Error('Error retrieving shop schedule');
//     }
// }


// export const ShopScheduledService = {
//     getShopSchedule,
//     createOrUpdateShopSchedule,
//     getShopScheduleByBarberId
// };

