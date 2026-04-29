// models/paymentModel.js
const pool = require('../config/configdb');

const PaymentModel = {
  createPayment: async (data) => {
    const { rows } = await pool.query(
      `INSERT INTO payments
         (consumer_id, stakeholder_id, order_id, payment_method, payment_status,
          amount, transaction_id, bkash_payment_id, currency, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())
       RETURNING id`,
      [
        data.consumer_id,
        data.stakeholder_id,
        data.order_id || null,
        data.payment_method,
        data.payment_status || 'pending',
        data.amount,
        data.transaction_id || null,
        data.bkash_payment_id || null,
        data.currency || 'BDT',
      ]
    );
    return { id: rows[0].id, ...data };
  },

  updatePaymentStatus: async (paymentId, statusData) => {
    const { rows } = await pool.query(
      `UPDATE payments
       SET payment_status = $1, transaction_id = $2, bkash_transaction_id = $3, updated_at = NOW()
       WHERE id = $4`,
      [
        statusData.payment_status,
        statusData.transaction_id || null,
        statusData.bkash_transaction_id || null,
        paymentId,
      ]
    );
    return rows;
  },

  getPaymentById: async (paymentId) => {
    const { rows } = await pool.query('SELECT * FROM payments WHERE id = $1', [paymentId]);
    return rows[0];
  },

  getPaymentByBkashId: async (bkashPaymentId) => {
    const { rows } = await pool.query(
      'SELECT * FROM payments WHERE bkash_payment_id = $1',
      [bkashPaymentId]
    );
    return rows[0];
  },

  getPaymentsByConsumer: async (consumerId) => {
    const { rows } = await pool.query(
      `SELECT p.*, o.order_type, o.total_amount AS order_amount
       FROM payments p
       LEFT JOIN orders o ON p.order_id = o.id
       WHERE p.consumer_id = $1
       ORDER BY p.created_at DESC`,
      [consumerId]
    );
    return rows;
  },
};

module.exports = PaymentModel;