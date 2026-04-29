// models/locationModel.js
const pool = require('../config/configdb');

const getConsumerLocation = async (consumerId) => {
  const { rows } = await pool.query(
    'SELECT lat, lng FROM consumer WHERE consumer_id = $1',
    [consumerId]
  );
  return rows[0] || null;
};

module.exports = { getConsumerLocation };