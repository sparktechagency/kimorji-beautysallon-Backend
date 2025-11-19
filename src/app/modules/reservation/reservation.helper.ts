import ApiError from "../../../errors/ApiError";
import { Service } from "../service/service.model";
import ShopSchedule from "../shopScheduled/scheduled.model";
import httpStatus from "http-status";
import { jwtHelper } from '../../../helpers/jwtHelper';


const getAvailableSlotsForDate = async (
  serviceId: string,
  date: string // "2024-12-25"
): Promise<string[]> => {
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

  if (!dailySchedule || !dailySchedule.timeSlot) {
    return [];
  }

  let availableSlots = [...dailySchedule.timeSlot];

  // Check shop schedule
  const shopSchedule = await ShopSchedule.findOne({ barber: service.barber });

  // Check permanent closure
  if (shopSchedule && shopSchedule.dailySchedule) {
    const shopDaySchedule = shopSchedule.dailySchedule.find(
      (s) => s.day.toUpperCase() === dayOfWeekUpper
    );

    if (shopDaySchedule?.isClosed) {
      return []; // Shop is permanently closed on this day
    }
  }

  // Check temporary closures
  if (shopSchedule && shopSchedule.temporaryClosures) {
    const temporaryClosure = shopSchedule.temporaryClosures.find(
      (closure) => closure.date === dateString
    );

    if (temporaryClosure) {
      if (temporaryClosure.timeSlots.length === 0) {
        return []; // Entire day is temporarily closed
      }

      // Remove temporarily closed time slots
      availableSlots = availableSlots.filter(
        (slot) => !temporaryClosure.timeSlots.includes(slot)
      );
    }
  }

  // Remove already booked slots
  if (service.bookedSlots) {
    const bookedSlotsForDate = service.bookedSlots
      .filter((booking) => booking.date === dateString)
      .map((booking) => booking.timeSlot);

    availableSlots = availableSlots.filter(
      (slot) => !bookedSlotsForDate.includes(slot)
    );
  }

  return availableSlots;
};

// Helper function to get available slots for multiple dates
const getAvailableSlotsForDateRange = async (
  serviceId: string,
  startDate: string,
  days: number = 7
): Promise<Array<{ date: string; day: string; availableSlots: string[] }>> => {
  const result = [];
  const start = new Date(startDate);

  for (let i = 0; i < days; i++) {
    const currentDate = new Date(start);
    currentDate.setDate(start.getDate() + i);
    
    const dateString = currentDate.toISOString().split('T')[0];
    const dayName = currentDate.toLocaleDateString('en-US', { weekday: 'long' });

    const availableSlots = await getAvailableSlotsForDate(serviceId, dateString);

    result.push({
      date: dateString,
      day: dayName,
      availableSlots
    });
  }

  return result;
};

export const helperReservation = {
    getAvailableSlotsForDate,
    getAvailableSlotsForDateRange
}