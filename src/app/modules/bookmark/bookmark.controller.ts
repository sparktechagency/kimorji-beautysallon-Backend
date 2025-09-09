import { Request, Response } from "express";
import catchAsync from "../../../shared/catchAsync";
import sendResponse from "../../../shared/sendResponse";
import { BookmarkService } from "./bookmark.service";

const toggleBookmark = catchAsync(async(req: Request, res: Response)=>{
    const customer = req.user.id;
    const payload = req.body;
    const payloadData:any = { customer, ...payload }
    const result = await BookmarkService.toggleBookmark(payloadData);
    
    sendResponse(res, {
        statusCode: 200,
        success: true,
        message: result
    })
});

const getBookmark = catchAsync(async(req: Request, res: Response)=>{
    const user = req.user;
    const result = await BookmarkService.getBookmark(user, req.query);
    sendResponse(res, {
        statusCode: 200,
        success: true,
        message: "Bookmark Retrieved Successfully",
        data: result
    })
});


export const BookmarkController = {toggleBookmark, getBookmark}