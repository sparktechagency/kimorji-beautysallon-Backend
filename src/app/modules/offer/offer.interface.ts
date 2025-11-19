import { Types, Document } from "mongoose";

export interface IOffer extends Document {
  service: Types.ObjectId;
  title?: string;
  percent: number;
  days: string[];
  timeSlots?: string[];
  startTime: Date;
  endTime: Date;
  isActive: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}


// import { model, Schema, Types, Document } from "mongoose";

// export interface IOffer extends Document {
//   service: Types.ObjectId;
//   title?: string;
//   percent: number;
//   days: string[];
//   // Schedule: Types.ObjectId[];
//   startTime: Date;
//   endTime: Date;
//   isActive: boolean;
//   createdAt?: Date;
//   updatedAt?: Date;
// }