// /models/consumerModel.js
const db = require('../config/configdb');

const getConsumerById = (consumer_id) => {
    return new Promise((resolve, reject) => {
        db.query(
            'SELECT number FROM consumer WHERE consumer_id = ?',
            [consumer_id],
            (err, results) => {
                if (err) return reject(err);
                resolve(results[0]); // First result or undefined
            }
        );
    });
};

const updateConsumerInfo = ({
    consumer_id,
    full_name,
    number,
    address,
    gender,
    age,
    lat,
    lng,
    profile_pic
  }) => {
    return new Promise((resolve, reject) => {
      // Base UPDATE
      let query = `
        UPDATE consumer
        SET
          name        = ?,
          number      = ?,
          address     = ?,
          gender      = ?,
          age         = ?,
          lat         = ?,
          lng         = ?,
          flag        = 1,
          updated_at  = NOW()
      `;
      const params = [full_name, number, address, gender, age, lat, lng];
  
      // optionally update picture
      if (profile_pic) {
        query += `,
          picture = ?
        `;
        params.push(profile_pic);
      }
  
      // finalize WHERE
      query += `
        WHERE consumer_id = ?
      `;
      params.push(consumer_id);
  
      // execute
      db.query(query, params, (err, result) => {
        if (err) return reject(err);
        resolve(result.affectedRows === 1);
      });
    });
  };
  
module.exports = {
    getConsumerById,updateConsumerInfo
};
