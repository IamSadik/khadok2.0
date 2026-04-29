// models/interiorModel.js
const pool = require('../config/configdb');
const { v4: uuidv4 } = require('uuid');

// ─── Table management (callback-style for backward compat) ───────────────────

const addTableToDB = (stakeholderId, tableType, quantity, callback) => {
  pool.query(
    'SELECT * FROM interior WHERE stakeholder_id = $1 AND table_type = $2',
    [stakeholderId, tableType]
  )
    .then(({ rows }) => {
      const newQty = parseInt(quantity);
      if (rows.length > 0) {
        const updated = rows[0].quantity + newQty;
        return pool.query(
          'UPDATE interior SET quantity = $1, bookable = $2 WHERE stakeholder_id = $3 AND table_type = $4',
          [updated, updated, stakeholderId, tableType]
        );
      }
      return pool.query(
        'INSERT INTO interior (stakeholder_id, table_type, quantity, bookable, picture) VALUES ($1, $2, $3, $4, NULL)',
        [stakeholderId, tableType, newQty, newQty]
      );
    })
    .then(() => callback(null))
    .catch((err) => callback(err));
};

const removeTableFromDB = (stakeholderId, tableType, tableCount, callback) => {
  pool.query(
    `UPDATE interior
     SET quantity = quantity - $1, bookable = bookable - $2
     WHERE stakeholder_id = $3
       AND table_type = $4
       AND quantity >= $5
       AND bookable >= $6`,
    [tableCount, tableCount, stakeholderId, tableType, tableCount, tableCount]
  )
    .then(({ rowCount }) => callback(null, { affectedRows: rowCount }))
    .catch((err) => callback(err));
};

const fetchTableSummary = (stakeholderId, callback) => {
  pool.query(
    'SELECT table_type, quantity, bookable FROM interior WHERE stakeholder_id = $1',
    [stakeholderId]
  )
    .then(({ rows }) => callback(null, rows))
    .catch((err) => callback(err));
};

// ─── Restaurant interiors (async/await) ──────────────────────────────────────

const create = async (data) => {
  const { stakeholder_id, floor_length, floor_width, floor_height, layout, name } = data;
  const newId = uuidv4();
  await pool.query(
    `INSERT INTO restaurant_interiors (id, stakeholder_id, floor_length, floor_width, floor_height, layout, name)
     VALUES ($1, $2, $3, $4, $5, $6, $7)`,
    [newId, stakeholder_id, floor_length || 10, floor_width || 10, floor_height || 3.0,
     JSON.stringify(layout || {}), name || 'Default Layout']
  );
  return { id: newId, ...data };
};

const update = async (id, data) => {
  const fields = [];
  const values = [];
  for (const key of Object.keys(data)) {
    if (data[key] !== undefined) {
      fields.push(`${key} = $${fields.length + 1}`);
      values.push(key === 'layout' ? JSON.stringify(data[key]) : data[key]);
    }
  }
  if (fields.length === 0) return false;
  values.push(id);
  const { rowCount } = await pool.query(
    `UPDATE restaurant_interiors SET ${fields.join(', ')}, updated_at = NOW() WHERE id = $${values.length}`,
    values
  );
  return rowCount > 0;
};

const softDelete = async (id) => {
  const { rowCount } = await pool.query(
    'UPDATE restaurant_interiors SET is_deleted = true WHERE id = $1',
    [id]
  );
  return rowCount > 0;
};

const getByStakeholder = async (stakeholderId) => {
  const { rows } = await pool.query(
    `SELECT * FROM restaurant_interiors
     WHERE stakeholder_id = $1 AND is_deleted = false
     ORDER BY updated_at DESC LIMIT 1`,
    [stakeholderId]
  );
  return rows[0] || null;
};

// ─── 360° image ───────────────────────────────────────────────────────────────

const checkExistingImage = async (stakeholderId) => {
  const { rows } = await pool.query(
    'SELECT pic FROM interior_pic WHERE stakeholder_id = $1 LIMIT 1',
    [stakeholderId]
  );
  return rows.length > 0 ? rows[0].pic : null;
};

const uploadImageToDB = async (stakeholderId, fileName) => {
  const { rows } = await pool.query(
    'INSERT INTO interior_pic (stakeholder_id, pic) VALUES ($1, $2) RETURNING pic_id',
    [stakeholderId, fileName]
  );
  return rows;
};

const deleteImageFromDB = async (stakeholderId) => {
  const { rows } = await pool.query(
    'DELETE FROM interior_pic WHERE stakeholder_id = $1',
    [stakeholderId]
  );
  return rows;
};

const getImageFromDB = async (stakeholderId) => {
  const { rows } = await pool.query(
    'SELECT pic FROM interior_pic WHERE stakeholder_id = $1 LIMIT 1',
    [stakeholderId]
  );
  return rows.length > 0 ? rows[0].pic : null;
};

module.exports = {
  addTableToDB,
  removeTableFromDB,
  fetchTableSummary,
  create,
  update,
  softDelete,
  getByStakeholder,
  uploadImageToDB,
  getImageFromDB,
  deleteImageFromDB,
  checkExistingImage,
};