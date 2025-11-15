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

    // Get services from these barbers, sorted by rating
    const recommendedServices = await Service.find({
        barber: { $in: barberIds },
        status: "Active",
    })
        .populate("barber", "name profile mobileNumber address location verified")
        .populate("category", "name")
        .populate("title", "name")
        .sort({ rating: -1, totalRating: -1 })
        .limit(limit)
        .lean();

    // Add distance information to each service
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

// Get all services based on location with pagination
const getServicesByLocation = async (
    latitude: number,
    longitude: number,
    maxDistance: number = 10000,
    page: number = 1,
    limit: number = 20
) => {
    const skip = (page - 1) * limit;

    // Find barbers within the specified distance
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
        return {
            services: [],
            total: 0,
        };
    }

    const barberIds = nearbyBarbers.map((barber) => barber._id);

    // Count total services
    const total = await Service.countDocuments({
        barber: { $in: barberIds },
        status: "Active",
    });

    // Get services with pagination
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

    // Add distance information to each service
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

    return {
        services: servicesWithDistance,
        total,
    };
};

export const RecommendedService = {
    getRecommendedServices,
    getServicesByLocation,
};