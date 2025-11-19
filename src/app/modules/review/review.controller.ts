import { Request, Response } from "express";
import catchAsync from "../../../shared/catchAsync";
import { ReviewService } from "./review.service";
import sendResponse from "../../../shared/sendResponse";
import { StatusCodes } from "http-status-codes";


const createReview = catchAsync(async (req: Request, res: Response) => {
    const result = await ReviewService.createReviewToDB(req.body);

    sendResponse(res, {
        statusCode: StatusCodes.OK,
        success: true,
        message: "Review Created Successfully",
        data: result
    })
})

//get all reviews for a service
const getAllReviews = catchAsync(async (req: Request, res: Response) => {
    const result = await ReviewService.getAllReviewsFromDB(req.params.id);
    sendResponse(res, {
        statusCode: StatusCodes.OK,
        success: true,
        message: "Reviews retrieved successfully",
        data: result
    })
}
);
//get all review for a user
const getUserReviews = catchAsync(async (req: Request, res: Response) => {
    const userId = req.params.userId;
    const result = await ReviewService.getUserReviewsFromDB(userId);
    sendResponse(res, {
        statusCode: StatusCodes.OK,
        success: true,
        message: "User Reviews retrieved successfully",
        data: result
    })
}
);

export const ReviewController = {
    createReview,
    getAllReviews,
    getUserReviews
}