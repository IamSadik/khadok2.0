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
      
      // Keep precision for small distances
      let distanceInKm = distanceInMeters / 1000;
      
      // If OSRM returns 0 or very small distance (< 10 meters), calculate straight-line distance as fallback
      if (distanceInMeters < 10) {
        // Haversine formula for straight-line distance
        const R = 6371; // Earth's radius in km
        const dLat = (restaurantLat - userLat) * Math.PI / 180;
        const dLng = (restaurantLng - userLng) * Math.PI / 180;
        const a = 
          Math.sin(dLat / 2) * Math.sin(dLat / 2) +
          Math.cos(userLat * Math.PI / 180) * Math.cos(restaurantLat * Math.PI / 180) *
          Math.sin(dLng / 2) * Math.sin(dLng / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        distanceInKm = R * c;
        
        console.log(`⚠️ OSRM returned very small distance (${distanceInMeters}m), using Haversine: ${distanceInKm.toFixed(2)}km`);
      }
      
      // Calculate travel time in minutes
      const travelTimeMinutes = Math.max(1, Math.round(durationInSeconds / 60));
      
      // 🔹 Calculate food preparation time based on distance
      // Closer restaurants = faster preparation (less time to prepare while rider is on the way)
      // Farther restaurants = more preparation time (they can prepare while rider travels)
      const foodPrepTime = calculateFoodPrepTime(distanceInKm);
      
      // 🔹 Total estimated delivery time = Travel time + Food prep time
      const totalDeliveryTime = travelTimeMinutes + foodPrepTime;
      
      // Calculate meters for distances < 1km
      const distanceInMetersRounded = Math.round(distanceInKm * 1000);
      
      return {
        distance: parseFloat(distanceInKm.toFixed(2)), // Keep 2 decimal places
        distance_meters: distanceInMetersRounded, // Distance in meters
        travel_time: travelTimeMinutes, // Time to travel (in minutes)
        food_prep_time: foodPrepTime, // Time to prepare food (in minutes)
        total_time: totalDeliveryTime, // Total delivery time (in minutes)
        duration: totalDeliveryTime // Backward compatibility (same as total_time)
      };
    }
    
    return null;
  } catch (error) {
    console.error('❌ OSRM routing error:', error.message);
    return null;
  }
};

/**
 * Calculate food preparation time based on delivery distance
 * Logic: Closer restaurants need to prepare food quickly (rider arrives soon)
 *        Farther restaurants have more time (can prepare while rider travels)
 */
function calculateFoodPrepTime(distanceKm) {
  const distanceMeters = distanceKm * 1000;
  
  // Distance-based food preparation time algorithm
  if (distanceMeters < 200) {
    // Very close (< 200m) - Quick prep: 8-10 minutes
    return 19;
  } else if (distanceMeters < 500) {
    // Close (200-500m) - Standard prep: 10-12 minutes
    return 22;
  } else if (distanceMeters < 800) {
    // Nearby (500-800m) - Normal prep: 12-15 minutes
    return 26;
  } else if (distanceKm < 1) {
    // Under 1km - Standard prep: 15 minutes
    return 30;
  } else if (distanceKm < 2) {
    // 1-2 km - More prep time: 18 minutes
    return 30;
  } else if (distanceKm < 3) {
    // 2-3 km - Extended prep: 20 minutes
    return 30;
  } else if (distanceKm < 5) {
    // 3-5 km - Longer prep: 22 minutes
    return 30;
  } else if (distanceKm < 8) {
    // 5-8 km - Extended prep: 25 minutes
    return 30;
  } else if (distanceKm < 12) {
    // 8-12 km - Long distance prep: 28 minutes
    return 30;
  } else {
    // 12+ km - Maximum prep time: 30 minutes
    return 32;
  }
}

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