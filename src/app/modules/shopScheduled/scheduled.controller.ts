
import { Request, Response } from 'express';
import * as shopScheduleService from './scheduled.service';
import { ShopSchedule } from './scheduled.interface';
import catchAsync from '../../../shared/catchAsync';
import { ShopScheduledService } from './scheduled.service';
import sendResponse from '../../../shared/sendResponse';

const getShopSchedule = catchAsync(async (req: Request, res: Response) => {
    const result = await ShopScheduledService.getShopSchedule();

    sendResponse(res, {
        statusCode: 200,
        success: true,
        message: 'Shop Schedule retrieved Successfully',
        data: result,
    });
});

const createOrUpdateShopSchedule = async (req: Request, res: Response): Promise<void> => {
    try {
        const { dailySchedule, serviceTimeSchedule }: ShopSchedule = req.body;

        const schedule = { dailySchedule, serviceTimeSchedule };
        const updatedSchedule = await ShopScheduledService.createOrUpdateShopSchedule(schedule);

        res.status(200).json(updatedSchedule);
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
};

export const ShopScheduledController = {
    getShopSchedule,
    createOrUpdateShopSchedule
};