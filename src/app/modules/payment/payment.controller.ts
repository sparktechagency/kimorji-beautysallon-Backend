import { Request, Response } from "express";
import catchAsync from "../../../shared/catchAsync";
import { PaymentService } from "./payment.service";
import sendResponse from "../../../shared/sendResponse";
import { StatusCodes } from "http-status-codes";


const createPaymentCheckoutToStripe = catchAsync(async(req: Request, res: Response)=>{
    const payload = req.body;
    const result = await PaymentService.createPaymentCheckoutToStripe(req.user, payload);
    sendResponse(res, {
        statusCode: StatusCodes.OK,
        success: true,
        message: "Payment Intent Created Successfully",
        data: result
    })
});

const createAccountToStripe = catchAsync(async(req: Request, res: Response)=>{
    const result = await PaymentService.createAccountToStripe(req.user);
    sendResponse(res, {
        statusCode: StatusCodes.OK,
        success: true,
        message: "Connected account created successfully",
        data: result
    })
});

const transferAndPayout = catchAsync(async(req: Request, res: Response)=>{

    const result = await PaymentService.transferAndPayoutToBarber(req.params.id);
    sendResponse(res, {
        statusCode: StatusCodes.OK,
        success: true,
        message: "Booking Has Completed",
        data: result
    })
});


export const PaymentController = {
    createPaymentCheckoutToStripe,
    createAccountToStripe,
    transferAndPayout
}