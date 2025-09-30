import { Request, Response } from "express";
import httpStatus from 'http-status-codes';
import { Service } from "../app/modules/service/service.model";
import { Offer } from "../app/modules/offer/offer.model";
import { Types } from "mongoose";
import ApiError from "../errors/ApiError";
import { StatusCodes } from "http-status-codes";
import { Day } from "../enums/day";

/**
 * Helpers
 */
const WEEKDAYS = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];

/** Convert "09:00 AM" or "09:00" to "HH:mm" 24-hour string */
// export function to24Hour(timeStr: string): string {
//   // Normalize common forms. If already "HH:mm" (24h), return.
//   const trimmed = timeStr.trim();
//   const ampmMatch = trimmed.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
//   if (ampmMatch) {
//     let hh = parseInt(ampmMatch[1], 10);
//     const mm = ampmMatch[2];
//     const ampm = ampmMatch[3].toUpperCase();
//     if (ampm === "PM" && hh !== 12) hh += 12;
//     if (ampm === "AM" && hh === 12) hh = 0;
//     return `${hh.toString().padStart(2, "0")}:${mm}`;
//   }
//   // If already like "9:00" or "09:00", pad hours
//   const basicMatch = trimmed.match(/^(\d{1,2}):(\d{2})$/);
//   if (basicMatch) {
//     const hh = parseInt(basicMatch[1], 10).toString().padStart(2, "0");
//     return `${hh}:${basicMatch[2]}`;
//   }
//   throw new Error(`Unsupported time format: ${timeStr}`);
// }
// export function to24Hour(time: string): number {
//     // Expects time in "HH:mm" format
//     const [hourStr, minuteStr] = time.split(":");
//     const hour = parseInt(hourStr, 10);
//     const minute = parseInt(minuteStr, 10);
//     if (
//         isNaN(hour) || isNaN(minute) ||
//         hour < 0 || hour > 23 ||
//         minute < 0 || minute > 59
//     ) {
//         throw new Error(`Invalid time format: ${time}`);
//     }
//     return hour * 60 + minute;
// }
/**
 * Convert "09:00 AM" or "09:00" to "HH:mm" (24-hour format string)
 */
export const to24Hour = (timeStr: string): string => {
  const s = timeStr.trim();
  const ampmMatch = s.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (ampmMatch) {
    let hh = parseInt(ampmMatch[1], 10);
    const mm = ampmMatch[2];
    const ampm = ampmMatch[3].toUpperCase();
    if (ampm === "PM" && hh !== 12) hh += 12;
    if (ampm === "AM" && hh === 12) hh = 0;
    return `${hh.toString().padStart(2, "0")}:${mm}`;
  }

  const basicMatch = s.match(/^(\d{1,2}):(\d{2})$/);
  if (basicMatch) {
    const hh = basicMatch[1].padStart(2, "0");
    const mm = basicMatch[2];
    return `${hh}:${mm}`;
  }

  throw new ApiError(httpStatus.BAD_REQUEST, `Unsupported time format: ${timeStr}`);
};



function hhmmToMinutes(hhmm: string): number {
  const [hh, mm] = hhmm.split(":").map(Number);
  return hh * 60 + mm;
}

/** Check if a given time (minutes) falls inside range start..end.
 * supports ranges where end < start (overnight) if needed.
 */
 function timeInRanges(minute: number, start: string, end: string): boolean {
  const s = hhmmToMinutes(start);
  const e = hhmmToMinutes(end);
  if (s <= e) return minute >= s && minute < e;
  // overnight range (e.g., 22:00 - 02:00)
  return minute >= s || minute < e;
}

export function timeInRange(minute: number, startTime: number, endTime: number): boolean {
    if (startTime <= endTime) {
        return minute >= startTime && minute < endTime;
    } else {
        // Handles overnight ranges (e.g., 22:00-02:00)
        return minute >= startTime || minute < endTime;
    }
}

/**
 * Finds best (highest percent) active offer for given service and datetime.
 * datetime: JS Date (local)
 */
async function findOfferForServiceAt(serviceId: Types.ObjectId | string, datetime: Date) {
  const weekday = WEEKDAYS[datetime.getDay()];
  const minutes = datetime.getHours() * 60 + datetime.getMinutes();

  const offers = await Offer.find({
    service: serviceId,
    isActive: true,
    days: weekday
  }).lean();

  let best: (typeof offers)[0] | null = null;
  for (const o of offers) {
    try {
      const s = o.startTime;
      const e = o.endTime;
      if (timeInRanges(minutes, s, e)) {
        if (!best || o.percent > best.percent) best = o;
      }
    } catch (err) {
      // ignore malformed offer times
      continue;
    }
  }
  return best;
}

export function isValidDay(rawDay: any): boolean {
  // Check if rawDay matches any value in the Day enum (case-insensitive)
  return Object.values(Day).some(day => day.toUpperCase() === rawDay.toString().toUpperCase());
}
