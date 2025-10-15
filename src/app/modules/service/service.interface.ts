import { Model, Types } from "mongoose";
import { ServiceType } from "../../../enums/serviceType";

export type IScheduleItem = {
  day: string;
  start: string; // "HH:mm"
  end: string; // "HH:mm"
};

export type IBookedSlot = {
  date: string; // "YYYY-MM-DD"
  start: string; // "HH:mm"
  end: string; // "HH:mm"
  reservationId: Types.ObjectId;
};

export type IService = {
  barber: Types.ObjectId;
  serviceType: ServiceType;
  title: Types.ObjectId;
  category: Types.ObjectId;
  image: String;
  transportFee: Number;
  dailySchedule: String[];
  price: number;
  duration: String;
  description: String;
  gender: "Male" | "Female" | "Children" | "Others";
  isOffered: Boolean;
  parcent: number;
  rating: Number;
  bookedSlots: IBookedSlot[]; // Updated type
  status: "Active" | "Inactive";
  totalRating: Number;
};

export type ServiceModel = Model<IService, Record<string, unknown>>;

// export type IService = {
//     barber: Types.ObjectId;
//     serviceType: ServiceType;
//     title: Types.ObjectId;
//     category: Types.ObjectId;
//     image: String;
//     transportFee: Number;
//     dailySchedule: String[];
//     price: number;
//     duration: String;
//     description: String;
//     gender: "Male" | "Female" | "Children" | "Others";
//     isOffered: Boolean;
//     parcent: number,
//     rating: Number;
//     // bookedSlots: Types.ObjectId
//     status: "Active" | "Inactive";
//     totalRating: Number;
// }
// export type ServiceModel = Model<IService, Record<string, unknown>>;