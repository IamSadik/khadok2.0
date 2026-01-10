const db = require('../config/configdb');

// Create a new order
exports.createOrder = async (orderData) => {
  const sql = `
    INSERT INTO orders (
      consumer_id, stakeholder_id, order_type, order_status, payment_status,
      payment_method, subtotal, delivery_fee, service_fee, total_amount,
      delivery_address, delivery_lat, delivery_lng, 
      restaurant_lat, restaurant_lng, delivery_status, estimated_delivery_time,
      pickup_time, notes
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
    orderData.delivery_lat || null,
    orderData.delivery_lng || null,
    orderData.restaurant_lat || null,
    orderData.restaurant_lng || null,
    orderData.delivery_status || null,
    orderData.estimated_delivery_time || null,
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
    INSERT INTO order_items (order_id, menu_id, item_name, item_price, quantity, subtotal, category)
    VALUES ?
  `;

  const values = orderItems.map(item => [
    item.order_id,
    item.menu_id,
    item.item_name,
    item.item_price,
    item.quantity,
    item.subtotal,
    item.category 
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
      s.picture as logo_url
    FROM orders o
    LEFT JOIN stakeholder s ON o.stakeholder_id = s.stakeholder_id
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
      c.name as consumer_name,
      c.number as consumer_phone
    FROM orders o
    LEFT JOIN consumer c ON o.consumer_id = c.consumer_id
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

// 🔥 NEW: Get orders by stakeholder with date filter
exports.getOrdersByStakeholderWithDate = async (stakeholder_id, dateFilter = 'today', orderType = 'delivery') => {
  // Build date condition based on filter
  let dateCondition = '';
  switch(dateFilter) {
    case 'today':
      dateCondition = 'DATE(o.created_at) = CURDATE()';
      break;
    case 'yesterday':
      dateCondition = 'DATE(o.created_at) = DATE_SUB(CURDATE(), INTERVAL 1 DAY)';
      break;
    case 'week':
      dateCondition = 'o.created_at >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)';
      break;
    case 'month':
      dateCondition = 'o.created_at >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)';
      break;
    case 'all':
    default:
      dateCondition = '1=1'; // No date filter
      break;
  }

  const sql = `
    SELECT 
      o.*,
      c.name as consumer_name,
      c.number as consumer_phone,
      r.name as rider_name,
      r.number as rider_phone,
      r.vehicle_type
    FROM orders o
    LEFT JOIN consumer c ON o.consumer_id = c.consumer_id
    LEFT JOIN rider r ON o.rider_id = r.rider_id
    WHERE o.stakeholder_id = ? 
      AND o.order_type = ?
      AND ${dateCondition}
    ORDER BY o.created_at DESC
  `;

  return new Promise((resolve, reject) => {
    db.query(sql, [stakeholder_id, orderType], (err, orders) => {
      if (err) {
        console.error('Get stakeholder orders with date filter error:', err);
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

// 🔥 NEW: Get restaurant coordinates
exports.getRestaurantCoordinates = async (stakeholder_id) => {
  const sql = `SELECT lat, lng FROM stakeholder WHERE stakeholder_id = ?`;

  return new Promise((resolve, reject) => {
    db.query(sql, [stakeholder_id], (err, results) => {
      if (err) {
        console.error('Get restaurant coordinates error:', err);
        return reject(err);
      }
      resolve(results[0] || null);
    });
  });
};

// 🔥 NEW: Get order by ID
exports.getOrderById = async (order_id) => {
  const sql = `
    SELECT 
      o.*,
      s.restaurant_name,
      s.address as restaurant_address,
      s.picture as restaurant_logo,
      s.lat as restaurant_lat,
      s.lng as restaurant_lng,
      s.number as restaurant_phone,
      c.name as consumer_name,
      c.number as consumer_phone,
      r.name as rider_name,
      r.number as rider_phone,
      r.vehicle_type,
      r.current_lat as rider_lat,
      r.current_lng as rider_lng
    FROM orders o
    LEFT JOIN stakeholder s ON o.stakeholder_id = s.stakeholder_id
    LEFT JOIN consumer c ON o.consumer_id = c.consumer_id
    LEFT JOIN rider r ON o.rider_id = r.rider_id
    WHERE o.id = ?
  `;

  return new Promise((resolve, reject) => {
    db.query(sql, [order_id], (err, results) => {
      if (err) {
        console.error('Get order by ID error:', err);
        return reject(err);
      }
      resolve(results[0] || null);
    });
  });
};

// 🔥 NEW: Get order items by order ID
exports.getOrderItems = async (order_id) => {
  const sql = `SELECT * FROM order_items WHERE order_id = ? ORDER BY id`;

  return new Promise((resolve, reject) => {
    db.query(sql, [order_id], (err, results) => {
      if (err) {
        console.error('Get order items error:', err);
        return reject(err);
      }
      resolve(results || []);
    });
  });
};

// 🔥 NEW: Create delivery tracking entry
exports.createTrackingEntry = async (order_id, rider_id, status, notes) => {
  const sql = `
    INSERT INTO delivery_tracking (order_id, rider_id, status, notes, latitude, longitude)
    SELECT ?, ?, ?, ?, current_lat, current_lng
    FROM rider WHERE rider_id = ?
  `;

  // If no rider_id, insert with NULL coordinates
  const simpleSql = `
    INSERT INTO delivery_tracking (order_id, rider_id, status, notes)
    VALUES (?, ?, ?, ?)
  `;

  return new Promise((resolve, reject) => {
    if (rider_id) {
      db.query(sql, [order_id, rider_id, status, notes, rider_id], (err, result) => {
        if (err) {
          console.error('Create tracking entry error:', err);
          return reject(err);
        }
        resolve(result);
      });
    } else {
      db.query(simpleSql, [order_id, null, status, notes], (err, result) => {
        if (err) {
          console.error('Create tracking entry error:', err);
          return reject(err);
        }
        resolve(result);
      });
    }
  });
};

// 🔥 NEW: Get available riders near restaurant
exports.getAvailableRiders = async (restaurant_lat, restaurant_lng, radius_km) => {
  const sql = `
    SELECT 
      rider_id,
      name,
      number,
      email,
      lat,
      lng,
      current_lat,
      current_lng,
      status,
      total_deliveries,
      rating,
      vehicle_type,
      (6371 * acos(cos(radians(?)) * cos(radians(COALESCE(current_lat, lat))) * 
       cos(radians(COALESCE(current_lng, lng)) - radians(?)) + 
       sin(radians(?)) * sin(radians(COALESCE(current_lat, lat))))) AS distance_to_restaurant
    FROM rider
    WHERE status = 'available' 
      AND is_active = 1 
      AND is_verified = 1
    HAVING distance_to_restaurant < ?
    ORDER BY distance_to_restaurant ASC, rating DESC
    LIMIT 10
  `;

  return new Promise((resolve, reject) => {
    db.query(sql, [restaurant_lat, restaurant_lng, restaurant_lat, radius_km], (err, results) => {
      if (err) {
        console.error('Get available riders error:', err);
        return reject(err);
      }
      resolve(results || []);
    });
  });
};

// 🔥 NEW: Assign rider to order
exports.assignRider = async (order_id, rider_id) => {
  const sql = `
    UPDATE orders 
    SET rider_id = ?, delivery_status = 'assigned', rider_assigned_at = NOW()
    WHERE id = ?
  `;

  return new Promise((resolve, reject) => {
    db.query(sql, [rider_id, order_id], (err, result) => {
      if (err) {
        console.error('Assign rider error:', err);
        return reject(err);
      }
      resolve(result);
    });
  });
};

// 🔥 NEW: Update rider status
exports.updateRiderStatus = async (rider_id, status) => {
  const sql = `UPDATE rider SET status = ? WHERE rider_id = ?`;

  return new Promise((resolve, reject) => {
    db.query(sql, [status, rider_id], (err, result) => {
      if (err) {
        console.error('Update rider status error:', err);
        return reject(err);
      }
      resolve(result);
    });
  });
};

// 🔥 NEW: Get rider by ID
exports.getRiderById = async (rider_id) => {
  const sql = `SELECT * FROM rider WHERE rider_id = ?`;

  return new Promise((resolve, reject) => {
    db.query(sql, [rider_id], (err, results) => {
      if (err) {
        console.error('Get rider by ID error:', err);
        return reject(err);
      }
      resolve(results[0] || null);
    });
  });
};

// 🔥 NEW: Update delivery status
exports.updateDeliveryStatus = async (order_id, delivery_status) => {
  const sql = `UPDATE orders SET delivery_status = ? WHERE id = ?`;

  return new Promise((resolve, reject) => {
    db.query(sql, [delivery_status, order_id], (err, result) => {
      if (err) {
        console.error('Update delivery status error:', err);
        return reject(err);
      }
      resolve(result);
    });
  });
};

// 🔥 NEW: Update pickup time
exports.updatePickupTime = async (order_id) => {
  const sql = `UPDATE orders SET picked_up_at = NOW() WHERE id = ?`;

  return new Promise((resolve, reject) => {
    db.query(sql, [order_id], (err, result) => {
      if (err) {
        console.error('Update pickup time error:', err);
        return reject(err);
      }
      resolve(result);
    });
  });
};

// 🔥 NEW: Complete delivery
exports.completeDelivery = async (order_id) => {
  const sql = `
    UPDATE orders 
    SET delivery_status = 'delivered', 
        delivered_at = NOW(),
        order_status = 'completed',
        actual_delivery_time = TIMESTAMPDIFF(MINUTE, created_at, NOW())
    WHERE id = ?
  `;

  return new Promise((resolve, reject) => {
    db.query(sql, [order_id], (err, result) => {
      if (err) {
        console.error('Complete delivery error:', err);
        return reject(err);
      }
      resolve(result);
    });
  });
};

// 🔥 NEW: Get tracking history
exports.getTrackingHistory = async (order_id) => {
  const sql = `
    SELECT 
      dt.*,
      r.name as rider_name,
      r.number as rider_phone
    FROM delivery_tracking dt
    LEFT JOIN rider r ON dt.rider_id = r.rider_id
    WHERE dt.order_id = ?
    ORDER BY dt.created_at ASC
  `;

  return new Promise((resolve, reject) => {
    db.query(sql, [order_id], (err, results) => {
      if (err) {
        console.error('Get tracking history error:', err);
        return reject(err);
      }
      resolve(results || []);
    });
  });
};

// 🔥 NEW: Create rider earning
exports.createRiderEarning = async (earningData) => {
  const sql = `
    INSERT INTO rider_earnings (
      rider_id, order_id, delivery_fee, rider_commission, platform_fee,
      bonus_amount, net_earning, delivery_distance, delivery_time
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;

  const values = [
    earningData.rider_id,
    earningData.order_id,
    earningData.delivery_fee,
    earningData.rider_commission,
    earningData.platform_fee,
    earningData.bonus_amount,
    earningData.net_earning,
    earningData.delivery_distance,
    earningData.delivery_time
  ];

  return new Promise((resolve, reject) => {
    db.query(sql, values, (err, result) => {
      if (err) {
        console.error('Create rider earning error:', err);
        return reject(err);
      }
      resolve(result);
    });
  });
};

// 🔥 NEW: Update rider statistics
exports.updateRiderStats = async (rider_id, delivery_time) => {
  const sql = `
    UPDATE rider 
    SET total_deliveries = total_deliveries + 1,
        successful_deliveries = successful_deliveries + 1,
        average_delivery_time = (
          (COALESCE(average_delivery_time, 0) * total_deliveries + ?) / (total_deliveries + 1)
        ),
        status = 'available'
    WHERE rider_id = ?
  `;

  return new Promise((resolve, reject) => {
    db.query(sql, [delivery_time, rider_id], (err, result) => {
      if (err) {
        console.error('Update rider stats error:', err);
        return reject(err);
      }
      resolve(result);
    });
  });
};

// 🔥 NEW: Get orders by rider
exports.getOrdersByRider = async (rider_id) => {
  const sql = `
    SELECT 
      o.*,
      s.restaurant_name,
      s.picture as logo_url,
      s.lat as restaurant_lat,
      s.lng as restaurant_lng,
      c.name as consumer_name,
      c.number as consumer_phone
    FROM orders o
    LEFT JOIN stakeholder s ON o.stakeholder_id = s.stakeholder_id
    LEFT JOIN consumer c ON o.consumer_id = c.consumer_id
    WHERE o.rider_id = ?
    ORDER BY o.created_at DESC
  `;

  return new Promise((resolve, reject) => {
    db.query(sql, [rider_id], (err, results) => {
      if (err) {
        console.error('Get orders by rider error:', err);
        return reject(err);
      }
      resolve(results || []);
    });
  });
};

// 🔥 NEW: Get orders by rider and status
exports.getOrdersByRiderAndStatus = async (rider_id, status) => {
  const sql = `
    SELECT 
      o.*,
      s.restaurant_name,
      s.picture as logo_url,
      s.lat as restaurant_lat,
      s.lng as restaurant_lng,
      c.name as consumer_name,
      c.number as consumer_phone
    FROM orders o
    LEFT JOIN stakeholder s ON o.stakeholder_id = s.stakeholder_id
    LEFT JOIN consumer c ON o.consumer_id = c.consumer_id
    WHERE o.rider_id = ? AND o.delivery_status = ?
    ORDER BY o.created_at DESC
  `;

  return new Promise((resolve, reject) => {
    db.query(sql, [rider_id, status], (err, results) => {
      if (err) {
        console.error('Get orders by rider and status error:', err);
        return reject(err);
      }
      resolve(results || []);
    });
  });
};

// 🔥 DEBUG: Get ALL orders for stakeholder without any filters
exports.debugGetAllOrdersByStakeholder = async (stakeholder_id) => {
  const sql = `
    SELECT 
      o.id,
      o.order_type,
      o.order_status,
      o.created_at,
      o.total_amount,
      c.name as consumer_name
    FROM orders o
    LEFT JOIN consumer c ON o.consumer_id = c.consumer_id
    WHERE o.stakeholder_id = ?
    ORDER BY o.created_at DESC
    LIMIT 20
  `;

  return new Promise((resolve, reject) => {
    db.query(sql, [stakeholder_id], (err, results) => {
      if (err) {
        console.error('Debug get all orders error:', err);
        return reject(err);
      }
      resolve(results || []);
    });
  });
};

// 🔥 NEW: Get today's orders by rider
exports.getTodayOrdersByRider = async (rider_id) => {
  const sql = `
    SELECT *
    FROM orders
    WHERE rider_id = ? 
      AND DATE(created_at) = CURDATE()
    ORDER BY created_at DESC
  `;

  return new Promise((resolve, reject) => {
    db.query(sql, [rider_id], (err, results) => {
      if (err) {
        console.error('Get today orders by rider error:', err);
        return reject(err);
      }
      resolve(results || []);
    });
  });
};

// 🔥 NEW: Update order rider assignment
exports.updateOrderRider = async (order_id, rider_id) => {
  const sql = `
    UPDATE orders 
    SET rider_id = ?, delivery_status = 'assigned', rider_assigned_at = NOW()
    WHERE id = ?
  `;

  return new Promise((resolve, reject) => {
    db.query(sql, [rider_id, order_id], (err, result) => {
      if (err) {
        console.error('Update order rider error:', err);
        return reject(err);
      }
      resolve(result);
    });
  });
};

// 🔥 NEW: Get delivery history for rider
exports.getDeliveryHistory = async (rider_id, limit = 50) => {
  const sql = `
    SELECT 
      o.*,
      s.restaurant_name,
      s.picture as logo_url,
      c.name as consumer_name
    FROM orders o
    LEFT JOIN stakeholder s ON o.stakeholder_id = s.stakeholder_id
    LEFT JOIN consumer c ON o.consumer_id = c.consumer_id
    WHERE o.rider_id = ? AND o.delivery_status IN ('delivered', 'cancelled')
    ORDER BY o.created_at DESC
    LIMIT ?
  `;

  return new Promise((resolve, reject) => {
    db.query(sql, [rider_id, limit], (err, results) => {
      if (err) {
        console.error('Get delivery history error:', err);
        return reject(err);
      }
      resolve(results || []);
    });
  });
};

// 🔥 NEW: Add order note
exports.addOrderNote = async (order_id, note) => {
  const sql = `
    UPDATE orders 
    SET notes = CONCAT(COALESCE(notes, ''), '\n', ?)
    WHERE id = ?
  `;

  return new Promise((resolve, reject) => {
    db.query(sql, [note, order_id], (err, result) => {
      if (err) {
        console.error('Add order note error:', err);
        return reject(err);
      }
      resolve(result);
    });
  });
};

// 🔥 NEW: Get recent orders by rider with full details
exports.getRecentOrdersByRider = async (rider_id, limit = 20, statusFilter = null) => {
  let whereClause = 'WHERE o.rider_id = ?';
  
  // Add status filter if provided
  if (statusFilter === 'active') {
    whereClause += ` AND o.delivery_status IN ('assigned', 'picked_up', 'out_for_delivery', 'arrived')`;
  } else if (statusFilter === 'completed') {
    whereClause += ` AND o.delivery_status = 'delivered' AND o.order_status = 'completed'`;
  } else if (statusFilter === 'cancelled') {
    whereClause += ` AND o.order_status = 'cancelled'`;
  }
  
  const sql = `
    SELECT 
      o.*,
      s.restaurant_name,
      s.address as restaurant_address,
      s.picture as restaurant_logo,
      s.lat as restaurant_lat,
      s.lng as restaurant_lng,
      s.number as restaurant_phone,
      c.name as consumer_name,
      c.number as consumer_phone,
      c.picture as consumer_picture,
      c.address as consumer_address
    FROM orders o
    LEFT JOIN stakeholder s ON o.stakeholder_id = s.stakeholder_id
    LEFT JOIN consumer c ON o.consumer_id = c.consumer_id
    ${whereClause}
    ORDER BY o.created_at DESC
    LIMIT ?
  `;

  return new Promise((resolve, reject) => {
    db.query(sql, [rider_id, limit], (err, orders) => {
      if (err) {
        console.error('Get recent orders by rider error:', err);
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

// 🔥 NEW: Get active orders by rider (orders in progress)
exports.getActiveOrdersByRider = async (rider_id) => {
  const sql = `
    SELECT 
      o.*,
      s.restaurant_name,
      s.address as restaurant_address,
      s.picture as restaurant_logo,
      s.lat as restaurant_lat,
      s.lng as restaurant_lng,
      s.number as restaurant_phone,
      c.name as consumer_name,
      c.number as consumer_phone,
      c.picture as consumer_picture,
      c.address as consumer_address,
      c.lat as consumer_lat,
      c.lng as consumer_lng
    FROM orders o
    LEFT JOIN stakeholder s ON o.stakeholder_id = s.stakeholder_id
    LEFT JOIN consumer c ON o.consumer_id = c.consumer_id
    WHERE o.rider_id = ? 
      AND o.delivery_status IN ('assigned', 'picked_up', 'out_for_delivery', 'arrived')
      AND o.order_status NOT IN ('cancelled', 'completed')
    ORDER BY o.created_at ASC
  `;

  return new Promise((resolve, reject) => {
    db.query(sql, [rider_id], (err, orders) => {
      if (err) {
        console.error('Get active orders by rider error:', err);
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

module.exports = exports;
