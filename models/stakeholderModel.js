const db = require('../config/configdb');

const getStakeholderById = (stakeholder_id) => {
  return new Promise((resolve, reject) => {
    db.query(
      'SELECT number FROM stakeholder WHERE stakeholder_id = ?',
      [stakeholder_id],
      (err, results) => {
        if (err) return reject(err);
        resolve(results[0]);
      }
    );
  });
};

const updateStakeholderInfo = ({
  stakeholder_id,
  restaurant_name,
  number,
  address,
  type,
  opens_at,
  closes_at,
  lat,
  lng,
  picture
}) => {
  return new Promise((resolve, reject) => {
    let query = `
      UPDATE stakeholder
      SET
        restaurant_name = ?,
        number          = ?,
        address         = ?,
        type            = ?,
        opens_at        = ?,
        closes_at       = ?,
        lat             = ?,
        lng             = ?,
        updated_at      = NOW()
    `;
    const params = [
      restaurant_name,
      number,
      address,
      type,
      opens_at,
      closes_at,
      lat,
      lng
    ];

    if (picture) {
      query += `, picture = ?`;
      params.push(picture);
    }

    query += ` WHERE stakeholder_id = ?`;
    params.push(stakeholder_id);

    db.query(query, params, (err, result) => {
      if (err) return reject(err);
      resolve(result.affectedRows === 1);
    });
  });
};

module.exports = {
  getStakeholderById,
  updateStakeholderInfo
};
