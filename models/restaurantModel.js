// models/restaurantModel.js
const db = require("../config/configdb");

// Test function
const testBasicQuery = () => {
  return new Promise((resolve, reject) => {
    const query = `SELECT stakeholder_id, restaurant_name, lat, lng FROM stakeholder WHERE restaurant_name IS NOT NULL LIMIT 5;`;
    
    db.query(query, (err, results) => {
      if (err) {
        console.error("❌ Test query error:", err);
        return reject(err);
      }
      resolve(results);
    });
  });
};

// Function to find restaurants within a certain radius using Haversine (straight-line distance)
const getNearbyRestaurants = (lat, lng, radius = 10) => {
  return new Promise((resolve, reject) => {
    const query = `
      SELECT stakeholder_id, restaurant_name, address, lat, lng, ratings, picture, opens_at, closes_at, type,
        (6371 * ACOS(
          LEAST(1,
            COS(RADIANS(?)) * COS(RADIANS(lat)) * COS(RADIANS(lng) - RADIANS(?)) +
            SIN(RADIANS(?)) * SIN(RADIANS(lat))
          )
        )) AS distance
      FROM stakeholder
      WHERE restaurant_name IS NOT NULL
      ORDER BY distance ASC
      LIMIT 200;
    `;

    db.query(query, [lat, lng, lat], (err, results) => {
      if (err) {
        console.error("❌ Database query error:", err);
        return reject(err);
      }
      
      // Filter by radius
      const filtered = results.filter(r => r.distance <= radius);
      
      resolve(filtered);
    });
  });
};

// Function to get a single restaurant by stakeholder_id
const getRestaurantById = (stakeholder_id) => {
  return new Promise((resolve, reject) => {
    const query = `
      SELECT stakeholder_id, restaurant_name, address, lat, lng, ratings, picture, opens_at, closes_at, type
      FROM stakeholder
      WHERE stakeholder_id = ? AND restaurant_name IS NOT NULL
      LIMIT 1;
    `;

    db.query(query, [stakeholder_id], (err, results) => {
      if (err) {
        console.error("❌ Database query error:", err);
        return reject(err);
      }
      
      if (results.length === 0) {
        return resolve(null);
      }
      
      resolve(results[0]);
    });
  });
};

module.exports = {
  getNearbyRestaurants,
  testBasicQuery,
  getRestaurantById
};