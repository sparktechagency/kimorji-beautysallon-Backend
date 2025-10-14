import { Model, Types } from "mongoose";
import { ServiceType } from "../../../enums/serviceType";


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
    parcent: number,
    rating: Number;
    bookedSlots:
    status: "Active" | "Inactive";
    totalRating: Number;
}
export type ServiceModel = Model<IService, Record<string, unknown>>;