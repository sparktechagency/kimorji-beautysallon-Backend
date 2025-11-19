import { Model, Types } from 'mongoose';

export type ISubscription = {
    customerId: string;
    price: number;
    barber: Types.ObjectId;
    package: Types.ObjectId;
    trxId: string;
    subscriptionId: string;
    status: 'expired' | 'active' | 'cancel';
    currentPeriodStart: string;
    currentPeriodEnd: string;
};

export type SubscriptionModel = Model<ISubscription, Record<string, unknown>>;