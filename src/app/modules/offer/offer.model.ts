import { model, Schema } from "mongoose";
import { IOffer } from "./offer.interface";
import { Day } from "../../../enums/day";
import { Service } from "../service/service.model";

const offerSchema = new Schema<IOffer>(
  {
    service: { type: Schema.Types.ObjectId, ref: "Service", required: true },
    title: { type: String },
    percent: { type: Number, required: true, min: 0, max: 100 },
    days: [{
      type: String,
      enum: Object.values(Day),
      required: true
    }],
    startTime: { type: Date, required: true },
    endTime: { type: Date, required: true },

    isActive: { type: Boolean, default: true }
  },
  { timestamps: true }
);

offerSchema.post("save", async function (offer) {
  if (offer.isActive) {
    await Service.findByIdAndUpdate(offer.service, { isOffered: true, parcent: offer.percent });
  }
});


export const Offer = model<IOffer>("Offer", offerSchema);