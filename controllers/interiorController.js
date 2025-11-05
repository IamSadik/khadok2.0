const interiorModel = require('../models/interiorModel');


//Add Tables
const addTables = (req, res) => {
  const { stakeholder_id, tables } = req.body;

  if (!stakeholder_id || !Array.isArray(tables)) {
    return res.status(400).json({ success: false, message: 'Invalid input data' });
  }

  let completed = 0;
  const errors = [];

  tables.forEach(({ table_type, quantity }) => {
    interiorModel.addTableToDB(stakeholder_id, table_type, quantity, (err) => {
      if (err) {
        errors.push({ table_type, error: err });
      }
      completed++;

      if (completed === tables.length) {
        if (errors.length > 0) {
          return res.status(500).json({ success: false, message: 'Some updates failed', errors });
        } else {
          return res.status(200).json({ success: true, message: 'Tables added/updated successfully' });
        }
      }
    });
  });
};


// Remove Tables
const removeTables = (req, res) => {
  const { stakeholder_id, tables } = req.body;

  if (!stakeholder_id || !Array.isArray(tables)) {
    return res.status(400).json({ error: 'Invalid input data' });
  }

  let completed = 0;
  const errors = [];

  tables.forEach(({ table_type, quantity }) => {
    interiorModel.removeTableFromDB(stakeholder_id, table_type, quantity, (err, result) => {
      if (err || result.affectedRows === 0) {
        errors.push({
          table_type,
          error: err ? err.message : 'Not enough tables to remove'
        });
      }

      completed++;

      if (completed === tables.length) {
        if (errors.length > 0) {
          return res.status(400).json({ success: false, message: 'Check table type or quantity carefully', errors });
        } else {
          return res.status(200).json({ success: true, message: 'Tables removed successfully' });
        }
      }
    });
  });
};


const getTableSummary = (req, res) => {
  const stakeholderId = req.query.stakeholder_id;

  if (!stakeholderId) {
    return res.status(400).json({ success: false, message: 'Missing stakeholder_id' });
  }

  interiorModel.fetchTableSummary(stakeholderId, (err, results) => {
    if (err) {
      console.error("Error in controller (getTableSummary):", err);
      return res.status(500).json({ success: false, message: 'Internal server error' });
    }

    res.status(200).json({ success: true, tables: results });
  });
};



module.exports = {
  addTables,
  removeTables,
  getTableSummary
};


