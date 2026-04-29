// models/riderModel.js
const pool = require('../config/configdb');

const getRiderById = async (riderId) => {
  const { rows } = await pool.query('SELECT * FROM rider WHERE rider_id = $1', [riderId]);
  return rows[0];
};

const getRiderByEmail = async (email) => {
  const { rows } = await pool.query('SELECT * FROM rider WHERE email = $1', [email]);
  return rows[0];
};

const updateRiderProfile = async (riderId, updates) => {
  const fields = [];
  const values = [];
  for (const [key, value] of Object.entries(updates)) {
    fields.push(`${key} = $${fields.length + 1}`);
    values.push(value);
  }
  values.push(riderId);
  const { rows } = await pool.query(
    `UPDATE rider SET ${fields.join(', ')}, updated_at = NOW() WHERE rider_id = $${values.length}`,
    values
  );
  return rows;
};

const updateRiderStatus = async (riderId, status) => {
  const { rows } = await pool.query(
    'UPDATE rider SET status = $1, updated_at = NOW() WHERE rider_id = $2',
    [status, riderId]
  );
  return rows;
};

const updateRiderLocation = async (riderId, lat, lng) => {
  const { rows } = await pool.query(
    'UPDATE rider SET current_lat = $1, current_lng = $2, last_location_update = NOW() WHERE rider_id = $3',
    [lat, lng, riderId]
  );
  return rows;
};

const getAvailableRidersNearLocation = async (lat, lng, radiusKm = 5) => {
  const { rows } = await pool.query(
    `SELECT *,
       (6371 * acos(cos(radians($1)) * cos(radians(current_lat::float))
         * cos(radians(current_lng::float) - radians($2))
         + sin(radians($1)) * sin(radians(current_lat::float)))) AS distance
     FROM rider
     WHERE status = 'available'
       AND is_active = true
       AND is_verified = true
       AND current_lat IS NOT NULL
       AND current_lng IS NOT NULL
     HAVING (6371 * acos(cos(radians($1)) * cos(radians(current_lat::float))
         * cos(radians(current_lng::float) - radians($2))
         + sin(radians($1)) * sin(radians(current_lat::float)))) < $3
     ORDER BY distance ASC`,
    [lat, lng, radiusKm]
  );
  return rows;
};

const getRiderStats = async (riderId) => {
  const { rows } = await pool.query(
    `SELECT total_deliveries, successful_deliveries, cancelled_deliveries,
            average_delivery_time, rating, total_ratings
     FROM rider WHERE rider_id = $1`,
    [riderId]
  );
  return rows[0];
};

const updateDeliveryStats = async (riderId, deliveryTime, wasSuccessful) => {
  const successIncrement = wasSuccessful ? 1 : 0;
  const cancelIncrement  = wasSuccessful ? 0 : 1;
  const { rows } = await pool.query(
    `UPDATE rider
     SET total_deliveries      = total_deliveries + 1,
         successful_deliveries = successful_deliveries + $1,
         cancelled_deliveries  = cancelled_deliveries  + $2,
         average_delivery_time = (
           (COALESCE(average_delivery_time, 0) * total_deliveries + $3)
           / (total_deliveries + 1)
         )
     WHERE rider_id = $4`,
    [successIncrement, cancelIncrement, deliveryTime || 0, riderId]
  );
  return rows;
};

const addRiderRating = async (riderId, rating) => {
  const { rows } = await pool.query(
    `UPDATE rider
     SET total_ratings = total_ratings + 1,
         rating = (COALESCE(rating, 0) * total_ratings + $1) / (total_ratings + 1)
     WHERE rider_id = $2`,
    [rating, riderId]
  );
  return rows;
};

module.exports = {
  getRiderById,
  getRiderByEmail,
  updateRiderProfile,
  updateRiderStatus,
  updateRiderLocation,
  getAvailableRidersNearLocation,
  getRiderStats,
  updateDeliveryStats,
  addRiderRating,
};