import { StatusCodes } from "http-status-codes";
import catchAsync from "../../../shared/catchAsync";
import sendResponse from "../../../shared/sendResponse";
import { ServiceService } from "../service/service.service";
import { RecommendedService } from "./recommended.service";
import { Request, Response } from "express";


// const getRecommendedServices = catchAsync(async (req: Request, res: Response) => {
//     const { latitude, longitude, maxDistance = 10000, limit = 10 } = req.query;
//     const customerId = req.user?.id;

//     console.log("Customer ID:", customerId); // Debug

//     if (!latitude || !longitude) {
//         return sendResponse(res, {
//             statusCode: StatusCodes.BAD_REQUEST,
//             success: false,
//             message: "Latitude and longitude are required",
//             data: null,
//         });
//     }

//     const result = await RecommendedService.getRecommendedServices(
//         parseFloat(latitude as string),
//         parseFloat(longitude as string),
//         parseInt(maxDistance as string) || 10000,
//         parseInt(limit as string) || 10,
//         customerId
//     );

//     sendResponse(res, {
//         statusCode: StatusCodes.OK,
//         success: true,
//         message: "Recommended services retrieved successfully",
//         data: result,
//     });
// });


const getRecommendedServices = catchAsync(async (req: Request, res: Response) => {
    const {
        latitude,
        longitude,
        maxDistance = 10000,
        limit = 10,
        search,        // NEW: Keyword search
        minPrice,      // NEW: Minimum price filter
        maxPrice       // NEW: Maximum price filter
    } = req.query;

    const customerId = req.user?.id;
    console.log("Customer ID:", customerId);

    if (!latitude || !longitude) {
        return sendResponse(res, {
            statusCode: StatusCodes.BAD_REQUEST,
            success: false,
            message: "Latitude and longitude are required",
            data: null,
        });
    }

    // Validate price filters
    if (minPrice && isNaN(parseFloat(minPrice as string))) {
        return sendResponse(res, {
            statusCode: StatusCodes.BAD_REQUEST,
            success: false,
            message: "Invalid minPrice value",
            data: null,
        });
    }

    if (maxPrice && isNaN(parseFloat(maxPrice as string))) {
        return sendResponse(res, {
            statusCode: StatusCodes.BAD_REQUEST,
            success: false,
            message: "Invalid maxPrice value",
            data: null,
        });
    }

    const result = await RecommendedService.getRecommendedServices(
        parseFloat(latitude as string),
        parseFloat(longitude as string),
        parseInt(maxDistance as string) || 10000,
        parseInt(limit as string) || 10,
        customerId,
        search as string,                          // NEW: Pass search keyword
        minPrice ? parseFloat(minPrice as string) : undefined,  // NEW: Pass minPrice
        maxPrice ? parseFloat(maxPrice as string) : undefined   // NEW: Pass maxPrice
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

    console.log("Customer ID:", customerId);

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
        data: result,
    });
});


export const RecommendedController = {
    getRecommendedServices,
    getServicesByLocation,
};