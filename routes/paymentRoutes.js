// routes/paymentRoutes.js
const express = require('express');
const router = express.Router();
const PaymentController = require('../controllers/paymentController');

// bKash payment routes
router.post('/bkash/create', PaymentController.createPayment);
router.post('/bkash/execute', PaymentController.executePayment);
router.get('/bkash/query/:paymentID', PaymentController.queryPayment);
router.post('/bkash/refund', PaymentController.refundPayment);
router.get('/bkash/callback', PaymentController.handleCallback);

// Payment history
router.get('/history/:consumer_id', PaymentController.getPaymentHistory);

module.exports = router;
