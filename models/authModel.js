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