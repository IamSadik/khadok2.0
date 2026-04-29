// models/stakeholderModel.js
const pool = require('../config/configdb');

const getStakeholderById = async (stakeholder_id) => {
  const { rows } = await pool.query(
    'SELECT * FROM stakeholder WHERE stakeholder_id = $1',
    [stakeholder_id]
  );
  return rows[0];
};

const updateStakeholderInfo = async ({
  stakeholder_id,
  restaurant_name,
  number,
  address,
  type,
  opens_at,
  closes_at,
  lat,
  lng,
  picture,
}) => {
  let query = `
    UPDATE stakeholder
    SET
      restaurant_name = $1,
      number          = $2,
      address         = $3,
      type            = $4,
      opens_at        = $5,
      closes_at       = $6,
      lat             = $7,
      lng             = $8,
      updated_at      = NOW()
  `;
  const params = [restaurant_name, number, address, type, opens_at, closes_at, lat, lng];

  if (picture) {
    query += `, picture = $${params.length + 1}`;
    params.push(picture);
  }

  query += ` WHERE stakeholder_id = $${params.length + 1}`;
  params.push(stakeholder_id);

  const { rowCount } = await pool.query(query, params);
  return rowCount === 1;
};

module.exports = { getStakeholderById, updateStakeholderInfo };