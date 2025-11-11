// routes/locationRoute.js
const express = require("express");
const { getLocation } = require("../controllers/locationController");

const router = express.Router();

// GET /api/location/:consumerId
router.get("/:consumerId", getLocation);

module.exports = router;
