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

    // Keep table_size as string to match ENUM column in database
    const tableSizeStr = table_size.toString();
    
    console.log('Checking availability for:', { stakeholder_id, table_size: tableSizeStr, quantity });

    // Check if enough tables are available
    dineInModel.checkTableAvailability(stakeholder_id, tableSizeStr, (err, results) => {
      if (err) {
        console.error("Error checking table availability:", err);
        return res.status(500).json({ 
          success: false, 
          message: "Database error while checking availability" 
        });
      }

      console.log('Availability check results:', results);

      if (results.length === 0) {
        return res.status(404).json({ 
          success: false, 
          message: `No ${tableSizeStr}-person tables found for this restaurant or all tables are currently booked` 
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
      const reservationData = { consumer_id, stakeholder_id, table_size: tableSizeStr, quantity, booking_time, message };
      
      dineInModel.insertReservation(reservationData, (err, result) => {
        if (err) {
          console.error("Error creating reservation:", err);
          return res.status(500).json({ 
            success: false, 
            message: "Failed to create reservation" 
          });
        }

        // Update bookable count (decrement)
        dineInModel.decrementBookableTables(stakeholder_id, tableSizeStr, quantity, (err) => {
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

    console.log('=== UPDATE RESERVATION STATUS DEBUG ===');
    console.log('Reservation ID:', dine_in_id);
    console.log('New Status:', status);
    console.log('Request body:', req.body);

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

      console.log('Current reservation details:', {
        id: reservation.dine_in_id,
        oldStatus: oldStatus,
        newStatus: status,
        stakeholder_id: reservation.stakeholder_id,
        table_size: reservation.table_size,
        quantity: reservation.quantity
      });

      // Update reservation status
      dineInModel.updateReservationStatus(dine_in_id, status, (err) => {
        if (err) {
          console.error("Error updating reservation status:", err);
          return res.status(500).json({ 
            success: false, 
            message: "Failed to update status" 
          });
        }

        console.log('Status updated successfully in database');

        // Logic for restoring bookable tables:
        // 1. REJECTED: Restore tables (consumer won't come)
        // 2. COMPLETED: Restore tables (consumer left, tables available again)
        // 3. APPROVED: No change (tables already reserved when booking was created)
        // 4. CANCELLED: Already handled in cancelReservation function
        
        const shouldRestoreTables = (status === 'rejected' || status === 'completed') && 
                                   (oldStatus === 'pending' || oldStatus === 'approved');

        console.log('Should restore tables?', shouldRestoreTables);
        console.log('Condition breakdown:', {
          'status is rejected or completed': (status === 'rejected' || status === 'completed'),
          'oldStatus is pending or approved': (oldStatus === 'pending' || oldStatus === 'approved'),
          'status': status,
          'oldStatus': oldStatus
        });

        if (shouldRestoreTables) {
          console.log(`>>> RESTORING ${reservation.quantity} table(s) of size ${reservation.table_size} for stakeholder ${reservation.stakeholder_id}`);
          
          dineInModel.incrementBookableTables(
            reservation.stakeholder_id, 
            reservation.table_size, 
            reservation.quantity, 
            (err) => {
              if (err) {
                console.error("!!! ERROR restoring bookable tables:", err);
                return res.status(500).json({ 
                  success: false, 
                  message: "Status updated but failed to restore table availability" 
                });
              }

              console.log('>>> Tables restored successfully!');
              return res.status(200).json({ 
                success: true, 
                message: "Reservation status updated successfully and tables restored" 
              });
            }
          );
        } else {
          console.log('>>> NO tables to restore (condition not met)');
          return res.status(200).json({ 
            success: true, 
            message: "Reservation status updated successfully" 
          });
        }
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

// Get reservations by date range (NEW)
const getReservationsByDateRange = async (req, res) => {
  try {
    const { stakeholder_id } = req.params;
    const { start_date, end_date } = req.query;

    if (!stakeholder_id) {
      return res.status(400).json({ 
        success: false, 
        message: "Stakeholder ID is required" 
      });
    }

    if (!start_date || !end_date) {
      return res.status(400).json({ 
        success: false, 
        message: "Start date and end date are required" 
      });
    }

    dineInModel.getReservationsByDateRange(stakeholder_id, start_date, end_date, (err, results) => {
      if (err) {
        console.error("Error fetching reservations by date range:", err);
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
    console.error("Error in getReservationsByDateRange:", error);
    return res.status(500).json({ 
      success: false, 
      message: "Internal server error" 
    });
  }
};

// Get reservation statistics for dashboard (NEW)
const getReservationStatistics = async (req, res) => {
  try {
    const { stakeholder_id } = req.params;

    if (!stakeholder_id) {
      return res.status(400).json({ 
        success: false, 
        message: "Stakeholder ID is required" 
      });
    }

    // Get all reservations for statistics
    dineInModel.getRestaurantReservations(stakeholder_id, (err, results) => {
      if (err) {
        console.error("Error fetching reservations for statistics:", err);
        return res.status(500).json({ 
          success: false, 
          message: "Database error" 
        });
      }

      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      
      const statistics = {
        total: results.length,
        pending: 0,
        approved: 0,
        completed: 0,
        rejected: 0,
        cancelled: 0,
        todayCount: 0,
        thisMonthCount: 0,
        upcomingCount: 0,
        totalRevenue: 0, // Can be calculated if you have pricing
        averagePartySize: 0,
        peakHours: {},
        popularTableSizes: {}
      };

      let totalGuests = 0;

      results.forEach(reservation => {
        const bookingDate = new Date(reservation.booking_time);
        const createdDate = new Date(reservation.created_at);
        
        // Count by status
        statistics[reservation.status]++;
        
        // Today's reservations
        if (createdDate >= today) {
          statistics.todayCount++;
        }
        
        // This month's reservations
        if (createdDate >= thisMonth) {
          statistics.thisMonthCount++;
        }
        
        // Upcoming reservations
        if (bookingDate > now && (reservation.status === 'pending' || reservation.status === 'approved')) {
          statistics.upcomingCount++;
        }
        
        // Calculate average party size
        totalGuests += reservation.table_size * reservation.quantity;
        
        // Track peak hours
        const hour = bookingDate.getHours();
        statistics.peakHours[hour] = (statistics.peakHours[hour] || 0) + 1;
        
        // Track popular table sizes
        statistics.popularTableSizes[reservation.table_size] = 
          (statistics.popularTableSizes[reservation.table_size] || 0) + reservation.quantity;
      });

      statistics.averagePartySize = results.length > 0 ? 
        Math.round((totalGuests / results.length) * 10) / 10 : 0;

      // Find most popular hour
      let maxHour = 0;
      let maxCount = 0;
      for (const [hour, count] of Object.entries(statistics.peakHours)) {
        if (count > maxCount) {
          maxCount = count;
          maxHour = hour;
        }
      }
      statistics.mostPopularHour = `${maxHour}:00`;

      return res.status(200).json({ 
        success: true, 
        statistics 
      });
    });
  } catch (error) {
    console.error("Error in getReservationStatistics:", error);
    return res.status(500).json({ 
      success: false, 
      message: "Internal server error" 
    });
  }
};

// Report no-show consumer to admin
const reportNoShow = async (req, res) => {
  try {
    const { dine_in_id } = req.params;
    const { stakeholder_id, message } = req.body;

    if (!dine_in_id || !stakeholder_id || !message) {
      return res.status(400).json({ 
        success: false, 
        message: "Missing required fields" 
      });
    }

    // Get reservation details
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

      // Verify the stakeholder owns this reservation
      if (reservation.stakeholder_id != stakeholder_id) {
        return res.status(403).json({ 
          success: false, 
          message: "Unauthorized to report this reservation" 
        });
      }

      // Check if already reported
      dineInModel.checkReportExists(dine_in_id, (err, existingReports) => {
        if (err) {
          console.error("Error checking existing reports:", err);
          return res.status(500).json({ 
            success: false, 
            message: "Database error" 
          });
        }

        if (existingReports.length > 0) {
          return res.status(400).json({ 
            success: false, 
            message: "This reservation has already been reported" 
          });
        }

        // Insert the report
        const reportData = {
          consumer_id: reservation.consumer_id,
          stakeholder_id: stakeholder_id,
          dine_id_id: dine_in_id,
          message: message
        };

        dineInModel.insertDineInReport(reportData, (err, result) => {
          if (err) {
            console.error("Error submitting report:", err);
            return res.status(500).json({ 
              success: false, 
              message: "Failed to submit report" 
            });
          }

          const oldStatus = reservation.status;

          // Update reservation status to completed
          dineInModel.updateReservationStatus(dine_in_id, 'completed', (err) => {
            if (err) {
              console.error("Error updating reservation status:", err);
              return res.status(500).json({ 
                success: false, 
                message: "Report submitted but failed to update status" 
              });
            }

            // Restore bookable tables if the reservation was pending or approved
            const shouldRestoreTables = (oldStatus === 'pending' || oldStatus === 'approved');

            if (shouldRestoreTables) {
              console.log(`Restoring ${reservation.quantity} table(s) of size ${reservation.table_size} after no-show report`);
              
              dineInModel.incrementBookableTables(
                reservation.stakeholder_id, 
                reservation.table_size, 
                reservation.quantity, 
                (err) => {
                  if (err) {
                    console.error("Error restoring bookable tables:", err);
                    return res.status(500).json({ 
                      success: false, 
                      message: "Report submitted and status updated but failed to restore table availability" 
                    });
                  }

                  return res.status(201).json({ 
                    success: true, 
                    message: "No-show report submitted successfully to admin, reservation marked as completed, and tables restored",
                    reportId: result.insertId
                  });
                }
              );
            } else {
              return res.status(201).json({ 
                success: true, 
                message: "No-show report submitted successfully to admin and reservation marked as completed",
                reportId: result.insertId
              });
            }
          });
        });
      });
    });
  } catch (error) {
    console.error("Error in reportNoShow:", error);
    return res.status(500).json({ 
      success: false, 
      message: "Internal server error" 
    });
  }
};

// Get reservations by created_at date range (when reservation was made)
const getReservationsByCreatedDate = async (req, res) => {
  try {
    const { stakeholder_id } = req.params;
    const { start_date, end_date } = req.query;

    if (!stakeholder_id) {
      return res.status(400).json({ 
        success: false, 
        message: "Stakeholder ID is required" 
      });
    }

    if (!start_date || !end_date) {
      return res.status(400).json({ 
        success: false, 
        message: "Start date and end date are required" 
      });
    }

    dineInModel.getReservationsByCreatedDateRange(stakeholder_id, start_date, end_date, (err, results) => {
      if (err) {
        console.error("Error fetching reservations by created date:", err);
        return res.status(500).json({ 
          success: false, 
          message: "Database error" 
        });
      }

      return res.status(200).json({ 
        success: true, 
        reservations: results,
        count: results.length 
      });
    });
  } catch (error) {
    console.error("Error in getReservationsByCreatedDate:", error);
    return res.status(500).json({ 
      success: false, 
      message: "Internal server error" 
    });
  }
};

// Get recent reservations (made in last N days)
const getRecentReservations = async (req, res) => {
  try {
    const { stakeholder_id } = req.params;
    const { days } = req.query;

    if (!stakeholder_id) {
      return res.status(400).json({ 
        success: false, 
        message: "Stakeholder ID is required" 
      });
    }

    const daysToFetch = days ? parseInt(days) : 7; // Default to 7 days

    dineInModel.getRecentReservations(stakeholder_id, daysToFetch, (err, results) => {
      if (err) {
        console.error("Error fetching recent reservations:", err);
        return res.status(500).json({ 
          success: false, 
          message: "Database error" 
        });
      }

      return res.status(200).json({ 
        success: true, 
        reservations: results,
        days: daysToFetch,
        count: results.length 
      });
    });
  } catch (error) {
    console.error("Error in getRecentReservations:", error);
    return res.status(500).json({ 
      success: false, 
      message: "Internal server error" 
    });
  }
};

// Get consumer reservations by created date range
const getConsumerReservationsByCreatedDate = async (req, res) => {
  try {
    const { consumer_id } = req.params;
    const { start_date, end_date } = req.query;

    if (!consumer_id) {
      return res.status(400).json({ 
        success: false, 
        message: "Consumer ID is required" 
      });
    }

    if (!start_date || !end_date) {
      return res.status(400).json({ 
        success: false, 
        message: "Start date and end date are required" 
      });
    }

    dineInModel.getConsumerReservationsByCreatedDate(consumer_id, start_date, end_date, (err, results) => {
      if (err) {
        console.error("Error fetching consumer reservations by created date:", err);
        return res.status(500).json({ 
          success: false, 
          message: "Database error" 
        });
      }

      return res.status(200).json({ 
        success: true, 
        reservations: results,
        count: results.length 
      });
    });
  } catch (error) {
    console.error("Error in getConsumerReservationsByCreatedDate:", error);
    return res.status(500).json({ 
      success: false, 
      message: "Internal server error" 
    });
  }
};

// Get reservations ordered by creation time (newest first)
const getReservationsOrderedByCreation = async (req, res) => {
  try {
    const { stakeholder_id } = req.params;

    if (!stakeholder_id) {
      return res.status(400).json({ 
        success: false, 
        message: "Stakeholder ID is required" 
      });
    }

    dineInModel.getReservationsOrderedByCreation(stakeholder_id, (err, results) => {
      if (err) {
        console.error("Error fetching reservations ordered by creation:", err);
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
    console.error("Error in getReservationsOrderedByCreation:", error);
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
  getPendingCount,
  getReservationsByDateRange,
  getReservationStatistics,
  reportNoShow,
  getReservationsByCreatedDate,
  getRecentReservations,
  getConsumerReservationsByCreatedDate,
  getReservationsOrderedByCreation
};
