//authRoutes
const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');

// Routes
router.post('/login', authController.login);
router.post('/logout', authController.logout);
router.get('/session-check', authController.checkSession);

module.exports = router;
