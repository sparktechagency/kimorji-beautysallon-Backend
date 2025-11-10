import cron from "node-cron";
import { Offer } from "../offer/offer.model";
import { Service } from "../service/service.model";

export function startInAppCron() {
    cron.schedule("* * * * *", async () => {
        console.log("[cron] Checking for expired offers...");
        const now = new Date();

        console.log("[cron] Current time:", now.toISOString());

        // Find expired offers
        const expiredOffers = await Offer.find({
            isActive: true,
            endTime: { $lte: now }
        }).populate("service");

        console.log(`[cron] Found ${expiredOffers.length} expired offers`);

        for (const offer of expiredOffers) {
            try {
                console.log(`[cron] Processing offer ${offer._id}`);

                // Update offer to inactive
                offer.isActive = false;
                await offer.save();
                console.log(`[cron] ✓ Offer ${offer._id} marked as inactive`);

                // Check if service has any OTHER active offers
                if (offer.service) {
                    const serviceId = offer.service._id || offer.service;

                    // Count other active offers for this service
                    const otherActiveOffers = await Offer.countDocuments({
                        service: serviceId,
                        isActive: true,
                        _id: { $ne: offer._id } // Exclude current offer
                    });

                    console.log(`[cron] Service ${serviceId} has ${otherActiveOffers} other active offers`);

                    // Only deactivate service offer if no other active offers exist
                    if (otherActiveOffers === 0) {
                        const result = await Service.findByIdAndUpdate(
                            serviceId,
                            {
                                $set: {
                                    isOffered: false,
                                    parcent: 0
                                }
                            },
                            { new: true }
                        );

                        console.log(`[cron] ✓ Service ${serviceId} offer deactivated:`, {
                            isOffered: result?.isOffered,
                            parcent: result?.parcent
                        });
                    } else {
                        // Find the highest percent from remaining active offers
                        const highestOffer = await Offer.findOne({
                            service: serviceId,
                            isActive: true
                        }).sort({ percent: -1 });

                        if (highestOffer) {
                            await Service.findByIdAndUpdate(
                                serviceId,
                                {
                                    $set: {
                                        parcent: highestOffer.percent
                                    }
                                }
                            );
                            console.log(`[cron] ✓ Service ${serviceId} parcent updated to ${highestOffer.percent}%`);
                        }
                    }
                }
            } catch (error) {
                console.error(`[cron] ✗ Error processing offer ${offer._id}:`, error);
            }
        }

        console.log("[cron] Expired offers check completed\n");
    });
}