import { StatusCodes } from "http-status-codes";
import ApiError from "../../../errors/ApiError";
import { Service } from "../service/service.model";
import { User } from "../user/user.model";


const getRecommendedServices = async (
    latitude: number,
    longitude: number,
    maxDistance: number = 10000,
    limit: number = 10
) => {
    const nearbyBarbers = await User.aggregate([
        {
            $geoNear: {
                near: {
                    type: "Point",
                    coordinates: [longitude, latitude],
                },
                distanceField: "distance",
                maxDistance: maxDistance, // in meters
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
        .select("-dailySchedule -bookedSlots ")
        .populate("barber", "name profile mobileNumber address location verified ")
        .populate("category", "name")
        .populate("title", "name")
        .sort({ rating: -1, totalRating: -1 })
        .limit(limit)
        .lean();
    const servicesWithDistance = recommendedServices.map((service: any) => {
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
    limit: number = 20
) => {
    try {
        console.log("=== DEBUG Location-Based Services ===");
        console.log("Input params:", { latitude, longitude, maxDistance, limit, page });

        if (!latitude || !longitude || isNaN(latitude) || isNaN(longitude)) {
            console.log("❌ Invalid coordinates");
            throw new ApiError(StatusCodes.BAD_REQUEST, "Invalid latitude or longitude");
        }

        const skip = (page - 1) * limit;
        console.log(`📄 Pagination: skip=${skip}, limit=${limit}, page=${page}`);

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

        console.log(`✓ Found ${nearbyBarbers.length} barbers within ${maxDistance}m`);

        if (nearbyBarbers.length === 0) {
            console.log("❌ No barbers found nearby");
            return {
                services: [],
                total: 0,
            };
        }

        const barberIds = nearbyBarbers.map((barber) => barber._id);

        const total = await Service.countDocuments({
            barber: { $in: barberIds },
            status: "Active",
        });

        console.log(`✓ Total active services: ${total}`);
        if (skip >= total && total > 0) {
            console.log(`⚠️  Skip (${skip}) >= Total (${total}). Adjusting to page 1.`);
            const services = await Service.find({
                barber: { $in: barberIds },
                status: "Active",
            })
                .populate("barber", "name profile mobileNumber address location verified")
                .populate("category", "name")
                .populate("title", "name")
                .sort({ createdAt: -1 })
                .limit(limit)
                .lean();

            const servicesWithDistance = services.map((service: any) => {
                const barberInfo = nearbyBarbers.find(
                    (b) => b._id.toString() === service.barber._id.toString()
                );

                return {
                    ...service,
                    barberDistance: barberInfo ? Math.round(barberInfo.distance) : null,
                    distanceInKm: barberInfo ? (barberInfo.distance / 1000).toFixed(2) : null,
                };
            });

            console.log(`✓ Returning ${services.length} services (adjusted to page 1)`);
            console.log("=== DEBUG Complete ===\n");

            return {
                services: servicesWithDistance,
                total,
                adjustedToPage1: true,
            };
        }

        const services = await Service.find({
            barber: { $in: barberIds },
            status: "Active",
        })
            .populate("barber", "name profile mobileNumber address location verified")
            .populate("category", "name")
            .populate("title", "name")
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .lean();

        console.log(`✓ Query returned ${services.length} services`);

        if (services.length === 0 && total > 0) {
            console.log("⚠️  Found services but query returned 0. Check:");
            console.log("   - Skip value:", skip);
            console.log("   - Limit value:", limit);
            console.log("   - Total services:", total);
        }

        const servicesWithDistance = services.map((service: any) => {
            const barberInfo = nearbyBarbers.find(
                (b) => b._id.toString() === service.barber._id.toString()
            );

            return {
                ...service,
                barberDistance: barberInfo ? Math.round(barberInfo.distance) : null,
                distanceInKm: barberInfo ? (barberInfo.distance / 1000).toFixed(2) : null,
            };
        });

        console.log("=== DEBUG Complete ===\n");

        return {
            services: servicesWithDistance,
            total,
        };

    } catch (error: any) {
        console.error("❌ Error in getServicesByLocation:", error.message);
        if (error.name === 'MongoError' && error.code === 27) {
            throw new ApiError(
                StatusCodes.INTERNAL_SERVER_ERROR,
                "Location index not found. Please ensure 2dsphere index exists on User.location"
            );
        }
        throw error;
    }
};

export const RecommendedService = {
    getRecommendedServices,
    getServicesByLocation,
};