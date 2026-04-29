// models/adminModel.js
const pool = require('../config/configdb');

const getAdminByEmail = async (email) => {
  const { rows } = await pool.query(
    'SELECT * FROM admin WHERE email = $1',
    [email]
  );
  return rows[0];
};

const fetchConsumers = async () => {
  const { rows } = await pool.query(
    'SELECT consumer_id, name, email, number FROM consumer WHERE flag = false'
  );
  return rows;
};

const markConsumerAsDeleted = async (consumerId) => {
  const { rows } = await pool.query(
    "UPDATE consumer SET flag = true, email = 'abc@gmail.com' WHERE consumer_id = $1",
    [consumerId]
  );
  return rows;
};

const fetchStakeholders = async () => {
  const { rows } = await pool.query(`
    SELECT stakeholder_id, name, email, restaurant_name, ratings, address
    FROM stakeholder
    WHERE flag IS NULL OR flag = false
  `);
  return rows;
};

const markStakeholderAsDeleted = async (stakeholderId) => {
  const { rows } = await pool.query(
    "UPDATE stakeholder SET flag = true, email = 'abc@gmail.com' WHERE stakeholder_id = $1",
    [stakeholderId]
  );
  return rows;
};

module.exports = {
  getAdminByEmail,
  fetchConsumers,
  markConsumerAsDeleted,
  fetchStakeholders,
  markStakeholderAsDeleted,
};