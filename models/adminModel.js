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
      (SELECT COUNT(*) FROM delivery_issues) + (SELECT COUNT(*) FROM dine_in_reports) AS tickets
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
    `SELECT consumer_id, name, email, number, address, created_at FROM consumer ORDER BY consumer_id DESC`
  );
  return rows;
};

const fetchStakeholders = async () => {
  const { rows } = await pool.query(`
    SELECT stakeholder_id, name, email, restaurant_name, ratings, address, number, created_at
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
      'delivery_issue' AS type,
      di.order_id,
      di.issue_type,
      di.description,
      di.resolution_status,
      di.reported_at,
      c.name AS consumer_name,
      r.name AS rider_name
    FROM delivery_issues di
    LEFT JOIN consumer c ON di.consumer_id = c.consumer_id
    LEFT JOIN rider r ON di.rider_id = r.rider_id
  `;

  const dineSql = `
    SELECT
      dr.id AS id,
      'dine_in_report' AS type,
      dr.dine_id_id AS order_id,
      NULL AS issue_type,
      dr.message AS description,
      'reported' AS resolution_status,
      NOW() AS reported_at,
      c.name AS consumer_name,
      s.restaurant_name AS rider_name
    FROM dine_in_reports dr
    LEFT JOIN consumer c ON dr.consumer_id = c.consumer_id
    LEFT JOIN stakeholder s ON dr.stakeholder_id = s.stakeholder_id
  `;

  const { rows: deliveryRows } = await pool.query(deliverySql);
  const { rows: dineRows } = await pool.query(dineSql);
  return [...deliveryRows, ...dineRows].sort((a, b) => new Date(b.reported_at) - new Date(a.reported_at));
};

const updateDeliveryIssueStatus = async (issue_id, resolution_status) => {
  const { rowCount } = await pool.query(
    'UPDATE delivery_issues SET resolution_status = $1 WHERE issue_id = $2',
    [resolution_status, issue_id]
  );
  return rowCount === 1;
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
};