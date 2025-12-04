// routes/dineInRoutes.js
const express = require('express');
const router = express.Router();
const dineInController = require('../controllers/dineInController');

// Create a new reservation
router.post('/reserve', dineInController.createReservation);

// Get all reservations for a consumer
router.get('/consumer/:consumer_id', dineInController.getConsumerReservations);

// Get upcoming reservations for a consumer
router.get('/consumer/:consumer_id/upcoming', dineInController.getUpcomingReservations);

// Get reservation history for a consumer
router.get('/consumer/:consumer_id/history', dineInController.getReservationHistory);

// Get consumer reservations by created date range
router.get('/consumer/:consumer_id/created-date-range', dineInController.getConsumerReservationsByCreatedDate);

// Get all reservations for a restaurant (stakeholder)
router.get('/restaurant/:stakeholder_id', dineInController.getRestaurantReservations);

// Get pending reservations count for a restaurant
router.get('/restaurant/:stakeholder_id/pending-count', dineInController.getPendingCount);

// Get reservations by date range for analytics
router.get('/restaurant/:stakeholder_id/date-range', dineInController.getReservationsByDateRange);

// Get reservations by created_at date range
router.get('/restaurant/:stakeholder_id/created-date-range', dineInController.getReservationsByCreatedDate);

// Get recent reservations (made in last N days)
router.get('/restaurant/:stakeholder_id/recent', dineInController.getRecentReservations);

// Get reservations ordered by creation time
router.get('/restaurant/:stakeholder_id/ordered-by-creation', dineInController.getReservationsOrderedByCreation);

// Get reservation statistics for dashboard
router.get('/restaurant/:stakeholder_id/statistics', dineInController.getReservationStatistics);

// Update reservation status (approve/reject by restaurant)
router.put('/status/:dine_in_id', dineInController.updateReservationStatus);

// Cancel reservation (by consumer)
router.put('/cancel/:dine_in_id', dineInController.cancelReservation);

// Report no-show consumer to admin
router.post('/report/:dine_in_id', dineInController.reportNoShow);

module.exports = router;
