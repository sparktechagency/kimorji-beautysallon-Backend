import cron from "node-cron";
import { Offer } from "../offer/offer.model";
import { Service } from "../service/service.model";

export function startInAppCron() {
    cron.schedule("* * * * *", async () => {
        console.log("[cron] Checking for expired offers...");
        const now = new Date();

        const expiredOffers = await Offer.find({ isActive: true, endTime: { $lte: now.toISOString() } })
            .populate("service");
        console.log(expiredOffers);
        for (const offer of expiredOffers) {
            offer.isActive = false;
            await offer.save();

            if (offer.service) {
                await Service.findByIdAndUpdate(offer.service._id, { isOffered: false });

            }
        }
    })

}
