const db = require('../config/configdb');

// Create a new order
exports.createOrder = async (orderData) => {
  const sql = `
    INSERT INTO orders (
      consumer_id, stakeholder_id, order_type, order_status, payment_status,
      payment_method, subtotal, delivery_fee, service_fee, total_amount,
      delivery_address, pickup_time, notes
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;

  const values = [
    orderData.consumer_id,
    orderData.stakeholder_id,
    orderData.order_type,
    orderData.order_status,
    orderData.payment_status,
    orderData.payment_method,
    orderData.subtotal,
    orderData.delivery_fee,
    orderData.service_fee,
    orderData.total_amount,
    orderData.delivery_address,
    orderData.pickup_time,
    orderData.notes
  ];

  return new Promise((resolve, reject) => {
    db.query(sql, values, (err, result) => {
      if (err) {
        console.error('Create order error:', err);
        return reject(err);
      }
      resolve(result.insertId);
    });
  });
};

// Create order items
exports.createOrderItems = async (orderItems) => {
  const sql = `
    INSERT INTO order_items (order_id, menu_id, item_name, item_price, quantity, subtotal)
    VALUES ?
  `;

  const values = orderItems.map(item => [
    item.order_id,
    item.menu_id,
    item.item_name,
    item.item_price,
    item.quantity,
    item.subtotal
  ]);

  return new Promise((resolve, reject) => {
    db.query(sql, [values], (err, result) => {
      if (err) {
        console.error('Create order items error:', err);
        return reject(err);
      }
      resolve(result);
    });
  });
};

// Get orders by consumer ID
exports.getOrdersByConsumer = async (consumer_id) => {
  const sql = `
    SELECT 
      o.*,
      s.restaurant_name,
      s.logo_url
    FROM orders o
    LEFT JOIN stakeholders s ON o.stakeholder_id = s.stakeholder_id
    WHERE o.consumer_id = ?
    ORDER BY o.created_at DESC
  `;

  return new Promise((resolve, reject) => {
    db.query(sql, [consumer_id], (err, orders) => {
      if (err) {
        console.error('Get consumer orders error:', err);
        return reject(err);
      }

      if (orders.length === 0) {
        return resolve([]);
      }

      // Get order items for each order
      const orderIds = orders.map(o => o.id);
      const itemsSql = `
        SELECT * FROM order_items
        WHERE order_id IN (?)
        ORDER BY order_id
      `;

      db.query(itemsSql, [orderIds], (err, items) => {
        if (err) {
          console.error('Get order items error:', err);
          return reject(err);
        }

        // Group items by order_id
        const itemsByOrder = {};
        items.forEach(item => {
          if (!itemsByOrder[item.order_id]) {
            itemsByOrder[item.order_id] = [];
          }
          itemsByOrder[item.order_id].push(item);
        });

        // Attach items to orders
        orders.forEach(order => {
          order.items = itemsByOrder[order.id] || [];
        });

        resolve(orders);
      });
    });
  });
};

// Get orders by stakeholder ID
exports.getOrdersByStakeholder = async (stakeholder_id) => {
  const sql = `
    SELECT 
      o.*,
      c.consumer_name,
      c.consumer_phone
    FROM orders o
    LEFT JOIN consumers c ON o.consumer_id = c.consumer_id
    WHERE o.stakeholder_id = ?
    ORDER BY o.created_at DESC
  `;

  return new Promise((resolve, reject) => {
    db.query(sql, [stakeholder_id], (err, orders) => {
      if (err) {
        console.error('Get stakeholder orders error:', err);
        return reject(err);
      }

      if (orders.length === 0) {
        return resolve([]);
      }

      // Get order items for each order
      const orderIds = orders.map(o => o.id);
      const itemsSql = `
        SELECT * FROM order_items
        WHERE order_id IN (?)
        ORDER BY order_id
      `;

      db.query(itemsSql, [orderIds], (err, items) => {
        if (err) {
          console.error('Get order items error:', err);
          return reject(err);
        }

        // Group items by order_id
        const itemsByOrder = {};
        items.forEach(item => {
          if (!itemsByOrder[item.order_id]) {
            itemsByOrder[item.order_id] = [];
          }
          itemsByOrder[item.order_id].push(item);
        });

        // Attach items to orders
        orders.forEach(order => {
          order.items = itemsByOrder[order.id] || [];
        });

        resolve(orders);
      });
    });
  });
};

// Update order status
exports.updateOrderStatus = async (order_id, order_status) => {
  const sql = `UPDATE orders SET order_status = ? WHERE id = ?`;

  return new Promise((resolve, reject) => {
    db.query(sql, [order_status, order_id], (err, result) => {
      if (err) {
        console.error('Update order status error:', err);
        return reject(err);
      }
      resolve(result);
    });
  });
};

// Update order payment status
exports.updateOrderPaymentStatus = async (order_id, payment_status) => {
  const sql = `UPDATE orders SET payment_status = ? WHERE id = ?`;

  return new Promise((resolve, reject) => {
    db.query(sql, [payment_status, order_id], (err, result) => {
      if (err) {
        console.error('Update payment status error:', err);
        return reject(err);
      }
      resolve(result);
    });
  });
};

// Link payment to order
exports.linkPaymentToOrder = async (payment_id, order_id, transaction_id) => {
  const sql = `
    UPDATE payments 
    SET order_id = ?, bkash_transaction_id = ?
    WHERE id = ?
  `;

  return new Promise((resolve, reject) => {
    db.query(sql, [order_id, transaction_id, payment_id], (err, result) => {
      if (err) {
        console.error('Link payment to order error:', err);
        return reject(err);
      }
      resolve(result);
    });
  });
};

module.exports = exports;
