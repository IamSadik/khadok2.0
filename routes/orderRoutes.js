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

// ✅ NEW: Get orders for a consumer (query params for frontend compatibility)
router.get('/consumer', orderController.getConsumerOrdersQuery);

// ✅ NEW: Get pickup orders for a consumer (query params)
router.get('/pickup', orderController.getConsumerPickupOrdersQuery);

// ✅ NEW: Get active delivery orders for a consumer
router.get('/consumer/:consumer_id/active', orderController.getActiveDeliveryOrders);

// ✅ NEW: Get single order by ID (for tracking page)
router.get('/:order_id', orderController.getOrderById);

// Get orders for a consumer (path params - keeping for backward compatibility)
router.get('/consumer/:consumer_id', orderController.getConsumerOrders);

// Get orders for a stakeholder (restaurant)
router.get('/stakeholder/:stakeholder_id', orderController.getStakeholderOrders);

// Update order status
router.put('/status/:order_id', orderController.updateOrderStatus);

// ✅ NEW: Update pickup order status
router.put('/pickup/status/:pickup_id', orderController.updatePickupOrderStatus);

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
