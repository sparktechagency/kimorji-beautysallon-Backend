import axios from "axios";
import e from "express";

export const getCoordinates = async (location: string) => {
    try {
        const apiKey = process.env.GOOGLE_MAPS_API_KEY;
        const response = await axios.get(`https://maps.googleapis.com/maps/api/geocode/json?address=${location}&key=${apiKey}`);

        if (response.data.results.length === 0) {
            throw new Error(`No coordinates found for location: ${location}`);
        }

        const coordinates = response.data.results[0].geometry.location;
        return { latitude: coordinates.lat, longitude: coordinates.lng };
    } catch (error) {
        console.error('Error fetching coordinates:', error);
        throw new Error('Could not fetch coordinates');
    }
};

export function getDistanceFromLatLonInKm(lat1: number, lon1: number, lat2: number, lon2: number) {
    const R = 6371; // Radius of the earth in km
    const dLat = deg2rad(lat2 - lat1);
    const dLon = deg2rad(lon2 - lon1);
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(deg2rad(lat1)) *
        Math.cos(deg2rad(lat2)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c; // Distance in km
}

function deg2rad(deg: number) {
    return deg * (Math.PI / 180);
}

