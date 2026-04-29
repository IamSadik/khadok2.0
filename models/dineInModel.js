// models/dineInModel.js
// All functions keep callback signatures for backward compatibility with controllers.
// Internally they use pg's Promise API.
const pool = require('../config/configdb');

const q = (sql, params) => pool.query(sql, params);

const checkTableAvailability = (stakeholder_id, table_size, callback) => {
  q('SELECT bookable, quantity FROM interior WHERE stakeholder_id = $1 AND table_type = $2 AND bookable > 0',
    [stakeholder_id, table_size.toString()])
    .then(({ rows }) => callback(null, rows))
    .catch((err) => callback(err));
};

const insertReservation = (data, callback) => {
  const { consumer_id, stakeholder_id, table_size, quantity, booking_time, message } = data;
  q(`INSERT INTO dine_in (consumer_id, stakeholder_id, table_size, quantity, booking_time, status, message, created_at)
     VALUES ($1, $2, $3, $4, $5, 'pending', $6, NOW())
     RETURNING dine_in_id`,
    [consumer_id, stakeholder_id, table_size, quantity, booking_time, message || null])
    .then(({ rows }) => callback(null, { insertId: rows[0].dine_in_id }))
    .catch((err) => callback(err));
};

const decrementBookableTables = (stakeholder_id, table_size, quantity, callback) => {
  q('UPDATE interior SET bookable = bookable - $1 WHERE stakeholder_id = $2 AND table_type = $3',
    [quantity, stakeholder_id, table_size])
    .then(({ rowCount }) => callback(null, { affectedRows: rowCount }))
    .catch((err) => callback(err));
};

const incrementBookableTables = (stakeholder_id, table_size, quantity, callback) => {
  q('UPDATE interior SET bookable = bookable + $1 WHERE stakeholder_id = $2 AND table_type = $3',
    [quantity, stakeholder_id, table_size.toString()])
    .then(({ rowCount }) => callback(null, { affectedRows: rowCount }))
    .catch((err) => callback(err));
};

const getConsumerReservations = (consumer_id, callback) => {
  q(`SELECT d.*, s.restaurant_name, s.address, s.number AS phone_number, s.picture AS restaurant_picture
     FROM dine_in d
     LEFT JOIN stakeholder s ON d.stakeholder_id = s.stakeholder_id
     WHERE d.consumer_id = $1
     ORDER BY d.booking_time DESC`,
    [consumer_id])
    .then(({ rows }) => callback(null, rows))
    .catch((err) => callback(err));
};

const getRestaurantReservations = (stakeholder_id, callback) => {
  q(`SELECT d.*, c.name AS consumer_name, c.number AS consumer_phone, c.email AS consumer_email,
            CASE WHEN dr.dine_id_id IS NOT NULL THEN true ELSE false END AS is_reported
     FROM dine_in d
     LEFT JOIN consumer c ON d.consumer_id = c.consumer_id
     LEFT JOIN dine_in_reports dr ON d.dine_in_id = dr.dine_id_id
     WHERE d.stakeholder_id = $1
     ORDER BY d.booking_time DESC`,
    [stakeholder_id])
    .then(({ rows }) => callback(null, rows))
    .catch((err) => callback(err));
};

const getReservationById = (dine_in_id, callback) => {
  q('SELECT * FROM dine_in WHERE dine_in_id = $1', [dine_in_id])
    .then(({ rows }) => callback(null, rows))
    .catch((err) => callback(err));
};

const getReservationByIdAndConsumer = (dine_in_id, consumer_id, callback) => {
  q('SELECT * FROM dine_in WHERE dine_in_id = $1 AND consumer_id = $2',
    [dine_in_id, consumer_id])
    .then(({ rows }) => callback(null, rows))
    .catch((err) => callback(err));
};

const updateReservationStatus = (dine_in_id, status, callback) => {
  q('UPDATE dine_in SET status = $1 WHERE dine_in_id = $2', [status, dine_in_id])
    .then(({ rowCount }) => callback(null, { affectedRows: rowCount }))
    .catch((err) => callback(err));
};

const getPendingReservationsCount = (stakeholder_id, callback) => {
  q("SELECT COUNT(*) AS pending_count FROM dine_in WHERE stakeholder_id = $1 AND status = 'pending'",
    [stakeholder_id])
    .then(({ rows }) => callback(null, rows))
    .catch((err) => callback(err));
};

const getUpcomingReservations = (consumer_id, callback) => {
  q(`SELECT d.*, s.restaurant_name, s.address, s.number AS phone_number, s.picture AS restaurant_picture
     FROM dine_in d
     LEFT JOIN stakeholder s ON d.stakeholder_id = s.stakeholder_id
     WHERE d.consumer_id = $1
       AND d.booking_time >= NOW()
       AND d.status IN ('pending', 'approved')
     ORDER BY d.booking_time ASC`,
    [consumer_id])
    .then(({ rows }) => callback(null, rows))
    .catch((err) => callback(err));
};

const getReservationHistory = (consumer_id, callback) => {
  q(`SELECT d.*, s.restaurant_name, s.address, s.number AS phone_number, s.picture AS restaurant_picture
     FROM dine_in d
     LEFT JOIN stakeholder s ON d.stakeholder_id = s.stakeholder_id
     WHERE d.consumer_id = $1
       AND (d.booking_time < NOW() OR d.status IN ('cancelled', 'rejected', 'completed'))
     ORDER BY d.booking_time DESC`,
    [consumer_id])
    .then(({ rows }) => callback(null, rows))
    .catch((err) => callback(err));
};

const getReservationsByDateRange = (stakeholder_id, start_date, end_date, callback) => {
  q(`SELECT d.*, c.name AS consumer_name, c.number AS consumer_phone, c.email AS consumer_email
     FROM dine_in d
     LEFT JOIN consumer c ON d.consumer_id = c.consumer_id
     WHERE d.stakeholder_id = $1
       AND d.booking_time BETWEEN $2 AND $3
     ORDER BY d.booking_time ASC`,
    [stakeholder_id, start_date, end_date])
    .then(({ rows }) => callback(null, rows))
    .catch((err) => callback(err));
};

const checkOverlappingReservations = (stakeholder_id, table_size, booking_time, callback) => {
  q(`SELECT SUM(quantity) AS total_booked
     FROM dine_in
     WHERE stakeholder_id = $1
       AND table_size = $2
       AND booking_time = $3
       AND status IN ('pending', 'approved')`,
    [stakeholder_id, table_size, booking_time])
    .then(({ rows }) => callback(null, rows))
    .catch((err) => callback(err));
};

const insertDineInReport = (reportData, callback) => {
  const { consumer_id, stakeholder_id, dine_id_id, message } = reportData;
  q(`INSERT INTO dine_in_reports (consumer_id, stakeholder_id, dine_id_id, message)
     VALUES ($1, $2, $3, $4) RETURNING id`,
    [consumer_id, stakeholder_id, dine_id_id, message])
    .then(({ rows }) => callback(null, { insertId: rows[0].id }))
    .catch((err) => callback(err));
};

const checkReportExists = (dine_id_id, callback) => {
  q('SELECT * FROM dine_in_reports WHERE dine_id_id = $1', [dine_id_id])
    .then(({ rows }) => callback(null, rows))
    .catch((err) => callback(err));
};

const getReservationsByCreatedDateRange = (stakeholder_id, start_date, end_date, callback) => {
  q(`SELECT d.*, c.name AS consumer_name, c.number AS consumer_phone, c.email AS consumer_email
     FROM dine_in d
     LEFT JOIN consumer c ON d.consumer_id = c.consumer_id
     WHERE d.stakeholder_id = $1
       AND d.created_at BETWEEN $2 AND $3
     ORDER BY d.created_at DESC`,
    [stakeholder_id, start_date, end_date])
    .then(({ rows }) => callback(null, rows))
    .catch((err) => callback(err));
};

const getRecentReservations = (stakeholder_id, days, callback) => {
  q(`SELECT d.*, c.name AS consumer_name, c.number AS consumer_phone, c.email AS consumer_email
     FROM dine_in d
     LEFT JOIN consumer c ON d.consumer_id = c.consumer_id
     WHERE d.stakeholder_id = $1
       AND d.created_at >= NOW() - ($2 || ' days')::INTERVAL
     ORDER BY d.created_at DESC`,
    [stakeholder_id, days])
    .then(({ rows }) => callback(null, rows))
    .catch((err) => callback(err));
};

const getConsumerReservationsByCreatedDate = (consumer_id, start_date, end_date, callback) => {
  q(`SELECT d.*, s.restaurant_name, s.address, s.number AS phone_number, s.picture AS restaurant_picture
     FROM dine_in d
     LEFT JOIN stakeholder s ON d.stakeholder_id = s.stakeholder_id
     WHERE d.consumer_id = $1
       AND d.created_at BETWEEN $2 AND $3
     ORDER BY d.created_at DESC`,
    [consumer_id, start_date, end_date])
    .then(({ rows }) => callback(null, rows))
    .catch((err) => callback(err));
};

const getReservationsOrderedByCreation = (stakeholder_id, callback) => {
  q(`SELECT d.*, c.name AS consumer_name, c.number AS consumer_phone, c.email AS consumer_email,
            CASE WHEN dr.dine_id_id IS NOT NULL THEN true ELSE false END AS is_reported
     FROM dine_in d
     LEFT JOIN consumer c ON d.consumer_id = c.consumer_id
     LEFT JOIN dine_in_reports dr ON d.dine_in_id = dr.dine_id_id
     WHERE d.stakeholder_id = $1
     ORDER BY d.created_at DESC`,
    [stakeholder_id])
    .then(({ rows }) => callback(null, rows))
    .catch((err) => callback(err));
};

const getReservationsByStakeholder = (stakeholder_id, callback) => {
  q(`SELECT d.dine_in_id, d.consumer_id, d.stakeholder_id, d.table_size, d.quantity,
            d.booking_time, d.status, d.created_at, c.name AS consumer_name
     FROM dine_in d
     LEFT JOIN consumer c ON d.consumer_id = c.consumer_id
     WHERE d.stakeholder_id = $1
     ORDER BY d.created_at DESC
     LIMIT 50`,
    [stakeholder_id])
    .then(({ rows }) => callback(null, rows))
    .catch((err) => callback(err));
};

module.exports = {
  checkTableAvailability,
  insertReservation,
  decrementBookableTables,
  incrementBookableTables,
  getConsumerReservations,
  getRestaurantReservations,
  getReservationById,
  getReservationByIdAndConsumer,
  updateReservationStatus,
  getPendingReservationsCount,
  getUpcomingReservations,
  getReservationHistory,
  getReservationsByDateRange,
  checkOverlappingReservations,
  insertDineInReport,
  checkReportExists,
  getReservationsByCreatedDateRange,
  getRecentReservations,
  getConsumerReservationsByCreatedDate,
  getReservationsOrderedByCreation,
  getReservationsByStakeholder,
};