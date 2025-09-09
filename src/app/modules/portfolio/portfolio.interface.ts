import { Model, Types } from 'mongoose';

export type IPortfolio = {
    image: string;
    barber: Types.ObjectId;
};
export type PortfolioModel = Model<IPortfolio>;