const express = require("express");
const router = express.Router();
const { requireLogin } = require('../middlewares/authMiddleware');
const {
    loginAdmin,
    signupAdmin,
    getOverview,
    getConsumers,
    getStakeholders,
    getRiders,
    updateRider,
    getOrders,
    updateOrderStatus,
    updateDeliveryStatus,
    updateOrderRider,
    getPayments,
    updatePaymentStatus,
    getReservations,
    updateReservationStatus,
    getMenus,
    getTickets,
    updateDeliveryIssueStatus,
    updateDineInTicketStatus,
    restrictConsumer,
    restrictStakeholder,
    deleteConsumer,
    deleteStakeholder,
    deleteRider,
    getOrderItems,
    getCuisines,
    createCuisine,
    updateCuisine,
    deleteCuisine,
    getReviews,
    deleteReview,
    getActiveDeliveries,
    getDeliveryTracking,
    getAvailableRiders,
    getRiderPerformance,
    getRiderEarnings,
    updateRiderEarningStatus,
    getRiderAvailability,
    getPickups,
    getInteriors,
    getInteriorPics,
    getRestaurantInteriors,
    getUsers,
} = require("../controllers/adminController");

router.post('/login', loginAdmin);
router.post('/signup', signupAdmin);

router.use(requireLogin('admin'));

router.get("/overview", getOverview);
router.get("/consumers", getConsumers);
router.get("/stakeholders", getStakeholders);
router.get("/riders", getRiders);
router.get("/riders/available", getAvailableRiders);
router.get("/riders/performance", getRiderPerformance);
router.get("/riders/earnings", getRiderEarnings);
router.patch("/riders/earnings/:id/status", updateRiderEarningStatus);
router.get("/riders/availability", getRiderAvailability);
router.patch("/riders/:rider_id", updateRider);
router.get("/orders", getOrders);
router.get("/orders/:id/items", getOrderItems);
router.patch("/orders/:id/status", updateOrderStatus);
router.patch("/orders/:id/delivery-status", updateDeliveryStatus);
router.patch("/orders/:id/rider", updateOrderRider);
router.get("/payments", getPayments);
router.patch("/payments/:id/status", updatePaymentStatus);
router.get("/reservations", getReservations);
router.patch("/reservations/:id/status", updateReservationStatus);
router.get("/menus", getMenus);
router.get("/cuisines", getCuisines);
router.post("/cuisines", createCuisine);
router.patch("/cuisines/:id", updateCuisine);
router.delete("/cuisines/:id", deleteCuisine);
router.get("/reviews", getReviews);
router.delete("/reviews/:id", deleteReview);
router.get("/tickets", getTickets);
router.patch("/tickets/delivery/:id/status", updateDeliveryIssueStatus);
router.patch("/tickets/dine-in/:id/status", updateDineInTicketStatus);
router.patch("/consumers/:id/restrict", restrictConsumer);
router.delete("/consumers/:id", deleteConsumer);
router.patch("/stakeholders/:id/restrict", restrictStakeholder);
router.delete("/stakeholders/:id", deleteStakeholder);
router.delete("/riders/:id", deleteRider);
router.get("/deliveries/active", getActiveDeliveries);
router.get("/deliveries/:orderId/tracking", getDeliveryTracking);
router.get("/pickups", getPickups);
router.get("/interiors", getInteriors);
router.get("/interior-pics", getInteriorPics);
router.get("/restaurant-interiors", getRestaurantInteriors);
router.get("/users", getUsers);

module.exports = router;
