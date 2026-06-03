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

const getTopRatedRestaurants = async (limit = 7) => {
  const { rows } = await pool.query(
    `SELECT stakeholder_id, restaurant_name, ratings, picture, address, type
     FROM stakeholder
     WHERE restaurant_name IS NOT NULL
       AND TRIM(restaurant_name) <> ''
     ORDER BY COALESCE(ratings, 0) DESC, restaurant_name ASC
     LIMIT $1`,
    [limit]
  );
  return rows;
};

const searchRestaurantsByName = async (query, limit = 10) => {
  const { rows } = await pool.query(
    `SELECT stakeholder_id, restaurant_name, ratings, picture, address
     FROM stakeholder
     WHERE restaurant_name IS NOT NULL
       AND TRIM(restaurant_name) <> ''
       AND restaurant_name ILIKE $1
     ORDER BY COALESCE(ratings, 0) DESC, restaurant_name ASC
     LIMIT $2`,
    [`%${query}%`, limit]
  );
  return rows;
};

const getTopOrderedCategoryForConsumer = async (consumerId, { orderType } = {}) => {
  const params = [consumerId];
  let orderTypeClause = '';
  if (orderType) {
    params.push(orderType);
    orderTypeClause = ` AND o.order_type = $${params.length}`;
  }

  const { rows } = await pool.query(
    `SELECT
       oi.category,
       SUM(COALESCE(oi.quantity, 0))::int AS quantity
     FROM orders o
     JOIN order_items oi ON oi.order_id = o.id
     WHERE o.consumer_id = $1
       AND oi.category IS NOT NULL
       AND TRIM(oi.category) <> ''
       ${orderTypeClause}
     GROUP BY oi.category
     ORDER BY quantity DESC, oi.category ASC
     LIMIT 1`,
    params
  );

  return rows[0]?.category ? String(rows[0].category).trim() : null;
};

const getCuisineRecommendedRestaurantIdsForConsumer = async (
  consumerId,
  lat,
  lng,
  radius = 10,
  { limit = 20, orderType } = {}
) => {
  const topCategory = await getTopOrderedCategoryForConsumer(consumerId, { orderType });
  if (!topCategory) {
    return { category: null, restaurantIds: [] };
  }

  const { rows } = await pool.query(
    `WITH candidates AS (
       SELECT
         s.stakeholder_id,
         (6371 * ACOS(
           LEAST(1,
             COS(RADIANS($1)) * COS(RADIANS(s.lat::FLOAT)) * COS(RADIANS(s.lng::FLOAT) - RADIANS($2))
             + SIN(RADIANS($1)) * SIN(RADIANS(s.lat::FLOAT))
           )
         )) AS distance
       FROM stakeholder s
       WHERE s.restaurant_name IS NOT NULL
         AND TRIM(s.restaurant_name) <> ''
         AND EXISTS (
           SELECT 1
           FROM menu m
           LEFT JOIN stakeholder_cuisine sc ON sc.menu_id = m.menu_id
           LEFT JOIN cuisine c ON c.id = sc.cuisine_id
           WHERE m.stakeholder_id = s.stakeholder_id
             AND COALESCE(NULLIF(TRIM(m.category), ''), c.name) = $3
         )
     )
     SELECT stakeholder_id
     FROM candidates
     WHERE distance <= $4
     ORDER BY distance ASC
     LIMIT $5`,
    [lat, lng, topCategory, radius, Math.min(Math.max(limit, 1), 50)]
  );

  return {
    category: topCategory,
    restaurantIds: rows.map((r) => Number(r.stakeholder_id)).filter((id) => Number.isFinite(id)),
  };
};

module.exports = {
  getNearbyRestaurants,
  getRestaurantById,
  testBasicQuery,
  getTopRatedRestaurants,
  searchRestaurantsByName,
  getTopOrderedCategoryForConsumer,
  getCuisineRecommendedRestaurantIdsForConsumer,
};