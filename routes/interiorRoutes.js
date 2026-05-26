const express = require('express');
const multer = require('multer');
const router = express.Router();
const interiorController = require('../controllers/interiorController');
const upload = require('../utils/imageProcessing');

const uploadInteriorImageMiddleware = (req, res, next) => {
	upload.single('interiorImage')(req, res, (err) => {
		if (!err) return next();

		if (err instanceof multer.MulterError && err.code === 'LIMIT_FILE_SIZE') {
			return res.status(400).json({
				success: false,
				message: 'Image is too large. Maximum allowed size is 10 MB.',
			});
		}

		return res.status(400).json({
			success: false,
			message: err.message || 'Image upload failed.',
		});
	});
};

// Add tables
router.post('/add-tables', interiorController.addTables);

// Remove tables
router.post('/remove-tables', interiorController.removeTables);

//Get Tables
router.get('/get-tables', interiorController.getTableSummary);

//Upload 360 image
router.post('/upload-interior-image', uploadInteriorImageMiddleware, interiorController.uploadImage);

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