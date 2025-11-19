import e, { Request, Response } from "express";
import catchAsync from "../../../shared/catchAsync";
import { ReservationService } from "./reservation.service";
import sendResponse from "../../../shared/sendResponse";
import { StatusCodes } from "http-status-codes";
import ApiError from "../../../errors/ApiError";

const createReservation = catchAsync(async (req: Request, res: Response) => {
    const reservation = await ReservationService.createReservationToDB(req.body);
    sendResponse(res, {
        statusCode: StatusCodes.OK,
        success: true,
        message: "Reservation created successfully",
        data: reservation
    })
}); 

const barberReservation = catchAsync(async (req: Request, res: Response) => {
    const result = await ReservationService.barberReservationFromDB(req.user, req.query);
    sendResponse(res, {
        statusCode: StatusCodes.OK,
        success: true,
        message: "Reservation created successfully",
        data: result.data,
        pagination: result.meta
    })
}); 

const customerReservation = catchAsync(async (req: Request, res: Response) => {
    const reservation = await ReservationService.customerReservationFromDB(req.user, req.query);
    sendResponse(res, {
        statusCode: StatusCodes.OK,
        success: true,
        message: "Reservation created successfully",
        data: reservation
    })
}); 


const reservationSummerForBarber = catchAsync(async (req: Request, res: Response) => {
    const reservation = await ReservationService.reservationSummerForBarberFromDB(req.user);
    sendResponse(res, {
        statusCode: StatusCodes.OK,
        success: true,
        message: "Reservation created successfully",
        data: reservation
    })
}); 

const aviliableslot = catchAsync(async (req: Request, res: Response) => {
  const { serviceId, date } = req.query;

  if (!serviceId || !date) {
    throw new ApiError(StatusCodes.BAD_REQUEST, "serviceId and date are required");
  }

  const reservation = await ReservationService.getAvailableSlots(
    serviceId as string,
    date as string
  );

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "Available slots retrieved successfully",
    data: reservation,
  });
});


const reservationDetails = catchAsync(async (req: Request, res: Response) => {

    const reservation = await ReservationService.reservationDetailsFromDB(req.params.id);
    sendResponse(res, {
        statusCode: StatusCodes.OK,
        success: true,
        message: "Reservation Details retrieved successfully",
        data: reservation
    })
}); 

const respondedReservation = catchAsync(async (req: Request, res: Response) => {

    const reservation = await ReservationService.respondedReservationFromDB(req.params.id, req.query.status as string);
    sendResponse(res, {
        statusCode: StatusCodes.OK,
        success: true,
        message: "Reservation Updated  successfully",
        data: reservation
    })
}); 


const cancelReservation = catchAsync(async (req: Request, res: Response) => {

    const reservation = await ReservationService.cancelReservationFromDB(req.params.id);
    sendResponse(res, {
        statusCode: StatusCodes.OK,
        success: true,
        message: "Reservation Cancelled. You have been refunded within 24 hours",
        data: reservation
    })
}); 


const confirmReservation = catchAsync(async (req: Request, res: Response) => {

    const reservation = await ReservationService.confirmReservationFromDB(req.params.id);
    sendResponse(res, {
        statusCode: StatusCodes.OK,
        success: true,
        message: "Reservation Confirm",
        data: reservation
    })
}); 


const updateReservationStatus = catchAsync(async (req: Request, res: Response) => {
  const { reservationId, status } = req.query;
  
  if (!reservationId || !status) {
    throw new ApiError(StatusCodes.BAD_REQUEST, "reservationId and status are required");
  }
  
  // Validate allowed statuses
  const allowed = ["Completed", "Canceled", "Accepted"];
  if (!allowed.includes(String(status))) {
    throw new ApiError(StatusCodes.BAD_REQUEST, `status must be one of: ${allowed.join(", ")}`);
  }
  
  const reservation = await ReservationService.updateReservationStatus(
    reservationId as string,
    status as "Completed" | "Canceled" | "Accepted"
  );
  
  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: `Reservation status updated to ${status} successfully`,
    data: reservation,
  });
});


export const ReservationController = {
    createReservation,
    barberReservation,
    customerReservation,
    reservationSummerForBarber,
    reservationDetails,
    respondedReservation,
    cancelReservation,
    confirmReservation,
    aviliableslot,
    updateReservationStatus
}