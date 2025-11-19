import { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import catchAsync from "../../../../shared/catchAsync";
import sendResponse from "../../../../shared/sendResponse";
import { BarberService } from "../../barber/barber.service";
import { dashboardBarberService } from "./barber.service";


const getBarberDashboard = catchAsync(async (req: Request, res: Response) => {
    const barberId = req.user?.userId || req.user?.id || req.user?._id;

    console.log("req.user:", req.user);

    if (!barberId) {
        return sendResponse(res, {
            statusCode: StatusCodes.UNAUTHORIZED,
            success: false,
            message: "Unauthorized access. User not authenticated.",
            data: null,
        });
    }

    const result = await dashboardBarberService.getBarberDashboard(barberId);

    sendResponse(res, {
        statusCode: StatusCodes.OK,
        success: true,
        message: "Barber dashboard retrieved successfully",
        data: result,
    });
});

export const BarberController = {
    getBarberDashboard,
};