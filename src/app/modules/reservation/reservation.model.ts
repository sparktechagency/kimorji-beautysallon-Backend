import { Schema, model } from "mongoose";
import { IReservation, ReservationModel } from "./reservation.interface";
import { randomBytes } from "crypto";

const ReservationSchema = new Schema<IReservation, ReservationModel>(
    {
        barber: {
            type: Schema.Types.ObjectId,
            ref: "User",
            required: true
        },
        customer: {
            type: Schema.Types.ObjectId,
            ref: "User",
            required: true
        },
        service: {
            type: Schema.Types.ObjectId,
            ref: "Service",
            required: true
        },
        status: {
            type: String,
            enum: ["Upcoming", "Accepted", "Canceled", "Completed"],
            default: "Upcoming",
            required: true
        },
        paymentStatus: {
            type: String,
            enum: [ "Pending", "Paid", "Refunded"],
            default: "Pending"
        },
        price: {
            type: Number,
            required: true
        },
        tips: {
            type: Number,
            default: 0
        },
        travelFee: {
            type: Number,
            default: 0
        },
         appCharge: {
            type: Number,
            default: 0
        },
        txid: {
            type: String,
            unique: true
        },
        cancelByCustomer: {
            type: Boolean, 
            default: false
        },
        isReported: {
            type: Boolean,
            default: false
        },
        sessionId: {
            type: String,
            required: false
        },
        transfer: {
            type: Boolean,
            default: false
        }

    },
    { timestamps: true }
);


ReservationSchema.pre("save", async function (next) {
    const reservation = this;

    if (reservation.isNew && !reservation.txid) {
        const prefix = "tx_";
        const uniqueId = randomBytes(8).toString("hex");
        reservation.txid = `${prefix}${uniqueId}`;
    }

    next();
});

export const Reservation = model<IReservation, ReservationModel>("Reservation", ReservationSchema);