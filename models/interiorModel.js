const db = require('../config/configdb');
const util = require("util");

// Add table to DB (or update if exists)
const addTableToDB = (stakeholderId, tableType, quantity, callback) => {
  const checkQuery = `
    SELECT * FROM interior WHERE stakeholder_id = ? AND table_type = ?
  `;

  db.query(checkQuery, [stakeholderId, tableType], (err, results) => {
    if (err) {
      console.error('Error checking table existence:', err);
      return callback(err);
    }

    const newQuantity = parseInt(quantity);

    if (results.length > 0) {
      const existingQuantity = results[0].quantity || 0;
      const updatedQuantity = existingQuantity + newQuantity;

      const updateQuery = `
        UPDATE interior
        SET quantity = ?, bookable = ?
        WHERE stakeholder_id = ? AND table_type = ?
      `;

      db.query(updateQuery, [updatedQuantity, updatedQuantity, stakeholderId, tableType], callback);
    } else {
      const insertQuery = `
        INSERT INTO interior (stakeholder_id, table_type, quantity, bookable, picture)
        VALUES (?, ?, ?, ?, ?)
      `;
      db.query(insertQuery, [stakeholderId, tableType, newQuantity, newQuantity, null], callback);
    }
  });
};


// Remove table from DB (update both quantity and bookable)
const removeTableFromDB = (stakeholderId, tableType, tableCount, callback) => {
  const query = `
    UPDATE interior
    SET quantity = quantity - ?, 
        bookable = bookable - ?
    WHERE stakeholder_id = ? 
      AND table_type = ? 
      AND quantity >= ? 
      AND bookable >= ?
  `;

  db.query(query, [tableCount, tableCount, stakeholderId, tableType, tableCount, tableCount], (err, results) => {
    if (err) {
      console.error('Error removing tables from DB:', err);
      return callback(err);
    }
    callback(null, results);
  });
};


const fetchTableSummary = (stakeholderId, callback) => {
  const query = `
    SELECT table_type, quantity, bookable
    FROM interior
    WHERE stakeholder_id = ?
  `;

  db.query(query, [stakeholderId], (err, results) => {
    if (err) {
      console.error('Error in model (fetchTableSummary):', err);
      return callback(err);
    }
    callback(null, results);
  });
};



const { v4: uuidv4 } = require('uuid');

// Promisify db.query so we can use async/await
const query = util.promisify(db.query).bind(db);

const RestaurantInterior = {
  create: async (data) => {
    const { stakeholder_id, floor_length, floor_width, floor_height, layout, name } = data;
    const sql = `
      INSERT INTO restaurant_interiors 
      (id, stakeholder_id, floor_length, floor_width, floor_height, layout, name)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `;
    const newId = uuidv4();
  
    console.log("Creating interior with:", {
      id: newId,
      stakeholder_id,
      floor_length,
      floor_width,
      floor_height,
      layout,
      name
    });
  
    try {
      const result = await query(sql, [
        newId,
        stakeholder_id,
        floor_length || 10,  // fallback minimal value
        floor_width || 10,   // fallback minimal value
        floor_height || 3.0,
        JSON.stringify(layout || {}),
        name || "Default Layout",
      ]);
      console.log("Insert result:", result);
      return { id: newId, ...data };
    } catch (err) {
      console.error("Failed to insert interior:", err);
      throw err;
    }
  },

  update: async (id, data) => {
    const fields = [];
    const values = [];

    for (const key in data) {
      if (data[key] !== undefined) {
        fields.push(`${key} = ?`);
        values.push(key === "layout" ? JSON.stringify(data[key]) : data[key]);
      }
    }

    if (fields.length === 0) return false;

    const sql = `
      UPDATE restaurant_interiors 
      SET ${fields.join(", ")}, updated_at = CURRENT_TIMESTAMP 
      WHERE id = ?
    `;
    values.push(id);
    const result = await query(sql, values);
    return result.affectedRows > 0;
  },

  softDelete: async (id) => {
    const sql = `UPDATE restaurant_interiors SET is_deleted = 1 WHERE id = ?`;
    const result = await query(sql, [id]);
    return result.affectedRows > 0;
  },
  getByStakeholder: async (stakeholderId) => {
    const sql = `
      SELECT * FROM restaurant_interiors
      WHERE stakeholder_id = ? AND is_deleted = 0
      ORDER BY updated_at DESC LIMIT 1
    `;
    const rows = await query(sql, [stakeholderId]);
    return rows[0];
  },
};


// Check if an image exists for a stakeholder
const checkExistingImage = (stakeholderId) => {
  return new Promise((resolve, reject) => {
    const query = `SELECT pic FROM interior_pic WHERE stakeholder_id = ? LIMIT 1`;
    db.query(query, [stakeholderId], (err, results) => {
      if (err) return reject(err);
      resolve(results.length > 0 ? results[0].pic : null);
    });
  });
};

// Upload image to DB
const uploadImageToDB = (stakeholderId, fileName) => {
  return new Promise((resolve, reject) => {
    const query = `INSERT INTO interior_pic (stakeholder_id, pic) VALUES (?, ?)`;
    db.query(query, [stakeholderId, fileName], (err, results) => {
      if (err) return reject(err);
      resolve(results);
    });
  });
};

// Delete image from DB
const deleteImageFromDB = (stakeholderId) => {
  return new Promise((resolve, reject) => {
    const query = `DELETE FROM interior_pic WHERE stakeholder_id = ?`;
    db.query(query, [stakeholderId], (err, results) => {
      if (err) return reject(err);
      resolve(results);
    });
  });
};

// ----------------------------
// Get image from DB (MySQL version)
// ----------------------------
const getImageFromDB = (stakeholderId) => {
  return new Promise((resolve, reject) => {
    const query = 'SELECT pic FROM interior_pic WHERE stakeholder_id = ? LIMIT 1';
    console.log('Executing query:', query, 'with stakeholder_id:', stakeholderId);

    db.query(query, [stakeholderId], (err, results) => {
      if (err) {
        console.error('Database query error:', err);
        return reject(err);
      }

      console.log('Raw DB results:', results);
      if (Array.isArray(results) && results.length > 0) {
        resolve(results[0].pic);
      } else {
        resolve(null);
      }
    });
  });
};


module.exports = {
  addTableToDB,
  removeTableFromDB,
  fetchTableSummary,
  ...RestaurantInterior,
  uploadImageToDB,
  getImageFromDB,
  deleteImageFromDB,
  checkExistingImage
};
