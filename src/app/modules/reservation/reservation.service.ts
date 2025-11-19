import { TimeSlot, to24Hour } from './../../../helpers/timeslot.helper';
import { JwtPayload } from "jsonwebtoken";
import { IReservation } from "./reservation.interface";
import { Reservation } from "./reservation.model";
import { StatusCodes } from "http-status-codes";
import ApiError from "../../../errors/ApiError";
import { Report } from "../report/report.model";
import mongoose, { Types } from "mongoose";
import { sendNotifications } from "../../../helpers/notificationsHelper";
import getDistanceFromCoordinates from "../../../shared/getDistanceFromCoordinates";
import getRatingForBarber from "../../../shared/getRatingForBarber";
import { Review } from "../review/review.model";
import { User } from "../user/user.model";
import { Service } from "../service/service.model";
import { string } from "zod";
import { IBookedSlot } from "../service/service.interface";
import { logger } from "../../../shared/logger";
import { enqueueNotification } from "../queue/notification.queue";
import { Day } from "../../../enums/day";
import { resetSlotAndUpdateStatus } from '../../../helpers/reset.time.slot';
import httpStatus from "http-status";
import ShopSchedule from '../shopScheduled/scheduled.model';
// const createReservationToDB = async (payload: IReservation): Promise<IReservation> => {
//   const service = await Service.findById(payload.service);
//   if (!service) {
//     throw new Error("Service not found");
//   }

//   const dayOfWeek = new Date(payload.reservationDate).toLocaleDateString("en-US", { weekday: "long" });
//   const dayOfWeekUpper = dayOfWeek.toUpperCase();

//   const dailySchedule = service.dailySchedule.find(
//     (schedule) => schedule.day === dayOfWeekUpper || schedule.day === dayOfWeek
//   );

//   if (!dailySchedule) {
//     throw new Error(`No schedule available for ${dayOfWeek}`);
//   }

//   const isValidTimeSlot = dailySchedule.timeSlot.includes(payload.timeSlot);
//   if (!isValidTimeSlot) {
//     throw new Error(`Time slot ${payload.timeSlot} is not available on ${dayOfWeek}`);
//   }

//   const isSlotBooked = service.bookedSlots.some(
//     (slot) =>
//       slot.date === payload.reservationDate &&
//       slot.timeSlot === payload.timeSlot
//   );

//   if (isSlotBooked) {
//     throw new Error("This time slot is already booked for the selected date");
//   }

//   // Create reservation
//   const reservation = await Reservation.create(payload);
//   if (!reservation) {
//     throw new Error("Failed to create reservation");
//   }

//   // Update the bookedSlots array for the service
//   await Service.findByIdAndUpdate(payload.service as Types.ObjectId, {
//     $push: {
//       bookedSlots: {
//         date: payload.reservationDate,
//         timeSlot: payload.timeSlot,
//         day: payload.Day,
//         reservationId: reservation._id
//       }
//     }
//   });

//   // Send notification to the barber
//   const data = {
//     text: "You receive a new reservation request",
//     receiver: payload.barber,
//     referenceId: reservation._id,
//     screen: "RESERVATION"
//   };
//   enqueueNotification;
//   sendNotifications(data);

//   return reservation;
// };

const createReservationToDB = async (payload: IReservation): Promise<IReservation> => {
  // Find service
  const service = await Service.findById(payload.service);
  if (!service) {
    throw new ApiError(httpStatus.NOT_FOUND, "Service not found");
  }
  
  const barberId = service.barber;

  const reservationDate = new Date(payload.reservationDate);
  const dateString = reservationDate.toISOString().split('T')[0]; 
  const dayOfWeek = reservationDate.toLocaleDateString("en-US", { weekday: "long" });
  const dayOfWeekUpper = dayOfWeek.toUpperCase();

  let normalizedTimeSlot = payload.timeSlot;
  try {
    if (payload.timeSlot.includes('AM') || payload.timeSlot.includes('PM') || 
        payload.timeSlot.includes('am') || payload.timeSlot.includes('pm')) {
      normalizedTimeSlot = to24Hour(payload.timeSlot);
    }
  } catch (error) {
    // If conversion fails, use as is
    console.log('Time slot conversion skipped:', payload.timeSlot);
  }

  console.log('Reservation Details:', {
    dateString,
    dayOfWeek,
    dayOfWeekUpper,
    originalTimeSlot: payload.timeSlot,
    normalizedTimeSlot
  });

  // 1. Check if service has schedule for this day
  const dailySchedule = service.dailySchedule?.find(
    (schedule) => {
      const scheduleDay = schedule.day.toUpperCase();
      return scheduleDay === dayOfWeekUpper || scheduleDay === dayOfWeek.toUpperCase();
    }
  );

  if (!dailySchedule || !dailySchedule.timeSlot || dailySchedule.timeSlot.length === 0) {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      `No schedule available for ${dayOfWeek}`
    );
  }

  // 2. Check if time slot exists in service's regular schedule
  // Compare both original and normalized formats
  const isValidTimeSlot = dailySchedule.timeSlot.some(slot => {
    return slot === payload.timeSlot || 
           slot === normalizedTimeSlot ||
           slot.replace(/\s/g, '') === payload.timeSlot.replace(/\s/g, '');
  });

  if (!isValidTimeSlot) {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      `Time slot ${payload.timeSlot} is not available on ${dayOfWeek}. Available slots: ${dailySchedule.timeSlot.join(', ')}`
    );
  }

  // 3. Check shop schedule
  const shopSchedule = await ShopSchedule.findOne({ barber: barberId });
  
  console.log('Shop Schedule Found:', shopSchedule ? 'Yes' : 'No');

  // 4. Check if permanent shop closure (shop closed every week on this day)
  if (shopSchedule && shopSchedule.dailySchedule) {
    const shopDaySchedule = shopSchedule.dailySchedule.find(
      (s) => s.day.toUpperCase() === dayOfWeekUpper
    );

    console.log('Checking permanent closure:', {
      day: dayOfWeekUpper,
      shopDaySchedule,
      isClosed: shopDaySchedule?.isClosed
    });

    if (shopDaySchedule?.isClosed) {
      throw new ApiError(
        httpStatus.BAD_REQUEST,
        `Shop is permanently closed on ${dayOfWeek}s`
      );
    }
  }

  // 5. Check for temporary closures
  if (shopSchedule && shopSchedule.temporaryClosures) {
    console.log('Checking temporary closures for date:', dateString);
    console.log('Available temporary closures:', shopSchedule.temporaryClosures);

    const temporaryClosure = shopSchedule.temporaryClosures.find(
      (closure) => {
        console.log('Comparing dates:', {
          closureDate: closure.date,
          requestDate: dateString,
          match: closure.date === dateString
        });
        return closure.date === dateString;
      }
    );

    if (temporaryClosure) {
      console.log('Temporary closure found:', temporaryClosure);

      // Check if entire day is closed
      if (temporaryClosure.timeSlots.length === 0) {
        throw new ApiError(
          httpStatus.BAD_REQUEST,
          `Shop is closed on ${dateString}. Reason: ${temporaryClosure.reason || 'Temporary closure'}`
        );
      }

      // Check if specific time slot is closed - compare in multiple formats
      const isSlotClosed = temporaryClosure.timeSlots.some(closedSlot => {
        // Normalize both slots for comparison
        const normalizedClosedSlot = closedSlot.replace(/\s/g, '').toUpperCase();
        const normalizedRequestSlot = payload.timeSlot.replace(/\s/g, '').toUpperCase();
        
        console.log('Comparing slots:', {
          closedSlot,
          requestSlot: payload.timeSlot,
          normalizedClosedSlot,
          normalizedRequestSlot,
          match: normalizedClosedSlot === normalizedRequestSlot
        });

        return normalizedClosedSlot === normalizedRequestSlot ||
               closedSlot === payload.timeSlot ||
               closedSlot === normalizedTimeSlot;
      });

      if (isSlotClosed) {
        throw new ApiError(
          httpStatus.BAD_REQUEST,
          `Time slot ${payload.timeSlot} is temporarily unavailable on ${dateString}. Reason: ${temporaryClosure.reason || 'Temporary closure'}`
        );
      }
    } else {
      console.log('No temporary closure found for this date');
    }
  }

  // 6. Check if slot is already booked
  const isSlotBooked = service.bookedSlots?.some(
    (slot) => {
      return slot.date === dateString && (
        slot.timeSlot === payload.timeSlot || 
        slot.timeSlot === normalizedTimeSlot
      );
    }
  );

  if (isSlotBooked) {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      "This time slot is already booked for the selected date"
    );
  }

  // 7. Create reservation
  const reservation = await Reservation.create(payload);
  if (!reservation) {
    throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, "Failed to create reservation");
  }

  // 8. Update the bookedSlots array for the service
  await Service.findByIdAndUpdate(payload.service as Types.ObjectId, {
    $push: {
      bookedSlots: {
        date: dateString, // Use ISO date format
        timeSlot: payload.timeSlot,
        day: dayOfWeekUpper,
        reservationId: reservation._id
      }
    }
  });
  // 8. Send notification to the barber
  const notificationData = {
    text: "You receive a new reservation request",
    receiver: payload.barber,
    referenceId: reservation._id,
    screen: "RESERVATION"
  };

  const queueData = {
    type: 'push' as const,
    message: notificationData.text
  };

  enqueueNotification(queueData);
  sendNotifications(notificationData);

  return reservation;
};

// const updateReservationStatus = async (
//   reservationId: string,
//   status: "Completed" | "Canceled" | "Accepted"
// ): Promise<IReservation | null> => {
//   logger.info(`Updating reservation ${reservationId} to status: ${status}`);

//   // Find reservation
//   const reservation = await Reservation.findById(reservationId);
//   if (!reservation) {
//     throw new ApiError(StatusCodes.NOT_FOUND, "Reservation not found");
//   }

//   logger.info(`Found reservation: ${reservation._id}, current status: ${reservation.status}`);

//   // Update reservation status
//   reservation.status = status;
//   await reservation.save();

//   logger.info(`Reservation status updated to: ${status}`);

//   // If completed or canceled, remove the booked slot from service
//   if (status === "Completed" || status === "Canceled") {
//     logger.info(`Removing booked slot for reservation: ${reservation._id}`);

//     // Method 1: Pull by reservationId (more reliable)
//     const updateResult = await Service.findByIdAndUpdate(
//       reservation.service,
//       {
//         $pull: {
//           bookedSlots: { 
//             reservationId: new Types.ObjectId(reservation._id) 
//           }
//         }
//       },
//       { new: true } // Return updated document
//     );

//     if (!updateResult) {
//       logger.error(`Service not found: ${reservation.service}`);
//       throw new ApiError(StatusCodes.NOT_FOUND, "Service not found");
//     }

//     logger.info(`Booked slot removed successfully from service: ${reservation.service}`);
//     logger.debug(`Remaining booked slots: ${JSON.stringify(updateResult.bookedSlots)}`);
//   }

//   // Populate and return
//   const populatedReservation = await Reservation.findById(reservation._id)
//     .populate('barber', 'name email')
//     .populate('customer', 'name email')
//     .populate('service', 'title price duration');

//   return populatedReservation as IReservation;
// };

// Alternative method if above doesn't work
const updateReservationStatus = async (
  reservationId: string,
  status: "Completed" | "Canceled" | "Accepted"
): Promise<IReservation | null> => {
  logger.info(`Updating reservation ${reservationId} to status: ${status}`);

  // Find reservation
  const reservation = await Reservation.findById(reservationId);
  if (!reservation) {
    throw new ApiError(StatusCodes.NOT_FOUND, "Reservation not found");
  }

  logger.info(`Found reservation: ${reservation._id}, current status: ${reservation.status}`);

  // Update reservation status
  reservation.status = status;
  await reservation.save();

  logger.info(`Reservation status updated to: ${status}`);

  // If completed or canceled, remove the booked slot from service
  if (status === "Completed" || status === "Canceled") {
    logger.info(`Removing booked slot for reservation: ${reservation._id}`);

    // Method 1: Try $pull with date and timeSlot (more reliable)
    const updateResult = await Service.findByIdAndUpdate(
      reservation.service,
      {
        $pull: {
          bookedSlots: {
            date: reservation.reservationDate,
            timeSlot: reservation.timeSlot
          }
        }
      },
      { new: true } // Return updated document
    );

    if (!updateResult) {
      logger.error(`Service not found: ${reservation.service}`);
      throw new ApiError(StatusCodes.NOT_FOUND, "Service not found");
    }

    logger.info(`Booked slot removed successfully from service: ${reservation.service}`);
    logger.debug(`Remaining booked slots: ${JSON.stringify(updateResult.bookedSlots)}`);
  }

  // Populate and return
  const populatedReservation = await Reservation.findById(reservation._id)
    .populate('barber', 'name email')
    .populate('customer', 'name email')
    .populate('service', 'title price duration');

  return populatedReservation as IReservation;
};

// Alternative method - Remove by date and timeSlot (RECOMMENDED)
const updateReservationStatusAlternative = async (
  reservationId: string,
  status: "Completed" | "Canceled" | "Accepted"
): Promise<IReservation | null> => {
  logger.info(`Updating reservation ${reservationId} to status: ${status}`);

  const reservation = await Reservation.findById(reservationId);
  if (!reservation) {
    throw new ApiError(StatusCodes.NOT_FOUND, "Reservation not found");
  }

  // Update reservation status
  reservation.status = status;
  await reservation.save();

  // Remove booked slot manually
  if (status === "Completed" || status === "Canceled") {
    const service = await Service.findById(reservation.service);

    if (!service) {
      throw new ApiError(StatusCodes.NOT_FOUND, "Service not found");
    }

    logger.info(`Current booked slots: ${service.bookedSlots.length}`);
    logger.info(`Looking for slot - Date: ${reservation.reservationDate}, TimeSlot: ${reservation.timeSlot}`);

    // Filter out the booked slot by date and timeSlot (safer method)
    const initialLength = service.bookedSlots.length;
    service.bookedSlots = service.bookedSlots.filter(
      (slot) => {
        // Handle cases where reservationId might be undefined
        if (slot.reservationId) {
          return slot.reservationId.toString() !== reservation._id.toString();
        }
        // Fallback: match by date and timeSlot
        return !(slot.date === reservation.reservationDate && slot.timeSlot === reservation.timeSlot);
      }
    );

    const removed = initialLength - service.bookedSlots.length;
    await service.save();
    logger.info(`Booked slots removed: ${removed}. Remaining slots: ${service.bookedSlots.length}`);
  }

  return reservation;
};

type SlotStatus = {
  timeSlot: string;
  isBooked: boolean;
  reservationId?: string;
};

type AvailableSlotResponse = {
  date: string;
  dayOfWeek: string;
  serviceDuration: string;
  availableTimeSlots: string[];
  bookedTimeSlots: string[];
  allSlots: SlotStatus[];
};

const getAvailableSlots = async (serviceId: string, date: string): Promise<AvailableSlotResponse> => {
  const service = await Service.findById(serviceId);
  if (!service) {
    throw new Error("Service not found");
  }

  // Get the day of week from date
  const dayOfWeek = new Date(date).toLocaleDateString("en-US", { weekday: "long" });
  const dayOfWeekUpper = dayOfWeek.toUpperCase();

  // Find daily schedule for this day
  const dailySchedule = service.dailySchedule.find(
    (schedule) => schedule.day === dayOfWeekUpper || schedule.day === dayOfWeek
  );

  if (!dailySchedule) {
    throw new Error(`No schedule available for ${dayOfWeek}`);
  }

  if (!dailySchedule.timeSlot || dailySchedule.timeSlot.length === 0) {
    throw new Error(`No time slots configured for ${dayOfWeek}`);
  }

  // Get booked slots for this specific date
  const bookedSlotsForDate = service.bookedSlots.filter((slot) => slot.date === date);

  // Create a set of booked time slots for quick lookup
  const bookedTimeSlotSet = new Set(bookedSlotsForDate.map((slot) => slot.timeSlot));

  // Build slot status for all available time slots
  const allSlots: SlotStatus[] = dailySchedule.timeSlot.map((timeSlot) => {
    const bookedSlot = bookedSlotsForDate.find((slot) => slot.timeSlot === timeSlot);
    return {
      timeSlot,
      isBooked: bookedTimeSlotSet.has(timeSlot),
      reservationId: bookedSlot?.reservationId?.toString()
    };
  });

  // Separate available and booked slots
  const availableTimeSlots = allSlots
    .filter((slot) => !slot.isBooked)
    .map((slot) => slot.timeSlot);

  const bookedTimeSlots = allSlots
    .filter((slot) => slot.isBooked)
    .map((slot) => slot.timeSlot);

  return {
    date,
    dayOfWeek,
    serviceDuration: service.duration,
    availableTimeSlots,
    bookedTimeSlots,
    allSlots
  };
};

const barberReservationFromDB = async (user: JwtPayload, query: Record<string, any>): Promise<any> => {
  const { page, limit, status, coordinates } = query;

  if (!coordinates) {
    throw new ApiError(StatusCodes.BAD_REQUEST, "Please Provide coordinates")
  }

  const condition: any = {
    barber: user.id
  }

  if (status) {
    condition['status'] = status;
  }

  const pages = parseInt(page as string) || 1;
  const size = parseInt(limit as string) || 10;
  const skip = (pages - 1) * size;

  const reservations = await Reservation.find(condition)
    .populate([
      {
        path: 'customer',
        select: "name location profile address"
      },
      {
        path: 'service',
        select: "title category ",
        populate: [
          {
            path: "title",
            select: "title"
          },
          {
            path: "category",
            select: "name"
          },
        ]
      }
    ])
    .select("customer service createdAt status tips travelFee appCharge paymentStatus cancelByCustomer price txid sessionId transfer paymentIntentId ")
    .skip(skip)
    .limit(size)
    .lean();

  const count = await Reservation.countDocuments(condition);

  // check how many reservation in each status
  const allStatus = await Promise.all(["Upcoming", "Accepted", "Canceled", "Completed"].map(
    async (status: string) => {
      return {
        status,
        count: await Reservation.countDocuments({ barber: user.id, status })
      }
    })
  );

  const reservationsWithDistance = await Promise.all(reservations.map(async (reservation: any) => {
    const distance = await getDistanceFromCoordinates(reservation?.customer?.location?.coordinates, JSON?.parse(coordinates));
    const report = await Report.findOne({ reservation: reservation?._id });

    const rating = await Review.findOne({ customer: reservation?.customer?._id, service: reservation?.service?._id }).select("rating").lean();
    return {
      ...reservation,
      report: report || {},
      rating: rating || {},
      distance: distance ? distance : {}
    };
  }));

  const data = {
    reservations: reservationsWithDistance,
    allStatus
  }
  const meta = {
    page: pages,
    totalPage: Math.ceil(count / size),
    total: count,
    limit: size
  }


  return { data, meta };
}

const customerReservationFromDB = async (user: JwtPayload, query: Record<string, any>): Promise<{}> => {
  const { page, limit, status } = query;

  // if (!coordinates) {
  //     throw new ApiError(StatusCodes.BAD_REQUEST, "Please Provide coordinates")
  // }

  const condition: any = {
    customer: user.id
  }

  if (status) {
    condition['status'] = status;
  }

  const pages = parseInt(page as string) || 1;
  const size = parseInt(limit as string) || 10;
  const skip = (pages - 1) * size;

  const reservations: any = await Reservation.find(condition)
    .populate([
      {
        path: 'barber',
        select: "name location profile address contact "
      },
      {
        path: 'service',
        select: "title category",
        populate: [
          {
            path: "title",
            select: "title"
          },
          {
            path: "category",
            select: "name"
          },
        ]
      }
    ])
    .select("barber service createdAt status travelFee appCharge tips price paymentStatus cancelByCustomer txid sessionId transfer paymentIntentId ")
    .skip(skip)
    .limit(size)
    .lean();

  const reservationsWithDistance = await Promise.all(reservations.map(async (reservation: any) => {
    // const distance = await getDistanceFromCoordinates(reservation?.barber?.location?.coordinates, JSON?.parse(coordinates));
    const rating = await getRatingForBarber(reservation?.barber?._id);
    const review = await Review.findOne({ service: reservation?.service?._id, customer: user.id }).select("rating").lean();
    return {
      ...reservation,
      rating: rating,
      review: review || {},
      // distance: distance ? distance : {}
    };
  }));

  const count = await Reservation.countDocuments(condition);
  const meta = {
    page: pages,
    totalPage: Math.ceil(count / size),
    total: count,
    limit: size
  }


  return { reservations: reservationsWithDistance, meta };
}

const reservationSummerForBarberFromDB = async (user: JwtPayload): Promise<{}> => {

  // total earnings
  const totalEarnings = await Reservation.aggregate([
    {
      $match: { barber: user.id }
    },
    {
      $group: {
        _id: null,
        totalEarnings: { $sum: "$price" }
      }
    }
  ]);

  // total earnings today
  const today = new Date();
  const todayEarnings = await Reservation.aggregate([
    {
      $match: { barber: user.id, createdAt: { $gte: new Date(today.getFullYear(), today.getMonth(), today.getDate()) } }
    },
    {
      $group: {
        _id: null,
        todayEarnings: { $sum: "$price" }
      }
    }
  ]);

  // total reservations today
  const todayReservations = await Reservation.countDocuments(
    {
      barber: user.id,
      createdAt: { $gte: new Date(today.getFullYear(), today.getMonth(), today.getDate()) }
    } as any);

  // total reservations
  const totalReservations = await Reservation.countDocuments({ barber: user.id } as any);

  const data = {
    earnings: {
      total: totalEarnings[0]?.totalEarnings || 0,
      today: todayEarnings[0]?.todayEarnings || 0,
    },
    services: {
      today: todayReservations,
      total: totalReservations
    }
  }

  return data;
}

const reservationDetailsFromDB = async (id: string): Promise<{ reservation: IReservation | null, report: any }> => {

  if (!mongoose.Types.ObjectId.isValid(id)) throw new ApiError(StatusCodes.BAD_REQUEST, 'Invalid Reservation ID');

  const reservation: IReservation | null = await Reservation.findById(id)
    .populate([
      {
        path: 'customer',
        select: "name profile location"
      },
      {
        path: 'service',
        select: "title category"
      }
    ])
    .select("customer service createdAt status price");

  if (!reservation) throw new ApiError(StatusCodes.NOT_FOUND, 'Reservation not found');

  const report = await Report.findOne({ reservation: id }).select("reason");

  return { reservation, report, };
}


const respondedReservationFromDB = async (id: string, status: string): Promise<IReservation | null> => {

  if (!mongoose.Types.ObjectId.isValid(id)) throw new ApiError(StatusCodes.BAD_REQUEST, 'Invalid Reservation ID');

  const updatedReservation = await Reservation.findOneAndUpdate(
    { _id: id },
    { status },
    { new: true }
  );
  if (!updatedReservation) throw new ApiError(StatusCodes.NOT_FOUND, 'Failed to update reservation');

  if (updatedReservation?.status === "Accepted") {
    const data = {
      text: "Your reservation has been Accepted. Your service will start soon",
      receiver: updatedReservation.customer,
      referenceId: id,
      screen: "RESERVATION"
    }

    sendNotifications(data);
  }

  if (updatedReservation?.status === "Canceled") {
    const data = {
      text: "Your reservation cancel request has been Accepted.",
      receiver: updatedReservation.customer,
      referenceId: id,
      screen: "RESERVATION"
    }

    sendNotifications(data);
  }

  return updatedReservation;
}


const cancelReservationFromDB = async (id: string): Promise<IReservation | null> => {

  if (!mongoose.Types.ObjectId.isValid(id)) throw new ApiError(StatusCodes.BAD_REQUEST, 'Invalid Reservation ID');

  const updatedReservation = await Reservation.findOneAndUpdate(
    { _id: id },
    { cancelByCustomer: true },
    { new: true }
  );

  if (!updatedReservation) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Failed to update reservation');
  } else {
    const data = {
      text: "A customer has requested to cancel your reservation",
      receiver: updatedReservation.barber,
      referenceId: id,
      screen: "RESERVATION"
    }
    sendNotifications(data);
  }

  return updatedReservation;
}


const confirmReservationFromDB = async (id: string): Promise<IReservation | null> => {

  if (!mongoose.Types.ObjectId.isValid(id)) throw new ApiError(StatusCodes.BAD_REQUEST, 'Invalid Reservation ID');

  const updatedReservation: any = await Reservation.findOneAndUpdate(
    { _id: id },
    { status: "Completed" },
    { new: true }
  );


  //check bank account
  const isExistAccount = await User.findOne({})
  if (!isExistAccount) {
    throw new ApiError(StatusCodes.BAD_REQUEST, "Sorry, Salon didn't provide bank information. Please tell the salon owner to create a bank account");
  }

  if (updatedReservation) {
    const data = {
      text: "A customer has confirm your reservation",
      receiver: updatedReservation.barber,
      referenceId: id,
      screen: "RESERVATION"
    }
    sendNotifications(data);
  }

  return updatedReservation;
}


export const ReservationService = {
  createReservationToDB,
  barberReservationFromDB,
  customerReservationFromDB,
  reservationSummerForBarberFromDB,
  reservationDetailsFromDB,
  respondedReservationFromDB,
  cancelReservationFromDB,
  confirmReservationFromDB,
  getAvailableSlots,
  updateReservationStatus
}