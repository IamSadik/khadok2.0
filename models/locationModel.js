// models/consumerModel.js
const db = require("../config/configdb");

// get consumer location (lat & lng)
const getConsumerLocation = (consumerId) => {
  return new Promise((resolve, reject) => {
    const query = "SELECT lat, lng FROM consumer WHERE consumer_id = ?";
    db.query(query, [consumerId], (err, results) => {
      if (err) return reject(err);
      if (results.length === 0) return resolve(null);
      resolve(results[0]);
    });
  });
};

module.exports = { getConsumerLocation };
