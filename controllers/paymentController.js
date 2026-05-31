// controllers/paymentController.js
const axios = require('axios');
const config = require('../config/config');
const PaymentModel = require('../models/paymentModel');

let bkashToken = null;
let tokenExpiry = null;

const PaymentController = {
    // Get bKash access token
    getToken: async () => {
        try {
            // Return cached token if still valid
            if (bkashToken && tokenExpiry && Date.now() < tokenExpiry) {
                return bkashToken;
            }

            const { data } = await axios.post(
                `${config.bkash.base_url}/tokenized/checkout/token/grant`,
                {
                    app_key: config.bkash.app_key,
                    app_secret: config.bkash.app_secret
                },
                {
                    headers: {
                        'Content-Type': 'application/json',
                        username: config.bkash.username,
                        password: config.bkash.password
                    }
                }
            );

            bkashToken = data.id_token;
            // Token expires in 1 hour, cache for 55 minutes
            tokenExpiry = Date.now() + (55 * 60 * 1000);
            
            return bkashToken;
        } catch (error) {
            console.error('bKash token error:', error.response?.data || error.message);
            throw new Error('Failed to get bKash token');
        }
    },

    // Create bKash payment
    createPayment: async (req, res) => {
        try {
            const { amount, consumer_id, stakeholder_id, order_type } = req.body;

            // Validate required fields
            if (!amount || !consumer_id || !stakeholder_id) {
                return res.status(400).json({
                    success: false,
                    message: 'Missing required fields'
                });
            }

            // Get bKash token
            const token = await PaymentController.getToken();

            // Create payment request to bKash
            const { data } = await axios.post(
                `${config.bkash.base_url}/tokenized/checkout/create`,
                {
                    mode: '0011', // Wallet payment
                    payerReference: `CONSUMER_${consumer_id}`,
                    callbackURL: config.bkash.callback_url,
                    amount: amount.toString(),
                    currency: 'BDT',
                    intent: 'sale',
                    merchantInvoiceNumber: `INV_${Date.now()}`
                },
                {
                    headers: {
                        'Content-Type': 'application/json',
                        Authorization: token,
                        'X-APP-Key': config.bkash.app_key
                    }
                }
            );

            // Save payment record to database
            const paymentRecord = await PaymentModel.createPayment({
                consumer_id,
                stakeholder_id,
                payment_method: 'bkash',
                payment_status: 'pending',
                amount,
                bkash_payment_id: data.paymentID,
                transaction_id: data.merchantInvoiceNumber
            });

            res.json({
                success: true,
                message: 'Payment created successfully',
                data: {
                    paymentID: data.paymentID,
                    bkashURL: data.bkashURL,
                    paymentRecordId: paymentRecord.id,
                    amount: amount,
                    currency: 'BDT'
                }
            });

        } catch (error) {
            console.error('Create payment error:', error.response?.data || error.message);
            res.status(500).json({
                success: false,
                message: 'Failed to create payment',
                error: error.response?.data || error.message
            });
        }
    },

    // Execute bKash payment
    executePayment: async (req, res) => {
        try {
            const { paymentID } = req.body;

            if (!paymentID) {
                return res.status(400).json({
                    success: false,
                    message: 'Payment ID is required'
                });
            }

            const token = await PaymentController.getToken();

            // Execute payment
            const { data } = await axios.post(
                `${config.bkash.base_url}/tokenized/checkout/execute`,
                { paymentID },
                {
                    headers: {
                        'Content-Type': 'application/json',
                        Authorization: token,
                        'X-APP-Key': config.bkash.app_key
                    }
                }
            );

            // Update payment status in database
            const payment = await PaymentModel.getPaymentByBkashId(paymentID);
            
            if (payment) {
                await PaymentModel.updatePaymentStatus(payment.id, {
                    payment_status: data.transactionStatus === 'Completed' ? 'completed' : 'failed',
                    bkash_transaction_id: data.trxID
                });
            }

            res.json({
                success: true,
                message: 'Payment executed successfully',
                data: {
                    transactionStatus: data.transactionStatus,
                    trxID: data.trxID,
                    amount: data.amount,
                    paymentID: data.paymentID
                }
            });

        } catch (error) {
            console.error('Execute payment error:', error.response?.data || error.message);
            res.status(500).json({
                success: false,
                message: 'Failed to execute payment',
                error: error.response?.data || error.message
            });
        }
    },

    // Query bKash payment status
    queryPayment: async (req, res) => {
        try {
            const { paymentID } = req.params;

            const token = await PaymentController.getToken();

            const { data } = await axios.get(
                `${config.bkash.base_url}/tokenized/checkout/payment/status`,
                {
                    params: { paymentID },
                    headers: {
                        'Content-Type': 'application/json',
                        Authorization: token,
                        'X-APP-Key': config.bkash.app_key
                    }
                }
            );

            res.json({
                success: true,
                data
            });

        } catch (error) {
            console.error('Query payment error:', error.response?.data || error.message);
            res.status(500).json({
                success: false,
                message: 'Failed to query payment',
                error: error.response?.data || error.message
            });
        }
    },

    // Refund bKash payment
    refundPayment: async (req, res) => {
        try {
            const { paymentID, amount, trxID, reason } = req.body;

            if (!paymentID || !amount || !trxID) {
                return res.status(400).json({
                    success: false,
                    message: 'Missing required fields'
                });
            }

            const token = await PaymentController.getToken();

            const { data } = await axios.post(
                `${config.bkash.base_url}/tokenized/checkout/payment/refund`,
                {
                    paymentID,
                    amount: amount.toString(),
                    trxID,
                    sku: 'order_refund',
                    reason: reason || 'Customer requested refund'
                },
                {
                    headers: {
                        'Content-Type': 'application/json',
                        Authorization: token,
                        'X-APP-Key': config.bkash.app_key
                    }
                }
            );

            res.json({
                success: true,
                message: 'Refund processed successfully',
                data
            });

        } catch (error) {
            console.error('Refund payment error:', error.response?.data || error.message);
            res.status(500).json({
                success: false,
                message: 'Failed to process refund',
                error: error.response?.data || error.message
            });
        }
    },

    // bKash callback handler
    handleCallback: async (req, res) => {
        try {
            const { paymentID, status } = req.query;

            console.log('bKash callback received:', { paymentID, status });

            const safePaymentId = encodeURIComponent(paymentID || '');
            const safeStatus = encodeURIComponent(status || '');
            res.redirect(`/consumer/payment-callback.html?paymentID=${safePaymentId}&status=${safeStatus}`);

        } catch (error) {
            console.error('Callback error:', error);
            res.redirect('/payment-error.html');
        }
    },

    // Get payment history for consumer
    getPaymentHistory: async (req, res) => {
        try {
            const { consumer_id } = req.params;

            const payments = await PaymentModel.getPaymentsByConsumer(consumer_id);

            res.json({
                success: true,
                data: payments
            });

        } catch (error) {
            console.error('Get payment history error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to get payment history',
                error: error.message
            });
        }
    }
};

module.exports = PaymentController;
