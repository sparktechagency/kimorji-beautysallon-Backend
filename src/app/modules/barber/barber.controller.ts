import { Request, Response } from "express";
import catchAsync from "../../../shared/catchAsync";
import { BarberService } from "./barber.service";
import sendResponse from "../../../shared/sendResponse";
import { StatusCodes } from "http-status-codes";
import { jwtHelper } from "../../../helpers/jwtHelper";
import { Secret } from "jsonwebtoken";
import config from "../../../config";

const getBarberProfile = catchAsync(async (req: Request, res: Response) => {
    const user = req.user; 
    const id = req.params.id;
    const query = req.query;
    const result = await BarberService.getBarberProfileFromDB(user, id, query);

    sendResponse(res, {
        statusCode: StatusCodes.OK,
        success: true,
        message: "Barber profile found",
        data: result
    });
});

const getCustomerProfile = catchAsync(async (req: Request, res: Response) => {
    const result = await BarberService.getCustomerProfileFromDB(req.params.id);

    sendResponse(res, {
        statusCode: StatusCodes.OK,
        success: true,
        message: "Customer profile found",
        data: result
    });
});

const makeDiscount = catchAsync(async (req: Request, res: Response) => {
    const result = await BarberService.makeDiscountToDB(req.user, req.body.shopDiscount);

    sendResponse(res, {
        statusCode: StatusCodes.OK,
        success: true,
        message: "Discount added successfully",
        data: result
    });
});

const specialOfferBarber = catchAsync(async (req: Request, res: Response) => {
    const token = req.body.token;
    let user: any;
    if (token) {
        user = jwtHelper.verifyToken(token as string, config.jwt.jwt_secret as Secret);
    }
    const result = await BarberService.specialOfferBarberFromDB(user, req.query);

    sendResponse(res, {
        statusCode: StatusCodes.OK,
        success: true,
        message: "Special Offer Barber data retrieved Successfully",
        data: result
    })
})

const recommendedBarber = catchAsync(async (req: Request, res: Response) => {
    const token = req.body.token;
    let user: any;
    if (token) {
        user = jwtHelper.verifyToken(token as string, config.jwt.jwt_secret as Secret);
    }
    const result = await BarberService.recommendedBarberFromDB(user, req.query);

    sendResponse(res, {
        statusCode: StatusCodes.OK,
        success: true,
        message: "Recommended Barber data retrieved Successfully",
        data: result
    })
});

const getBarberList = catchAsync(async (req: Request, res: Response) => {
    const token = req.body.token;
    let user: any;
    if (token) {
        user = jwtHelper.verifyToken(token as string, config.jwt.jwt_secret as Secret);
    }

    const result = await BarberService.getBarberListFromDB(user, req.query);

    sendResponse(res, {
        statusCode: StatusCodes.OK,
        success: true,
        message: "Recommended Barber data retrieved Successfully",
        data: result
    })
});

const barberDetails = catchAsync(async (req: Request, res: Response) => {
    const result = await BarberService.barberDetailsFromDB(req.params.id);

    sendResponse(res, {
        statusCode: StatusCodes.OK,
        success: true,
        message: "Recommended Barber data retrieved Successfully",
        data: result
    })
});

const getUserCategoryWithServices = catchAsync(async (req: Request, res: Response) => {
    const { userId } = req.params;

    const { serviceType } = req.query;

    const result = await BarberService.getUserCategoryWithServicesFromDB(
        userId,
        serviceType as string
    );

    sendResponse(res, {
        statusCode: StatusCodes.OK,
        success: true,
        message: "User category with services retrieved successfully",
        data: result
    });
});


const getUserCategoryWithServicesAggregated = catchAsync(async (req: Request, res: Response) => {
    const { userId, categoryId } = req.params;

    console.log("=== Get User Category with Services (Aggregated) ===");
    console.log("User ID:", userId);
    console.log("Category ID:", categoryId);

    const result = await BarberService.getUserCategoryWithServicesUsingAggregation(
        userId,
        categoryId
    );

    sendResponse(res, {
        statusCode: StatusCodes.OK,
        success: true,
        message: "User category with services retrieved successfully",
        data: result
    });
});

const barbaerownprofile = catchAsync(async (req: Request, res: Response) => {
    const result = await BarberService.barberDetailsFromDB2(req.user);
    sendResponse(res, {
        statusCode: StatusCodes.OK,
        success: true,
        message: "Barber profile found",
        data: result
    });
});


export const BarberController = {
    getBarberProfile,
    getCustomerProfile,
    makeDiscount,
    specialOfferBarber,
    recommendedBarber,
    getBarberList,
    barberDetails,
    getUserCategoryWithServicesAggregated,
    getUserCategoryWithServices,
    barbaerownprofile

}