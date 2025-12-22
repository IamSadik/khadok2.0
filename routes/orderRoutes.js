const express = require('express');
const router = express.Router();
const orderController = require('../controllers/orderController');

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

module.exports = router;
