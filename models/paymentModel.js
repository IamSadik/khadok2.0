// models/paymentModel.js
const pool = require('../config/configdb');

const PaymentModel = {
    // Create a new payment record
    createPayment: (paymentData) => {
        return new Promise((resolve, reject) => {
            const query = `
                INSERT INTO payments 
                (consumer_id, stakeholder_id, order_id, payment_method, payment_status, 
                 amount, transaction_id, bkash_payment_id, currency, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
            `;
            
            pool.query(
                query,
                [
                    paymentData.consumer_id,
                    paymentData.stakeholder_id,
                    paymentData.order_id || null,
                    paymentData.payment_method,
                    paymentData.payment_status || 'pending',
                    paymentData.amount,
                    paymentData.transaction_id || null,
                    paymentData.bkash_payment_id || null,
                    paymentData.currency || 'BDT'
                ],
                (err, results) => {
                    if (err) return reject(err);
                    resolve({ id: results.insertId, ...paymentData });
                }
            );
        });
    },

    // Update payment status
    updatePaymentStatus: (paymentId, statusData) => {
        return new Promise((resolve, reject) => {
            const query = `
                UPDATE payments 
                SET payment_status = ?, 
                    transaction_id = ?,
                    bkash_transaction_id = ?,
                    updated_at = NOW()
                WHERE id = ?
            `;
            
            pool.query(
                query,
                [
                    statusData.payment_status,
                    statusData.transaction_id || null,
                    statusData.bkash_transaction_id || null,
                    paymentId
                ],
                (err, results) => {
                    if (err) return reject(err);
                    resolve(results);
                }
            );
        });
    },

    // Get payment by ID
    getPaymentById: (paymentId) => {
        return new Promise((resolve, reject) => {
            const query = 'SELECT * FROM payments WHERE id = ?';
            pool.query(query, [paymentId], (err, results) => {
                if (err) return reject(err);
                resolve(results[0]);
            });
        });
    },

    // Get payment by bKash payment ID
    getPaymentByBkashId: (bkashPaymentId) => {
        return new Promise((resolve, reject) => {
            const query = 'SELECT * FROM payments WHERE bkash_payment_id = ?';
            pool.query(query, [bkashPaymentId], (err, results) => {
                if (err) return reject(err);
                resolve(results[0]);
            });
        });
    },

    // Get all payments for a consumer
    getPaymentsByConsumer: (consumerId) => {
        return new Promise((resolve, reject) => {
            const query = `
                SELECT p.*, o.order_type, o.total_amount as order_amount
                FROM payments p
                LEFT JOIN orders o ON p.order_id = o.id
                WHERE p.consumer_id = ?
                ORDER BY p.created_at DESC
            `;
            pool.query(query, [consumerId], (err, results) => {
                if (err) return reject(err);
                resolve(results);
            });
        });
    }
};

module.exports = PaymentModel;
