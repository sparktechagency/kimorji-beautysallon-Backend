import axios from "axios";

const getCoordinates = async (location: string) => {
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

export default getCoordinates;