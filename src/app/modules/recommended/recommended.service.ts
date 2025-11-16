import { SubCategory } from './../subCategory/subCategory.model';
import { StatusCodes } from "http-status-codes";
import ApiError from "../../../errors/ApiError";
import { Service } from "../service/service.model";
import { User } from "../user/user.model";
import { Bookmark } from "../bookmark/bookmark.model";
import mongoose from "mongoose";


// const getRecommendedServices = async (
//     latitude: number,
//     longitude: number,
//     maxDistance: number = 10000,
//     limit: number = 10,
//     customerId?: string,
//     search?: string,
//     minPrice?: number,
//     maxPrice?: number
// ) => {
//     // Find nearby barbers
//     const nearbyBarbers = await User.aggregate([
//         {
//             $geoNear: {
//                 near: {
//                     type: "Point",
//                     coordinates: [longitude, latitude],
//                 },
//                 distanceField: "distance",
//                 maxDistance: maxDistance,
//                 spherical: true,
//                 query: {
//                     role: "BARBER",
//                     isDeleted: false,
//                     location: { $exists: true },
//                     "location.coordinates": { $exists: true, $ne: [] },
//                 },
//             },
//         },
//         {
//             $project: {
//                 _id: 1,
//                 name: 1,
//                 distance: 1,
//                 verified: 1,
//             },
//         },
//     ]);

//     if (nearbyBarbers.length === 0) {
//         return [];
//     }

//     const barberIds = nearbyBarbers.map((barber) => barber._id);

//     // Build query with search and price filters
//     const query: any = {
//         barber: { $in: barberIds },
//         status: "Active",
//     };

//     // NEW: Add price range filter
//     if (minPrice !== undefined || maxPrice !== undefined) {
//         query.price = {};
//         if (minPrice !== undefined) {
//             query.price.$gte = minPrice;
//         }
//         if (maxPrice !== undefined) {
//             query.price.$lte = maxPrice;
//         }
//     }

//     // NEW: Add search filter (searches in description and barber name)
//     if (search && search.trim() !== "") {
//         query.$or = [
//             { description: { $regex: search, $options: "i" } },
//             { serviceType: { $regex: search, $options: "i" } },
//         ];
//     }

//     const recommendedServices = await Service.find(query)
//         .select("-dailySchedule -bookedSlots")
//         .populate("barber", "name profile mobileNumber address location verified")
//         .populate("category", "name")
//         .populate("title", "name")
//         .sort({ rating: -1, totalRating: -1 })
//         .limit(limit)
//         .lean();

//     // Filter by barber name if search is provided (post-populate filter)
//     let filteredServices = recommendedServices;
//     if (search && search.trim() !== "") {
//         const searchLower = search.toLowerCase();
//         filteredServices = recommendedServices.filter((service: any) => {
//             const barberName = service.barber?.name?.toLowerCase() || "";
//             const categoryName = service.category?.name?.toLowerCase() || "";
//             const titleName = service.title?.name?.toLowerCase() || "";
//             const description = service.description?.toLowerCase() || "";
//             const serviceType = service.serviceType?.toLowerCase() || "";

//             return (
//                 barberName.includes(searchLower) ||
//                 categoryName.includes(searchLower) ||
//                 titleName.includes(searchLower) ||
//                 description.includes(searchLower) ||
//                 serviceType.includes(searchLower)
//             );
//         });
//     }

//     // Add bookmark status for each service
//     const servicesWithBookmarkStatus = await Promise.all(
//         filteredServices.map(async (service: any) => {
//             if (!customerId) {
//                 return { ...service, isBookmarked: false };
//             }
//             const isBookmarked = await Bookmark.exists({
//                 customer: new mongoose.Types.ObjectId(customerId),
//                 barber: service.barber._id,
//             });
//             return {
//                 ...service,
//                 isBookmarked: !!isBookmarked,
//             };
//         })
//     );

//     // Add distance information
//     const servicesWithDistance = servicesWithBookmarkStatus.map((service: any) => {
//         const barberInfo = nearbyBarbers.find(
//             (b) => b._id.toString() === service.barber._id.toString()
//         );
//         return {
//             ...service,
//             barberDistance: barberInfo ? Math.round(barberInfo.distance) : null,
//             distanceInKm: barberInfo ? (barberInfo.distance / 1000).toFixed(2) : null,
//         };
//     });

//     return servicesWithDistance;
// };

const getRecommendedServices = async (
    latitude: number,
    longitude: number,
    maxDistance: number = 10000,
    limit: number = 10,
    customerId?: string,
    search?: string,
    category?: string,
    SubCategory?: string,
    minPrice?: number,
    maxPrice?: number,
    bestForYou?: boolean
) => {
    const effectiveMaxDistance = bestForYou ? 500000 : maxDistance;
    const sortByRating = !bestForYou;

    // Find nearby barbers
    const nearbyBarbers = await User.aggregate([
        {
            $geoNear: {
                near: {
                    type: "Point",
                    coordinates: [longitude, latitude],
                },
                distanceField: "distance",
                maxDistance: effectiveMaxDistance,
                spherical: true,
                query: {
                    role: "BARBER",
                    isDeleted: false,
                    location: { $exists: true },
                    "location.coordinates": { $exists: true, $ne: [] },
                },
            },
        },
        {
            $project: {
                _id: 1,
                name: 1,
                distance: 1,
                verified: 1,
            },
        },
    ]);

    if (nearbyBarbers.length === 0) {
        return [];
    }

    const barberIds = nearbyBarbers.map((barber) => barber._id);

    const query: any = {
        barber: { $in: barberIds },
        status: "Active",
    };

    if (minPrice !== undefined || maxPrice !== undefined) {
        query.price = {};
        if (minPrice !== undefined) {
            query.price.$gte = minPrice;
        }
        if (maxPrice !== undefined) {
            query.price.$lte = maxPrice;
        }
    }

    if (search && search.trim() !== "") {
        query.$or = [
            { description: { $regex: search, $options: "i" } },
            { serviceType: { $regex: search, $options: "i" } },
        ];
    }

    let recommendedServices;

    if (bestForYou) {
        recommendedServices = await Service.find(query)
            .select("-dailySchedule -bookedSlots")
            .populate("barber", "name profile mobileNumber address location verified")
            .populate("category", "name")
            .populate("title", "name title")
            .sort({ createdAt: -1 })
            .lean();
    } else {
        recommendedServices = await Service.find(query)
            .select("-dailySchedule -bookedSlots")
            .populate("barber", "name profile mobileNumber address location verified")
            .populate("category", "name title")
            .populate("title", "name title")
            .sort({ rating: -1, totalRating: -1 })
            .limit(limit)
            .lean();
    }



    let filteredServices = recommendedServices;
    if (search && search.trim() !== "") {
        const searchLower = search.toLowerCase();
        filteredServices = recommendedServices.filter((service: any) => {
            const barberName = service.barber?.name?.toLowerCase() || "";
            // const categoryName = service.category?.name?.toLowerCase() || "";
            const titleName = service.title?.name?.toLowerCase() || "";
            const description = service.description?.toLowerCase() || "";
            const serviceType = service.serviceType?.toLowerCase() || "";

            return (
                barberName.includes(searchLower) ||
                // categoryName.includes(searchLower) ||
                titleName.includes(searchLower) ||
                description.includes(searchLower) ||
                serviceType.includes(searchLower)
            );
        });
    }

    // category subcategory filter
    if (category && category.trim() !== "") {
        filteredServices = filteredServices.filter((service: any) => {
            return service.category?.name === category;
        });
    }
    if (SubCategory && SubCategory.trim() !== "") {
        filteredServices = filteredServices.filter((service: any) => {
            return service.title?.title === SubCategory;
        });
    }

    // Add bookmark status for each service
    const servicesWithBookmarkStatus = await Promise.all(
        filteredServices.map(async (service: any) => {
            if (!customerId) {
                return { ...service, isBookmarked: false };
            }
            const isBookmarked = await Bookmark.exists({
                customer: new mongoose.Types.ObjectId(customerId),
                barber: service.barber._id,
            });
            return {
                ...service,
                isBookmarked: !!isBookmarked,
            };
        })
    );

    // Add distance information
    const servicesWithDistance = servicesWithBookmarkStatus.map((service: any) => {
        const barberInfo = nearbyBarbers.find(
            (b) => b._id.toString() === service.barber._id.toString()
        );
        return {
            ...service,
            barberDistance: barberInfo ? Math.round(barberInfo.distance) : null,
            distanceInKm: barberInfo ? (barberInfo.distance / 1000).toFixed(2) : null,
        };
    });

    return servicesWithDistance;
};


const getServicesByLocation = async (
    latitude: number,
    longitude: number,
    maxDistance: number = 10000,
    page: number = 1,
    limit: number = 20,
    customerId?: string
) => {
    try {
        console.log("========== SERVICE FUNCTION ==========");
        console.log("Customer ID received:", customerId);
        console.log("Customer ID type:", typeof customerId);

        if (!latitude || !longitude || isNaN(latitude) || isNaN(longitude)) {
            throw new ApiError(StatusCodes.BAD_REQUEST, "Invalid latitude or longitude");
        }

        const skip = (page - 1) * limit;

        const nearbyBarbers = await User.aggregate([
            {
                $geoNear: {
                    near: {
                        type: "Point",
                        coordinates: [longitude, latitude],
                    },
                    distanceField: "distance",
                    maxDistance: maxDistance,
                    spherical: true,
                    query: {
                        role: "BARBER",
                        isDeleted: false,
                        location: { $exists: true },
                        "location.coordinates": { $exists: true, $ne: [] },
                    },
                },
            },
            {
                $project: {
                    _id: 1,
                    name: 1,
                    distance: 1,
                    verified: 1,
                    location: 1,
                },
            },
        ]);

        if (nearbyBarbers.length === 0) {
            return { services: [], total: 0 };
        }

        const barberIds = nearbyBarbers.map((barber) => barber._id);

        const total = await Service.countDocuments({
            barber: { $in: barberIds },
            status: "Active",
        });

        const services = await Service.find({
            barber: { $in: barberIds },
            status: "Active",
        })
            .populate("barber", "name profile mobileNumber address location verified")
            .populate("category", "name")
            .populate("title", "name title")
            .select("-dailySchedule -bookedSlots")
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .lean();

        console.log("Total services found:", services.length);

        // Check all bookmarks at once for better performance
        let allBookmarks: any[] = [];
        if (customerId) {
            console.log("Checking bookmarks for customer:", customerId);
            allBookmarks = await Bookmark.find({
                customer: customerId,
                barber: { $in: barberIds }
            }).lean();

            console.log("Total bookmarks found:", allBookmarks.length);
            console.log("Bookmarks:", allBookmarks.map(b => ({
                customer: b.customer.toString(),
                barber: b.barber.toString()
            })));
        }

        // Add bookmark status for each service
        const servicesWithBookmarkStatus = services.map((service: any) => {
            let isBookmarked = false;

            if (customerId && allBookmarks.length > 0) {
                isBookmarked = allBookmarks.some(
                    bookmark => bookmark.barber.toString() === service.barber._id.toString()
                );
            }

            console.log(`Service ${service._id} - Barber: ${service.barber._id} - isBookmarked: ${isBookmarked}`);

            return {
                ...service,
                isBookmarked,
            };
        });

        const servicesWithDistance = servicesWithBookmarkStatus.map((service: any) => {
            const barberInfo = nearbyBarbers.find(
                (b) => b._id.toString() === service.barber._id.toString()
            );

            return {
                ...service,
                barberDistance: barberInfo ? Math.round(barberInfo.distance) : null,
                distanceInKm: barberInfo ? (barberInfo.distance / 1000).toFixed(2) : null,
            };
        });

        return {
            services: servicesWithDistance,
            total,
        };
    } catch (error) {
        console.error("Error in getServicesByLocation:", error);
        throw error;
    }
};


export const RecommendedService = {
    getRecommendedServices,
    getServicesByLocation,
};