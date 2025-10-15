import { Model, Types } from "mongoose"
export type IReservation = {
  timeSlot: string[] | undefined;
  barber: Types.ObjectId;
  customer: Types.ObjectId;
  service: Types.ObjectId;
  reservationDate: string; // "YYYY-MM-DD"
  startTime: string; // "HH:mm"
  endTime: string; // "HH:mm"
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
// export type IReservation = {
//     barber: Types.ObjectId;
//     customer: Types.ObjectId;
//     service: Types.ObjectId;
//     status: "Upcoming" | "Accepted" | "Canceled" | "Completed";
//     paymentStatus: "Pending" | "Paid" | "Refunded";
//     travelFee: number;
//     appCharge: number;
//     price: number;
//     txid: string;
//     cancelByCustomer: boolean;
//     isReported: boolean;
//     sessionId?: string;
//     tips?: number;
//     transfer?: boolean;
// }

export type ReservationModel = Model<IReservation, Record<string, unknown>>;