// models/authModel.js
const pool = require('../config/configdb');

exports.getUserByEmail = async (email) => {
  const { rows } = await pool.query(
    'SELECT user_id, email, password, role FROM users WHERE email = $1',
    [email]
  );
  if (rows.length === 0) return null;
  const user = rows[0];
  user.id = user.user_id;
  return user;
};

exports.isUserRestricted = async (userId, role) => {
  if (role === 'consumer') {
    const { rows } = await pool.query(
      'SELECT flag FROM consumer WHERE consumer_id = $1',
      [userId]
    );
    return rows[0] ? rows[0].flag === false : false;
  }

  if (role === 'stakeholder') {
    const { rows } = await pool.query(
      'SELECT is_restricted FROM stakeholder WHERE stakeholder_id = $1',
      [userId]
    );
    return rows[0] ? rows[0].is_restricted === true : false;
  }

  if (role === 'rider') {
    const { rows } = await pool.query(
      'SELECT is_active FROM rider WHERE rider_id = $1',
      [userId]
    );
    return rows[0] ? rows[0].is_active === false : false;
  }

  return false;
};