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
import { redis } from "../redis/client";
import { logger } from "../../../shared/logger";

// const getBarberProfileFromDB = async (user: JwtPayload, id: string, query: Record<string, any>): Promise<{}> => {
//     const { coordinates } = query;
//     const cacheKey = `services:${coordinates}}`

//     try {
//         const cached = await redis.get(cacheKey)
//         if (cached) {
//             logger.info(`Cache hit for key ${cacheKey}`)
//             return JSON.parse(cached)
//         }
//     } catch (e) {
//         logger.warn(`Redis get failed: ${e}`)
//     }
//     if (!coordinates) {
//         throw new ApiError(StatusCodes.BAD_REQUEST, "Please Provide coordinates");
//     }

//     if (!mongoose.Types.ObjectId.isValid(id)) {
//         throw new ApiError(StatusCodes.BAD_REQUEST, "Invalid Barber ID");
//     }

//     const [barber, portfolios, reviews, rating, services]: any = await Promise.all([

//         User.findById(id).select("name email profile about address contact location gender sallonType  dateOfBirth").lean(),
//         Portfolio.find({ barber: id }).select("image"),
//         Review.find({ barber: id })
//             .populate({ path: "customer", select: "name" })
//             .populate({
//                 path: "service",
//                 select: "title price category duration image",
//                 populate: {
//                     path: "title",
//                     select: "title"
//                 }
//             })
//             .select("barber comment createdAt rating service"),
//         Review.aggregate([
//             {
//                 $match: { barber: id }
//             },
//             {
//                 $group: {
//                     _id: null,
//                     totalRatingCount: { $sum: 1 },
//                     totalRating: { $sum: "$rating" }
//                 }
//             },
//             {
//                 $project: {
//                     _id: 0,
//                     totalRatingCount: 1,
//                     averageRating: { $divide: ["$totalRating", "$totalRatingCount"] }
//                 }
//             },
//             {
//                 $lookup: {
//                     from: "services",
//                     localField: "service",
//                     foreignField: "_id",
//                     as: "service"
//                 }
//             },
//         ]),
//         Service.find({ barber: id }).populate("title", "title").select("title duration category price image")

//     ]);

//     if (!barber) {
//         throw new Error("Barber not found");
//     }

//     const distance = await getDistanceFromCoordinates(barber?.location?.coordinates, JSON?.parse(coordinates));
//     const isBookmarked = await Bookmark.findOne({ customer: user?.id, barber: id });

//     const result = {
//         ...barber,
//         distance: distance ? distance : {},
//         rating: {
//             totalRatingCount: rating[0]?.totalRatingCount || 0,
//             averageRating: rating[0]?.averageRating || 0
//         },
//         isBookmarked: !!isBookmarked,
//         satisfiedClients: rating[0]?.totalRatingCount || 0,
//         portfolios,
//         reviews: reviews.map((review: any) => ({
//             ...review.toObject(),
//             serviceName: review.service?.title?.title || 'Unknown Service',
//             image: review.service?.image || 'N/A',
//             price: review.service?.price || 'N/A',
//             duration: review.service?.duration || 'N/A',
//             // cacheKey: result

//         })),
//     }

//     return result;
// };
async function checkRedisConnection() {
    if (!redis.isOpen) {
        try {
            await redis.connect(); // Connect to Redis if not already connected
            console.log('[Redis] Connected successfully');
        } catch (error) {
            console.error('[Redis] Failed to connect:', error
            );
            throw new Error('[Redis] Failed to connect');
        }
    }
}

const getBarberProfileFromDB = async (user: JwtPayload, id: string, query: Record<string, any>): Promise<{}> => {
    const { coordinates } = query;
    const cacheKey = `barberProfile:${id}:${coordinates}`;

    try {
        await checkRedisConnection();

        const cached = await redis.get(cacheKey);
        if (cached) {
            logger.info(`Cache hit for key ${cacheKey}`);
            return JSON.parse(cached);
        }
    } catch (e) {
        logger.warn(`Redis get failed: ${e}`);
    }

    if (!coordinates) {
        throw new ApiError(StatusCodes.BAD_REQUEST, "Please Provide coordinates");
    }

    if (!mongoose.Types.ObjectId.isValid(id)) {
        throw new ApiError(StatusCodes.BAD_REQUEST, "Invalid Barber ID");
    }

    const [barber, portfolios, reviews, rating, services]: any = await Promise.all([
        User.findById(id).select("name email profile about address contact location gender sallonType dateOfBirth").lean(),

        Portfolio.find({ barber: id }).select("image"),

        Review.find({ barber: id })
            .populate({ path: "customer", select: "name" })
            .populate({
                path: "service",
                select: "title price category duration image",
                populate: {
                    path: "title",
                    select: "title"
                }
            })
            .select("barber comment createdAt rating service"),

        Review.aggregate([
            { $match: { barber: id } },
            { $group: { _id: null, totalRatingCount: { $sum: 1 }, totalRating: { $sum: "$rating" } } },
            { $project: { _id: 0, totalRatingCount: 1, averageRating: { $divide: ["$totalRating", "$totalRatingCount"] } } }
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
        reviews: reviews.map((review: any) => ({
            ...review.toObject(),
            serviceName: review.service?.title?.title || 'Unknown Service',
            image: review.service?.image || 'N/A',
            price: review.service?.price || 'N/A',
            duration: review.service?.duration || 'N/A'
        }))
    };

    // Cache the result in Redis with an expiration time (e.g., 10 minutes)
    try {
        await redis.setEx(cacheKey, 600, JSON.stringify(result)); // Set TTL to 600 seconds (10 minutes)
    } catch (e) {
        logger.warn(`Redis set failed: ${e}`);
    }

    return result;
};

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

const makeDiscountToDB = async (user: JwtPayload, shopDiscount: number): Promise<IUser> => {

    const updateDoc: any = User.findOneAndUpdate({ _id: user.id }, { shopDiscount: shopDiscount }, { new: true });
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

const barberDetailsFromDB2 = async (user: JwtPayload): Promise<{}> => {

    const [barber, portfolios, reviews, rating]: any = await Promise.all([
        User.findById(user?.id).select("name email profile accountInformation about address contact gender dateOfBirth").lean(),
        Portfolio.find({ barber: user?.id }).select("image"),
        Review.find({ barber: user?.id }).populate({ path: "customer", select: "name" }).select("barber comment createdAt rating "),
        Review.aggregate([
            {
                $match: {
                    barber: user?.id,
                    service: {
                        $exists: true
                    }
                }
            },


            {
                $group: {
                    _id: null,
                    totalRatingCount: { $sum: 1 },
                    totalRating: { $sum: "$rating" }
                }
            },
            {
                $project: {
                    _id: 0,
                    totalRatingCount: 1,
                    averageRating: { $divide: ["$totalRating", "$totalRatingCount"] }
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

const barberDetailsFromDB = async (barberId: string, customerId?: string): Promise<{}> => {
    console.log("Service - Customer ID:", customerId, "Barber ID:", barberId); // Debug

    const [barber, portfolios, reviews, rating, bookmark]: any = await Promise.all([
        User.findById(barberId)
            .select("name email profile accountInformation about address contact gender dateOfBirth")
            .lean(),
        Portfolio.find({ barber: barberId }).select("image"),
        Review.find({ barber: barberId })
            .populate({
                path: "customer",
                select: "name profile"
            })
            .populate({
                path: "service",
                select: "title",
                populate: {
                    path: "title",
                    model: "SubCategory",
                    select: "title"
                }
            })
            .select("barber comment createdAt rating service customer")
            .lean(),
        Review.aggregate([
            {
                $match: { barber: new mongoose.Types.ObjectId(barberId) }
            },
            {
                $group: {
                    _id: null,
                    totalRatingCount: { $sum: 1 },
                    totalRating: { $sum: "$rating" }
                }
            },
            {
                $project: {
                    _id: 0,
                    totalRatingCount: 1,
                    averageRating: { $divide: ["$totalRating", "$totalRatingCount"] }
                }
            }
        ]),
        customerId ? Bookmark.findOne({
            customer: new mongoose.Types.ObjectId(customerId),
            barber: new mongoose.Types.ObjectId(barberId)
        }) : null
    ]);

    console.log("Bookmark result:", bookmark); // Debug
    console.log("First review with service:", JSON.stringify(reviews[0], null, 2)); // Debug

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
        reviews: reviews.map((review: any) => ({
            _id: review._id,
            customer: review.customer,
            barber: review.barber,
            comment: review.comment,
            rating: review.rating,
            createdAt: review.createdAt,
            service: review.service?._id,
            serviceName: review.service?.title?.title || 'Unknown Service'
        })),
        isBookmarked: !!bookmark
    }

    return result;
}


const getUserCategoryWithServicesFromDB = async (userId: string, serviceTypeFilter: string = ''): Promise<{}> => {
    console.log("🔍 User ID:", userId);


    const servicesQuery = Service.find({ barber: userId, status: "Active" })
        .populate({
            path: "title",
            select: "title category",
            populate: {
                path: "category",
                select: "name image"
            }
        })
        .select("title price duration description image gender rating totalRating isOffered transportFee serviceType")
        .lean();

    if (serviceTypeFilter) {
        servicesQuery.where({ serviceType: serviceTypeFilter });
    }

    const services = await servicesQuery;

    console.log(`🛠️ Found ${services.length} services for this user`);

    if (services.length === 0) {
        console.log("⚠️ No services found for this user.");

        return {
            // user: {
            //     _id: user._id,
            //     name: user.name,
            //     email: user.email,
            //     profile: user.profile
            // },
            category: {
                totalSubcategories: 0,
                totalServices: 0,
                subcategories: []
            }
        };
    }

    // Group services by subcategory
    const subcategoriesMap = new Map();

    services.forEach((service: any) => {
        if (!service.title) {
            console.log("⚠️ Service without title:", service._id);
            return;
        }

        const subcategoryId = service.title._id.toString();
        const subcategoryTitle = service.title.title;
        const category = service.title.category;

        if (!subcategoriesMap.has(subcategoryId)) {
            subcategoriesMap.set(subcategoryId, {
                _id: subcategoryId,
                title: subcategoryTitle,
                categoryInfo: {
                    _id: category?._id,
                    name: category?.name || 'Unknown Category',
                    image: category?.image || 'No Image'
                },
                servicesCount: 0,
                services: []
            });
        }

        const subcategory = subcategoriesMap.get(subcategoryId);
        subcategory.servicesCount++;
        subcategory.services.push({
            _id: service._id,
            serviceName: subcategoryTitle,
            price: service.price,
            duration: service.duration,
            description: service.description,
            image: service.image,
            gender: service.gender,
            rating: service.rating,
            totalRating: service.totalRating,
            isOffered: service.isOffered,
            transportFee: service.transportFee,
            serviceType: service.serviceType
        });
    });

    const subcategoriesArray = Array.from(subcategoriesMap.values());

    console.log(`✅ Organized into ${subcategoriesArray.length} subcategories`);

    // Return result
    const result = {
        // user: {
        //     _id: user._id,
        //     name: user.name,
        //     email: user.email,
        //     profile: user.profile
        // },
        category: {
            totalSubcategories: subcategoriesArray.length,
            totalServices: services.length,
            subcategories: subcategoriesArray
        }
    };

    return result;
};


/**
 * Using aggregation for better performance
 */
const getUserCategoryWithServicesUsingAggregation = async (
    userId: string,
    categoryId: string
): Promise<{}> => {
    // Validate inputs
    const [user, category] = await Promise.all([
        User.findById(userId).select("name email profile").lean(),
        Category.findById(categoryId).select("name image").lean()
    ]);

    if (!user) {
        throw new Error("User not found");
    }

    if (!category) {
        throw new Error("Category not found");
    }

    console.log("🔍 Running aggregation for user:", userId, "category:", categoryId);

    // Aggregation: Get services grouped by subcategory
    const result = await Service.aggregate([
        // Match services for this user and category
        {
            $match: {
                barber: new mongoose.Types.ObjectId(userId),
                category: new mongoose.Types.ObjectId(categoryId),
                status: "Active"
            }
        },
        // Lookup subcategory details
        {
            $lookup: {
                from: "subcategories",
                localField: "title",
                foreignField: "_id",
                as: "subcategoryInfo"
            }
        },
        // Unwind subcategory
        {
            $unwind: {
                path: "$subcategoryInfo",
                preserveNullAndEmptyArrays: false
            }
        },
        // Group by subcategory
        {
            $group: {
                _id: "$subcategoryInfo._id",
                title: { $first: "$subcategoryInfo.title" },
                services: {
                    $push: {
                        _id: "$_id",
                        serviceName: "$subcategoryInfo.title",
                        price: "$price",
                        duration: "$duration",
                        description: "$description",
                        image: "$image",
                        gender: "$gender",
                        rating: "$rating",
                        totalRating: "$totalRating",
                        isOffered: "$isOffered",
                        transportFee: "$transportFee",
                        serviceType: "$serviceType"
                    }
                }
            }
        },
        // Add services count
        {
            $addFields: {
                servicesCount: { $size: "$services" }
            }
        },
        // Sort by title
        {
            $sort: { title: 1 }
        }
    ]);

    console.log(`✅ Aggregation found ${result.length} subcategories`);

    const totalServices = result.reduce((sum, sub) => sum + sub.servicesCount, 0);

    return {
        user: {
            _id: user._id,
            name: user.name,
            email: user.email,
            profile: user.profile
        },
        category: {
            _id: category._id,
            name: category.name,
            image: category.image,
            totalSubcategories: result.length,
            totalServices: totalServices,
            subcategories: result
        }
    };
};


export const BarberService = {
    getBarberProfileFromDB,
    getCustomerProfileFromDB,
    makeDiscountToDB,
    specialOfferBarberFromDB,
    recommendedBarberFromDB,
    getBarberListFromDB,
    barberDetailsFromDB,
    barberDetailsFromDB2,
    getUserCategoryWithServicesFromDB,
    getUserCategoryWithServicesUsingAggregation
}