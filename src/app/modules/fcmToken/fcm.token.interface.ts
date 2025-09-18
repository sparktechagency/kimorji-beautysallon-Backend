import mongoose from "mongoose";

export interface IDeviceToken extends Document {
  userId: mongoose.Types.ObjectId;
  fcmToken: string;
  deviceType: string;
  deviceId: string;
  createdAt: Date;
  updatedAt: Date;
}