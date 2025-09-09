import { StatusCodes } from "http-status-codes";
import ApiError from "../../../errors/ApiError";
import { IService } from "./service.interface";
import { Service } from "./service.model";
import mongoose, { UpdateWriteOpResult } from "mongoose";
import { JwtPayload } from "jsonwebtoken";
import unlinkFile from "../../../shared/unlinkFile";
import { User } from "../user/user.model";

const createServiceToDB = async (payload: IService[]): Promise<IService[] | null> => {

    if (!payload || payload.length === 0) {
        throw new ApiError(StatusCodes.BAD_REQUEST, "No services provided");
    }

    // retrieved existing services based on the payload
    const existingServices = await Service.find({
        $or: payload.map(service => ({
            title: service.title,
            category: service.category,
            barber: service.barber
        }))
    });

    // Filter payload to exclude existing services
    const filteredPayload = payload.filter(service =>
        !existingServices.some(existing =>
            existing.title.toString() === service.title.toString() &&
            existing.category.toString() === service.category.toString() &&
            existing.barber.toString() === service.barber.toString()
        )
    );

    // Delete existing services
    if (existingServices.length > 0) {
        await Service.deleteMany({
            $or: existingServices?.map(service => ({
                title: service.title,
                category: service.category,
                barber: service.barber
            }))
        });
    }

    // Step 4: If no new services to insert, return an error
    if (filteredPayload.length === 0) {
        throw new ApiError(StatusCodes.BAD_REQUEST, "All provided services already exist");
    }

    // Insert the new services
    const insertedServices = await Service.insertMany(filteredPayload);
    if (!insertedServices || insertedServices.length === 0) {
        throw new ApiError(StatusCodes.BAD_REQUEST, "Failed to create services");
    }

    // Return the newly created services
    return insertedServices;
};


const updateServiceToDB = async (id: string, payload: IService): Promise<IService | null> => {

    if (!mongoose.Types.ObjectId.isValid(id)) {
        throw new ApiError(StatusCodes.BAD_REQUEST, "Invalid Service Object ID")
    }

    const isExistService = await Service.findById(id);
    if (isExistService?.image?.startsWith("/images")) {
        unlinkFile(isExistService.image as string);
    }

    const result = await Service.findByIdAndUpdate(
        { _id: id },
        payload,
        { new: true }
    );

    if (!result) {
        throw new ApiError(StatusCodes.BAD_REQUEST, "Failed to Update Service")
    }

    return result;
}


const getServiceForBarberFromDB = async (user: JwtPayload, category: string): Promise<IService[]> => {

    if (category && !mongoose.Types.ObjectId.isValid(category)) {
        throw new ApiError(StatusCodes.BAD_REQUEST, "Invalid Category ID")
    }

    const result = await Service.find({ barber: user.id, category: category })
        .populate("title", "title")
        .lean();
    return result;
}

// hold service
const holdServiceFromDB = async (user: JwtPayload, password: string): Promise<UpdateWriteOpResult> => {


    const isExistUser = await User.findById(user.id).select('+password');
    if (!isExistUser) {
        throw new ApiError(StatusCodes.BAD_REQUEST, "User doesn't exist!");
    }

    //check match password
    if (password && !(await User.isMatchPassword(password, isExistUser.password))) {
        throw new ApiError(StatusCodes.BAD_REQUEST, 'Password is incorrect');
    }

    const result = await Service.updateMany(
        { barber: user.id },
        { status: "Inactive" },
        { new: true }
    );

    return result;
}


export const ServiceService = {
    createServiceToDB,
    updateServiceToDB,
    getServiceForBarberFromDB,
    holdServiceFromDB
}