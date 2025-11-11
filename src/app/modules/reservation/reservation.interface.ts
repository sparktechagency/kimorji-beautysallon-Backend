import { Day } from './../../../enums/day';
import { Model, Types } from "mongoose"
export type IReservation = {
  barber: Types.ObjectId;
  customer: Types.ObjectId;
  service: Types.ObjectId;
  reservationDate: string;
  timeSlot: string;
  Day: Day;
  status: "Upcoming" | "Accepted" | "Canceled" | "Completed";
  paymentStatus: "Pending" | "Paid" | "Refunded";
  price: number;
  tips: number;
  txid?: string;
  cancelByCustomer: boolean;
  isReported: boolean;
  sessionId?: string;
  transfer: boolean;
};

export type ReservationModel = Model<IReservation, Record<string, unknown>>;