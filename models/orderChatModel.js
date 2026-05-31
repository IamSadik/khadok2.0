const pool = require('../config/configdb');

const ACTIVE_CHAT_STATUSES = ['assigned', 'picked_up', 'out_for_delivery', 'arrived'];
const READONLY_CHAT_STATUSES = [...ACTIVE_CHAT_STATUSES, 'delivered'];

exports.getOrderChatContext = async (order_id) => {
  const { rows } = await pool.query(
    `SELECT id, consumer_id, rider_id, delivery_status, order_status, order_type
     FROM orders
     WHERE id = $1
     LIMIT 1`,
    [order_id]
  );
  return rows[0] || null;
};

exports.canSendChatMessage = (order) => {
  if (!order || order.order_type !== 'delivery') return false;
  if (order.order_status === 'cancelled') return false;
  return ACTIVE_CHAT_STATUSES.includes(order.delivery_status);
};

exports.canReadChatHistory = (order) => {
  if (!order || order.order_type !== 'delivery') return false;
  return READONLY_CHAT_STATUSES.includes(order.delivery_status);
};

exports.isParticipant = (order, sender_type, sender_id) => {
  if (!order || !sender_id) return false;
  if (sender_type === 'consumer') {
    return Number(order.consumer_id) === Number(sender_id);
  }
  if (sender_type === 'rider') {
    return Number(order.rider_id) === Number(sender_id);
  }
  return false;
};

exports.getOrderMessages = async (order_id, limit = 100) => {
  const { rows } = await pool.query(
    `SELECT message_id, order_id, sender_type, sender_id, body, created_at
     FROM order_messages
     WHERE order_id = $1
     ORDER BY created_at ASC
     LIMIT $2`,
    [order_id, limit]
  );
  return rows;
};

exports.createOrderMessage = async ({ order_id, sender_type, sender_id, body }) => {
  const { rows } = await pool.query(
    `INSERT INTO order_messages (order_id, sender_type, sender_id, body)
     VALUES ($1, $2, $3, $4)
     RETURNING message_id, order_id, sender_type, sender_id, body, created_at`,
    [order_id, sender_type, sender_id, body]
  );
  return rows[0];
};

exports.getRiderChatThreads = async (rider_id) => {
  const { rows } = await pool.query(
    `SELECT
       o.id AS order_id,
       o.delivery_status,
       c.name AS consumer_name,
       s.restaurant_name,
       lm.body AS last_message,
       lm.created_at AS last_message_at,
       lm.sender_type AS last_sender_type
     FROM orders o
     LEFT JOIN consumer c ON c.consumer_id = o.consumer_id
     LEFT JOIN stakeholder s ON s.stakeholder_id = o.stakeholder_id
     LEFT JOIN LATERAL (
       SELECT body, created_at, sender_type
       FROM order_messages
       WHERE order_id = o.id
       ORDER BY created_at DESC
       LIMIT 1
     ) lm ON true
     WHERE o.rider_id = $1
       AND o.order_type = 'delivery'
       AND o.delivery_status = ANY($2::varchar[])
     ORDER BY COALESCE(lm.created_at, o.updated_at) DESC`,
    [rider_id, ACTIVE_CHAT_STATUSES]
  );
  return rows;
};

exports.getConsumerChatThreads = async (consumer_id) => {
  const statuses = ['assigned', 'picked_up', 'out_for_delivery', 'arrived', 'delivered'];
  const { rows } = await pool.query(
    `SELECT
       o.id AS order_id,
       o.delivery_status,
       r.name AS rider_name,
       s.restaurant_name,
       lm.body AS last_message,
       lm.created_at AS last_message_at,
       lm.sender_type AS last_sender_type
     FROM orders o
     LEFT JOIN rider r ON r.rider_id = o.rider_id
     LEFT JOIN stakeholder s ON s.stakeholder_id = o.stakeholder_id
     LEFT JOIN LATERAL (
       SELECT body, created_at, sender_type
       FROM order_messages
       WHERE order_id = o.id
       ORDER BY created_at DESC
       LIMIT 1
     ) lm ON true
     WHERE o.consumer_id = $1
       AND o.order_type = 'delivery'
       AND o.rider_id IS NOT NULL
       AND o.delivery_status = ANY($2::varchar[])
     ORDER BY COALESCE(lm.created_at, o.updated_at) DESC`,
    [consumer_id, statuses]
  );
  return rows;
};
