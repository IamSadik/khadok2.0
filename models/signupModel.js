// models/signupModel.js
const pool = require('../config/configdb');

exports.checkEmailExists = async (email) => {
  const { rows } = await pool.query(
    'SELECT email FROM users WHERE email = $1 LIMIT 1',
    [email]
  );
  return rows.length > 0;
};

exports.createUser = async (name, email, hashedPassword, role) => {
  const { rows } = await pool.query(
    `INSERT INTO users (name, email, password, role, created_at, updated_at)
     VALUES ($1, $2, $3, $4, NOW(), NOW())
     RETURNING user_id`,
    [name, email, hashedPassword, role]
  );
  return { id: rows[0].user_id };
};

exports.createConsumer = async (userId, name, email) => {
  const { rows } = await pool.query(
    'INSERT INTO consumer (consumer_id, name, email) VALUES ($1, $2, $3) RETURNING consumer_id',
    [userId, name, email]
  );
  return rows[0].consumer_id;
};

exports.createRider = async (userId, name, email) => {
  const { rows } = await pool.query(
    `INSERT INTO rider (rider_id, name, email, created_at, updated_at)
     VALUES ($1, $2, $3, NOW(), NOW())`,
    [userId, name, email]
  );
  return rows;
};

exports.createStakeholder = async (userId, name, email, restaurantName) => {
  const { rows } = await pool.query(
    `INSERT INTO stakeholder (stakeholder_id, name, email, restaurant_name, created_at, updated_at)
     VALUES ($1, $2, $3, $4, NOW(), NOW())`,
    [userId, name, email, restaurantName]
  );
  return rows;
};