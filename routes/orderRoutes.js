const express = require('express');
const router = express.Router();
const orderController = require('../controllers/orderController');

// 🔥 DEBUG: Get all orders without filters
router.get('/debug/all', orderController.debugGetAllOrders);

// Get orders for a stakeholder with date filter (query params)
router.get('/', orderController.getOrdersByStakeholderWithDate);

// Get pickup orders for a stakeholder with date filter
router.get('/pickups', orderController.getPickupOrdersByStakeholderWithDate);

// Create a new order
router.post('/create', orderController.createOrder);

// Get orders for a consumer
router.get('/consumer/:consumer_id', orderController.getConsumerOrders);

// Get orders for a stakeholder (restaurant)
router.get('/stakeholder/:stakeholder_id', orderController.getStakeholderOrders);

// Update order status
router.put('/status/:order_id', orderController.updateOrderStatus);

// Link payment to order (after bKash payment)
router.post('/link-payment', orderController.linkPaymentToOrder);

// 🔥 NEW: Delivery-specific routes
// Update delivery status
router.put('/delivery-status/:order_id', orderController.updateDeliveryStatus);

// Get delivery tracking history
router.get('/tracking/:order_id', orderController.getTrackingHistory);

// Manual rider assignment
router.post('/assign-rider', orderController.assignRiderManually);

module.exports = router;
