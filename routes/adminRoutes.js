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
} = require("../controllers/adminController");

router.post('/login', loginAdmin);
router.post('/signup', signupAdmin);

router.use(requireLogin('admin'));

router.get("/overview", getOverview);
router.get("/consumers", getConsumers);
router.get("/stakeholders", getStakeholders);
router.get("/riders", getRiders);
router.patch("/riders/:rider_id", updateRider);
router.get("/orders", getOrders);
router.patch("/orders/:id/status", updateOrderStatus);
router.patch("/orders/:id/delivery-status", updateDeliveryStatus);
router.patch("/orders/:id/rider", updateOrderRider);
router.get("/payments", getPayments);
router.patch("/payments/:id/status", updatePaymentStatus);
router.get("/reservations", getReservations);
router.patch("/reservations/:id/status", updateReservationStatus);
router.get("/menus", getMenus);
router.get("/tickets", getTickets);
router.patch("/tickets/delivery/:id/status", updateDeliveryIssueStatus);

module.exports = router;
