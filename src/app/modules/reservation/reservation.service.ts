import { JwtPayload } from "jsonwebtoken";
import { IReservation } from "./reservation.interface";
import { Reservation } from "./reservation.model";
import { StatusCodes } from "http-status-codes";
import ApiError from "../../../errors/ApiError";
import { Report } from "../report/report.model";
import mongoose from "mongoose";
import { sendNotifications } from "../../../helpers/notificationsHelper";
import getDistanceFromCoordinates from "../../../shared/getDistanceFromCoordinates";
import getRatingForBarber from "../../../shared/getRatingForBarber";
import { Review } from "../review/review.model";
import { User } from "../user/user.model";
import { Service } from "../service/service.model";
import { string } from "zod";
import { IBookedSlot } from "../service/service.interface";
import { AvailableSlotResponse, generateTimeSlots, isSlotBooked } from "../../../helpers/timeslot.helper";


// const createReservationToDB = async (payload: IReservation): Promise<IReservation> => {
//     const reservation = await Reservation.create(payload);
//     if (!reservation) {
//         throw new Error('Failed to created Reservation ');
//     } else {
//         const data = {
//             text: "You receive a new reservation request",
//             receiver: payload.barber,
//             referenceId: reservation._id,
//             screen: "RESERVATION"
//         }

//         sendNotifications(data);
//     }

//     return reservation;
// };

const createReservationToDB = async (payload: IReservation): Promise<IReservation> => {
  const service = await Service.findById(payload.service);
  if (!service) throw new Error("Service not found");

  // Check if the chosen slot is already booked
  const isSlotBooked = service.bookedSlots.some(
    (slot) =>
      slot.date === payload.reservationDate &&
      slot.timeSlot === payload.timeSlot
  );

  if (isSlotBooked) {
    throw new Error("This time slot is already booked for the selected date");
  }

  // Create the reservation
  const reservation = await Reservation.create(payload);
  if (!reservation) throw new Error("Failed to create reservation");

  // Add the booked slot to the service
  await Service.findByIdAndUpdate(payload.service, {
    $push: {
      bookedSlots: {
        date: payload.reservationDate,
        timeSlot: payload.timeSlot,
        reservationId: reservation._id
      }
    }
  });

  // Send notification
  const data = {
    text: "You receive a new reservation request",
    receiver: payload.barber,
    referenceId: reservation._id,
    screen: "RESERVATION"
  };
  sendNotifications(data);

  return reservation;
};


const updateReservationStatus = async (
  reservationId: string,
  status: "Completed" | "Canceled"
): Promise<IReservation | null> => {
  if (!mongoose.Types.ObjectId.isValid(reservationId)) {
    throw new ApiError(StatusCodes.BAD_REQUEST, "Invalid reservationId");
  }

  const reservation = await Reservation.findById(reservationId);
  if (!reservation) {
    throw new ApiError(StatusCodes.NOT_FOUND, "Reservation not found");
  }

  // Update reservation status
  reservation.status = status;
  await reservation.save();

  // If completed or canceled, remove the booked slot from service
  if (status === "Completed" || status === "Canceled") {
    await Service.findByIdAndUpdate(reservation.service, {
      $pull: { bookedSlots: { reservationId: reservation._id } }
    });
  }

  return reservation;
};




const getAvailableSlots = async (serviceId: string, date: string): Promise<AvailableSlotResponse> => {
  const service = await Service.findById(serviceId);
  if (!service) {
    throw new Error("Service not found");
  }

  // Get the day of week from date (e.g., "Monday", "Tuesday")
  const dayOfWeek = new Date(date).toLocaleDateString("en-US", { weekday: "long" });
  const dayOfWeekUpper = dayOfWeek.toUpperCase(); // match enum

  // Find daily schedule for this day
  const dailySchedule = service.dailySchedule.find(
    (schedule) => schedule.day === dayOfWeekUpper || schedule.day === dayOfWeek
  );

  if (!dailySchedule) {
    throw new Error(`No schedule available for ${dayOfWeek}`);
  }

  // Determine start and end times from dailySchedule
  // If your schema uses timeSlot[], derive start/end from first and last slot
// Determine start and end times safely
let scheduleStart = "00:00";
let scheduleEnd = "23:59";

if (dailySchedule.timeSlot && dailySchedule.timeSlot.length > 0) {
  const validSlots = dailySchedule.timeSlot.filter((t) => typeof t === "string" && t.trim() !== "");
  if (validSlots.length === 0) {
    throw new Error(`No valid time slots for ${dayOfWeek}`);
  }
  scheduleStart = validSlots[0];
  scheduleEnd = validSlots[validSlots.length - 1];
} else if ((dailySchedule as any).start && (dailySchedule as any).end) {
  scheduleStart = (dailySchedule as any).start;
  scheduleEnd = (dailySchedule as any).end;
} else {
  throw new Error(`No valid start/end or timeSlot for ${dayOfWeek}`);
}


  // Get booked slots for this date
  const bookedSlots = service.bookedSlots.filter((slot) => slot.date === date);

  // Generate all possible time slots
  const allSlots = generateTimeSlots(scheduleStart, scheduleEnd, service.duration);

  // Mark slots as booked
  const slotsWithStatus = allSlots.map((slot) => {
    const bookingInfo = isSlotBooked(slot, bookedSlots);
    return {
      start: slot.start,
      end: slot.end,
      isBooked: bookingInfo.booked,
      reservationId: bookingInfo.reservationId
    };
  });

  return {
    date,
    dayOfWeek,
    scheduleStart,
    scheduleEnd,
    serviceDuration: service.duration,
    slots: slotsWithStatus
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
        .select("customer service createdAt status tips travelFee appCharge paymentStatus cancelByCustomer price")
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
        const report = await Report.findOne({reservation: reservation?._id});

        const rating = await Review.findOne({ customer: reservation?.customer?._id,  service: reservation?.service?._id }).select("rating").lean();
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

    const reservations:any = await Reservation.find(condition)
        .populate([
            {
                path: 'barber',
                select: "name location profile discount"
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
        .select("barber service createdAt status travelFee appCharge tips price paymentStatus cancelByCustomer")
        .skip(skip)
        .limit(size)
        .lean();

        const reservationsWithDistance = await Promise.all(reservations.map(async (reservation: any) => {
            // const distance = await getDistanceFromCoordinates(reservation?.barber?.location?.coordinates, JSON?.parse(coordinates));
            const rating = await getRatingForBarber(reservation?.barber?._id);
            const review = await Review.findOne({ service : reservation?.service?._id, customer: user.id }).select("rating").lean();
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

    const updatedReservation:any = await Reservation.findOneAndUpdate(
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