// models/authModel.js
const db = require('../config/configdb');

exports.getUserByEmail = (email) => {
    return new Promise((resolve, reject) => {
        const query = 'SELECT user_id, email, password, role FROM users WHERE email = ?';

        db.query(query, [email], (err, results) => {
            if (err) {
                console.error('💥 Error executing query:', err);
                return reject(err);
            }

            if (results.length === 0) {
                return resolve(null); // No user found
            }

            const user = results[0];
            user.id = user.user_id; // Map user_id to id for consistency
            resolve(user);
        });
    });
};
