// models/signupModel.js
const pool = require('../config/configdb');
// Check if email already exists
exports.checkEmailExists = (email) => {
    return new Promise((resolve, reject) => {
        const query = `SELECT email FROM users WHERE email = ? LIMIT 1`;
        pool.query(query, [email], (err, results) => {
            if (err) return reject(err);
            resolve(results.length > 0);
        });
    });
};

// User base creation
exports.createUser = (name, email, hashedPassword, role) => {
    return new Promise((resolve, reject) => {
        const query = `
            INSERT INTO users (name, email, password, role, created_at, updated_at)
            VALUES (?, ?, ?, ?, NOW(), NOW())
        `;
        const params = [name, email, hashedPassword, role]; // ✅ Correct parameters
        pool.query(query, params, (err, results) => {
            if (err) return reject(err);
            resolve({ id: results.insertId });
        });
    });
};

// Consumer creation
exports.createConsumer = (userId, name, email) => {
    return new Promise((resolve, reject) => {
        const query = 'INSERT INTO consumer (consumer_id, name, email) VALUES (?, ?, ?)';
        pool.query(query, [userId, name, email], (err, results) => {
            if (err) return reject(err);
            resolve(results.insertId);
        });
    });
};
;

// Rider creation with more details
exports.createRider = (userId, name, email) => {
    return new Promise((resolve, reject) => {
        const query = `
            INSERT INTO rider (rider_id, name, email, created_at, updated_at)
            VALUES (?, ?, ?, NOW(), NOW())
        `;
        const params = [userId, name, email];
        pool.query(query, params, (err, results) => {
            if (err) return reject(err);
            resolve(results);
        });
    });
};


// Stakeholder creation with more details
exports.createStakeholder = (userId, name, email, restaurantName) => {
    return new Promise((resolve, reject) => {
        const query = `
            INSERT INTO stakeholder (stakeholder_id, name, email, restaurant_name, created_at, updated_at)
            VALUES (?, ?, ?, ?, NOW(), NOW())
        `;
        const params = [userId, name, email, restaurantName];
        pool.query(query, params, (err, results) => {
            if (err) return reject(err);
            resolve(results);
        });
    });
};
