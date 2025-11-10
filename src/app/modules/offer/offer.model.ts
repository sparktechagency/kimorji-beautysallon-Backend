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
offerSchema.post("save", async function (offer) {
  if (offer.isActive) {
    // When activating an offer, set service to offered
    await Service.findByIdAndUpdate(offer.service, {
      isOffered: true,
      parcent: offer.percent
    });
  } else {
    // When deactivating an offer, check if there are other active offers
    const otherActiveOffers = await Offer.countDocuments({
      service: offer.service,
      isActive: true,
      _id: { $ne: offer._id }
    });

    if (otherActiveOffers === 0) {
      // No other active offers, deactivate service offer
      await Service.findByIdAndUpdate(offer.service, {
        isOffered: false,
        parcent: 0
      });
    } else {
      // Update to highest percent from remaining offers
      const highestOffer = await Offer.findOne({
        service: offer.service,
        isActive: true
      }).sort({ percent: -1 });

      if (highestOffer) {
        await Service.findByIdAndUpdate(offer.service, {
          parcent: highestOffer.percent
        });
      }
    }
  }
});


export const Offer = model<IOffer>("Offer", offerSchema);