// utils/routingUtils.js
const fetch = require('node-fetch');
require('dotenv').config(); // Make sure this is at the top of your file


// Using OSRM (free, no API key needed)
const getOSRMDistance = async (userLat, userLng, restaurantLat, restaurantLng) => {
  // Note: OSRM uses longitude,latitude order (not lat,lng)
  const url = `http://router.project-osrm.org/route/v1/driving/${userLng},${userLat};${restaurantLng},${restaurantLat}?overview=false`;
  
  try {
    const response = await fetch(url);
    const data = await response.json();
    
    if (data.code === 'Ok' && data.routes && data.routes.length > 0) {
      const distanceInMeters = data.routes[0].distance;
      const durationInSeconds = data.routes[0].duration;
      const distanceInKm = distanceInMeters / 1000;
      const durationInMinutes = Math.round(durationInSeconds / 60);
      
      return {
        distance: distanceInKm,
        duration: durationInMinutes
      };
    }
    
    return null;
  } catch (error) {
    console.error('❌ OSRM routing error:', error.message);
    return null;
  }
};

const getMapTilerDistance = async (userLat, userLng, restaurantLat, restaurantLng) => {
  const apiKey = process.env.MAPTILER_API_KEY; // load API key from .env

  if (!apiKey) {
    console.error("❌ MAPTILER_API_KEY is not set in .env");
    return null;
  }

  const url = `https://api.maptiler.com/routing/driving/${userLng},${userLat};${restaurantLng},${restaurantLat}.json?key=${apiKey}`;

  try {
    const response = await fetch(url);
    const data = await response.json();

    if (data.routes && data.routes.length > 0) {
      const distanceInMeters = data.routes[0].distance;
      const durationInSeconds = data.routes[0].duration;
      const distanceInKm = distanceInMeters / 1000;
      const durationInMinutes = Math.round(durationInSeconds / 60);

      return {
        distance: distanceInKm,
        duration: durationInMinutes
      };
    }

    return null;
  } catch (error) {
    console.error('❌ MapTiler routing error:', error.message);
    return null;
  }
};

module.exports = { 
  getOSRMDistance,
  getMapTilerDistance
};