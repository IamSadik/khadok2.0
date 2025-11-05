const express = require('express');
const router = express.Router();
const interiorController = require('../controllers/interiorController');

// Add tables
router.post('/add-tables', interiorController.addTables);


// Remove tables
router.post('/remove-tables', interiorController.removeTables);


//Get Tables
router.get('/get-tables', interiorController.getTableSummary);


module.exports = router;
