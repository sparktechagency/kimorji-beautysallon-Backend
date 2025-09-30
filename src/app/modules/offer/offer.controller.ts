import e, { Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import catchAsync from '../../../shared/catchAsync';
import sendResponse from '../../../shared/sendResponse';
import { offerService,} from './offer.service';

const addOffer = catchAsync(async (req: Request, res: Response) => {
  const serviceId = req.params.id;
  const payload = req.body; 
  const result = await offerService.addOfferToDB(serviceId, payload);

  sendResponse(res, {
    statusCode: StatusCodes.CREATED,
    success: true,
    message: "Offer added to service",
    data: result
  });
});

//get all offers
const getAllOffers = catchAsync(async (req: Request, res: Response) => {
  const result = await offerService.getAllOffers();
    sendResponse(res, {
        statusCode: StatusCodes.OK,
        success: true,
        message: 'Offers retrieved successfully',
        data: result
    });
});

const findOfferForServiceAt = catchAsync(async (req: Request, res: Response) => {
  const { serviceId, date } = req.params;
  const result = await offerService.findOfferForServiceAt(serviceId, new Date(date));
    sendResponse(res, {
        statusCode: StatusCodes.OK,
        success: true,
        message: 'service offer retrieved successfully',
        data: result
    });
}
);

export const offerController = {
addOffer,
getAllOffers,
findOfferForServiceAt
};