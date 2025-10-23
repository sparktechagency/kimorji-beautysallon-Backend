import { model, Schema, Types, Document } from "mongoose";

export interface IOffer extends Document {
  service: Types.ObjectId;
  title?: string;
  percent: number;
  days: string[];
  startTime: string;
  endTime: string;
  isActive: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}