import { Schema, model } from "mongoose";
import { IReservation, ReservationModel } from "./reservation.interface";
import { randomBytes } from "crypto";
import { Day } from "../../../enums/day";
import { Service } from "../service/service.model";

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
    reservationDate: {
      type: String,
      required: true
    }, // "YYYY-MM-DD"
    timeSlot: {
      type: String,
      required: true
    }, // "HH:mm"
    Day: {
      type: String,
      enum: Day,
      required: false
    },
    status: {
      type: String,
      enum: ["Upcoming", "Accepted", "Canceled", "Completed"],
      default: "Upcoming",
      required: true
    },
    paymentStatus: {
      type: String,
      enum: ["Pending", "Paid", "Refunded"],
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
    },
    paymentIntentId: {
      type: String,
      required: false
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

ReservationSchema.pre("save", async function (next) {
  const reservation = this;

  // Check if the status is being updated to "Canceled" or "Completed"
  if (
    (reservation.isModified("status") && reservation.status === "Canceled") ||
    reservation.status === "Completed"
  ) {
    // Find the related Service and remove the booked slot
    const service = await Service.findById(reservation.service);

    if (service) {
      // Remove the booked slot from the bookedSlots array
      const index = service.bookedSlots.findIndex(
        (slot) =>
          slot.date === reservation.reservationDate &&
          slot.timeSlot === reservation.timeSlot
      );

      if (index !== -1) {
        // Remove the slot if found
        service.bookedSlots.splice(index, 1);
        await service.save();
        console.log(`Slot for ${reservation.timeSlot} on ${reservation.reservationDate} has been reset.`);
      }
    }
  }

  next();
});

export const Reservation = model<IReservation, ReservationModel>("Reservation", ReservationSchema);
