const express = require('express');
const router  = express.Router();
const stakeholderController = require('../controllers/stakeholderController');
const upload = require("../middlewares/multerUpload");

// Route for first-time check
router.get('/first-time', stakeholderController.checkFirstTimeLogin);

// UPDATE stakeholder info
router.post(
    '/update-info',
    upload.single('interior_pic'),
    stakeholderController.updateStakeholderInfo
);

// ========== DASHBOARD API ROUTES ==========
// Get stakeholder info
router.get('/info', stakeholderController.getStakeholderInfo);

// Get dashboard orders
router.get('/dashboard/orders', stakeholderController.getDashboardOrders);

// Get dashboard reservations
router.get('/dashboard/reservations', stakeholderController.getDashboardReservations);

// Get revenue data
router.get('/dashboard/revenue', stakeholderController.getRevenueData);

// Get popular items
router.get('/dashboard/popular-items', stakeholderController.getPopularItems);

// Get dashboard statistics (ultra-fast)
router.get('/dashboard/stats', stakeholderController.getDashboardStats);

module.exports = router;
