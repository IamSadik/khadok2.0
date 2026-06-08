// models/restaurantModel.js
const pool = require('../config/configdb');

const normalizeCategoryName = (value) => {
  if (value === null || value === undefined) return null;
  const trimmed = String(value).trim();
  return trimmed === '' ? null : trimmed;
};

// Resolve an order_item's cuisine using a fallback chain:
// 1) order_items.category, 2) menu.category, 3) cuisine.name (via stakeholder_cuisine).
// Returns NULL if none of the three resolves a non-empty string.
const resolveItemCategoryExpr = `
  COALESCE(
    NULLIF(TRIM(oi.category), ''),
    NULLIF(TRIM(m.category), ''),
    c.name
  )
`;

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

const getCuisineBreakdownForConsumer = async (
  consumerId,
  { orderType, limit = 5 } = {}
) => {
  const params = [consumerId];
  const where = [`o.consumer_id = $1`];
  if (orderType) {
    params.push(orderType);
    where.push(`o.order_type = $${params.length}`);
  }
  // Cancelled / rejected orders should not pollute the user's preferences.
  where.push(`o.order_status NOT IN ('cancelled', 'rejected')`);
  params.push(Math.min(Math.max(Number(limit) || 5, 1), 25));
  const limitParamIdx = params.length;

  const sql = `
    WITH resolved_items AS (
      SELECT
        oi.id AS order_item_id,
        oi.order_id,
        oi.quantity,
        ${resolveItemCategoryExpr} AS resolved_category
      FROM orders o
      JOIN order_items oi ON oi.order_id = o.id
      LEFT JOIN menu m ON m.menu_id = oi.menu_id
      LEFT JOIN stakeholder_cuisine sc ON sc.menu_id = m.menu_id
      LEFT JOIN cuisine c ON c.id = sc.cuisine_id
      WHERE ${where.join(' AND ')}
        AND ${resolveItemCategoryExpr} IS NOT NULL
    ),
    -- Collapse the 1:N (menu -> stakeholder_cuisine) expansion so a single
    -- order_item row isn't double-counted when its menu links to multiple cuisines.
    deduped AS (
      SELECT DISTINCT ON (order_item_id) order_item_id, order_id,
             COALESCE(quantity, 0) AS quantity, resolved_category
      FROM resolved_items
      ORDER BY order_item_id, resolved_category
    )
    SELECT
      resolved_category AS category,
      SUM(quantity)::int AS quantity,
      ROUND(
        SUM(quantity)::numeric
          / NULLIF((SELECT SUM(quantity) FROM deduped), 0),
        4
      ) AS ratio
    FROM deduped
    GROUP BY resolved_category
    ORDER BY quantity DESC, resolved_category ASC
    LIMIT $${limitParamIdx}
  `;

  const { rows } = await pool.query(sql, params);
  return rows
    .map((r) => ({
      category: normalizeCategoryName(r.category),
      quantity: Number(r.quantity) || 0,
      ratio: r.ratio === null || r.ratio === undefined ? 0 : Number(r.ratio),
    }))
    .filter((r) => r.category);
};

const getCuisineRecommendedRestaurantIdsForConsumer = async (
  consumerId,
  lat,
  lng,
  radius = 10,
  { categories = [], limit = 20, orderType } = {}
) => {
  const safeCategories = Array.isArray(categories)
    ? categories
        .map((c) => normalizeCategoryName(c))
        .filter((c) => c && c.length <= 100)
    : [];

  const safeLimit = Math.min(Math.max(Number(limit) || 20, 1), 50);

  const params = [lat, lng, safeCategories, radius, safeLimit];

  const { rows } = await pool.query(
    `WITH candidates AS (
       SELECT
         s.stakeholder_id,
         s.ratings,
         (6371 * ACOS(
           LEAST(1,
             COS(RADIANS($1)) * COS(RADIANS(s.lat::FLOAT)) * COS(RADIANS(s.lng::FLOAT) - RADIANS($2))
             + SIN(RADIANS($1)) * SIN(RADIANS(s.lat::FLOAT))
           )
         )) AS distance
       FROM stakeholder s
       WHERE s.restaurant_name IS NOT NULL
         AND TRIM(s.restaurant_name) <> ''
         AND (
              CARDINALITY($3::text[]) = 0
              OR EXISTS (
                SELECT 1
                FROM menu m
                LEFT JOIN stakeholder_cuisine sc ON sc.menu_id = m.menu_id
                LEFT JOIN cuisine c ON c.id = sc.cuisine_id
                WHERE m.stakeholder_id = s.stakeholder_id
                  AND COALESCE(NULLIF(TRIM(m.category), ''), c.name) = ANY ($3::text[])
              )
            )
     )
     SELECT stakeholder_id, distance
     FROM candidates
     WHERE distance <= $4
     ORDER BY
       CASE WHEN CARDINALITY($3::text[]) = 0 THEN 1 ELSE 0 END ASC,
       distance ASC,
       COALESCE((SELECT ratings FROM stakeholder sk WHERE sk.stakeholder_id = candidates.stakeholder_id), 0) DESC
     LIMIT $5`,
    params
  );

  return {
    category: safeCategories[0] || null,
    categoriesUsed: safeCategories,
    restaurantIds: rows
      .map((r) => Number(r.stakeholder_id))
      .filter((id) => Number.isFinite(id)),
  };
};

module.exports = {
  getNearbyRestaurants,
  getRestaurantById,
  testBasicQuery,
  getTopRatedRestaurants,
  searchRestaurantsByName,
  getCuisineBreakdownForConsumer,
  getCuisineRecommendedRestaurantIdsForConsumer,
};