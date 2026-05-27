const pool = require('../config/configdb');

const attachOrderItems = async (orders) => {
  if (!orders || orders.length === 0) {
    return [];
  }

  const orderIds = orders.map((order) => order.id);
  const { rows: items } = await pool.query(
    'SELECT * FROM order_items WHERE order_id = ANY($1) ORDER BY order_id',
    [orderIds]
  );

  const itemsByOrder = {};
  items.forEach((item) => {
    if (!itemsByOrder[item.order_id]) {
      itemsByOrder[item.order_id] = [];
    }
    itemsByOrder[item.order_id].push(item);
  });

  orders.forEach((order) => {
    order.items = itemsByOrder[order.id] || [];
  });

  return orders;
};

const buildBulkInsert = (items, columnCount) => {
  const values = [];
  const placeholders = items.map((item, index) => {
    const offset = index * columnCount;
    return `(${Array.from({ length: columnCount }, (_, colIndex) => `$${offset + colIndex + 1}`).join(', ')})`;
  });

  items.forEach((item) => values.push(...item));

  return { placeholders: placeholders.join(', '), values };
};

// Create a new order
exports.createOrder = async (orderData) => {
  const sql = `
    INSERT INTO orders (
      consumer_id, stakeholder_id, order_type, order_status, payment_status,
      payment_method, subtotal, delivery_fee, service_fee, total_amount,
      delivery_address, delivery_lat, delivery_lng,
      restaurant_lat, restaurant_lng, delivery_status, estimated_delivery_time,
      pickup_time, notes
    ) VALUES (
      $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
      $11, $12, $13, $14, $15, $16, $17, $18, $19
    )
    RETURNING id
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

  try {
    const { rows } = await pool.query(sql, values);
    return rows[0]?.id;
  } catch (err) {
    console.error('Create order error:', err);
    throw err;
  }
};

// Create order items
exports.createOrderItems = async (orderItems) => {
  if (!orderItems || orderItems.length === 0) {
    return { rowCount: 0 };
  }

  const columns = 7;
  const valuesArray = orderItems.map((item) => [
    item.order_id,
    item.menu_id,
    item.item_name,
    item.item_price,
    item.quantity,
    item.subtotal,
    item.category
  ]);

  const { placeholders, values } = buildBulkInsert(valuesArray, columns);
  const sql = `
    INSERT INTO order_items (order_id, menu_id, item_name, item_price, quantity, subtotal, category)
    VALUES ${placeholders}
  `;

  try {
    return await pool.query(sql, values);
  } catch (err) {
    console.error('Create order items error:', err);
    throw err;
  }
};

// Get orders by consumer ID
exports.getOrdersByConsumer = async (consumer_id) => {
  const reviewExpiresAt = "o.delivered_at + INTERVAL '45 minutes'";
  const sql = `
    SELECT
      o.*,
      s.restaurant_name,
      s.picture as logo_url,
      rv.review_id,
      rv.rating AS review_rating,
      rv.review_text,
      rv.review_date,
      ${reviewExpiresAt} AS review_expires_at,
      CASE
        WHEN o.order_type = 'delivery'
          AND o.order_status = 'completed'
          AND o.delivery_status = 'delivered'
          AND o.delivered_at IS NOT NULL
          AND rv.review_id IS NULL
          AND NOW() <= ${reviewExpiresAt}
        THEN 1 ELSE 0
      END AS can_review,
      GREATEST(
        CEIL(EXTRACT(EPOCH FROM (${reviewExpiresAt} - NOW())) / 60.0),
        0
      )::int AS review_minutes_left
    FROM orders o
    LEFT JOIN stakeholder s ON o.stakeholder_id = s.stakeholder_id
    LEFT JOIN (
      SELECT r.order_id, r.review_id, r.rating, r.review_text, r.review_date
      FROM review r
      INNER JOIN (
        SELECT order_id, MAX(review_id) AS max_review_id
        FROM review
        GROUP BY order_id
      ) latest ON latest.max_review_id = r.review_id
    ) rv ON rv.order_id = o.id
    WHERE o.consumer_id = $1
    ORDER BY o.created_at DESC
  `;

  try {
    const { rows: orders } = await pool.query(sql, [consumer_id]);
    return await attachOrderItems(orders);
  } catch (err) {
    console.error('Get consumer orders error:', err);
    throw err;
  }
};

// Get an order with review eligibility context for one consumer.
exports.getOrderForReview = async (order_id, consumer_id) => {
  const sql = `
    SELECT
      o.id,
      o.consumer_id,
      o.stakeholder_id,
      o.order_type,
      o.order_status,
      o.delivery_status,
      o.delivered_at,
      rv.review_id
    FROM orders o
    LEFT JOIN (
      SELECT r.order_id, MAX(r.review_id) AS review_id
      FROM review r
      GROUP BY r.order_id
    ) rv ON rv.order_id = o.id
    WHERE o.id = $1 AND o.consumer_id = $2
    LIMIT 1
  `;

  try {
    const { rows } = await pool.query(sql, [order_id, consumer_id]);
    return rows[0] || null;
  } catch (err) {
    console.error('Get order for review error:', err);
    throw err;
  }
};

// Create a review for an order.
exports.createOrderReview = async ({ order_id, stakeholder_id, consumer_id, rating, review_text }) => {
  const nextIdSql = 'SELECT COALESCE(MAX(review_id), 0) + 1 AS next_id FROM review';
  const insertSql = `
    INSERT INTO review (
      review_id, order_id, stakeholder_id, consumer_id, rating, review_text, review_date
    ) VALUES ($1, $2, $3, $4, $5, $6, NOW())
  `;

  try {
    const { rows: idResults } = await pool.query(nextIdSql);
    const nextId = idResults?.[0]?.next_id || 1;
    const safeText = review_text ? String(review_text).trim().slice(0, 100) : null;

    await pool.query(
      insertSql,
      [nextId, order_id, stakeholder_id, consumer_id, rating, safeText]
    );

    return {
      review_id: nextId,
      order_id,
      stakeholder_id,
      consumer_id,
      rating,
      review_text: safeText,
    };
  } catch (err) {
    console.error('Create order review error:', err);
    throw err;
  }
};

// Recalculate and persist stakeholder average rating.
exports.refreshStakeholderRating = async (stakeholder_id) => {
  const sql = `
    UPDATE stakeholder s
    SET ratings = rv.avg_rating
    FROM (
      SELECT stakeholder_id, ROUND(AVG(rating)::numeric, 2) AS avg_rating
      FROM review
      GROUP BY stakeholder_id
    ) rv
    WHERE s.stakeholder_id = rv.stakeholder_id
      AND s.stakeholder_id = $1
  `;

  try {
    return await pool.query(sql, [stakeholder_id]);
  } catch (err) {
    console.error('Refresh stakeholder rating error:', err);
    throw err;
  }
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
    WHERE o.stakeholder_id = $1
    ORDER BY o.created_at DESC
  `;

  try {
    const { rows: orders } = await pool.query(sql, [stakeholder_id]);
    return await attachOrderItems(orders);
  } catch (err) {
    console.error('Get stakeholder orders error:', err);
    throw err;
  }
};

// 🔥 NEW: Get orders by stakeholder with date filter
exports.getOrdersByStakeholderWithDate = async (stakeholder_id, dateFilter = 'today', orderType = 'delivery') => {
  // Build date condition based on filter
  let dateCondition = '';
  switch(dateFilter) {
    case 'today':
      dateCondition = 'o.created_at::date = CURRENT_DATE';
      break;
    case 'yesterday':
      dateCondition = "o.created_at::date = (CURRENT_DATE - INTERVAL '1 day')";
      break;
    case 'week':
      dateCondition = "o.created_at >= (CURRENT_DATE - INTERVAL '7 day')";
      break;
    case 'month':
      dateCondition = "o.created_at >= (CURRENT_DATE - INTERVAL '30 day')";
      break;
    case 'all':
    default:
      dateCondition = '1=1';
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
    WHERE o.stakeholder_id = $1
      AND o.order_type = $2
      AND ${dateCondition}
    ORDER BY o.created_at DESC
  `;

  try {
    const { rows: orders } = await pool.query(sql, [stakeholder_id, orderType]);
    return await attachOrderItems(orders);
  } catch (err) {
    console.error('Get stakeholder orders with date filter error:', err);
    throw err;
  }
};

// Update order status
exports.updateOrderStatus = async (order_id, order_status) => {
  const sql = `UPDATE orders SET order_status = $1 WHERE id = $2`;

  try {
    return await pool.query(sql, [order_status, order_id]);
  } catch (err) {
    console.error('Update order status error:', err);
    throw err;
  }
};

// Update order payment status
exports.updateOrderPaymentStatus = async (order_id, payment_status) => {
  const sql = `UPDATE orders SET payment_status = $1 WHERE id = $2`;

  try {
    return await pool.query(sql, [payment_status, order_id]);
  } catch (err) {
    console.error('Update payment status error:', err);
    throw err;
  }
};

// Link payment to order
exports.linkPaymentToOrder = async (payment_id, order_id, transaction_id) => {
  const sql = `
    UPDATE payments
    SET order_id = $1, bkash_transaction_id = $2
    WHERE id = $3
  `;

  try {
    return await pool.query(sql, [order_id, transaction_id, payment_id]);
  } catch (err) {
    console.error('Link payment to order error:', err);
    throw err;
  }
};

// 🔥 NEW: Get restaurant coordinates
exports.getRestaurantCoordinates = async (stakeholder_id) => {
  const sql = `SELECT lat, lng FROM stakeholder WHERE stakeholder_id = $1`;

  try {
    const { rows } = await pool.query(sql, [stakeholder_id]);
    return rows[0] || null;
  } catch (err) {
    console.error('Get restaurant coordinates error:', err);
    throw err;
  }
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
    WHERE o.id = $1
  `;

  try {
    const { rows } = await pool.query(sql, [order_id]);
    return rows[0] || null;
  } catch (err) {
    console.error('Get order by ID error:', err);
    throw err;
  }
};

// 🔥 NEW: Get order items by order ID
exports.getOrderItems = async (order_id) => {
  const sql = `SELECT * FROM order_items WHERE order_id = $1 ORDER BY id`;

  try {
    const { rows } = await pool.query(sql, [order_id]);
    return rows || [];
  } catch (err) {
    console.error('Get order items error:', err);
    throw err;
  }
};

// 🔥 NEW: Create delivery tracking entry
exports.createTrackingEntry = async (order_id, rider_id, status, notes) => {
  const sql = `
    INSERT INTO delivery_tracking (order_id, rider_id, status, notes, latitude, longitude)
    SELECT $1, $2, $3, $4, current_lat, current_lng
    FROM rider WHERE rider_id = $2
  `;

  const simpleSql = `
    INSERT INTO delivery_tracking (order_id, rider_id, status, notes)
    VALUES ($1, $2, $3, $4)
  `;

  try {
    if (rider_id) {
      return await pool.query(sql, [order_id, rider_id, status, notes]);
    }

    return await pool.query(simpleSql, [order_id, null, status, notes]);
  } catch (err) {
    console.error('Create tracking entry error:', err);
    throw err;
  }
};

// 🔥 NEW: Get available riders near restaurant
exports.getAvailableRiders = async (restaurant_lat, restaurant_lng, radius_km, options = {}) => {
  const { includeUnverified = false } = options;

  // rider coords are stored as varchar in this DB; cast safely (and treat empty strings as NULL)
  const riderLatExpr = `COALESCE(NULLIF(current_lat, '')::double precision, NULLIF(lat, '')::double precision)`;
  const riderLngExpr = `COALESCE(NULLIF(current_lng, '')::double precision, NULLIF(lng, '')::double precision)`;
  const distanceExpr = `(6371 * acos(
    cos(radians($1::double precision)) * cos(radians(${riderLatExpr})) *
    cos(radians(${riderLngExpr}) - radians($2::double precision)) +
    sin(radians($1::double precision)) * sin(radians(${riderLatExpr}))
  ))`;

  const verificationClause = includeUnverified ? '' : 'AND is_verified = true';

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
      ${distanceExpr} AS distance_to_restaurant
    FROM rider
    WHERE status = 'available'
      AND is_active = true
      ${verificationClause}
      AND ${distanceExpr} < $3
    ORDER BY distance_to_restaurant ASC, rating DESC
    LIMIT 10
  `;

  try {
    const { rows } = await pool.query(sql, [restaurant_lat, restaurant_lng, radius_km]);
    return rows || [];
  } catch (err) {
    console.error('Get available riders error:', err);
    throw err;
  }
};

// 🔥 NEW: Assign rider to order
exports.assignRider = async (order_id, rider_id) => {
  const sql = `
    UPDATE orders
    SET rider_id = $1, delivery_status = 'assigned', rider_assigned_at = NOW()
    WHERE id = $2
  `;

  try {
    return await pool.query(sql, [rider_id, order_id]);
  } catch (err) {
    console.error('Assign rider error:', err);
    throw err;
  }
};

// 🔥 NEW: Update rider status
exports.updateRiderStatus = async (rider_id, status) => {
  const sql = `UPDATE rider SET status = $1 WHERE rider_id = $2`;

  try {
    return await pool.query(sql, [status, rider_id]);
  } catch (err) {
    console.error('Update rider status error:', err);
    throw err;
  }
};

// 🔥 NEW: Get rider by ID
exports.getRiderById = async (rider_id) => {
  const sql = `SELECT * FROM rider WHERE rider_id = $1`;

  try {
    const { rows } = await pool.query(sql, [rider_id]);
    return rows[0] || null;
  } catch (err) {
    console.error('Get rider by ID error:', err);
    throw err;
  }
};

// 🔥 NEW: Update delivery status
exports.updateDeliveryStatus = async (order_id, delivery_status) => {
  const sql = `UPDATE orders SET delivery_status = $1 WHERE id = $2`;

  try {
    return await pool.query(sql, [delivery_status, order_id]);
  } catch (err) {
    console.error('Update delivery status error:', err);
    throw err;
  }
};

// 🔥 NEW: Update pickup time
exports.updatePickupTime = async (order_id) => {
  const sql = `UPDATE orders SET picked_up_at = NOW() WHERE id = $1`;

  try {
    return await pool.query(sql, [order_id]);
  } catch (err) {
    console.error('Update pickup time error:', err);
    throw err;
  }
};

// 🔥 NEW: Complete delivery
exports.completeDelivery = async (order_id) => {
  const sql = `
    UPDATE orders
    SET delivery_status = 'delivered',
        delivered_at = NOW(),
        order_status = 'completed',
        actual_delivery_time = FLOOR(EXTRACT(EPOCH FROM (NOW() - created_at)) / 60)
    WHERE id = $1
  `;

  try {
    return await pool.query(sql, [order_id]);
  } catch (err) {
    console.error('Complete delivery error:', err);
    throw err;
  }
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
    WHERE dt.order_id = $1
    ORDER BY dt.created_at ASC
  `;

  try {
    const { rows } = await pool.query(sql, [order_id]);
    return rows || [];
  } catch (err) {
    console.error('Get tracking history error:', err);
    throw err;
  }
};

// 🔥 NEW: Create rider earning
exports.createRiderEarning = async (earningData) => {
  const sql = `
    INSERT INTO rider_earnings (
      rider_id, order_id, delivery_fee, rider_commission, platform_fee,
      bonus_amount, net_earning, delivery_distance, delivery_time
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
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

  try {
    return await pool.query(sql, values);
  } catch (err) {
    console.error('Create rider earning error:', err);
    throw err;
  }
};

// 🔥 NEW: Update rider statistics
exports.updateRiderStats = async (rider_id, delivery_time) => {
  const sql = `
    UPDATE rider
    SET total_deliveries = total_deliveries + 1,
        successful_deliveries = successful_deliveries + 1,
        average_delivery_time = (
          (COALESCE(average_delivery_time, 0) * total_deliveries + $1) / (total_deliveries + 1)
        ),
        status = 'available'
    WHERE rider_id = $2
  `;

  try {
    return await pool.query(sql, [delivery_time, rider_id]);
  } catch (err) {
    console.error('Update rider stats error:', err);
    throw err;
  }
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
    WHERE o.rider_id = $1
    ORDER BY o.created_at DESC
  `;

  try {
    const { rows } = await pool.query(sql, [rider_id]);
    return rows || [];
  } catch (err) {
    console.error('Get orders by rider error:', err);
    throw err;
  }
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
    WHERE o.rider_id = $1 AND o.delivery_status = $2
    ORDER BY o.created_at DESC
  `;

  try {
    const { rows } = await pool.query(sql, [rider_id, status]);
    return rows || [];
  } catch (err) {
    console.error('Get orders by rider and status error:', err);
    throw err;
  }
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
    WHERE o.stakeholder_id = $1
    ORDER BY o.created_at DESC
    LIMIT 20
  `;

  try {
    const { rows } = await pool.query(sql, [stakeholder_id]);
    return rows || [];
  } catch (err) {
    console.error('Debug get all orders error:', err);
    throw err;
  }
};

// 🔥 NEW: Get today's orders by rider
exports.getTodayOrdersByRider = async (rider_id) => {
  const sql = `
    SELECT *
    FROM orders
    WHERE rider_id = $1
      AND created_at::date = CURRENT_DATE
    ORDER BY created_at DESC
  `;

  try {
    const { rows } = await pool.query(sql, [rider_id]);
    return rows || [];
  } catch (err) {
    console.error('Get today orders by rider error:', err);
    throw err;
  }
};

// 🔥 NEW: Update order rider assignment
exports.updateOrderRider = async (order_id, rider_id) => {
  const sql = `
    UPDATE orders
    SET rider_id = $1, delivery_status = 'assigned', rider_assigned_at = NOW()
    WHERE id = $2
  `;

  try {
    return await pool.query(sql, [rider_id, order_id]);
  } catch (err) {
    console.error('Update order rider error:', err);
    throw err;
  }
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
    WHERE o.rider_id = $1 AND o.delivery_status IN ('delivered', 'cancelled')
    ORDER BY o.created_at DESC
    LIMIT $2
  `;

  try {
    const { rows } = await pool.query(sql, [rider_id, limit]);
    return rows || [];
  } catch (err) {
    console.error('Get delivery history error:', err);
    throw err;
  }
};

// 🔥 NEW: Add order note
exports.addOrderNote = async (order_id, note) => {
  const sql = `
    UPDATE orders
    SET notes = COALESCE(notes, '') || E'\n' || $1
    WHERE id = $2
  `;

  try {
    return await pool.query(sql, [note, order_id]);
  } catch (err) {
    console.error('Add order note error:', err);
    throw err;
  }
};

// 🔥 NEW: Get recent orders by rider with full details
exports.getRecentOrdersByRider = async (rider_id, limit = 20, statusFilter = null) => {
  let whereClause = 'WHERE o.rider_id = $1';
  
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
    LIMIT $2
  `;

  try {
    const { rows: orders } = await pool.query(sql, [rider_id, limit]);
    return await attachOrderItems(orders);
  } catch (err) {
    console.error('Get recent orders by rider error:', err);
    throw err;
  }
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
    WHERE o.rider_id = $1
      AND o.delivery_status IN ('assigned', 'picked_up', 'out_for_delivery', 'arrived')
      AND o.order_status NOT IN ('cancelled', 'completed')
    ORDER BY o.created_at ASC
  `;
  try {
    const { rows: orders } = await pool.query(sql, [rider_id]);
    return await attachOrderItems(orders);
  } catch (err) {
    console.error('Get active orders by rider error:', err);
    throw err;
  }
};
