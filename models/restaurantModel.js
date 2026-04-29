// models/restaurantModel.js
const pool = require('../config/configdb');

const getNearbyRestaurants = async (lat, lng, radius = 10) => {
  const { rows } = await pool.query(
    `SELECT stakeholder_id, restaurant_name, address, lat, lng, ratings, picture,
            opens_at, closes_at, type,
            (6371 * ACOS(
              LEAST(1,
                COS(RADIANS($1)) * COS(RADIANS(lat::FLOAT)) * COS(RADIANS(lng::FLOAT) - RADIANS($2))
                + SIN(RADIANS($1)) * SIN(RADIANS(lat::FLOAT))
              )
            )) AS distance
     FROM stakeholder
     WHERE restaurant_name IS NOT NULL
     ORDER BY distance ASC
     LIMIT 200`,
    [lat, lng]
  );
  return rows.filter((r) => r.distance <= radius);
};

const getRestaurantById = async (stakeholder_id) => {
  const { rows } = await pool.query(
    `SELECT stakeholder_id, restaurant_name, address, lat, lng, ratings, picture,
            opens_at, closes_at, type
     FROM stakeholder
     WHERE stakeholder_id = $1 AND restaurant_name IS NOT NULL
     LIMIT 1`,
    [stakeholder_id]
  );
  return rows[0] || null;
};

const testBasicQuery = async () => {
  const { rows } = await pool.query(
    'SELECT stakeholder_id, restaurant_name, lat, lng FROM stakeholder WHERE restaurant_name IS NOT NULL LIMIT 5'
  );
  return rows;
};

module.exports = { getNearbyRestaurants, getRestaurantById, testBasicQuery };