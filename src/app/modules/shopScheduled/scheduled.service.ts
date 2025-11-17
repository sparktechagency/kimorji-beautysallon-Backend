import ShopSchedule from "./scheduled.model";
import { ShopSchedule as ShopScheduleInterface } from "./scheduled.interface";


const getShopSchedule = async (): Promise<ShopScheduleInterface | {}> => {
    try {
        const shopSchedule = await ShopSchedule.findOne().lean();
        if (!shopSchedule) {
            return [];
        }
        return shopSchedule as ShopScheduleInterface;
    }
    catch (error) {
        throw new Error('Error retrieving shop schedule');
    }
};
const createOrUpdateShopSchedule = async (schedule: ShopScheduleInterface): Promise<ShopScheduleInterface> => {
    try {

        let shopSchedule = await ShopSchedule.findOne();

        if (shopSchedule) {
            shopSchedule.set({
                dailySchedule: schedule.dailySchedule,
                serviceTimeSchedule: schedule.serviceTimeSchedule,
            });
            await shopSchedule.save();
        } else {
            shopSchedule = new ShopSchedule({
                dailySchedule: schedule.dailySchedule,
                serviceTimeSchedule: schedule.serviceTimeSchedule,
            });
            await shopSchedule.save();
        }

        return shopSchedule.toObject() as ShopScheduleInterface;
    } catch (error) {
        throw new Error('Error creating or updating shop schedule');
    }
};
//barber id to get shop schedule
const getShopScheduleByBarberId = async (barberId: string): Promise<ShopScheduleInterface | {}> => {
    try {
        const shopSchedule = await ShopSchedule.findOne().lean();
        if (!shopSchedule) {
            return [];
        }
        return shopSchedule as ShopScheduleInterface;
    }
    catch (error) {
        throw new Error('Error retrieving shop schedule');
    }
}


export const ShopScheduledService = {
    getShopSchedule,
    createOrUpdateShopSchedule,
    getShopScheduleByBarberId
};