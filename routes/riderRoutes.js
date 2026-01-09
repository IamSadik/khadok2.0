const express = require('express');
const router = express.Router();
const riderController = require('../controllers/riderController');

// ==================== RIDER PROFILE ROUTES ====================

// Check if rider is first-time user
router.get('/first-time', riderController.checkFirstTime);

// Update rider info (for first-time setup with profile picture)
router.post('/update-info', riderController.uploadProfilePicture, riderController.updateRiderInfo);

// Get rider profile
router.get('/profile/:riderId', riderController.getRiderProfile);

// Update rider profile
router.put('/profile/:riderId', riderController.updateRiderProfile);

// Get rider statistics
router.get('/stats/:riderId', riderController.getRiderStats);

// ==================== RIDER STATUS & LOCATION ROUTES ====================

// Update rider status (available/busy/offline/on_break)
router.post('/status', riderController.updateRiderStatus);

// Update rider location (real-time tracking)
router.post('/location', riderController.updateRiderLocation);

// Update work schedule
router.post('/schedule', riderController.updateWorkSchedule);

// Check if rider is within working hours
router.get('/working-hours', riderController.checkWorkingHours);

// Get available riders near a location (for order assignment)
router.get('/available', riderController.getAvailableRiders);

// ==================== ORDER MANAGEMENT ROUTES ====================

// Get assigned orders for rider
router.get('/orders/:riderId', riderController.getAssignedOrders);

// Get active orders (currently being delivered)
router.get('/active-orders/:riderId', riderController.getActiveOrders);

// Get recent orders with full details (for dashboard)
router.get('/recent-orders/:riderId', riderController.getRecentOrders);

// Get order tracking data (for real-time tracking page)
router.get('/tracking/order/:orderId', riderController.getOrderTrackingData);

// Accept order assignment
router.post('/orders/accept', riderController.acceptOrder);

// Mark order as picked up from restaurant
router.post('/orders/picked-up', riderController.markOrderPickedUp);

// Mark order as out for delivery
router.post('/orders/out-for-delivery', riderController.markOutForDelivery);

// Mark as arrived at delivery location
router.post('/orders/arrived', riderController.markArrived);

// Complete delivery
router.post('/orders/complete', riderController.completeDelivery);

// Cancel order
router.post('/orders/cancel', riderController.cancelOrder);

// Get delivery history
router.get('/history/:riderId', riderController.getDeliveryHistory);

module.exports = router;
