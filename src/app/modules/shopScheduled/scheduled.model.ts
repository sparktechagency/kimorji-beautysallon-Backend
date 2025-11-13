
import mongoose, { Schema, Document } from 'mongoose';

const DayScheduleSchema = new Schema({
    day: { type: String, required: false },
    time: { type: String, required: false },
    isClosed: { type: Boolean, default: false },
});

const ServiceTimeSchema = new Schema({
    time: { type: String, required: false },
    discount: { type: String, required: false },
});

const ShopScheduleSchema = new Schema({
    dailySchedule: [DayScheduleSchema],
    serviceTimeSchedule: [ServiceTimeSchema],
});

const ShopSchedule = mongoose.model('ShopSchedule', ShopScheduleSchema);

export default ShopSchedule;
