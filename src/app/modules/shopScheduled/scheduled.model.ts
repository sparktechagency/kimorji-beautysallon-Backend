
import mongoose, { Schema, Document } from 'mongoose';

export interface ITemporaryClosure {
    date: string; 
    day: string; 
    timeSlots: string[];
    reason?: string;
    createdAt: Date;
}

export interface IDaySchedule {
    day: string;
    time: string;
    isClosed: boolean;
}

export interface IServiceTime {
    time: string;
    discount?: string;
}

export interface IShopSchedule extends Document {
    barber: mongoose.Types.ObjectId;
    dailySchedule: IDaySchedule[];
    serviceTimeSchedule: IServiceTime[];
    temporaryClosures: ITemporaryClosure[]; 
    createdAt: Date;
    updatedAt: Date;
}

const TemporaryClosureSchema = new Schema({
    date: { type: String, required: true },
    day: { type: String, required: true },
    timeSlots: [{ type: String }],
    reason: { type: String, required: false },
    createdAt: { type: Date, default: Date.now }
});

const DayScheduleSchema = new Schema({
    day: { type: String, required: true },
    time: { type: String, required: false },
    isClosed: { type: Boolean, default: false },
});

const ServiceTimeSchema = new Schema({
    time: { type: String, required: false },
    discount: { type: String, required: false },
});

const ShopScheduleSchema = new Schema<IShopSchedule>(
    {
        barber: { 
            type: Schema.Types.ObjectId, 
            ref: 'User', 
            required: true,
            unique: true
        },
        dailySchedule: [DayScheduleSchema],
        serviceTimeSchedule: [ServiceTimeSchema],
        temporaryClosures: [TemporaryClosureSchema]
    },
    {
        timestamps: true,
    }
);

// Index for faster queries
ShopScheduleSchema.index({ barber: 1 });
ShopScheduleSchema.index({ 'temporaryClosures.date': 1 });

const ShopSchedule = mongoose.model<IShopSchedule>('ShopSchedule', ShopScheduleSchema);

export default ShopSchedule;
