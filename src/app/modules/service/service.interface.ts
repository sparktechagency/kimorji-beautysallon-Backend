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
    price: Number;
    duration: String;
    description: String;
    gender: "Male" | "Female" | "Children" | "Others";
    isOffered: Boolean;
    rating: Number;
    status: "Active" | "Inactive";
    totalRating: Number;
}

export type ServiceModel = Model<IService, Record<string, unknown>>;