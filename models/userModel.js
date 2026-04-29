const pool = require('../config/configdb');

const getUserById = async (user_id) => {
    const { rows } = await pool.query(
        'SELECT user_id, name, email, password, role FROM users WHERE user_id = $1',
        [user_id]
    );

    return rows[0] || null;
};

const getUserByEmail = async (email) => {
    const { rows } = await pool.query(
        'SELECT user_id, name, email, password, role FROM users WHERE email = $1',
        [email]
    );

    return rows[0] || null;
};

const createUser = async ({ name, email, password, role }) => {
    const { rows } = await pool.query(
        `INSERT INTO users (name, email, password, role, created_at, updated_at)
         VALUES ($1, $2, $3, $4, NOW(), NOW())
         RETURNING user_id`,
        [name, email, password, role]
    );

    return rows[0] || null;
};

const updateUserPassword = async (user_id, hashedPassword) => {
    await pool.query(
        'UPDATE users SET password = $1, updated_at = NOW() WHERE user_id = $2',
        [hashedPassword, user_id]
    );
};

module.exports = {
    getUserById,
    getUserByEmail,
    createUser,
    updateUserPassword,
};
