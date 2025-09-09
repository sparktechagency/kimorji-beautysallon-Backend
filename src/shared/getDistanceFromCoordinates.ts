import axios from "axios";
import config from "../config";

interface Location {
    coordinates: [number, number]; // [longitude, latitude]
}

const getDistanceFromCoordinates = async (destination: Location, origin: Location): Promise<{ distance: string; duration: string, travelFee: number } | null> => {
    const apiKey = config.google_maps;

    if (!Array.isArray(origin) || !Array.isArray(destination)){
        console.error("Invalid origin or destination coordinates.");
        return null;
    }

    const [originLng, originLat] = origin;
    const [destLng, destLat] = destination;

    const url = `https://maps.googleapis.com/maps/api/distancematrix/json?origins=${originLat},${originLng}&destinations=${destLat},${destLng}&key=${apiKey}`;

    try {
        const response = await axios.get(url, { timeout: 5000 });
        const data = response.data;

        const distanceMeters = data?.rows?.[0]?.elements?.[0]?.distance?.value;
        const durationText = data?.rows?.[0]?.elements?.[0]?.duration?.text;

        const distanceMiles = distanceMeters / 1609.34;

        return {
            distance: distanceMiles.toFixed(2), // returns
            travelFee: Number(distanceMiles.toFixed(2)) * 1.85,
            duration: durationText
        };

    } catch (error: unknown) {
        console.error("Error fetching distance:", error);
        return null;
    }
};

export default getDistanceFromCoordinates;