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

const createReservationToDB = async (payload: IReservation): Promise<IReservation> => {
    const reservation = await Reservation.create(payload);
    if (!reservation) {
        throw new Error('Failed to created Reservation ');
    } else {
        const data = {
            text: "You receive a new reservation request",
            receiver: payload.barber,
            referenceId: reservation._id,
            screen: "RESERVATION"
        }

        sendNotifications(data);
    }

    return reservation;
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
    const { page, limit, status, coordinates } = query;

    if (!coordinates) {
        throw new ApiError(StatusCodes.BAD_REQUEST, "Please Provide coordinates")
    }

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
            const distance = await getDistanceFromCoordinates(reservation?.barber?.location?.coordinates, JSON?.parse(coordinates));
            const rating = await getRatingForBarber(reservation?.barber?._id);
            const review = await Review.findOne({ service : reservation?.service?._id, customer: user.id }).select("rating").lean();
            return {
                ...reservation,
                rating: rating,
                review: review || {},
                distance: distance ? distance : {}
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
    confirmReservationFromDB
}