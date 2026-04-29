// models/consumerModel.js
const pool = require('../config/configdb');

const getConsumerById = async (consumer_id) => {
  const { rows } = await pool.query(
    'SELECT number FROM consumer WHERE consumer_id = $1',
    [consumer_id]
  );
  return rows[0];
};

const updateConsumerInfo = async ({
  consumer_id,
  full_name,
  number,
  address,
  gender,
  age,
  lat,
  lng,
  profile_pic,
}) => {
  let query = `
    UPDATE consumer
    SET
      name       = $1,
      number     = $2,
      address    = $3,
      gender     = $4,
      age        = $5,
      lat        = $6,
      lng        = $7,
      flag       = true,
      updated_at = NOW()
  `;
  const params = [full_name, number, address, gender, age, lat, lng];

  if (profile_pic) {
    query += `, picture = $${params.length + 1}`;
    params.push(profile_pic);
  }

  query += ` WHERE consumer_id = $${params.length + 1}`;
  params.push(consumer_id);

  const { rowCount } = await pool.query(query, params);
  return rowCount === 1;
};

module.exports = { getConsumerById, updateConsumerInfo };