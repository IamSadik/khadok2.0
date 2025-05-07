// routes/signupRoutes.js
const express = require('express');
const router = express.Router();

// Import the signup controller functions correctly
const { signupConsumer, riderSignup, stakeholderSignup } = require('../controllers/signupController');

// Route for consumer signup
router.post('/consumer', signupConsumer);

// Route for rider signup
router.post('/rider', riderSignup);

// Route for stakeholder signup
router.post('/stakeholder', stakeholderSignup);

module.exports = router;
