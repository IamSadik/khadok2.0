const express = require('express');
const router = express.Router();
const interiorController = require('../controllers/interiorController');
const upload = require('../utils/imageProcessing');

// Add tables
router.post('/add-tables', interiorController.addTables);

// Remove tables
router.post('/remove-tables', interiorController.removeTables);

//Get Tables
router.get('/get-tables', interiorController.getTableSummary);

//Upload 360 image
router.post('/upload-interior-image', upload.single('interiorImage'), interiorController.uploadImage);

//Fetch a restaurants 360 image - MOVE THIS BEFORE /:stakeholderId
router.get('/get-interior-image', interiorController.getInteriorImage);

//Delete 360 image
router.delete("/delete-interior-image", interiorController.deleteImage);

// Create new interior
router.post("/", interiorController.createInterior);

// Get interior by stakeholder ID - MOVE THIS AFTER SPECIFIC ROUTES
router.get("/:stakeholderId", interiorController.getInteriorByStakeholder);

// Update interior (auto-save)
router.put("/:id", interiorController.updateInterior);

// Soft delete interior
router.delete("/:id", interiorController.deleteInterior);

module.exports = router;