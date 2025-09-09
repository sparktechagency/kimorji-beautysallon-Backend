import { model, Schema } from "mongoose";
import { IService, ServiceModel } from "./service.interface";


const serviceSchema = new Schema<IService, ServiceModel>(
    {
        title: {
            type: Schema.Types.ObjectId,
            ref: "SubCategory",
            required: true,
            immutable: true
        },
        category: {
            type: Schema.Types.ObjectId,
            ref: "Category",
            required: true,
            immutable: true
        },
        image: {
            type: String,
            default: "https://res.cloudinary.com/ddqovbzxy/image/upload/v1734498548/Barbar_Me_u4jj7s.png"
        },
        price: {
            type: Number,
            required: false
        },
        duration: {
            type: String,
            required: false
        },
        description: {
            type: String,
            required: false
        },
        gender: {
            type: String,
            enum: ["Male", "Female", "Children", 'Others'],
            required: false
        },
        barber: {
            type: Schema.Types.ObjectId,
            ref: "User",
            required: true
        },
        rating: {
            type: Number,
            default: 0
        },
        totalRating: {
            type: Number,
            default: 0
        },
        isOffered: {
            type: Boolean,
            default: false
        },
        status: {
            type: String,
            enum: ["Active", "Inactive"],
            default: "Active"
        }
    },
    {
        timestamps: true
    }
)

export const Service = model<IService, ServiceModel>("Service", serviceSchema)