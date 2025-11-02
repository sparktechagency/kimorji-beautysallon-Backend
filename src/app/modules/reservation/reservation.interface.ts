import { Model, Types } from "mongoose"
export type IReservation = {
  barber: Types.ObjectId;
  customer: Types.ObjectId;
  service: Types.ObjectId;
  reservationDate: string; // "YYYY-MM-DD"
  timeSlot: string; // "HH:mm" - single time slot
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