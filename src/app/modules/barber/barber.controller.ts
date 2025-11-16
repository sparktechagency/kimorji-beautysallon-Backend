import { Request, Response } from "express";
import catchAsync from "../../../shared/catchAsync";
import { BarberService } from "./barber.service";
import sendResponse from "../../../shared/sendResponse";
import { StatusCodes } from "http-status-codes";
import { jwtHelper } from "../../../helpers/jwtHelper";
import { Secret } from "jsonwebtoken";
import config from "../../../config";

const getBarberProfile = catchAsync(async (req: Request, res: Response) => {
    const barberId = req.params.id;
    const customerId = req.user?.id;
    console.log("=== Get Barber Profile ===");
    console.log("Customer ID:", customerId);
    console.log("Barber ID:", barberId);

    const result = await BarberService.barberDetailsFromDB(barberId, customerId);

    sendResponse(res, {
        statusCode: 200,
        success: true,
        message: "Barber profile found",
        data: result
    });
});

// const getBarberProfile = catchAsync(async (req: Request, res: Response) => {
//     const token = req.body.token;
//     let user: any;
//     if (token) {
//         user = jwtHelper.verifyToken(token as string, config.jwt.jwt_secret as Secret);
//     }
//     const result = await BarberService.getBarberProfileFromDB(user, req.params.id, req.query);

//     sendResponse(res, {
//         statusCode: StatusCodes.OK,
//         success: true,
//         message: "Barber profile found",
//         data: result
//     });
// });

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
    const result = await BarberService.barberDetailsFromDB2(req.user);

    sendResponse(res, {
        statusCode: StatusCodes.OK,
        success: true,
        message: "Recommended Barber data retrieved Successfully",
        data: result
    })
});


export const BarberController = {
    getBarberProfile,
    getCustomerProfile,
    makeDiscount,
    specialOfferBarber,
    recommendedBarber,
    getBarberList,
    barberDetails
}