import ApiError from "../../../errors/ApiError";
import { Service } from "../service/service.model";
import ShopSchedule from "./scheduled.model";
import httpStatus from "http-status";
interface AvailabilityCheck {
  isAvailable: boolean;
  reason?: string;
  availableSlots?: string[];
}

class AvailabilityService {
  /**
   * Check if a specific time slot is available
   */
  async isTimeSlotAvailable(
    serviceId: string,
    date: string, // "2024-12-25"
    timeSlot: string
  ): Promise<AvailabilityCheck> {
    const service = await Service.findById(serviceId).populate('barber');
    
    if (!service) {
      throw new ApiError(httpStatus.NOT_FOUND, "Service not found");
    }

    const reservationDate = new Date(date);
    const dayOfWeek = reservationDate.toLocaleDateString("en-US", { weekday: "long" });
    const dayOfWeekUpper = dayOfWeek.toUpperCase();
    const dateString = reservationDate.toISOString().split('T')[0];

    // 1. Check service's regular schedule
    const dailySchedule = service.dailySchedule?.find(
      (schedule) => schedule.day === dayOfWeekUpper || schedule.day === dayOfWeek
    );

    if (!dailySchedule || !dailySchedule.timeSlot || dailySchedule.timeSlot.length === 0) {
      return {
        isAvailable: false,
        reason: `Service has no schedule for ${dayOfWeek}`
      };
    }

    if (!dailySchedule.timeSlot.includes(timeSlot)) {
      return {
        isAvailable: false,
        reason: `Time slot ${timeSlot} is not in service schedule for ${dayOfWeek}`
      };
    }

    // 2. Check shop schedule
    const shopSchedule = await ShopSchedule.findOne({ barber: service.barber });

    // 2a. Check permanent closure
    if (shopSchedule?.dailySchedule) {
      const shopDaySchedule = shopSchedule.dailySchedule.find(
        (s) => s.day.toUpperCase() === dayOfWeekUpper
      );

      if (shopDaySchedule?.isClosed) {
        return {
          isAvailable: false,
          reason: `Shop is permanently closed on ${dayOfWeek}s`
        };
      }
    }

    // 2b. Check temporary closures
    if (shopSchedule?.temporaryClosures) {
      const temporaryClosure = shopSchedule.temporaryClosures.find(
        (closure) => closure.date === dateString
      );

      if (temporaryClosure) {
        // Entire day closed
        if (temporaryClosure.timeSlots.length === 0) {
          return {
            isAvailable: false,
            reason: `Shop is temporarily closed on ${date}. ${temporaryClosure.reason || ''}`
          };
        }

        // Specific time slot closed
        if (temporaryClosure.timeSlots.includes(timeSlot)) {
          return {
            isAvailable: false,
            reason: `Time slot ${timeSlot} is temporarily unavailable on ${date}. ${temporaryClosure.reason || ''}`
          };
        }
      }
    }

    // 3. Check if already booked
    const isBooked = service.bookedSlots?.some(
      (slot) => slot.date === dateString && slot.timeSlot === timeSlot
    );

    if (isBooked) {
      return {
        isAvailable: false,
        reason: "Time slot is already booked"
      };
    }

    return {
      isAvailable: true
    };
  }

  /**
   * Get all available slots for a specific date
   */
  async getAvailableSlotsForDate(
    serviceId: string,
    date: string
  ): Promise<string[]> {
    const service = await Service.findById(serviceId).populate('barber');
    
    if (!service) {
      throw new ApiError(httpStatus.NOT_FOUND, "Service not found");
    }

    const reservationDate = new Date(date);
    const dayOfWeek = reservationDate.toLocaleDateString("en-US", { weekday: "long" });
    const dayOfWeekUpper = dayOfWeek.toUpperCase();
    const dateString = reservationDate.toISOString().split('T')[0];

    // Get service's regular schedule
    const dailySchedule = service.dailySchedule?.find(
      (schedule) => schedule.day === dayOfWeekUpper || schedule.day === dayOfWeek
    );

    if (!dailySchedule?.timeSlot || dailySchedule.timeSlot.length === 0) {
      return [];
    }

    let availableSlots = [...dailySchedule.timeSlot];

    // Check shop schedule
    const shopSchedule = await ShopSchedule.findOne({ barber: service.barber });

    // Check permanent closure
    if (shopSchedule?.dailySchedule) {
      const shopDaySchedule = shopSchedule.dailySchedule.find(
        (s) => s.day.toUpperCase() === dayOfWeekUpper
      );

      if (shopDaySchedule?.isClosed) {
        return [];
      }
    }

    // Check temporary closures
    if (shopSchedule?.temporaryClosures) {
      const temporaryClosure = shopSchedule.temporaryClosures.find(
        (closure) => closure.date === dateString
      );

      if (temporaryClosure) {
        if (temporaryClosure.timeSlots.length === 0) {
          return []; // Entire day closed
        }

        // Remove temporarily closed slots
        availableSlots = availableSlots.filter(
          (slot) => !temporaryClosure.timeSlots.includes(slot)
        );
      }
    }

    // Remove booked slots
    if (service.bookedSlots) {
      const bookedSlotsForDate = service.bookedSlots
        .filter((booking) => booking.date === dateString)
        .map((booking) => booking.timeSlot);

      availableSlots = availableSlots.filter(
        (slot) => !bookedSlotsForDate.includes(slot)
      );
    }

    return availableSlots;
  }

  /**
   * Get availability for date range (useful for calendar view)
   */
  async getAvailabilityForDateRange(
    serviceId: string,
    startDate: string,
    days: number = 7
  ): Promise<Array<{
    date: string;
    day: string;
    availableSlots: string[];
    totalSlots: number;
    isFullyBooked: boolean;
    isClosed: boolean;
  }>> {
    const result = [];
    const start = new Date(startDate);

    for (let i = 0; i < days; i++) {
      const currentDate = new Date(start);
      currentDate.setDate(start.getDate() + i);
      
      const dateString = currentDate.toISOString().split('T')[0];
      const dayName = currentDate.toLocaleDateString('en-US', { weekday: 'long' });

      const availableSlots = await this.getAvailableSlotsForDate(serviceId, dateString);

      // Get total possible slots for this day
      const service = await Service.findById(serviceId);
      const dayOfWeekUpper = currentDate.toLocaleDateString("en-US", { weekday: "long" }).toUpperCase();
      const dailySchedule = service?.dailySchedule?.find(
        (schedule) => schedule.day === dayOfWeekUpper
      );
      const totalSlots = dailySchedule?.timeSlot?.length || 0;

      result.push({
        date: dateString,
        day: dayName,
        availableSlots,
        totalSlots,
        isFullyBooked: totalSlots > 0 && availableSlots.length === 0,
        isClosed: totalSlots === 0
      });
    }

    return result;
  }

  /**
   * Get next available slot (useful for "Book Next Available")
   */
  async getNextAvailableSlot(
    serviceId: string,
    fromDate?: string
  ): Promise<{ date: string; timeSlot: string } | null> {
    const startDate = fromDate || new Date().toISOString().split('T')[0];
    const maxDaysToCheck = 30; // Look ahead 30 days

    for (let i = 0; i < maxDaysToCheck; i++) {
      const currentDate = new Date(startDate);
      currentDate.setDate(new Date(startDate).getDate() + i);
      
      const dateString = currentDate.toISOString().split('T')[0];
      const availableSlots = await this.getAvailableSlotsForDate(serviceId, dateString);

      if (availableSlots.length > 0) {
        return {
          date: dateString,
          timeSlot: availableSlots[0] // Return first available slot
        };
      }
    }

    return null; // No available slots in next 30 days
  }
}
export default new AvailabilityService();