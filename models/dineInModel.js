// models/dineInModel.js
const db = require("../config/configdb");

// Check table availability for a specific table type
const checkTableAvailability = (stakeholder_id, table_size, callback) => {
  const query = `
    SELECT bookable, quantity
    FROM interior 
    WHERE stakeholder_id = ? AND table_type = ? AND bookable > 0
  `;
  
  db.query(query, [stakeholder_id, table_size.toString()], callback);
};

// Insert a new reservation
const insertReservation = (reservationData, callback) => {
  const { consumer_id, stakeholder_id, table_size, quantity, booking_time, message } = reservationData;
  
  const query = `
    INSERT INTO dine_in 
    (consumer_id, stakeholder_id, table_size, quantity, booking_time, status, message, created_at)
    VALUES (?, ?, ?, ?, ?, 'pending', ?, CURRENT_TIMESTAMP)
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
  console.log('>>> incrementBookableTables called with:', {
    stakeholder_id,
    table_size,
    table_size_type: typeof table_size,
    quantity
  });
  
  const query = `
    UPDATE interior 
    SET bookable = bookable + ? 
    WHERE stakeholder_id = ? AND table_type = ?
  `;

  // Convert table_size to string to match ENUM type
  const table_size_str = table_size.toString();
  
  console.log('>>> Executing query:', query);
  console.log('>>> With parameters:', [quantity, stakeholder_id, table_size_str]);

  db.query(query, [quantity, stakeholder_id, table_size_str], (err, result) => {
    if (err) {
      console.error('>>> incrementBookableTables ERROR:', err);
      return callback(err);
    }
    
    console.log('>>> incrementBookableTables result:', {
      affectedRows: result.affectedRows,
      changedRows: result.changedRows,
      message: result.message
    });
    
    callback(null, result);
  });
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
      c.email as consumer_email,
      CASE WHEN dr.dine_id_id IS NOT NULL THEN 1 ELSE 0 END as is_reported
    FROM dine_in d
    LEFT JOIN consumer c ON d.consumer_id = c.consumer_id
    LEFT JOIN dine_in_reports dr ON d.dine_in_id = dr.dine_id_id
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

// Insert a report for no-show consumer
const insertDineInReport = (reportData, callback) => {
  const { consumer_id, stakeholder_id, dine_id_id, message } = reportData;
  
  const query = `
    INSERT INTO dine_in_reports 
    (consumer_id, stakeholder_id, dine_id_id, message)
    VALUES (?, ?, ?, ?)
  `;

  db.query(query, [consumer_id, stakeholder_id, dine_id_id, message], callback);
};

// Check if reservation has already been reported
const checkReportExists = (dine_id_id, callback) => {
  const query = `
    SELECT * FROM dine_in_reports 
    WHERE dine_id_id = ?
  `;
  
  db.query(query, [dine_id_id], callback);
};

// Get reservations by created_at date range (when the reservation was made)
const getReservationsByCreatedDateRange = (stakeholder_id, start_date, end_date, callback) => {
  const query = `
    SELECT 
      d.*,
      c.name as consumer_name,
      c.number as consumer_phone,
      c.email as consumer_email
    FROM dine_in d
    LEFT JOIN consumer c ON d.consumer_id = c.consumer_id
    WHERE d.stakeholder_id = ? 
      AND d.created_at BETWEEN ? AND ?
    ORDER BY d.created_at DESC
  `;

  db.query(query, [stakeholder_id, start_date, end_date], callback);
};

// Get recent reservations (made in last N days)
const getRecentReservations = (stakeholder_id, days, callback) => {
  const query = `
    SELECT 
      d.*,
      c.name as consumer_name,
      c.number as consumer_phone,
      c.email as consumer_email
    FROM dine_in d
    LEFT JOIN consumer c ON d.consumer_id = c.consumer_id
    WHERE d.stakeholder_id = ? 
      AND d.created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
    ORDER BY d.created_at DESC
  `;

  db.query(query, [stakeholder_id, days], callback);
};

// Get consumer reservations by created date range
const getConsumerReservationsByCreatedDate = (consumer_id, start_date, end_date, callback) => {
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
      AND d.created_at BETWEEN ? AND ?
    ORDER BY d.created_at DESC
  `;

  db.query(query, [consumer_id, start_date, end_date], callback);
};

// Get reservations ordered by created_at (newest first)
const getReservationsOrderedByCreation = (stakeholder_id, callback) => {
  const query = `
    SELECT 
      d.*,
      c.name as consumer_name,
      c.number as consumer_phone,
      c.email as consumer_email,
      CASE WHEN dr.dine_id_id IS NOT NULL THEN 1 ELSE 0 END as is_reported
    FROM dine_in d
    LEFT JOIN consumer c ON d.consumer_id = c.consumer_id
    LEFT JOIN dine_in_reports dr ON d.dine_in_id = dr.dine_id_id
    WHERE d.stakeholder_id = ?
    ORDER BY d.created_at DESC
  `;

  db.query(query, [stakeholder_id], callback);
};

// Alias for dashboard - get reservations by stakeholder (optimized)
const getReservationsByStakeholder = (stakeholder_id, callback) => {
  const query = `
    SELECT 
      d.dine_in_id,
      d.consumer_id,
      d.stakeholder_id,
      d.table_size,
      d.quantity,
      d.booking_time,
      d.status,
      d.created_at,
      c.name as consumer_name
    FROM dine_in d
    LEFT JOIN consumer c ON d.consumer_id = c.consumer_id
    WHERE d.stakeholder_id = ?
    ORDER BY d.created_at DESC
    LIMIT 50
  `;

  db.query(query, [stakeholder_id], callback);
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
  getReservationsByStakeholder  // Add the new function
};
