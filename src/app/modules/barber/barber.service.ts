import { JwtPayload } from "jsonwebtoken";
import { User } from "../user/user.model";
import { Portfolio } from "../portfolio/portfolio.model";
import { Review } from "../review/review.model";
import ApiError from "../../../errors/ApiError";
import { StatusCodes } from "http-status-codes";
import mongoose from "mongoose";
import { Reservation } from "../reservation/reservation.model";
import { Service } from "../service/service.model";
import getDistanceFromCoordinates from "../../../shared/getDistanceFromCoordinates";
import { IUser } from "../user/user.interface";
import getBarberCategory from "../../../shared/getCategoryForBarber";
import { Bookmark } from "../bookmark/bookmark.model";
import getRatingForBarber from "../../../shared/getRatingForBarber";
import { Category } from "../category/category.model";
import { SubCategory } from "../subCategory/subCategory.model";

const getBarberProfileFromDB = async (user: JwtPayload, id: string, query: Record<string, any>): Promise<{}> => {

    const { coordinates } = query;

    if (!coordinates) {
        throw new ApiError(StatusCodes.BAD_REQUEST, "Please Provide coordinates")
    }

    if (!mongoose.Types.ObjectId.isValid(id)) {
        throw new ApiError(StatusCodes.BAD_REQUEST, "Invalid Barber ID")
    }

    const [barber, portfolios, reviews, rating, services]: any = await Promise.all([
        User.findById(id).select("name email profile about address contact location gender dateOfBirth").lean(),
        Portfolio.find({ barber: id }).select("image"),
        Review.find({ barber: id }).populate({ path: "customer", select: "name" }).select("barber comment createdAt rating"),
        Review.aggregate([
            {
                $match: { barber: id }
            },
            {
                $group: {
                    _id: null,
                    totalRatingCount: { $sum: 1 }, // Count the total number of ratings
                    totalRating: { $sum: "$rating" } // Calculate the sum of all ratings
                }
            },
            {
                // Project the desired fields and calculate the average rating
                $project: {
                    _id: 0,
                    totalRatingCount: 1,
                    averageRating: { $divide: ["$totalRating", "$totalRatingCount"] } // Calculate average rating
                }
            }
        ]),
        Service.find({ barber: id }).populate("title", "title").select("title duration category price image")
    ]);

    if (!barber) {
        throw new Error("Barber not found");
    }

    const distance = await getDistanceFromCoordinates(barber?.location?.coordinates, JSON?.parse(coordinates));
    const isBookmarked = await Bookmark.findOne({ customer: user?.id, barber: id });

    const result = {
        ...barber,
        distance: distance ? distance : {},
        rating: {
            totalRatingCount: rating[0]?.totalRatingCount || 0,
            averageRating: rating[0]?.averageRating || 0
        },
        isBookmarked: !!isBookmarked,
        satisfiedClients: rating[0]?.totalRatingCount || 0,
        portfolios,
        reviews,
        services
    }

    return result;
}

const getCustomerProfileFromDB = async (customer: string): Promise<{}> => {

    if (!mongoose.Types.ObjectId.isValid(customer)) {
        throw new ApiError(StatusCodes.BAD_REQUEST, "Invalid Customer ID")
    }

    const [customerProfile, serviceCount, totalSpend] = await Promise.all([
        User.findById({ _id: customer }).lean(),
        Reservation.countDocuments({ customer: customer, status: "Completed", paymentStatus: "Paid" }),
        Reservation.aggregate([
            {
                $match: {
                    customer: customer,
                    status: "Completed",
                    paymentStatus: "Paid"
                }
            },
            {
                $group: {
                    _id: null,
                    totalSpend: { $sum: "$price" }
                }
            }
        ])
    ]);

    if (!customerProfile) {
        throw new Error("Customer not found");
    }

    const result = {
        ...customerProfile,
        serviceCount,
        totalSpend: totalSpend[0]?.totalSpend || 0
    }

    return result;
}


const makeDiscountToDB = async (user: JwtPayload, discount: number): Promise<IUser> => {

    const updateDoc: any = User.findOneAndUpdate({ _id: user.id }, { discount: discount }, { new: true });
    if (!updateDoc) {
        throw new ApiError(StatusCodes.BAD_REQUEST, "Failed to update discount");
    }

    return updateDoc;
}

const specialOfferBarberFromDB = async (user: JwtPayload, query: Record<string, any>): Promise<{}> => {

    const { category, coordinates, page, limit } = query;

    const anyConditions: Record<string, any>[] = [];

    anyConditions.push({
        role: "BARBER",
        discount: { $gt: 0 }
    })

    const pages = parseInt(page as string) || 1;
    const size = parseInt(limit as string) || 10;
    const skip = (pages - 1) * size;

    if (category && !mongoose.Types.ObjectId.isValid(category)) {
        throw new ApiError(StatusCodes.BAD_REQUEST, "Invalid Category ID")
    }

    if (!coordinates) {
        throw new ApiError(StatusCodes.BAD_REQUEST, "Please Provide coordinates")
    }



    if (category) {
        const userIDs = await Service.find({ category: category }).distinct("barber");

        anyConditions.push({
            $or: [
                { _id: { $in: userIDs } }
            ]
        })
    }




    const whereConditions = anyConditions.length > 0 ? { $and: anyConditions } : {};

    const result = await User.find(whereConditions)
        .select("name profile discount location")
        .skip(skip)
        .limit(size)
        .lean();

    if (!result) {
        throw new ApiError(StatusCodes.BAD_REQUEST, "Barber not found");
    }
    const count = await User.countDocuments(whereConditions);


    const barbers = await Promise.all(result.map(async (barber: any) => {

        const isFavorite = await Bookmark.findOne({ barber: barber._id, customer: user?.id });
        const distance = await getDistanceFromCoordinates(barber?.location?.coordinates, JSON?.parse(coordinates));
        const rating = await getRatingForBarber(barber?._id);
        const services = await getBarberCategory(barber?._id);
        return {
            ...barber,
            distance: distance ? distance : {},
            rating,
            services: services || [],
            isBookmarked: !!isFavorite
        };

    }));

    const data: any = {
        barbers,
        meta: {
            page: pages,
            total: count
        }
    }

    return data;
}

const recommendedBarberFromDB = async (user: JwtPayload, query: Record<string, any>): Promise<{}> => {

    const { category, coordinates, page, limit } = query;
    if (!coordinates) {
        throw new ApiError(StatusCodes.BAD_REQUEST, "Please Provide coordinates")
    }


    const pages = parseInt(page as string) || 1;
    const size = parseInt(limit as string) || 10;
    const skip = (pages - 1) * size;

    const anyConditions: Record<string, any>[] = [];

    anyConditions.push({
        $or: [
            { _id: { $in: await Service.find({ rating: { $gte: 0 } }).distinct("barber") } }
        ]
    });

    if (category && !mongoose.Types.ObjectId.isValid(category)) {
        throw new ApiError(StatusCodes.BAD_REQUEST, "Invalid Category ID")
    }

    if (category) {
        const userIDs = await Service.find({ category: category }).distinct("barber");

        anyConditions.push({
            $or: [
                { _id: { $in: userIDs } }
            ]
        })
    }

    const whereConditions = anyConditions.length > 0 ? { $and: anyConditions } : {};

    const result = await User.find(whereConditions)
        .select("name profile discount location")
        .skip(skip)
        .limit(size)
        .lean();

    if (!result) {
        throw new ApiError(StatusCodes.BAD_REQUEST, "Barber not found");
    }
    const count = await User.countDocuments(whereConditions);



    const barbers = await Promise.all(result.map(async (barber: any) => {
        const isFavorite = await Bookmark.findOne({ barber: barber._id, customer: user?.id });
        const distance = await getDistanceFromCoordinates(barber?.location?.coordinates, JSON?.parse(coordinates));
        const rating = await getRatingForBarber(barber?._id);
        const services = await getBarberCategory(barber?._id);
        return {
            ...barber,
            distance: distance ? distance : {},
            rating,
            services: services || [],
            isBookmarked: !!isFavorite
        };

    }));

    const data: any = {
        barbers,
        meta: {
            page: pages,
            total: count
        }
    }

    return data;
}

const getBarberListFromDB = async (user: JwtPayload, query: Record<string, any>): Promise<{ barbers: [], meta: { page: 0, total: 0 } }> => {

    const { minPrice, maxPrice, page, limit, coordinates, search, ...othersQuery } = query;

    if (!coordinates) {
        throw new ApiError(StatusCodes.BAD_REQUEST, "Please Provide coordinates")
    }

    const anyConditions: Record<string, any>[] = [];

    anyConditions.push({
        role: "BARBER"
    })

    if (search) {
        const categoriesID = await Category.find({ name: { $regex: search, $options: "i" } }).distinct("_id");
        const subCategoriesID = await SubCategory.find({ title: { $regex: search, $options: "i" } }).distinct("_id");
        const usersID = await User.find({ name: { $regex: search, $options: "i" } }).distinct("_id");

        const barbersFromCategory = await Service.find({ category: { $in: categoriesID } }).distinct("barber");
        const barbersFromSubCategory = await Service.find({ title: { $in: subCategoriesID } }).distinct("barber");
        const barberIDs = [...usersID, ...barbersFromCategory, ...barbersFromSubCategory];

        if (barberIDs.length) {
            anyConditions.push({ _id: { $in: barberIDs } });
        }
    }


    if (minPrice && maxPrice) {
        anyConditions.push({
            $or: [
                {
                    _id: {
                        $in: await Service.find({
                            price: {
                                $gte: parseFloat(minPrice),
                                $lte: parseFloat(maxPrice)
                            }
                        }).distinct("barber")
                    }
                }
            ]
        });
    }

    // Additional filters for other fields
    if (Object.keys(othersQuery).length) {

        anyConditions.push({
            $or: [
                {
                    _id: {
                        $in: await Service.find({
                            $and: Object.entries(othersQuery).map(([field, value]) => ({
                                [field]: value
                            }))
                        }).distinct("barber")
                    }
                }
            ]
        })
    }

    const pages = parseInt(page as string) || 1;
    const size = parseInt(limit as string) || 10;
    const skip = (pages - 1) * size;

    const whereConditions = anyConditions.length > 0 ? { $and: anyConditions } : {};

    const barbers = await User.find(whereConditions)
        .select("name profile discount location")
        .lean()
        .skip(skip)
        .limit(size)

    if (!barbers.length) {
        return { barbers: [], meta: { page: 0, total: 0 } };
    }

    const count = await User.countDocuments(whereConditions);

    const result = await Promise.all(barbers.map(async (barber: any) => {

        const isFavorite = await Bookmark.findOne({ barber: barber._id, customer: user?.id });
        const distance = await getDistanceFromCoordinates(barber?.location?.coordinates, JSON?.parse(coordinates));
        const rating = await getRatingForBarber(barber?._id);
        const services = await getBarberCategory(barber?._id);

        return {
            ...barber,
            distance: distance ? distance : {},
            rating,
            services: services || [],
            isBookmarked: !!isFavorite
        };


    }));

    const data = {
        barbers: result,
        meta: {
            page: pages,
            total: count
        }
    } as { barbers: [], meta: { page: 0, total: 0 } }

    return data;
}


const barberDetailsFromDB = async (user: JwtPayload): Promise<{}> => {

    const [barber, portfolios, reviews, rating]: any = await Promise.all([
        User.findById(user?.id).select("name email profile accountInformation about address contact gender dateOfBirth").lean(),
        Portfolio.find({ barber: user?.id }).select("image"),
        Review.find({ barber: user?.id }).populate({ path: "customer", select: "name" }).select("barber comment createdAt rating"),
        Review.aggregate([
            {
                $match: { barber: user?.id }
            },
            {
                $group: {
                    _id: null,
                    totalRatingCount: { $sum: 1 }, // Count the total number of ratings
                    totalRating: { $sum: "$rating" } // Calculate the sum of all ratings
                }
            },
            {
                // Project the desired fields and calculate the average rating
                $project: {
                    _id: 0,
                    totalRatingCount: 1,
                    averageRating: { $divide: ["$totalRating", "$totalRatingCount"] } // Calculate average rating
                }
            }
        ])
    ]);

    if (!barber) {
        throw new Error("Barber not found");
    }

    const result = {
        ...barber,
        rating: {
            totalRatingCount: rating[0]?.totalRatingCount || 0,
            averageRating: rating[0]?.averageRating || 0
        },
        satisfiedClients: rating[0]?.totalRatingCount || 0,
        portfolios,
        reviews
    }

    return result;
}

export const BarberService = {
    getBarberProfileFromDB,
    getCustomerProfileFromDB,
    makeDiscountToDB,
    specialOfferBarberFromDB,
    recommendedBarberFromDB,
    getBarberListFromDB,
    barberDetailsFromDB
}