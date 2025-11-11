import { Service } from "../app/modules/service/service.model";

import { ObjectId } from 'mongoose';

export const resetSlotAndUpdateStatus = async (serviceId: ObjectId, reservationDate: string, timeSlot: string) => {
    // Find the service
    const service = await Service.findById(serviceId);
    if (!service) {
        throw new Error("Service not found");
    }

    // Find the booked slot and remove it
    const slotIndex = service.bookedSlots.findIndex(
        (slot) => slot.date === reservationDate && slot.timeSlot === timeSlot
    );

    if (slotIndex !== -1) {
        service.bookedSlots.splice(slotIndex, 1);

        await service.save();
    }

    console.log(`Slot for ${timeSlot} on ${reservationDate} has been reset.`);
};
