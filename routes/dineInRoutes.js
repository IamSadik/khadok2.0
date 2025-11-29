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

// Get all reservations for a restaurant (stakeholder)
router.get('/restaurant/:stakeholder_id', dineInController.getRestaurantReservations);

// Get pending reservations count for a restaurant
router.get('/restaurant/:stakeholder_id/pending-count', dineInController.getPendingCount);

// Update reservation status (approve/reject by restaurant)
router.put('/status/:dine_in_id', dineInController.updateReservationStatus);

// Cancel reservation (by consumer)
router.put('/cancel/:dine_in_id', dineInController.cancelReservation);

module.exports = router;
