import { Request, Response } from 'express';
import catchAsync from '../../../shared/catchAsync';
import sendResponse from '../../../shared/sendResponse';
import { PortfolioService } from './portfolio.service';
import { logger } from '../../../shared/logger';
import ApiError from '../../../errors/ApiError';
import httpStatus from 'http-status-codes';
const createPortfolio = catchAsync(async (req: Request, res: Response) => {
    //add barber id from token
    const barber = req.user?.id;
    logger.info(`Barber ID from token: ${barber}`);

    if (!barber) {
        logger.error('Barber ID missing in token');
        throw new ApiError(
            httpStatus.UNAUTHORIZED,
            'Authentication required: Barber ID not found in token'
        );
    }

    const result = await PortfolioService.createPortfolioToDB(req.body,);

    sendResponse(res, {
        statusCode: 200,
        success: true,
        message: 'Portfolio Created Successfully',
        data: result
    });
});

const deletePortfolio = catchAsync(async (req: Request, res: Response) => {

    const result = await PortfolioService.deletePortfolioToDB(req.params.id);

    sendResponse(res, {
        statusCode: 200,
        success: true,
        message: 'Portfolio Deleted Successfully',
        data: result,
    });
});

const getPortfolio = catchAsync(async (req: Request, res: Response) => {
    const result = await PortfolioService.portfolioFromDB();

    sendResponse(res, {
        statusCode: 200,
        success: true,
        message: 'Portfolio retrieved Successfully',
        data: result,
    });
});

export const PortfolioController = {
    createPortfolio,
    deletePortfolio,
    getPortfolio
};  