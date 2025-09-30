import { StatusCodes } from "http-status-codes";
import { Types } from "mongoose";
import ApiError from "../../../errors/ApiError";
import { Service } from "../service/service.model";
import { Offer } from "./offer.model";
import { Day } from "../../../enums/day";
import { timeInRange, to24Hour } from "../../../helpers/find.offer";
import { logger } from "../../../shared/logger";
const WEEKDAYS: Day[] = [
  Day.SUNDAY,
  Day.MONDAY,
  Day.TUESDAY,
  Day.WEDNESDAY,
  Day.THURSDAY,
  Day.FRIDAY,
  Day.SATURDAY
];
 const addOfferToDB = async (serviceId: string, payload: {
  title?: string;
  percent: number;
  days: string[];
  startTime: string;
  endTime: string;
  isActive?: boolean;
}) => {
  if (!Types.ObjectId.isValid(serviceId)) throw new ApiError(StatusCodes.BAD_REQUEST, "Invalid service id");
  const { percent, days, startTime, endTime, title, isActive } = payload;
  if (typeof percent !== "number" || percent <= 0 || percent > 100) {
    throw new ApiError(StatusCodes.BAD_REQUEST, "percent must be a number between 1 and 100");
  }
  if (!Array.isArray(days) || days.length === 0) throw new ApiError(StatusCodes.BAD_REQUEST, "days required");
  const s = to24Hour(startTime);
  const e = to24Hour(endTime);

  const offer = await Offer.create({
    service: serviceId,
    title,
    percent,
    days,
    startTime: s,
    endTime: e,
    isActive: !!isActive
  });

  await Service.findByIdAndUpdate(serviceId, { $set: { isOffered: true } });

  return offer;
};

/**
 * Find the best offer (highest percent) for service at a given Date (server local)
 */
const findOfferForServiceAt = async (serviceId: string | Types.ObjectId, datetime = new Date()) => {
  const day = WEEKDAYS[datetime.getDay()];
  const minute = datetime.getHours() * 60 + datetime.getMinutes();

  const offers = await Offer.find({ service: serviceId, isActive: true, days: day }).lean();
  let best = null as any;

  const hhmmToMinutes = (hhmm: string) => {
    const [h, m] = hhmm.split(":").map(Number);
    return h * 60 + m;
  };

  for (const o of offers) {
    try {
      const start = typeof o.startTime === "string" ? hhmmToMinutes(o.startTime) : o.startTime;
      const end = typeof o.endTime === "string" ? hhmmToMinutes(o.endTime) : o.endTime;
      if (timeInRange(minute, start, end)) {
        if (!best || o.percent > best.percent) best = o;
      }
    } catch (err) {
      logger.error(`Error parsing offer time: ${err}`);
    }
  }

  return best;
};


//get all offers
 const getAllOffers = async () => {
  const offers = await Offer.find().populate('service');
  return offers;
}


export const offerService = {
    addOfferToDB,
    findOfferForServiceAt,
    getAllOffers

};

