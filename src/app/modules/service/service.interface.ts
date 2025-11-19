import { Day } from './../../../enums/day';
import { Model, Types } from "mongoose";
import { ServiceType } from "../../../enums/serviceType";
import { IUser } from "../user/user.interface";
export type IScheduleItem = {
  day: string;
  timeSlot: string[];
};

export type IBookedSlot = {
  date: string;
  timeSlot: string;
  Day: Day;
  reservationId: Types.ObjectId;
};
export type IService = {
  barber: Types.ObjectId | IUser;
  serviceType: ServiceType;
  title: Types.ObjectId;
  category: Types.ObjectId;
  image: string;
  transportFee: number;
  dailySchedule: IScheduleItem[];
  price: number;
  duration: string;
  description: string;
  gender: "Male" | "Female" | "Children" | "Others";
  isOffered: boolean;
  // parcent: number;
  rating: number;
  bookedSlots: IBookedSlot[];
  status: "Active" | "Inactive";
  totalRating: number;
  getActiveOffers(): Promise<any[]>;
  getDiscountForTimeSlot(timeSlot: string, day?: string): Promise<number>;
};

export type ServiceModel = Model<IService, Record<string, unknown>>;
