import mongoose from "mongoose";
import { Service } from "../service/service.model";
import { User } from "../user/user.model";
import { Review } from "../review/review.model";

/**
 * Debug helper to check why services are not showing
 * Call this function to diagnose the issue
 */
export const debugLocationServices = async (barberId: string) => {
    console.log("=== DEBUG: Starting diagnosis ===\n");

    // 1. Check if barber exists
    const barber = await User.findById(barberId);
    console.log("1. Barber exists:", !!barber);
    if (barber) {
        console.log("   - Name:", barber.name);
        console.log("   - Role:", barber.role);
        console.log("   - Verified:", barber.verified);
        console.log("   - IsDeleted:", barber.isDeleted);
        console.log("   - Location exists:", !!barber.location);
        if (barber.location) {
            console.log("   - Location type:", (barber.location as any).type);
            console.log("   - Coordinates:", (barber.location as any).coordinates);
            console.log("   - Has coordinates:", (barber.location as any).coordinates?.length > 0);
        }
    }

    // 2. Check services for this barber
    const services = await Service.find({ barber: barberId });
    console.log("\n2. Services count:", services.length);
    if (services.length > 0) {
        const service = services[0];
        console.log("   - First service ID:", service._id);
        console.log("   - Status:", service.status);
        console.log("   - Rating:", service.rating);
        console.log("   - Total Rating:", service.totalRating);
    }

    // 3. Check reviews
    const reviews = await Review.find({ barber: barberId });
    console.log("\n3. Reviews count:", reviews.length);
    if (reviews.length > 0) {
        console.log("   - Ratings:", reviews.map(r => r.rating));
    }

    // 4. Test geospatial query with a sample location
    const testLat = 23.8103;
    const testLng = 90.4125;

    console.log("\n4. Testing geospatial query:");
    console.log("   - Test coordinates: [", testLng, ",", testLat, "]");

    try {
        const nearbyBarbers = await User.aggregate([
            {
                $geoNear: {
                    near: {
                        type: "Point",
                        coordinates: [testLng, testLat],
                    },
                    distanceField: "distance",
                    maxDistance: 50000, // 50km for testing
                    spherical: true,
                    query: {
                        role: "BARBER",
                        isDeleted: false,
                    },
                },
            },
            {
                $limit: 5
            }
        ]);

        console.log("   - Barbers found within 50km:", nearbyBarbers.length);
        if (nearbyBarbers.length > 0) {
            nearbyBarbers.forEach((b, i) => {
                console.log(`   - Barber ${i + 1}:`, b.name, `(${(b.distance / 1000).toFixed(2)} km)`);
            });
        }
    } catch (error: any) {
        console.log("   - ERROR in geospatial query:", error.message);
    }

    console.log("\n=== DEBUG: Diagnosis complete ===");
};

/**
 * Quick fix function to ensure barber has proper location format
 */
export const fixBarberLocation = async (barberId: string, latitude: number, longitude: number) => {
    const result = await User.findByIdAndUpdate(
        barberId,
        {
            location: {
                type: "Point",
                coordinates: [longitude, latitude], // [lng, lat] order is important!
            },
        },
        { new: true }
    );

    console.log("Location updated for barber:", result?.name);
    console.log("New coordinates:", result?.location as any);
};

/**
 * Check if 2dsphere index exists
 */
export const checkIndexes = async () => {
    const indexes = await User.collection.getIndexes();
    console.log("User collection indexes:");
    console.log(JSON.stringify(indexes, null, 2));

    const hasGeoIndex = Object.keys(indexes).some(key =>
        indexes[key].some((idx: any) => idx['2dsphere'])
    );

    console.log("\nHas 2dsphere index on location:", hasGeoIndex);
    return hasGeoIndex;
};