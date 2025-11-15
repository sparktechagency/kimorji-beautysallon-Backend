import { StatusCodes } from "http-status-codes";
import catchAsync from "../../../shared/catchAsync";
import sendResponse from "../../../shared/sendResponse";
import { ServiceService } from "../service/service.service";
import { RecommendedService } from "./recommended.service";
import { Request, Response } from "express";


const getRecommendedServices = catchAsync(async (req: Request, res: Response) => {
    const { latitude, longitude, maxDistance = 10000, limit = 10 } = req.query;
    const customerId = req.user?.id;

    console.log("Customer ID:", customerId); // Debug

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
        parseInt(maxDistance as string) || 10000,
        parseInt(limit as string) || 10,
        customerId
    );

    sendResponse(res, {
        statusCode: StatusCodes.OK,
        success: true,
        message: "Recommended services retrieved successfully",
        data: result,
    });
});

const getServicesByLocation = catchAsync(async (req: Request, res: Response) => {
    const { latitude, longitude, maxDistance = 10000, page = 1, limit = 20 } = req.query;
    const customerId = req.user?.id;

    console.log("Customer ID:", customerId); // Debug

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
        parseInt(maxDistance as string) || 10000,
        parseInt(page as string) || 1,
        parseInt(limit as string) || 20,
        customerId
    );

    sendResponse(res, {
        statusCode: StatusCodes.OK,
        success: true,
        message: "Location-based services retrieved successfully",
        data: {
            services: result.services,
            meta: {
                page: parseInt(page as string) || 1,
                limit: parseInt(limit as string) || 20,
                total: result.total,
            },
        },
    });
});


export const RecommendedController = {
    getRecommendedServices,
    getServicesByLocation,
};