import { StatusCodes } from "http-status-codes";
import catchAsync from "../../../shared/catchAsync";
import sendResponse from "../../../shared/sendResponse";
import { ServiceService } from "../service/service.service";
import { RecommendedService } from "./recommended.service";
import { Request, Response } from "express";


const getRecommendedServices = catchAsync(async (req: Request, res: Response) => {
    const { latitude, longitude, maxDistance = 10000, limit = 10 } = req.query;

    if (!latitude || !longitude) {
        return sendResponse(res, {
            statusCode: StatusCodes.BAD_REQUEST,
            success: false,
            message: "Latitude and longitude are required",
            data: null,
        });
    }

    const result = await RecommendedService.getRecommendedServices(
        parseFloat(latitude as string),
        parseFloat(longitude as string),
        parseInt(maxDistance as string),
        parseInt(limit as string)
    );

    sendResponse(res, {
        statusCode: StatusCodes.OK,
        success: true,
        message: "Recommended services retrieved successfully",
        data: result,
    });
});

// Get all services based on location only
const getServicesByLocation = catchAsync(async (req: Request, res: Response) => {
    const { latitude, longitude, maxDistance = 10000, page = 1, limit = 20 } = req.query;

    if (!latitude || !longitude) {
        return sendResponse(res, {
            statusCode: StatusCodes.BAD_REQUEST,
            success: false,
            message: "Latitude and longitude are required",
            data: null,
        });
    }

    const result = await RecommendedService.getServicesByLocation(
        parseFloat(latitude as string),
        parseFloat(longitude as string),
        parseInt(maxDistance as string),
        parseInt(page as string),
        parseInt(limit as string)
    );

    sendResponse(res, {
        statusCode: StatusCodes.OK,
        success: true,
        message: "Location-based services retrieved successfully",
        data: {
            services: result.services,
            meta: {
                page: parseInt(page as string),
                limit: parseInt(limit as string),
                total: result.total,
            },
        },
    });
});

export const RecommendedController = {
    getRecommendedServices,
    getServicesByLocation,
};