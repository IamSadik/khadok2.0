// controllers/restaurantController.js
const restaurantModel = require("../models/restaurantModel");
const { getOSRMDistance } = require("../utils/routingUtils");

// Controller: Get nearby restaurants with road distance
const getNearbyRestaurants = async (req, res) => {
  try {
    const { lat, lng, radius, useRoadDistance } = req.query;

    // Validate input
    if (!lat || !lng) {
      return res.status(400).json({ error: "Latitude and longitude are required" });
    }

    const searchRadius = parseFloat(radius) || 10; // Default 10 km
    const calculateRoadDistance = useRoadDistance === 'true'; // Check if user wants road distance

    console.log(`🔍 Searching with lat: ${lat}, lng: ${lng}, radius: ${searchRadius}km, roadDistance: ${calculateRoadDistance}`);
    
    // Step 1: Get nearby restaurants using Haversine (fast pre-filter)
    // Use 1.5x radius since road distance is typically longer than straight line
    const haversineRadius = calculateRoadDistance ? searchRadius * 1.5 : searchRadius;
    const nearbyRestaurants = await restaurantModel.getNearbyRestaurants(
      lat, 
      lng, 
      haversineRadius
    );
    
    console.log(`📍 Found ${nearbyRestaurants.length} restaurants within ${haversineRadius}km (Haversine)`);

    // If no restaurants found
    if (!nearbyRestaurants || nearbyRestaurants.length === 0) {
      return res.status(200).json({ 
        message: "No nearby restaurants found.",
        count: 0,
        restaurants: []
      });
    }

    // Step 2: Calculate actual road distances if requested
    let finalResults;
    
    if (calculateRoadDistance) {
      console.log(`🚗 Calculating road distances for ${nearbyRestaurants.length} restaurants...`);
      
      const restaurantsWithRoadDistance = await Promise.all(
        nearbyRestaurants.map(async (restaurant) => {
          const roadInfo = await getOSRMDistance(
            parseFloat(lat), 
            parseFloat(lng), 
            parseFloat(restaurant.lat), 
            parseFloat(restaurant.lng)
          );
          
          return {
            stakeholder_id: restaurant.stakeholder_id,
            restaurant_name: restaurant.restaurant_name,
            address: restaurant.address,
            lat: restaurant.lat,
            lng: restaurant.lng,
            ratings: restaurant.ratings,
            picture: restaurant.picture,
            opens_at: restaurant.opens_at,
            closes_at: restaurant.closes_at,
            type: restaurant.type, // delivery, pickup, dine-in
            straight_line_distance: parseFloat(restaurant.distance.toFixed(2)),
            road_distance: roadInfo ? roadInfo.distance : null, // Distance in km
            road_distance_meters: roadInfo ? roadInfo.distance_meters : null, // Distance in meters
            travel_time: roadInfo ? roadInfo.travel_time : null, // Travel time only (minutes)
            food_prep_time: roadInfo ? roadInfo.food_prep_time : null, // Food preparation time (minutes)
            estimated_time: roadInfo ? roadInfo.total_time : null, // Total delivery time (minutes)
            distance_unit: 'km'
          };
        })
      );

      // Filter by actual road distance and remove any failed calculations
      finalResults = restaurantsWithRoadDistance
        .filter(r => r.road_distance !== null && r.road_distance <= searchRadius)
        .sort((a, b) => a.road_distance - b.road_distance);
      
      console.log(`✅ ${finalResults.length} restaurants within ${searchRadius}km (Road distance)`);
      
    } else {
      // Use Haversine distance only
      finalResults = nearbyRestaurants.map(restaurant => ({
        stakeholder_id: restaurant.stakeholder_id,
        restaurant_name: restaurant.restaurant_name,
        address: restaurant.address,
        lat: restaurant.lat,
        lng: restaurant.lng,
        ratings: restaurant.ratings,
        picture: restaurant.picture,
        opens_at: restaurant.opens_at,
        closes_at: restaurant.closes_at,
        type: restaurant.type, // delivery, pickup, dine-in
        distance: parseFloat(restaurant.distance.toFixed(2)),
        distance_unit: 'km',
        distance_type: 'straight_line'
      }));
      
      console.log(`✅ ${finalResults.length} restaurants within ${searchRadius}km (Straight line)`);
    }

    // Success response
    return res.status(200).json({
      count: finalResults.length,
      search_radius: searchRadius,
      distance_type: calculateRoadDistance ? 'road' : 'straight_line',
      user_location: { lat: parseFloat(lat), lng: parseFloat(lng) },
      restaurants: finalResults
    });

  } catch (error) {
    console.error("❌ Error in getNearbyRestaurants controller:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
};

// Controller: Get single restaurant by stakeholder_id
const getRestaurantById = async (req, res) => {
  try {
    const { stakeholder_id } = req.params;

    if (!stakeholder_id) {
      return res.status(400).json({ error: "Stakeholder ID is required" });
    }

    console.log(`🔍 Fetching restaurant with ID: ${stakeholder_id}`);

    const restaurant = await restaurantModel.getRestaurantById(stakeholder_id);

    if (!restaurant) {
      return res.status(404).json({ error: "Restaurant not found" });
    }

    console.log(`✅ Found restaurant: ${restaurant.restaurant_name}`);

    return res.status(200).json(restaurant);

  } catch (error) {
    console.error("❌ Error in getRestaurantById controller:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
};

// Export all controller functions here
module.exports = {
  getNearbyRestaurants,
  getRestaurantById,
};