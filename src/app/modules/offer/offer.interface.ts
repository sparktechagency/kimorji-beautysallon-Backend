import { model, Schema, Types, Document } from "mongoose";

export interface IOffer extends Document {
  service: Types.ObjectId;
  title?: string; // optional short label
  percent: number; // e.g. 10 for 10%
  days: string[]; // ["Monday","Tuesday",...]
  startTime: string; // "09:00" (24-hour HH:mm)
  endTime: string;   // "10:30" (24-hour HH:mm)
  isActive: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}