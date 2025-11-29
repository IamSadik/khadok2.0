// controllers/dineInController.js
const dineInModel = require("../models/dineInModel");

// Create a new table reservation
const createReservation = async (req, res) => {
  try {
    const { consumer_id, stakeholder_id, table_size, quantity, booking_time, message } = req.body;

    // Validate required fields
    if (!consumer_id || !stakeholder_id || !table_size || !quantity || !booking_time) {
      return res.status(400).json({ 
        success: false, 
        message: "Missing required fields" 
      });
    }

    // Check if enough tables are available
    dineInModel.checkTableAvailability(stakeholder_id, table_size, (err, results) => {
      if (err) {
        console.error("Error checking table availability:", err);
        return res.status(500).json({ 
          success: false, 
          message: "Database error while checking availability" 
        });
      }

      if (results.length === 0) {
        return res.status(404).json({ 
          success: false, 
          message: "Table type not found for this restaurant" 
        });
      }

      const availableTables = results[0].bookable || 0;

      if (availableTables < quantity) {
        return res.status(400).json({ 
          success: false, 
          message: `Only ${availableTables} table(s) available. You requested ${quantity}.` 
        });
      }

      // Insert reservation
      const reservationData = { consumer_id, stakeholder_id, table_size, quantity, booking_time, message };
      
      dineInModel.insertReservation(reservationData, (err, result) => {
        if (err) {
          console.error("Error creating reservation:", err);
          return res.status(500).json({ 
            success: false, 
            message: "Failed to create reservation" 
          });
        }

        // Update bookable count (decrement)
        dineInModel.decrementBookableTables(stakeholder_id, table_size, quantity, (err) => {
          if (err) {
            console.error("Error updating bookable tables:", err);
            return res.status(500).json({ 
              success: false, 
              message: "Reservation created but failed to update availability" 
            });
          }

          return res.status(201).json({ 
            success: true, 
            message: "Reservation created successfully",
            reservationId: result.insertId
          });
        });
      });
    });
  } catch (error) {
    console.error("Error in createReservation:", error);
    return res.status(500).json({ 
      success: false, 
      message: "Internal server error" 
    });
  }
};

// Get all reservations for a consumer
const getConsumerReservations = async (req, res) => {
  try {
    const { consumer_id } = req.params;

    if (!consumer_id) {
      return res.status(400).json({ 
        success: false, 
        message: "Consumer ID is required" 
      });
    }

    dineInModel.getConsumerReservations(consumer_id, (err, results) => {
      if (err) {
        console.error("Error fetching reservations:", err);
        return res.status(500).json({ 
          success: false, 
          message: "Database error" 
        });
      }

      return res.status(200).json({ 
        success: true, 
        reservations: results 
      });
    });
  } catch (error) {
    console.error("Error in getConsumerReservations:", error);
    return res.status(500).json({ 
      success: false, 
      message: "Internal server error" 
    });
  }
};

// Get all reservations for a restaurant (stakeholder)
const getRestaurantReservations = async (req, res) => {
  try {
    const { stakeholder_id } = req.params;

    if (!stakeholder_id) {
      return res.status(400).json({ 
        success: false, 
        message: "Stakeholder ID is required" 
      });
    }

    dineInModel.getRestaurantReservations(stakeholder_id, (err, results) => {
      if (err) {
        console.error("Error fetching reservations:", err);
        return res.status(500).json({ 
          success: false, 
          message: "Database error" 
        });
      }

      return res.status(200).json({ 
        success: true, 
        reservations: results 
      });
    });
  } catch (error) {
    console.error("Error in getRestaurantReservations:", error);
    return res.status(500).json({ 
      success: false, 
      message: "Internal server error" 
    });
  }
};

// Update reservation status (approve/reject by restaurant)
const updateReservationStatus = async (req, res) => {
  try {
    const { dine_in_id } = req.params;
    const { status } = req.body;

    if (!dine_in_id || !status) {
      return res.status(400).json({ 
        success: false, 
        message: "Missing required fields" 
      });
    }

    // Validate status
    const validStatuses = ['pending', 'approved', 'rejected', 'cancelled', 'completed'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ 
        success: false, 
        message: "Invalid status value" 
      });
    }

    // Get current reservation details
    dineInModel.getReservationById(dine_in_id, (err, results) => {
      if (err) {
        console.error("Error fetching reservation:", err);
        return res.status(500).json({ 
          success: false, 
          message: "Database error" 
        });
      }

      if (results.length === 0) {
        return res.status(404).json({ 
          success: false, 
          message: "Reservation not found" 
        });
      }

      const reservation = results[0];
      const oldStatus = reservation.status;

      // Update reservation status
      dineInModel.updateReservationStatus(dine_in_id, status, (err) => {
        if (err) {
          console.error("Error updating reservation status:", err);
          return res.status(500).json({ 
            success: false, 
            message: "Failed to update status" 
          });
        }

        // If rejected or cancelled, restore the bookable tables
        if ((status === 'rejected' || status === 'cancelled') && oldStatus === 'pending') {
          dineInModel.incrementBookableTables(
            reservation.stakeholder_id, 
            reservation.table_size, 
            reservation.quantity, 
            (err) => {
              if (err) {
                console.error("Error restoring bookable tables:", err);
              }
            }
          );
        }

        return res.status(200).json({ 
          success: true, 
          message: "Reservation status updated successfully" 
        });
      });
    });
  } catch (error) {
    console.error("Error in updateReservationStatus:", error);
    return res.status(500).json({ 
      success: false, 
      message: "Internal server error" 
    });
  }
};

// Cancel reservation by consumer
const cancelReservation = async (req, res) => {
  try {
    const { dine_in_id } = req.params;
    const { consumer_id } = req.body;

    if (!dine_in_id || !consumer_id) {
      return res.status(400).json({ 
        success: false, 
        message: "Missing required fields" 
      });
    }

    // Get reservation details and verify ownership
    dineInModel.getReservationByIdAndConsumer(dine_in_id, consumer_id, (err, results) => {
      if (err) {
        console.error("Error fetching reservation:", err);
        return res.status(500).json({ 
          success: false, 
          message: "Database error" 
        });
      }

      if (results.length === 0) {
        return res.status(404).json({ 
          success: false, 
          message: "Reservation not found or unauthorized" 
        });
      }

      const reservation = results[0];

      // Only allow cancellation of pending or approved reservations
      if (reservation.status !== 'pending' && reservation.status !== 'approved') {
        return res.status(400).json({ 
          success: false, 
          message: `Cannot cancel reservation with status: ${reservation.status}` 
        });
      }

      // Update status to cancelled
      dineInModel.updateReservationStatus(dine_in_id, 'cancelled', (err) => {
        if (err) {
          console.error("Error cancelling reservation:", err);
          return res.status(500).json({ 
            success: false, 
            message: "Failed to cancel reservation" 
          });
        }

        // Restore bookable tables
        dineInModel.incrementBookableTables(
          reservation.stakeholder_id, 
          reservation.table_size, 
          reservation.quantity, 
          (err) => {
            if (err) {
              console.error("Error restoring bookable tables:", err);
            }

            return res.status(200).json({ 
              success: true, 
              message: "Reservation cancelled successfully" 
            });
          }
        );
      });
    });
  } catch (error) {
    console.error("Error in cancelReservation:", error);
    return res.status(500).json({ 
      success: false, 
      message: "Internal server error" 
    });
  }
};

// Get upcoming reservations for a consumer
const getUpcomingReservations = async (req, res) => {
  try {
    const { consumer_id } = req.params;

    if (!consumer_id) {
      return res.status(400).json({ 
        success: false, 
        message: "Consumer ID is required" 
      });
    }

    dineInModel.getUpcomingReservations(consumer_id, (err, results) => {
      if (err) {
        console.error("Error fetching upcoming reservations:", err);
        return res.status(500).json({ 
          success: false, 
          message: "Database error" 
        });
      }

      return res.status(200).json({ 
        success: true, 
        reservations: results 
      });
    });
  } catch (error) {
    console.error("Error in getUpcomingReservations:", error);
    return res.status(500).json({ 
      success: false, 
      message: "Internal server error" 
    });
  }
};

// Get reservation history for a consumer
const getReservationHistory = async (req, res) => {
  try {
    const { consumer_id } = req.params;

    if (!consumer_id) {
      return res.status(400).json({ 
        success: false, 
        message: "Consumer ID is required" 
      });
    }

    dineInModel.getReservationHistory(consumer_id, (err, results) => {
      if (err) {
        console.error("Error fetching reservation history:", err);
        return res.status(500).json({ 
          success: false, 
          message: "Database error" 
        });
      }

      return res.status(200).json({ 
        success: true, 
        reservations: results 
      });
    });
  } catch (error) {
    console.error("Error in getReservationHistory:", error);
    return res.status(500).json({ 
      success: false, 
      message: "Internal server error" 
    });
  }
};

// Get pending reservations count for a restaurant
const getPendingCount = async (req, res) => {
  try {
    const { stakeholder_id } = req.params;

    if (!stakeholder_id) {
      return res.status(400).json({ 
        success: false, 
        message: "Stakeholder ID is required" 
      });
    }

    dineInModel.getPendingReservationsCount(stakeholder_id, (err, results) => {
      if (err) {
        console.error("Error fetching pending count:", err);
        return res.status(500).json({ 
          success: false, 
          message: "Database error" 
        });
      }

      return res.status(200).json({ 
        success: true, 
        pendingCount: results[0].pending_count 
      });
    });
  } catch (error) {
    console.error("Error in getPendingCount:", error);
    return res.status(500).json({ 
      success: false, 
      message: "Internal server error" 
    });
  }
};

module.exports = {
  createReservation,
  getConsumerReservations,
  getRestaurantReservations,
  updateReservationStatus,
  cancelReservation,
  getUpcomingReservations,
  getReservationHistory,
  getPendingCount
};
