import { Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import catchAsync from '../../../shared/catchAsync';
import sendResponse from '../../../shared/sendResponse';
import { AdminService } from './admin.service';

const createAdmin = catchAsync(async (req: Request, res: Response) => {
    const payload = req.body;
    const result = await AdminService.createAdminToDB(payload);

    sendResponse(res, {
        statusCode: StatusCodes.OK,
        success: true,
        message: 'Admin created Successfully',
        data: result
    });
});

const deleteAdmin = catchAsync(async (req: Request, res: Response) => {
    const payload = req.params.id;
    const result = await AdminService.deleteAdminFromDB(payload);

    sendResponse(res, {
        statusCode: StatusCodes.OK,
        success: true,
        message: 'Admin Deleted Successfully',
        data: result
    });

});

const getAdmin = catchAsync(async (req: Request, res: Response) => {

    const result = await AdminService.getAdminFromDB();
    sendResponse(res, {
        statusCode: StatusCodes.OK,
        success: true,
        message: 'Admin Retrieved Successfully',
        data: result
    });
});

const countSummary = catchAsync(async (req: Request, res: Response) => {
    const result = await AdminService.countSummaryFromDB();
    sendResponse(res, {
        statusCode: StatusCodes.OK,
        success: true,
        message: 'Count Summary Retrieved Successfully',
        data: result
    });
});

const userStatistics = catchAsync(async (req: Request, res: Response) => {
    const result = await AdminService.userStatisticsFromDB();
    sendResponse(res, {
        statusCode: StatusCodes.OK,
        success: true,
        message: 'User Statistics Retrieved Successfully',
        data: result
    });
});

const revenueStatistics = catchAsync(async (req: Request, res: Response) => {
    const result = await AdminService.revenueStatisticsFromDB();
    sendResponse(res, {
        statusCode: StatusCodes.OK,
        success: true,
        message: 'Revenue Statistics Retrieved Successfully',
        data: result
    });
});

const userList = catchAsync(async (req: Request, res: Response) => {
    const result = await AdminService.userListFromDB(req.query);
    sendResponse(res, {
        statusCode: StatusCodes.OK,
        success: true,
        message: 'User List Retrieved Successfully',
        data: result
    });
});

const reservationList = catchAsync(async (req: Request, res: Response) => {
    const result = await AdminService.reservationListFromDB(req.query);
    sendResponse(res, {
        statusCode: StatusCodes.OK,
        success: true,
        message: 'Reservation List Retrieved Successfully',
        data: result
    });
});

export const AdminController = {
    deleteAdmin,
    createAdmin,
    getAdmin,
    userStatistics,
    revenueStatistics,
    countSummary,
    userList,
    reservationList
};