

import { Request, Response } from "express";
import catchAsync from "../../../shared/catchAsync";
import sendResponse from "../../../shared/sendResponse";
import httpStatus from "http-status";
import { ShopScheduleService } from "./scheduled.service";

const createOrUpdateShopSchedule = catchAsync(
  async (req: Request, res: Response) => {
    const barberId = req.user?._id;
    const scheduleData = req.body;

    const result = await ShopScheduleService.createOrUpdateShopSchedule(
      barberId,
      scheduleData
    );

    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "Shop schedule updated successfully",
      data: result
    });
  }
);

const addTemporaryClosure = catchAsync(
  async (req: Request, res: Response) => {
    const barberId = req.user?._id;
    const { date, day, timeSlots, reason } = req.body;

    const result = await ShopScheduleService.addTemporaryClosure(
      barberId,
      date,
      day,
      timeSlots,
      reason
    );

    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: result.message,
      data: result.closure
    });
  }
);

const removeTemporaryClosure = catchAsync(
  async (req: Request, res: Response) => {
    const barberId = req.user?._id;
    const { date, timeSlots } = req.body;

    const result = await ShopScheduleService.removeTemporaryClosure(
      barberId,
      date,
      timeSlots
    );

    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: result.message,
      data: null
    });
  }
);
const getAvailableTimeSlotsForDate = catchAsync(
  async (req: Request, res: Response) => {
    const { barberId, serviceId, date, day } = req.query;

    const result = await ShopScheduleService.getAvailableTimeSlotsForDate(
      barberId as string,
      serviceId as string,
      date as string,
      day as string
    );

    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "Available time slots retrieved successfully",
      data: result
    });
  }
);

const getAvailableSlotsForService = catchAsync(
  async (req: Request, res: Response) => {
    const { serviceId } = req.params;
    const days = req.query.days ? parseInt(req.query.days as string) : 7;

    const result = await ShopScheduleService.getAvailableSlotsForService(
      serviceId,
      days
    );

    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "Available slots retrieved successfully",
      data: result
    });
  }
);

const cleanupOldClosures = catchAsync(
  async (req: Request, res: Response) => {
    const barberId = req.user?._id;

    const result = await ShopScheduleService.cleanupOldClosures(barberId);

    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: result.message,
      data: result
    });
  }
);

const getTemporaryClosures = catchAsync(
  async (req: Request, res: Response) => {
    const barberId = req.params.barberId || req.user?._id;
    const fromDate = req.query.fromDate as string;

    const result = await ShopScheduleService.getTemporaryClosures(
      barberId,
      fromDate
    );

    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "Temporary closures retrieved successfully",
      data: result.closures
    });
  }
);

const getShopSchedule = catchAsync(async (req: Request, res: Response) => {
  const barberId = req.params.barberId || req.user?._id;

  const result = await ShopScheduleService.getShopSchedule(barberId);

  if (!result) {
    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "No shop schedule found for this barber",
      data: result
    });
    return;
  }

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Shop schedule retrieved successfully",
    data: result
  });
});

export const ShopScheduleController = {
  createOrUpdateShopSchedule,
  addTemporaryClosure,
  removeTemporaryClosure,
  getAvailableTimeSlotsForDate,
  getAvailableSlotsForService,
  cleanupOldClosures,
  getTemporaryClosures,
  getShopSchedule
};

