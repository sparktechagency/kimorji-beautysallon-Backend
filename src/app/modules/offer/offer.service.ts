import { TimeSlot } from './../../../helpers/timeslot.helper';
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

// const addOfferToDB = async (
//   serviceId: string,
//   payload: {
//     title?: string;
//     percent: number;
//     days: string[];
//     TimeSlot: TimeSlot[];
//     startTime: string;
//     endTime: string;
//     isActive?: boolean;
//   }
// ) => {
//   if (!Types.ObjectId.isValid(serviceId)) {
//     throw new ApiError(StatusCodes.BAD_REQUEST, "Invalid service id");
//   }

//   const { percent, days, TimeSlot, startTime, endTime, title, isActive } = payload;

//   const existingOffer = await Offer.findOne({ service: serviceId, isActive: true });

//   let offer;

//   if (existingOffer) {
//     existingOffer.title = title ?? existingOffer.title;
//     existingOffer.percent = percent;
//     existingOffer.days = days;
//     existingOffer.startTime = new Date(startTime);
//     existingOffer.endTime = new Date(endTime);
//     existingOffer.isActive = isActive ?? true;

//     offer = await existingOffer.save();
//   } else {
//     offer = await Offer.create({
//       service: serviceId,
//       title,
//       percent,
//       days,
//       startTime: new Date(startTime),
//       endTime: new Date(endTime),
//       isActive: !!isActive
//     });
//   }

//   await Service.findByIdAndUpdate(serviceId, { $set: { isOffered: true, parcent: offer.percent } });

//   return offer;
// };
const addOfferToDB = async (
  serviceId: string,
  payload: {
    title?: string;
    percent: number;
    days: string[];
    timeSlots: string[];
    startTime: string;
    endTime: string;
    isActive?: boolean;
  }
) => {
  if (!Types.ObjectId.isValid(serviceId)) {
    throw new ApiError(StatusCodes.BAD_REQUEST, "Invalid service id");
  }

  const { percent, days, timeSlots, startTime, endTime, title, isActive } = payload;

  console.log('Creating offer with:', {
    serviceId,
    days,
    timeSlots,
    startTime: new Date(startTime),
    endTime: new Date(endTime),
    now: new Date()
  });

  // Create new offer (don't update existing for now to avoid confusion)
  const offer = await Offer.findOneAndUpdate({
    service: serviceId,
    title,
    percent,
    days,
    timeSlots,
    startTime: new Date(startTime),
    endTime: new Date(endTime),
    isActive: isActive ?? true
  });

  console.log('Offer created:', offer);

  // The post-save hook will update the service
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
      const start = typeof o.startTime === "string" ? hhmmToMinutes(o.startTime) : new Date(o.startTime).getTime();
      const end = typeof o.endTime === "string" ? hhmmToMinutes(o.endTime) : new Date(o.endTime).getTime();

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

