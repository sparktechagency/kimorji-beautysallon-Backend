import { model, Schema } from "mongoose";
import { IOffer } from "./offer.interface";
import { Day } from "../../../enums/day";

const offerSchema = new Schema<IOffer>(
  {
    service: { type: Schema.Types.ObjectId, ref: "Service", required: true },
    title: { type: String },
    percent: { type: Number, required: true, min: 0, max: 100 },
    days: [{ type: String,
       enum: Object.values(Day),
        required: true }],
    startTime: { type: String, required: true },
    endTime: { type: String, required: true },   
    isActive: { type: Boolean, default: true }
  },
  { timestamps: true }
);

export const Offer = model<IOffer>("Offer", offerSchema);