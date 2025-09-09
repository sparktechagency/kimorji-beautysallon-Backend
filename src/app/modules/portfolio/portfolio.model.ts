import { model, Schema } from "mongoose";
import { IPortfolio, PortfolioModel } from "./portfolio.interface"

const portfolioSchema = new Schema<IPortfolio, PortfolioModel>(
    {
        image: {
            type: String,
            required: true
        },
        barber: {
            type: Schema.Types.ObjectId,
            reg: "User",
            required: true
        }
    },
    { timestamps: true }
)
export const Portfolio = model<IPortfolio, PortfolioModel>("Portfolio", portfolioSchema);