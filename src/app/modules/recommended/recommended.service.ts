import { StatusCodes } from "http-status-codes";
import ApiError from "../../../errors/ApiError";
import { Service } from "../service/service.model";
import { User } from "../user/user.model";
import { Bookmark } from "../bookmark/bookmark.model";
import mongoose from "mongoose";


const getRecommendedServices = async (
    latitude: number,
    longitude: number,
    maxDistance: number = 10000,
    limit: number = 10,
    customerId?: string
) => {
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
            },
        },
    ]);

    if (nearbyBarbers.length === 0) {
        return [];
    }

    const barberIds = nearbyBarbers.map((barber) => barber._id);

    const recommendedServices = await Service.find({
        barber: { $in: barberIds },
        status: "Active",
    })
        .select("-dailySchedule -bookedSlots")
        .populate("barber", "name profile mobileNumber address location verified")
        .populate("category", "name")
        .populate("title", "name")
        .sort({ rating: -1, totalRating: -1 })
        .limit(limit)
        .lean();

    // Add bookmark status for each service
    const servicesWithBookmarkStatus = await Promise.all(
        recommendedServices.map(async (service: any) => {
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
            .populate("title", "name")
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