// config/configdb.js
const mysql = require('mysql');
const config = require('./config');
//const mysql2 = require('mysql2/promise');
// /config/configdb.js


// Create a MySQL connection pool
const pool = mysql.createPool({
    host: process.env.HOST, // Replace with your DB host
    user: process.env.USER,      // Replace with your DB user
    password: process.env.PASSWORD,      // Replace with your DB password
    database: process.env.DATABASE, // Replace with your database name
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

// Export the pool
module.exports = pool;

