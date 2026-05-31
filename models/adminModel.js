// models/adminModel.js
const pool = require('../config/configdb');

const findAdminAuthByEmail = async (email) => {
  const usersSql = `
    SELECT user_id, name, email, password, role
    FROM users
    WHERE email = $1
    LIMIT 1
  `;

  const { rows: userRows } = await pool.query(usersSql, [email]);
  if (userRows[0]) {
    return { ...userRows[0], source: 'users' };
  }

  const adminSql = `
    SELECT admin_id, name, email, password
    FROM admin
    WHERE email = $1
    LIMIT 1
  `;

  const { rows: adminRows } = await pool.query(adminSql, [email]);
  if (adminRows[0]) {
    return { ...adminRows[0], role: 'admin', source: 'admin' };
  }

  return null;
};

const createAdminAccount = async ({ name, email, password }) => {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const userInsert = `
      INSERT INTO users (name, email, password, role, created_at, updated_at)
      VALUES ($1, $2, $3, 'admin', NOW(), NOW())
      RETURNING user_id
    `;
    const { rows: userRows } = await client.query(userInsert, [name, email, password]);
    const userId = userRows[0].user_id;

    const adminInsert = `
      INSERT INTO admin (name, email, password)
      VALUES ($1, $2, $3)
      RETURNING admin_id
    `;
    const { rows: adminRows } = await client.query(adminInsert, [name, email, password]);

    await client.query('COMMIT');

    return {
      user_id: userId,
      admin_id: adminRows[0].admin_id,
      name,
      email,
      role: 'admin',
    };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

const getOverview = async () => {
  const sql = `
    SELECT
      (SELECT COUNT(*) FROM consumer) AS consumers,
      (SELECT COUNT(*) FROM stakeholder) AS stakeholders,
      (SELECT COUNT(*) FROM rider) AS riders,
      (SELECT COUNT(*) FROM orders) AS orders,
      (SELECT COUNT(*) FROM payments) AS payments,
      (SELECT COUNT(*) FROM dine_in) AS reservations,
      (SELECT COUNT(*) FROM delivery_issues WHERE resolution_status NOT IN ('resolved', 'unresolved'))
        + (SELECT COUNT(*) FROM dine_in_reports WHERE COALESCE(resolution_status, 'reported') NOT IN ('resolved', 'unresolved')) AS tickets
  `;

  const { rows } = await pool.query(sql);
  return rows[0];
};

const fetchRecentOrders = async () => {
  const sql = `
    SELECT
      o.id,
      o.order_status,
      o.delivery_status,
      o.payment_status,
      o.total_amount,
      o.created_at,
      c.name AS consumer_name,
      s.restaurant_name
    FROM orders o
    LEFT JOIN consumer c ON o.consumer_id = c.consumer_id
    LEFT JOIN stakeholder s ON o.stakeholder_id = s.stakeholder_id
    ORDER BY o.created_at DESC
    LIMIT 10
  `;
  const { rows } = await pool.query(sql);
  return rows;
};

const fetchConsumers = async () => {
  const { rows } = await pool.query(
    `SELECT consumer_id, name, email, number, address, flag, created_at
     FROM consumer
     ORDER BY consumer_id DESC`
  );
  return rows;
};

const fetchStakeholders = async () => {
  const { rows } = await pool.query(`
    SELECT stakeholder_id, name, email, restaurant_name, ratings, address, number, is_restricted, created_at
    FROM stakeholder
    ORDER BY stakeholder_id DESC
  `);
  return rows;
};

const fetchRiders = async () => {
  const { rows } = await pool.query(`
    SELECT rider_id, name, email, number, status, is_active, is_verified, vehicle_type, vehicle_number
    FROM rider
    ORDER BY rider_id DESC
  `);
  return rows;
};

const updateRiderStatus = async (rider_id, { is_active, is_verified, status }) => {
  const fields = [];
  const values = [];
  let index = 1;

  if (is_active !== undefined) {
    fields.push(`is_active = $${index++}`);
    values.push(is_active);
  }

  if (is_verified !== undefined) {
    fields.push(`is_verified = $${index++}`);
    values.push(is_verified);
  }

  if (status) {
    fields.push(`status = $${index++}`);
    values.push(status);
  }

  if (fields.length === 0) return false;

  values.push(rider_id);
  const sql = `UPDATE rider SET ${fields.join(', ')} WHERE rider_id = $${index}`;
  const { rowCount } = await pool.query(sql, values);
  return rowCount === 1;
};

const fetchOrders = async () => {
  const sql = `
    SELECT
      o.id,
      o.order_type,
      o.order_status,
      o.delivery_status,
      o.payment_status,
      o.payment_method,
      o.total_amount,
      o.created_at,
      c.name AS consumer_name,
      s.restaurant_name,
      o.rider_id
    FROM orders o
    LEFT JOIN consumer c ON o.consumer_id = c.consumer_id
    LEFT JOIN stakeholder s ON o.stakeholder_id = s.stakeholder_id
    ORDER BY o.created_at DESC
  `;
  const { rows } = await pool.query(sql);
  return rows;
};

const updateOrderStatus = async (order_id, order_status) => {
  const { rowCount } = await pool.query(
    'UPDATE orders SET order_status = $1 WHERE id = $2',
    [order_status, order_id]
  );
  return rowCount === 1;
};

const updateDeliveryStatus = async (order_id, delivery_status) => {
  const { rowCount } = await pool.query(
    'UPDATE orders SET delivery_status = $1 WHERE id = $2',
    [delivery_status, order_id]
  );
  return rowCount === 1;
};

const assignOrderRider = async (order_id, rider_id) => {
  const { rowCount } = await pool.query(
    'UPDATE orders SET rider_id = $1 WHERE id = $2',
    [rider_id, order_id]
  );
  return rowCount === 1;
};

const fetchPayments = async () => {
  const sql = `
    SELECT
      p.id,
      p.order_id,
      p.payment_method,
      p.payment_status,
      p.amount,
      p.currency,
      p.created_at,
      c.name AS consumer_name,
      s.restaurant_name
    FROM payments p
    LEFT JOIN consumer c ON p.consumer_id = c.consumer_id
    LEFT JOIN stakeholder s ON p.stakeholder_id = s.stakeholder_id
    ORDER BY p.created_at DESC
  `;
  const { rows } = await pool.query(sql);
  return rows;
};

const updatePaymentStatus = async (payment_id, payment_status) => {
  const { rowCount } = await pool.query(
    'UPDATE payments SET payment_status = $1 WHERE id = $2',
    [payment_status, payment_id]
  );
  return rowCount === 1;
};

const fetchReservations = async () => {
  const sql = `
    SELECT
      d.dine_in_id,
      d.booking_time,
      d.status,
      d.table_size,
      d.quantity,
      d.message,
      c.name AS consumer_name,
      s.restaurant_name
    FROM dine_in d
    LEFT JOIN consumer c ON d.consumer_id = c.consumer_id
    LEFT JOIN stakeholder s ON d.stakeholder_id = s.stakeholder_id
    ORDER BY d.booking_time DESC
  `;
  const { rows } = await pool.query(sql);
  return rows;
};

const updateReservationStatus = async (dine_in_id, status) => {
  const { rowCount } = await pool.query(
    'UPDATE dine_in SET status = $1 WHERE dine_in_id = $2',
    [status, dine_in_id]
  );
  return rowCount === 1;
};

const fetchMenus = async () => {
  const sql = `
    SELECT
      m.menu_id,
      m.item_name,
      m.category,
      m.item_price,
      m.rating,
      s.restaurant_name
    FROM menu m
    LEFT JOIN stakeholder s ON m.stakeholder_id = s.stakeholder_id
    ORDER BY m.menu_id DESC
  `;
  const { rows } = await pool.query(sql);
  return rows;
};

const fetchTickets = async () => {
  const deliverySql = `
    SELECT
      di.issue_id AS id,
      'order_issue' AS type,
      di.order_id,
      di.issue_type,
      di.description,
      di.resolution_status,
      di.reported_at,
      c.name AS consumer_name,
      s.restaurant_name,
      r.name AS rider_name
    FROM delivery_issues di
    LEFT JOIN consumer c ON di.consumer_id = c.consumer_id
    LEFT JOIN orders o ON di.order_id = o.id
    LEFT JOIN stakeholder s ON o.stakeholder_id = s.stakeholder_id
    LEFT JOIN rider r ON di.rider_id = r.rider_id
  `;

  const dineSql = `
    SELECT
      dr.id AS id,
      'dine_in_report' AS type,
      dr.dine_id_id AS order_id,
      'no_show' AS issue_type,
      dr.message AS description,
      COALESCE(dr.resolution_status, 'reported') AS resolution_status,
      COALESCE(dr.reported_at, NOW()) AS reported_at,
      c.name AS consumer_name,
      s.restaurant_name,
      NULL AS rider_name
    FROM dine_in_reports dr
    LEFT JOIN consumer c ON dr.consumer_id = c.consumer_id
    LEFT JOIN stakeholder s ON dr.stakeholder_id = s.stakeholder_id
  `;

  const { rows: deliveryRows } = await pool.query(deliverySql);
  const { rows: dineRows } = await pool.query(dineSql);
  return [...deliveryRows, ...dineRows].sort((a, b) => new Date(b.reported_at) - new Date(a.reported_at));
};

const updateDeliveryIssueStatus = async (issue_id, resolution_status) => {
  const resolvedAt = resolution_status === 'resolved' ? 'NOW()' : 'NULL';
  const { rowCount } = await pool.query(
    `UPDATE delivery_issues
     SET resolution_status = $1,
         resolved_at = ${resolvedAt}
     WHERE issue_id = $2`,
    [resolution_status, issue_id]
  );
  return rowCount === 1;
};

const updateDineInReportStatus = async (report_id, resolution_status) => {
  const resolvedAt = resolution_status === 'resolved' ? 'NOW()' : 'NULL';
  const { rowCount } = await pool.query(
    `UPDATE dine_in_reports
     SET resolution_status = $1,
         resolved_at = ${resolvedAt}
     WHERE id = $2`,
    [resolution_status, report_id]
  );
  return rowCount === 1;
};

const updateConsumerRestriction = async (consumer_id, restricted) => {
  const { rowCount } = await pool.query(
    'UPDATE consumer SET flag = $1, updated_at = NOW() WHERE consumer_id = $2',
    [!restricted, consumer_id]
  );
  return rowCount === 1;
};

const updateStakeholderRestriction = async (stakeholder_id, restricted) => {
  const { rowCount } = await pool.query(
    'UPDATE stakeholder SET is_restricted = $1, updated_at = NOW() WHERE stakeholder_id = $2',
    [restricted, stakeholder_id]
  );
  return rowCount === 1;
};

const deleteConsumerAccount = async (consumer_id) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query('DELETE FROM cart WHERE consumer_id = $1', [consumer_id]);
    const { rowCount: consumerCount } = await client.query(
      'DELETE FROM consumer WHERE consumer_id = $1',
      [consumer_id]
    );
    if (consumerCount !== 1) {
      await client.query('ROLLBACK');
      return false;
    }
    await client.query('DELETE FROM users WHERE user_id = $1 AND role = $2', [consumer_id, 'consumer']);
    await client.query('COMMIT');
    return true;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

const deleteStakeholderAccount = async (stakeholder_id) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { rowCount: stakeholderCount } = await client.query(
      'DELETE FROM stakeholder WHERE stakeholder_id = $1',
      [stakeholder_id]
    );
    if (stakeholderCount !== 1) {
      await client.query('ROLLBACK');
      return false;
    }
    await client.query('DELETE FROM users WHERE user_id = $1 AND role = $2', [stakeholder_id, 'stakeholder']);
    await client.query('COMMIT');
    return true;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

const deleteRiderAccount = async (rider_id) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { rowCount: riderCount } = await client.query(
      'DELETE FROM rider WHERE rider_id = $1',
      [rider_id]
    );
    if (riderCount !== 1) {
      await client.query('ROLLBACK');
      return false;
    }
    await client.query('DELETE FROM users WHERE user_id = $1 AND role = $2', [rider_id, 'rider']);
    await client.query('COMMIT');
    return true;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

const fetchOrderItems = async (orderId) => {
  const sql = `
    SELECT
      oi.id,
      oi.order_id,
      oi.menu_id,
      oi.item_name,
      oi.item_price,
      oi.category,
      oi.quantity,
      oi.subtotal,
      oi.created_at
    FROM order_items oi
    WHERE oi.order_id = $1
    ORDER BY oi.id ASC
  `;
  const { rows } = await pool.query(sql, [orderId]);
  return rows;
};

const fetchCuisines = async () => {
  const { rows } = await pool.query('SELECT id, name FROM cuisine ORDER BY name ASC');
  return rows;
};

const createCuisine = async (name) => {
  const { rows } = await pool.query(
    'INSERT INTO cuisine (name) VALUES ($1) RETURNING id, name',
    [name]
  );
  return rows[0];
};

const updateCuisine = async (id, name) => {
  const { rows } = await pool.query(
    'UPDATE cuisine SET name = $1 WHERE id = $2 RETURNING id, name',
    [name, id]
  );
  return rows[0] || null;
};

const deleteCuisine = async (id) => {
  const { rowCount } = await pool.query('DELETE FROM cuisine WHERE id = $1', [id]);
  return rowCount === 1;
};

const fetchReviews = async () => {
  const sql = `
    SELECT
      r.review_id,
      r.order_id,
      r.rating,
      r.review_text,
      r.review_date,
      r.review_pic,
      c.name AS consumer_name,
      s.restaurant_name
    FROM review r
    LEFT JOIN consumer c ON r.consumer_id = c.consumer_id
    LEFT JOIN stakeholder s ON r.stakeholder_id = s.stakeholder_id
    ORDER BY r.review_date DESC
  `;
  const { rows } = await pool.query(sql);
  return rows;
};

const getReviewById = async (reviewId) => {
  const { rows } = await pool.query(
    'SELECT review_id, stakeholder_id FROM review WHERE review_id = $1',
    [reviewId]
  );
  return rows[0] || null;
};

const deleteReview = async (reviewId) => {
  const { rowCount } = await pool.query('DELETE FROM review WHERE review_id = $1', [reviewId]);
  return rowCount === 1;
};

const fetchActiveDeliveries = async () => {
  const { rows } = await pool.query('SELECT * FROM active_deliveries ORDER BY created_at DESC');
  return rows;
};

const fetchDeliveryTracking = async (orderId) => {
  const sql = `
    SELECT
      tracking_id,
      order_id,
      rider_id,
      status,
      latitude,
      longitude,
      notes,
      image_proof,
      created_at
    FROM delivery_tracking
    WHERE order_id = $1
    ORDER BY created_at DESC
  `;
  const { rows } = await pool.query(sql, [orderId]);
  return rows;
};

const fetchAvailableRiders = async () => {
  const { rows } = await pool.query('SELECT * FROM available_riders ORDER BY last_location_update DESC');
  return rows;
};

const fetchRiderPerformance = async () => {
  const { rows } = await pool.query('SELECT * FROM rider_performance ORDER BY total_deliveries DESC');
  return rows;
};

const fetchRiderEarnings = async () => {
  const sql = `
    SELECT
      e.earning_id,
      e.rider_id,
      r.name AS rider_name,
      e.order_id,
      e.delivery_fee,
      e.rider_commission,
      e.platform_fee,
      e.tip_amount,
      e.bonus_amount,
      e.net_earning,
      e.payment_status,
      e.payment_method,
      e.paid_at,
      e.delivery_distance,
      e.delivery_time,
      e.created_at
    FROM rider_earnings e
    LEFT JOIN rider r ON e.rider_id = r.rider_id
    ORDER BY e.created_at DESC
  `;
  const { rows } = await pool.query(sql);
  return rows;
};

const updateRiderEarningStatus = async (earningId, paymentStatus) => {
  const sql = `
    UPDATE rider_earnings
    SET payment_status = $1,
        paid_at = CASE WHEN $1 = 'paid' THEN NOW() ELSE NULL END
    WHERE earning_id = $2
  `;
  const { rowCount } = await pool.query(sql, [paymentStatus, earningId]);
  return rowCount === 1;
};

const fetchRiderAvailability = async () => {
  const sql = `
    SELECT
      availability_id,
      rider_id,
      date,
      start_time,
      end_time,
      is_available,
      reason,
      created_at,
      updated_at
    FROM rider_availability
    ORDER BY date DESC
  `;
  const { rows } = await pool.query(sql);
  return rows;
};

const fetchPickups = async () => {
  const sql = `
    SELECT
      p.pickup_id,
      p.consumer_id,
      p.stakeholder_id,
      p.pickup_date,
      p.status,
      p.total_amount,
      c.name AS consumer_name,
      s.restaurant_name
    FROM pickup p
    LEFT JOIN consumer c ON p.consumer_id = c.consumer_id
    LEFT JOIN stakeholder s ON p.stakeholder_id = s.stakeholder_id
    ORDER BY p.pickup_date DESC
  `;
  const { rows } = await pool.query(sql);
  return rows;
};

const fetchInteriors = async () => {
  const sql = `
    SELECT
      interior_id,
      stakeholder_id,
      table_type,
      quantity,
      bookable,
      picture
    FROM interior
    ORDER BY interior_id DESC
  `;
  const { rows } = await pool.query(sql);
  return rows;
};

const fetchInteriorPics = async () => {
  const sql = `
    SELECT
      pic_id,
      stakeholder_id,
      pic
    FROM interior_pic
    ORDER BY pic_id DESC
  `;
  const { rows } = await pool.query(sql);
  return rows;
};

const fetchRestaurantInteriors = async () => {
  const sql = `
    SELECT
      id,
      stakeholder_id,
      name,
      floor_length,
      floor_width,
      floor_height,
      layout,
      is_deleted,
      created_at,
      updated_at
    FROM restaurant_interiors
    WHERE is_deleted = 0
    ORDER BY created_at DESC
  `;
  const { rows } = await pool.query(sql);
  return rows;
};

const fetchUsers = async () => {
  const sql = `
    SELECT user_id, name, email, role, created_at, updated_at
    FROM users
    ORDER BY user_id DESC
  `;
  const { rows } = await pool.query(sql);
  return rows;
};

module.exports = {
  findAdminAuthByEmail,
  createAdminAccount,
  getOverview,
  fetchRecentOrders,
  fetchConsumers,
  fetchStakeholders,
  fetchRiders,
  updateRiderStatus,
  fetchOrders,
  updateOrderStatus,
  updateDeliveryStatus,
  assignOrderRider,
  fetchPayments,
  updatePaymentStatus,
  fetchReservations,
  updateReservationStatus,
  fetchMenus,
  fetchTickets,
  updateDeliveryIssueStatus,
  updateDineInReportStatus,
  updateConsumerRestriction,
  updateStakeholderRestriction,
  deleteConsumerAccount,
  deleteStakeholderAccount,
  deleteRiderAccount,
  fetchOrderItems,
  fetchCuisines,
  createCuisine,
  updateCuisine,
  deleteCuisine,
  fetchReviews,
  getReviewById,
  deleteReview,
  fetchActiveDeliveries,
  fetchDeliveryTracking,
  fetchAvailableRiders,
  fetchRiderPerformance,
  fetchRiderEarnings,
  updateRiderEarningStatus,
  fetchRiderAvailability,
  fetchPickups,
  fetchInteriors,
  fetchInteriorPics,
  fetchRestaurantInteriors,
  fetchUsers,
};