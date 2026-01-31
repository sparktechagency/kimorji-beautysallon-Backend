import mongoose, { model, Schema } from "mongoose";
import { IBookedSlot, IScheduleItem, IService, ServiceModel } from "./service.interface";
import { ServiceType } from "../../../enums/serviceType";
import { Day } from "../../../enums/day";

const scheduleItemSchema = new Schema<IScheduleItem>(
  {
    day: {
      type: String,
      enum: Object.values(Day),
      required: true
    },
    timeSlot: [{ type: String, required: false }]
  },
  { _id: false }
);

const bookedSlotSchema = new Schema<IBookedSlot>(
  {
    date: { type: String, required: true },
    timeSlot: { type: String, required: true },
    Day: {
      type: String,
      enum: Object.values(Day),
      required: false
    }
  },
  { _id: false }
);

const serviceSchema = new Schema<IService, ServiceModel>(
  {
    serviceType: {
      type: String,
      enum: Object.values(ServiceType),
      required: false
    },
    title: { type: Schema.Types.ObjectId, ref: "SubCategory", required: false },
    category: { type: Schema.Types.ObjectId, ref: "Category", required: false },
    image: {
      type: String,
      default: "https://res.cloudinary.com/ddqovbzxy/image/upload/v1734498548/Barbar_Me_u4jj7s.png"
    },
    transportFee: { type: Number, required: false },
    dailySchedule: { type: [scheduleItemSchema], required: false },
    price: { type: Number, required: false },
    duration: { type: String, required: false },
    serviceName: { type: String, required: false },
    description: { type: String, required: false },
    gender: {
      type: String,
      enum: ["Male", "Female", "Children", "Others"],
      required: false
    },
    barber: { type: Schema.Types.ObjectId, ref: "User", required: true },
    rating: { type: Number, default: 0 },
    totalRating: { type: Number, default: 0 },
    isOffered: { type: Boolean, default: false },
    bookedSlots: { type: [bookedSlotSchema], default: [] },
    status: {
      type: String,
      enum: ["Active", "Inactive"],
      default: "Active"
    }
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

serviceSchema.pre("findOneAndUpdate", async function (next) {
  const update = this.getUpdate() as any;

  if (update.isOffered === false || update.$set?.isOffered === false) {
    if (update.$set) {
      delete update.$set.parcent;
    } else {
      delete update.parcent;
    }
  }

  next();
});

serviceSchema.methods.getActiveOffers = async function () {
  const Offer = mongoose.model('Offer');
  const now = new Date();
  const currentDay = now.toLocaleString('en-US', { weekday: 'long' }).toUpperCase();

  return await Offer.find({
    service: this._id,
    isActive: true,
    startTime: { $lte: now },
    endTime: { $gte: now },
    days: currentDay
  });
};

serviceSchema.methods.getDiscountForTimeSlot = async function (timeSlot: string, day?: string) {
  const Offer = mongoose.model('Offer');
  const now = new Date();
  const targetDay = day || now.toLocaleString('en-US', { weekday: 'long' }).toUpperCase();

  const offers = await Offer.find({
    service: this._id,
    isActive: true,
    startTime: { $lte: now },
    endTime: { $gte: now },
    days: targetDay
  });

  let maxDiscount = 0;

  for (const offer of offers) {
    if (!offer.timeSlots || offer.timeSlots.length === 0) {
      maxDiscount = Math.max(maxDiscount, offer.percent);
    } else if (offer.timeSlots.includes(timeSlot)) {
      maxDiscount = Math.max(maxDiscount, offer.percent);
    }
  }

  return maxDiscount;
};

export const Service = model<IService, ServiceModel>("Service", serviceSchema);
