import { StatusCodes } from 'http-status-codes';
import ApiError from '../../../errors/ApiError';
import mongoose from 'mongoose';
import { IPortfolio } from './portfolio.interface';
import { Portfolio } from './portfolio.model';


const createPortfolioToDB = async (payload: IPortfolio): Promise<IPortfolio[]> => {
  const portfolios = await Portfolio.insertMany(payload);
  if (!portfolios) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Failed to created Faq');
  }
  return portfolios;
};

const portfolioFromDB = async (): Promise<IPortfolio[]> => {
  const faqs = await Portfolio.find({});
  return faqs;
};

const deletePortfolioToDB = async (id: string): Promise<IPortfolio | undefined> => {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Invalid Portfolio ID');
  }

  await Portfolio.findByIdAndDelete(id);
  return;
};

export const PortfolioService = {
  createPortfolioToDB,
  portfolioFromDB,
  deletePortfolioToDB,
};  