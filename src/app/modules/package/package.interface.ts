import { Model } from "mongoose";


export type IPackage = {
    title: String;
    description: String;
    price: Number;
    duration: 'month' | 'year';
    feature: [String];
    priceId: String;
    productId: String;
}

export type PackageModel = Model<IPackage, Record<string, unknown>>;