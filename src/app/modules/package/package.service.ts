import { StatusCodes } from "http-status-codes";
import ApiError from "../../../errors/ApiError";
import { IPackage } from "./package.interface";
import { Package } from "./package.model";
import mongoose from "mongoose";
import { createSubscriptionProduct } from "../../../helpers/createSubscriptionProductHelper";
import stripe from "../../../config/stripe";
import { updateSubscriptionProduct } from "../../../helpers/updateSubscriptionProduct";

const createPackageToDB = async(payload: IPackage): Promise<IPackage | null>=>{

    const productPayload = {
        title: payload.title,
        description: payload.description,
        duration: payload.duration,
        price: payload.price,
    }

    const product = await createSubscriptionProduct(productPayload)

    if(!product){
        throw new ApiError(StatusCodes.BAD_REQUEST, "Failed to create subscription product")
    }

    if(product){
        payload.priceId = product.priceId
        payload.productId = product.productId
    }

    const result = await Package.create(payload);
    if(!result){
        await stripe.products.del(product.productId);
        throw new ApiError(StatusCodes.BAD_REQUEST, "Failed to created Package")
    }

    return result;
}

const updatePackageToDB = async(id: string, payload: IPackage): Promise<IPackage | null>=>{

    if(!mongoose.Types.ObjectId.isValid(id)){
        throw new ApiError(StatusCodes.BAD_REQUEST, "Invalid ID")
    }

    const product:any = await Package.findById(id).select("productId");

    /* if(payload?.price || payload?.duration || payload.title){
        const {productId, priceId}:any =  await updateSubscriptionProduct(product?.productId, payload);
        payload.priceId = priceId;
        payload.productId = productId;
    } */

    const result = await Package.findByIdAndUpdate(
        {_id: id},
        payload,
        { new: true } 
    );

    if(!result){
        throw new ApiError(StatusCodes.BAD_REQUEST, "Failed to Update Package")
    }

    return result;
}


const getPackageFromDB = async(): Promise<IPackage[]>=>{
    const result = await Package.find();
    return result;
}

const getPackageDetailsFromDB = async(id: string): Promise<IPackage | null>=>{
    const result = await Package.findById(id);
    return result;
}

export const PackageService = {
    createPackageToDB,
    updatePackageToDB,
    getPackageFromDB,
    getPackageDetailsFromDB
}