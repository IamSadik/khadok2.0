// models/consumerModel.js
const pool = require('../config/configdb');

const getConsumerById = async (consumer_id) => {
  const { rows } = await pool.query(
    'SELECT number FROM consumer WHERE consumer_id = $1',
    [consumer_id]
  );
  return rows[0];
};

const updateConsumerInfo = async ({
  consumer_id,
  full_name,
  number,
  address,
  gender,
  age,
  lat,
  lng,
  profile_pic,
}) => {
  let query = `
    UPDATE consumer
    SET
      name       = $1,
      number     = $2,
      address    = $3,
      gender     = $4,
      age        = $5,
      lat        = $6,
      lng        = $7,
      flag       = true,
      updated_at = NOW()
  `;
  const params = [full_name, number, address, gender, age, lat, lng];

  if (profile_pic) {
    query += `, picture = $${params.length + 1}`;
    params.push(profile_pic);
  }

  query += ` WHERE consumer_id = $${params.length + 1}`;
  params.push(consumer_id);

  const { rowCount } = await pool.query(query, params);
  return rowCount === 1;
};

const getConsumerProfile = async (consumer_id) => {
  const sql = `
    SELECT
      consumer_id,
      name,
      email,
      number,
      address,
      age,
      gender,
      picture,
      lat,
      lng,
      created_at,
      updated_at
    FROM consumer
    WHERE consumer_id = $1
    LIMIT 1
  `;

  const { rows } = await pool.query(sql, [consumer_id]);
  return rows[0] || null;
};

const getConsumerStats = async (consumer_id) => {
  const sql = `
    SELECT
      COUNT(*)::int AS total_orders,
      COUNT(*) FILTER (WHERE order_status = 'completed')::int AS completed_orders,
      COALESCE(SUM(total_amount) FILTER (WHERE order_status = 'completed'), 0)::numeric AS total_spend
    FROM orders
    WHERE consumer_id = $1
  `;

  const { rows } = await pool.query(sql, [consumer_id]);
  return rows[0] || { total_orders: 0, completed_orders: 0, total_spend: 0 };
};

const getConsumerLastOrder = async (consumer_id) => {
  const sql = `
    SELECT
      o.id,
      o.order_status,
      o.total_amount,
      o.created_at,
      s.restaurant_name,
      s.picture AS restaurant_logo
    FROM orders o
    LEFT JOIN stakeholder s ON o.stakeholder_id = s.stakeholder_id
    WHERE o.consumer_id = $1
    ORDER BY o.created_at DESC
    LIMIT 1
  `;

  const { rows } = await pool.query(sql, [consumer_id]);
  return rows[0] || null;
};

const getConsumerFavoriteRestaurant = async (consumer_id) => {
  const sql = `
    SELECT
      s.stakeholder_id,
      s.restaurant_name,
      s.picture AS restaurant_logo,
      COUNT(*)::int AS order_count
    FROM orders o
    LEFT JOIN stakeholder s ON o.stakeholder_id = s.stakeholder_id
    WHERE o.consumer_id = $1
    GROUP BY s.stakeholder_id, s.restaurant_name, s.picture
    ORDER BY order_count DESC
    LIMIT 1
  `;

  const { rows } = await pool.query(sql, [consumer_id]);
  return rows[0] || null;
};

const getConsumerMonthlyOrders = async (consumer_id) => {
  const sql = `
    SELECT
      date_trunc('month', created_at) AS month,
      COUNT(*)::int AS order_count
    FROM orders
    WHERE consumer_id = $1
      AND created_at >= date_trunc('month', NOW()) - INTERVAL '5 months'
    GROUP BY 1
    ORDER BY 1
  `;

  const { rows } = await pool.query(sql, [consumer_id]);
  return rows;
};

const getConsumerRecentReviews = async (consumer_id, limit = 4) => {
  const sql = `
    SELECT
      r.review_id,
      r.rating,
      r.review_text,
      r.review_date,
      s.restaurant_name,
      s.picture AS restaurant_logo
    FROM review r
    LEFT JOIN stakeholder s ON r.stakeholder_id = s.stakeholder_id
    WHERE r.consumer_id = $1
    ORDER BY r.review_date DESC
    LIMIT $2
  `;

  const { rows } = await pool.query(sql, [consumer_id, limit]);
  return rows;
};

const updateConsumerProfile = async ({
  consumer_id,
  name,
  number,
  address,
  gender,
  age,
  lat,
  lng,
  picture,
}) => {
  const fields = [];
  const values = [];
  let index = 1;

  if (name !== undefined) {
    fields.push(`name = $${index++}`);
    values.push(name);
  }

  if (number !== undefined) {
    fields.push(`number = $${index++}`);
    values.push(number);
  }

  if (address !== undefined) {
    fields.push(`address = $${index++}`);
    values.push(address);
  }

  if (gender !== undefined) {
    fields.push(`gender = $${index++}`);
    values.push(gender);
  }

  if (age !== undefined) {
    fields.push(`age = $${index++}`);
    values.push(age);
  }

  if (lat !== undefined) {
    fields.push(`lat = $${index++}`);
    values.push(lat);
  }

  if (lng !== undefined) {
    fields.push(`lng = $${index++}`);
    values.push(lng);
  }

  if (picture) {
    fields.push(`picture = $${index++}`);
    values.push(picture);
  }

  if (fields.length === 0) {
    return false;
  }

  fields.push('updated_at = NOW()');
  values.push(consumer_id);

  const sql = `
    UPDATE consumer
    SET ${fields.join(', ')}
    WHERE consumer_id = $${index}
  `;

  const { rowCount } = await pool.query(sql, values);
  return rowCount === 1;
};

module.exports = {
  getConsumerById,
  updateConsumerInfo,
  getConsumerProfile,
  getConsumerStats,
  getConsumerLastOrder,
  getConsumerFavoriteRestaurant,
  getConsumerMonthlyOrders,
  getConsumerRecentReviews,
  updateConsumerProfile,
};