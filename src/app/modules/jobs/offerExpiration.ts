import cron from "node-cron";
import { Offer } from "../offer/offer.model";
import { Service } from "../service/service.model";

export function startInAppCron() {
    // Run every minute
    cron.schedule("* * * * *", async () => {
        try {
            console.log("[CRON] Starting offer expiration check at:", new Date().toISOString());

            const now = new Date();

            // Find and update expired offers
            const expiredOffers = await Offer.find({
                isActive: true,
                endTime: { $lt: now }
            });

            console.log(`[CRON] Found ${expiredOffers.length} expired offers`);

            if (expiredOffers.length === 0) {
                console.log("[CRON] No expired offers found");
                return;
            }

            // Group offers by service for batch processing
            const serviceOfferMap = new Map<string, any[]>();

            expiredOffers.forEach(offer => {
                const serviceId = offer.service.toString();
                if (!serviceOfferMap.has(serviceId)) {
                    serviceOfferMap.set(serviceId, []);
                }
                serviceOfferMap.get(serviceId)!.push(offer);
            });

            // Update expired offers
            const offerIds = expiredOffers.map(o => o._id);
            await Offer.updateMany(
                { _id: { $in: offerIds } },
                { $set: { isActive: false } }
            );

            console.log(`[CRON] Marked ${offerIds.length} offers as inactive`);

            // Update each affected service
            for (const [serviceId, offers] of serviceOfferMap.entries()) {
                try {
                    // Check if there are any other active offers for this service
                    const remainingActiveOffers = await Offer.countDocuments({
                        service: serviceId,
                        isActive: true,
                        startTime: { $lte: now },
                        endTime: { $gte: now }
                    });

                    if (remainingActiveOffers === 0) {
                        // No active offers left - mark service as not offered
                        await Service.findByIdAndUpdate(serviceId, {
                            $set: { isOffered: false }
                        });
                        console.log(`[CRON] ✓ Service ${serviceId}: No active offers, marked isOffered=false`);
                    } else {
                        // Still has active offers - keep isOffered=true
                        console.log(`[CRON] ✓ Service ${serviceId}: Still has ${remainingActiveOffers} active offers`);
                    }
                } catch (error) {
                    console.error(`[CRON] ✗ Error updating service ${serviceId}:`, error);
                }
            }

            console.log("[CRON] Offer expiration check completed\n");
        } catch (error) {
            console.error("[CRON] ✗ Fatal error in cron job:", error);
        }
    });

    console.log("[CRON] Scheduler started - checking for expired offers every minute");
}


// import cron from "node-cron";
// import { Offer } from "../offer/offer.model";
// import { Service } from "../service/service.model";

// export function startInAppCron() {
//     cron.schedule("* * * * *", async () => {
//         console.log("[cron] Checking for expired offers...");
//         const now = new Date();

//         console.log("[cron] Current time:", now.toISOString());

//         // Find expired offers
//         const expiredOffers = await Offer.find({
//             isActive: true,
//             endTime: { $lte: now }
//         }).populate("service");

//         console.log(`[cron] Found ${expiredOffers.length} expired offers`);

//         for (const offer of expiredOffers) {
//             try {
//                 console.log(`[cron] Processing offer ${offer._id}`);

//                 // Update offer to inactive
//                 offer.isActive = false;
//                 await offer.save();
//                 console.log(`[cron] ✓ Offer ${offer._id} marked as inactive`);

//                 // Check if service has any OTHER active offers
//                 if (offer.service) {
//                     const serviceId = offer.service._id || offer.service;

//                     // Count other active offers for this service
//                     const otherActiveOffers = await Offer.countDocuments({
//                         service: serviceId,
//                         isActive: true,
//                         _id: { $ne: offer._id } // Exclude current offer
//                     });

//                     console.log(`[cron] Service ${serviceId} has ${otherActiveOffers} other active offers`);

//                     // Only deactivate service offer if no other active offers exist
//                     if (otherActiveOffers === 0) {
//                         const result = await Service.findByIdAndUpdate(
//                             serviceId,
//                             {
//                                 $set: {
//                                     isOffered: false,
//                                     parcent: 0
//                                 }
//                             },
//                             { new: true }
//                         );

//                         console.log(`[cron] ✓ Service ${serviceId} offer deactivated:`, {
//                             isOffered: result?.isOffered,
//                             // parcent: result?.parcent
//                         });
//                     } else {
//                         // Find the highest percent from remaining active offers
//                         const highestOffer = await Offer.findOne({
//                             service: serviceId,
//                             isActive: true
//                         }).sort({ percent: -1 });

//                         if (highestOffer) {
//                             await Service.findByIdAndUpdate(
//                                 serviceId,
//                                 {
//                                     $set: {
//                                         parcent: highestOffer.percent
//                                     }
//                                 }
//                             );
//                             console.log(`[cron] ✓ Service ${serviceId} parcent updated to ${highestOffer.percent}%`);
//                         }
//                     }
//                 }
//             } catch (error) {
//                 console.error(`[cron] ✗ Error processing offer ${offer._id}:`, error);
//             }
//         }

//         console.log("[cron] Expired offers check completed\n");
//     });
// }