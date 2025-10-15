import { IBookedSlot } from "../app/modules/service/service.interface";


export type TimeSlot = {
  start: string;
  end: string;
  isBooked: boolean;
  reservationId?: string;
};

export type AvailableSlotResponse = {
  date: string;
  dayOfWeek: string;
  scheduleStart: string;
  scheduleEnd: string;
  serviceDuration: string;
  slots: TimeSlot[];
};
export const generateTimeSlots = (startTime: string, endTime: string, duration: string): TimeSlot[] => {
  const slots: TimeSlot[] = [];
  
  const durationMinutes = parseDuration(duration);
  
  // Convert time strings to minutes since midnight
  const startMinutes = timeToMinutes(startTime);
  const endMinutes = timeToMinutes(endTime);
  
  let currentMinutes = startMinutes;
  
  while (currentMinutes + durationMinutes <= endMinutes) {
    const slotStart = minutesToTime(currentMinutes);
    const slotEnd = minutesToTime(currentMinutes + durationMinutes);
    
    slots.push({
      start: slotStart,
      end: slotEnd,
      isBooked: false
    });
    
    currentMinutes += durationMinutes;
  }
  
  return slots;
};

// Helper function to check if a slot is booked
export const isSlotBooked = (
  slot: TimeSlot,
  bookedSlots: IBookedSlot[]
): { booked: boolean; reservationId?: string } => {
  for (const booked of bookedSlots) {
    if (!booked.start || !booked.end) continue; // skip invalid entries

    const slotStart = timeToMinutes(slot.start);
    const slotEnd = timeToMinutes(slot.end);
    const bookedStart = timeToMinutes(booked.start);
    const bookedEnd = timeToMinutes(booked.end);

    if (
      (slotStart >= bookedStart && slotStart < bookedEnd) ||
      (slotEnd > bookedStart && slotEnd <= bookedEnd) ||
      (slotStart <= bookedStart && slotEnd >= bookedEnd)
    ) {
      return { booked: true, reservationId: booked.reservationId.toString() };
    }
  }

  return { booked: false };
};


// Helper function to parse duration string to minutes
export const parseDuration = (duration: string): number => {
  // Normalize the string
  const durationLower = duration.toLowerCase().trim();
  
  // Handle formats like "1 hour", "2 hours", "30 minutes", "1.5 hours"
  if (durationLower.includes("hour")) {
    const hourMatch = durationLower.match(/(\d+\.?\d*)\s*hours?/);
    if (hourMatch) {
      return Math.round(parseFloat(hourMatch[1]) * 60);
    }
  }
  
  if (durationLower.includes("minute") || durationLower.includes("min")) {
    const minuteMatch = durationLower.match(/(\d+)\s*(minutes?|mins?)/);
    if (minuteMatch) {
      return parseInt(minuteMatch[1], 10);
    }
  }
  
  // If duration is just a number (e.g., "60"), treat as minutes
  if (/^\d+$/.test(duration)) {
    return parseInt(duration, 10);
  }
  
  // If duration is in format "HH:mm" or "H:mm"
  if (duration.includes(":")) {
    const [hours, minutes] = duration.split(":").map(Number);
    return hours * 60 + minutes;
  }
  
  // Default to 60 minutes if format is unknown
  console.warn(`Unknown duration format: ${duration}, defaulting to 60 minutes`);
  return 60;
};

// Helper function to convert "HH:mm" to minutes since midnight
export const timeToMinutes = (time: string): number => {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
};

// Helper function to convert minutes since midnight to "HH:mm"
export const minutesToTime = (minutes: number): string => {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours.toString().padStart(2, "0")}:${mins.toString().padStart(2, "0")}`;
};

export const to24Hour = (time: string): string => {
  // Remove extra spaces and convert to uppercase
  time = time.trim().toUpperCase();
  
  // Check if it's already in 24-hour format (no AM/PM)
  if (!time.includes('AM') && !time.includes('PM')) {
    return time;
  }
  
  // Extract time and period (AM/PM)
  const match = time.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (!match) {
    throw new Error(`Invalid time format: ${time}. Expected format: HH:MM AM/PM`);
  }
  
  let [, hours, minutes, period] = match;
  let hour = parseInt(hours, 10);
  
  // Convert to 24-hour format
  if (period === 'AM') {
    if (hour === 12) hour = 0; // 12:00 AM = 00:00
  } else {
    if (hour !== 12) hour += 12; // PM hours (except 12 PM)
  }
  
  // Format with leading zeros
  return `${hour.toString().padStart(2, '0')}:${minutes}`;
};