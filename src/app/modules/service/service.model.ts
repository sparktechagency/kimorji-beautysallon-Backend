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
    title: { type: Schema.Types.ObjectId, ref: "SubCategory", required: true },
    category: { type: Schema.Types.ObjectId, ref: "Category", required: true },
    image: {
      type: String,
      default: "https://res.cloudinary.com/ddqovbzxy/image/upload/v1734498548/Barbar_Me_u4jj7s.png"
    },
    transportFee: { type: Number, required: false },
    dailySchedule: { type: [scheduleItemSchema], required: false },
    price: { type: Number, required: false },
    duration: { type: String, required: false },
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
    parcent: { type: Number, required: false },
    bookedSlots: { type: [bookedSlotSchema], default: [] },
    status: {
      type: String,
      enum: ["Active", "Inactive"],
      default: "Active"
    }
  },
  { timestamps: true }
);

serviceSchema.pre("findOneAndUpdate", async function (next) {
  const update = this.getUpdate() as any;

  if (update.isOffered === false || update.$set?.isOffered === false) {
    if (update.$set) {
      update.$set.parcent = 0;
    } else {
      update.parcent = 0;
    }
  }

  next();
});

export const Service = model<IService, ServiceModel>("Service", serviceSchema);


