// models/dineInModel.js
const db = require("../config/configdb");

// Check table availability for a specific table type
const checkTableAvailability = (stakeholder_id, table_size, callback) => {
  const query = `
    SELECT bookable 
    FROM interior 
    WHERE stakeholder_id = ? AND table_type = ?
  `;
  
  db.query(query, [stakeholder_id, table_size], callback);
};

// Insert a new reservation
const insertReservation = (reservationData, callback) => {
  const { consumer_id, stakeholder_id, table_size, quantity, booking_time, message } = reservationData;
  
  const query = `
    INSERT INTO dine_in 
    (consumer_id, stakeholder_id, table_size, quantity, booking_time, status, message)
    VALUES (?, ?, ?, ?, ?, 'pending', ?)
  `;

  db.query(
    query, 
    [consumer_id, stakeholder_id, table_size, quantity, booking_time, message || null],
    callback
  );
};

// Update bookable table count (decrement)
const decrementBookableTables = (stakeholder_id, table_size, quantity, callback) => {
  const query = `
    UPDATE interior 
    SET bookable = bookable - ? 
    WHERE stakeholder_id = ? AND table_type = ?
  `;

  db.query(query, [quantity, stakeholder_id, table_size], callback);
};

// Update bookable table count (increment - restore)
const incrementBookableTables = (stakeholder_id, table_size, quantity, callback) => {
  const query = `
    UPDATE interior 
    SET bookable = bookable + ? 
    WHERE stakeholder_id = ? AND table_type = ?
  `;

  db.query(query, [quantity, stakeholder_id, table_size], callback);
};

// Get all reservations for a consumer
const getConsumerReservations = (consumer_id, callback) => {
  const query = `
    SELECT 
      d.*,
      s.restaurant_name,
      s.address,
      s.number as phone_number,
      s.picture as restaurant_picture
    FROM dine_in d
    LEFT JOIN stakeholder s ON d.stakeholder_id = s.stakeholder_id
    WHERE d.consumer_id = ?
    ORDER BY d.booking_time DESC
  `;

  db.query(query, [consumer_id], callback);
};

// Get all reservations for a restaurant (stakeholder)
const getRestaurantReservations = (stakeholder_id, callback) => {
  const query = `
    SELECT 
      d.*,
      c.name as consumer_name,
      c.number as consumer_phone,
      c.email as consumer_email
    FROM dine_in d
    LEFT JOIN consumer c ON d.consumer_id = c.consumer_id
    WHERE d.stakeholder_id = ?
    ORDER BY d.booking_time DESC
  `;

  db.query(query, [stakeholder_id], callback);
};

// Get a specific reservation by ID
const getReservationById = (dine_in_id, callback) => {
  const query = `SELECT * FROM dine_in WHERE dine_in_id = ?`;
  db.query(query, [dine_in_id], callback);
};

// Get a specific reservation by ID and consumer ID (for authorization)
const getReservationByIdAndConsumer = (dine_in_id, consumer_id, callback) => {
  const query = `SELECT * FROM dine_in WHERE dine_in_id = ? AND consumer_id = ?`;
  db.query(query, [dine_in_id, consumer_id], callback);
};

// Update reservation status
const updateReservationStatus = (dine_in_id, status, callback) => {
  const query = `UPDATE dine_in SET status = ? WHERE dine_in_id = ?`;
  db.query(query, [status, dine_in_id], callback);
};

// Get pending reservations count for a restaurant
const getPendingReservationsCount = (stakeholder_id, callback) => {
  const query = `
    SELECT COUNT(*) as pending_count 
    FROM dine_in 
    WHERE stakeholder_id = ? AND status = 'pending'
  `;
  db.query(query, [stakeholder_id], callback);
};

// Get upcoming reservations for a consumer
const getUpcomingReservations = (consumer_id, callback) => {
  const query = `
    SELECT 
      d.*,
      s.restaurant_name,
      s.address,
      s.number as phone_number,
      s.picture as restaurant_picture
    FROM dine_in d
    LEFT JOIN stakeholder s ON d.stakeholder_id = s.stakeholder_id
    WHERE d.consumer_id = ? 
      AND d.booking_time >= NOW()
      AND d.status IN ('pending', 'approved')
    ORDER BY d.booking_time ASC
  `;

  db.query(query, [consumer_id], callback);
};

// Get reservation history for a consumer (past reservations)
const getReservationHistory = (consumer_id, callback) => {
  const query = `
    SELECT 
      d.*,
      s.restaurant_name,
      s.address,
      s.number as phone_number,
      s.picture as restaurant_picture
    FROM dine_in d
    LEFT JOIN stakeholder s ON d.stakeholder_id = s.stakeholder_id
    WHERE d.consumer_id = ? 
      AND (d.booking_time < NOW() OR d.status IN ('cancelled', 'rejected', 'completed'))
    ORDER BY d.booking_time DESC
  `;

  db.query(query, [consumer_id], callback);
};

// Get reservations by date range for a restaurant
const getReservationsByDateRange = (stakeholder_id, start_date, end_date, callback) => {
  const query = `
    SELECT 
      d.*,
      c.name as consumer_name,
      c.number as consumer_phone,
      c.email as consumer_email
    FROM dine_in d
    LEFT JOIN consumer c ON d.consumer_id = c.consumer_id
    WHERE d.stakeholder_id = ? 
      AND d.booking_time BETWEEN ? AND ?
    ORDER BY d.booking_time ASC
  `;

  db.query(query, [stakeholder_id, start_date, end_date], callback);
};

// Check for overlapping reservations (to prevent double booking)
const checkOverlappingReservations = (stakeholder_id, table_size, booking_time, callback) => {
  const query = `
    SELECT SUM(quantity) as total_booked
    FROM dine_in 
    WHERE stakeholder_id = ? 
      AND table_size = ?
      AND booking_time = ?
      AND status IN ('pending', 'approved')
  `;

  db.query(query, [stakeholder_id, table_size, booking_time], callback);
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
  checkOverlappingReservations
};
