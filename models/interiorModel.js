const db = require('../config/configdb');

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
    SELECT table_type, quantity
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



module.exports = {
  addTableToDB,
  removeTableFromDB,
  fetchTableSummary
};
