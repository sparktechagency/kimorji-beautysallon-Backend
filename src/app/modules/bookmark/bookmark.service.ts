import { StatusCodes } from "http-status-codes";
import ApiError from "../../../errors/ApiError";
import { IBookmark } from "./bookmark.interface";
import { Bookmark } from "./bookmark.model";
import { JwtPayload } from "jsonwebtoken";
import mongoose from "mongoose";
import getDistanceFromCoordinates from "../../../shared/getDistanceFromCoordinates";
import { Review } from "../review/review.model";
import getBarberCategory from "../../../shared/getCategoryForBarber";
import getRatingForBarber from "../../../shared/getRatingForBarber";

const toggleBookmark = async (payload: { customer: string, barber: string }): Promise<string> => {

    if (!mongoose.Types.ObjectId.isValid(payload.barber)) {
        throw new ApiError(StatusCodes.NOT_ACCEPTABLE, "Invalid Barber ID")
    }

    // Check if the bookmark already exists
    const existingBookmark = await Bookmark.findOne(payload);

    if (existingBookmark) {
        // If the bookmark exists, delete it
        await Bookmark.findByIdAndDelete(existingBookmark._id);
        return "Bookmark Remove successfully";
    } else {

        // If the bookmark doesn't exist, create it
        const result = await Bookmark.create(payload);
        if (!result) {
            throw new ApiError(StatusCodes.EXPECTATION_FAILED, "Failed to add bookmark");
        }
        return "Bookmark Added successfully";
    }
};


const getBookmark = async (user: JwtPayload, query: Record<string, any>): Promise<IBookmark[]> => {

    const { coordinates } = query;

    if (!coordinates) {
        throw new ApiError(StatusCodes.BAD_REQUEST, "Please Provide coordinates")
    }

    const barbers = await Bookmark.find({ customer: user?.id })
        .populate([
            {
                path: "barber",
                select: "name location discount profile"
            },
        ])
        .select("barber")
        .lean();

    const barbersWithDistance = await Promise.all(barbers.map(async (barber: any) => {
        const distance = await getDistanceFromCoordinates(barber?.barber?.location?.coordinates, JSON?.parse(coordinates));
        const rating = await getRatingForBarber(barber?.barber?._id);
        const service = await getBarberCategory(barber?.barber?._id);

        return {
            ...barber,
            services: service || [],
            rating: rating,
            distance: distance ? distance : {},
            isBookmarked: true
        };
    }));

    return barbersWithDistance;
}

export const BookmarkService = { toggleBookmark, getBookmark }