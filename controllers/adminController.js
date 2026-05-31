const adminModel = require('../models/adminModel');
const orderModel = require('../models/orderModel');
const bcrypt = require('bcrypt');

const loginAdmin = async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ success: false, message: 'Email and password are required' });
    }

    try {
        const admin = await adminModel.findAdminAuthByEmail(email);

        if (!admin) {
            return res.status(401).json({ success: false, message: 'Invalid email or password' });
        }

        const storedPassword = String(admin.password || '');
        const isBcryptHash = storedPassword.startsWith('$2a$') || storedPassword.startsWith('$2b$') || storedPassword.startsWith('$2y$');
        const passwordMatches = isBcryptHash
            ? await bcrypt.compare(password, storedPassword)
            : password === storedPassword;

        if (!passwordMatches) {
            return res.status(401).json({ success: false, message: 'Invalid email or password' });
        }

        return req.session.regenerate((err) => {
            if (err) {
                console.error('Admin session regeneration error:', err);
                return res.status(500).json({ success: false, message: 'Session error' });
            }

            req.session.userId = admin.user_id || admin.admin_id;
            req.session.role = 'admin';

            return res.status(200).json({
                success: true,
                message: 'Admin login successful',
                sessionId: req.sessionID,
                user: {
                    id: admin.user_id || admin.admin_id,
                    role: 'admin',
                    name: admin.name,
                    email: admin.email,
                },
                redirect: '/admin/index.html',
            });
        });
    } catch (error) {
        console.error('Admin login error:', error);
        return res.status(500).json({ success: false, message: 'Internal Server Error' });
    }
};

const signupAdmin = async (req, res) => {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
        return res.status(400).json({ success: false, message: 'name, email and password are required' });
    }

    try {
        const existing = await adminModel.findAdminAuthByEmail(email);
        if (existing) {
            return res.status(409).json({ success: false, message: 'Admin already exists' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const created = await adminModel.createAdminAccount({
            name: String(name).trim(),
            email: String(email).trim().toLowerCase(),
            password: hashedPassword,
        });

        return res.status(201).json({
            success: true,
            message: 'Admin created successfully',
            admin: created,
        });
    } catch (error) {
        console.error('Admin signup error:', error);
        return res.status(500).json({ success: false, message: 'Internal Server Error' });
    }
};

const getOverview = async (req, res) => {
    try {
        const [summary, recentOrders] = await Promise.all([
            adminModel.getOverview(),
            adminModel.fetchRecentOrders()
        ]);
        res.json({ summary, recentOrders });
    } catch (error) {
        console.error('Admin overview error:', error);
        res.status(500).json({ error: 'Failed to load overview' });
    }
};

const getConsumers = async (req, res) => {
    try {
        const consumers = await adminModel.fetchConsumers();
        res.json({ consumers });
    } catch (error) {
        console.error('Error fetching consumers:', error);
        res.status(500).json({ error: 'Failed to fetch consumers' });
    }
};

const getStakeholders = async (req, res) => {
    try {
        const stakeholders = await adminModel.fetchStakeholders();
        res.json({ stakeholders });
    } catch (error) {
        console.error('Error fetching stakeholders:', error);
        res.status(500).json({ error: 'Failed to fetch stakeholders' });
    }
};

const getRiders = async (req, res) => {
    try {
        const riders = await adminModel.fetchRiders();
        res.json({ riders });
    } catch (error) {
        console.error('Error fetching riders:', error);
        res.status(500).json({ error: 'Failed to fetch riders' });
    }
};

const updateRider = async (req, res) => {
    const { rider_id } = req.params;
    const { is_active, is_verified, status } = req.body;

    try {
        const updated = await adminModel.updateRiderStatus(rider_id, {
            is_active,
            is_verified,
            status,
        });
        if (!updated) {
            return res.status(400).json({ error: 'No changes applied' });
        }
        res.json({ success: true });
    } catch (error) {
        console.error('Error updating rider:', error);
        res.status(500).json({ error: 'Failed to update rider' });
    }
};

const getOrders = async (req, res) => {
    try {
        const orders = await adminModel.fetchOrders();
        res.json({ orders });
    } catch (error) {
        console.error('Error fetching orders:', error);
        res.status(500).json({ error: 'Failed to fetch orders' });
    }
};

const updateOrderStatus = async (req, res) => {
    const { id } = req.params;
    const { order_status } = req.body;

    if (!order_status) {
        return res.status(400).json({ error: 'order_status is required' });
    }

    try {
        const updated = await adminModel.updateOrderStatus(id, order_status);
        if (!updated) {
            return res.status(404).json({ error: 'Order not found' });
        }
        res.json({ success: true });
    } catch (error) {
        console.error('Error updating order status:', error);
        res.status(500).json({ error: 'Failed to update order status' });
    }
};

const updateDeliveryStatus = async (req, res) => {
    const { id } = req.params;
    const { delivery_status } = req.body;

    if (!delivery_status) {
        return res.status(400).json({ error: 'delivery_status is required' });
    }

    try {
        const updated = await adminModel.updateDeliveryStatus(id, delivery_status);
        if (!updated) {
            return res.status(404).json({ error: 'Order not found' });
        }
        res.json({ success: true });
    } catch (error) {
        console.error('Error updating delivery status:', error);
        res.status(500).json({ error: 'Failed to update delivery status' });
    }
};

const updateOrderRider = async (req, res) => {
    const { id } = req.params;
    const { rider_id } = req.body;

    if (!rider_id) {
        return res.status(400).json({ error: 'rider_id is required' });
    }

    try {
        const updated = await adminModel.assignOrderRider(id, rider_id);
        if (!updated) {
            return res.status(404).json({ error: 'Order not found' });
        }
        res.json({ success: true });
    } catch (error) {
        console.error('Error assigning rider:', error);
        res.status(500).json({ error: 'Failed to assign rider' });
    }
};

const getPayments = async (req, res) => {
    try {
        const payments = await adminModel.fetchPayments();
        res.json({ payments });
    } catch (error) {
        console.error('Error fetching payments:', error);
        res.status(500).json({ error: 'Failed to fetch payments' });
    }
};

const updatePaymentStatus = async (req, res) => {
    const { id } = req.params;
    const { payment_status } = req.body;

    if (!payment_status) {
        return res.status(400).json({ error: 'payment_status is required' });
    }

    try {
        const updated = await adminModel.updatePaymentStatus(id, payment_status);
        if (!updated) {
            return res.status(404).json({ error: 'Payment not found' });
        }
        res.json({ success: true });
    } catch (error) {
        console.error('Error updating payment status:', error);
        res.status(500).json({ error: 'Failed to update payment status' });
    }
};

const getReservations = async (req, res) => {
    try {
        const reservations = await adminModel.fetchReservations();
        res.json({ reservations });
    } catch (error) {
        console.error('Error fetching reservations:', error);
        res.status(500).json({ error: 'Failed to fetch reservations' });
    }
};

const updateReservationStatus = async (req, res) => {
    const { id } = req.params;
    const { status } = req.body;

    if (!status) {
        return res.status(400).json({ error: 'status is required' });
    }

    try {
        const updated = await adminModel.updateReservationStatus(id, status);
        if (!updated) {
            return res.status(404).json({ error: 'Reservation not found' });
        }
        res.json({ success: true });
    } catch (error) {
        console.error('Error updating reservation status:', error);
        res.status(500).json({ error: 'Failed to update reservation status' });
    }
};

const getMenus = async (req, res) => {
    try {
        const menus = await adminModel.fetchMenus();
        res.json({ menus });
    } catch (error) {
        console.error('Error fetching menus:', error);
        res.status(500).json({ error: 'Failed to fetch menus' });
    }
};

const getTickets = async (req, res) => {
    try {
        const tickets = await adminModel.fetchTickets();
        res.json({ tickets });
    } catch (error) {
        console.error('Error fetching tickets:', error);
        res.status(500).json({ error: 'Failed to fetch tickets' });
    }
};

const updateDeliveryIssueStatus = async (req, res) => {
    const { id } = req.params;
    const { resolution_status } = req.body;

    if (!resolution_status) {
        return res.status(400).json({ error: 'resolution_status is required' });
    }

    try {
        const updated = await adminModel.updateDeliveryIssueStatus(id, resolution_status);
        if (!updated) {
            return res.status(404).json({ error: 'Ticket not found' });
        }
        res.json({ success: true });
    } catch (error) {
        console.error('Error updating ticket status:', error);
        res.status(500).json({ error: 'Failed to update ticket status' });
    }
};

const updateDineInTicketStatus = async (req, res) => {
    const { id } = req.params;
    const { resolution_status } = req.body;

    if (!resolution_status) {
        return res.status(400).json({ error: 'resolution_status is required' });
    }

    try {
        const updated = await adminModel.updateDineInReportStatus(id, resolution_status);
        if (!updated) {
            return res.status(404).json({ error: 'Ticket not found' });
        }
        res.json({ success: true });
    } catch (error) {
        console.error('Error updating dine-in ticket status:', error);
        res.status(500).json({ error: 'Failed to update ticket status' });
    }
};

const restrictConsumer = async (req, res) => {
    const { id } = req.params;
    const { restricted } = req.body;

    if (typeof restricted !== 'boolean') {
        return res.status(400).json({ error: 'restricted boolean is required' });
    }

    try {
        const updated = await adminModel.updateConsumerRestriction(id, restricted);
        if (!updated) {
            return res.status(404).json({ error: 'Consumer not found' });
        }
        res.json({ success: true });
    } catch (error) {
        console.error('Error updating consumer restriction:', error);
        res.status(500).json({ error: 'Failed to update consumer restriction' });
    }
};

const restrictStakeholder = async (req, res) => {
    const { id } = req.params;
    const { restricted } = req.body;

    if (typeof restricted !== 'boolean') {
        return res.status(400).json({ error: 'restricted boolean is required' });
    }

    try {
        const updated = await adminModel.updateStakeholderRestriction(id, restricted);
        if (!updated) {
            return res.status(404).json({ error: 'Stakeholder not found' });
        }
        res.json({ success: true });
    } catch (error) {
        console.error('Error updating stakeholder restriction:', error);
        res.status(500).json({ error: 'Failed to update stakeholder restriction' });
    }
};

const deleteConsumer = async (req, res) => {
    const { id } = req.params;

    try {
        const deleted = await adminModel.deleteConsumerAccount(id);
        if (!deleted) {
            return res.status(404).json({ error: 'Consumer not found' });
        }
        res.json({ success: true });
    } catch (error) {
        console.error('Error deleting consumer:', error);
        res.status(500).json({ error: 'Failed to delete consumer account' });
    }
};

const deleteStakeholder = async (req, res) => {
    const { id } = req.params;

    try {
        const deleted = await adminModel.deleteStakeholderAccount(id);
        if (!deleted) {
            return res.status(404).json({ error: 'Stakeholder not found' });
        }
        res.json({ success: true });
    } catch (error) {
        console.error('Error deleting stakeholder:', error);
        res.status(500).json({ error: 'Failed to delete stakeholder account' });
    }
};

const deleteRider = async (req, res) => {
    const { id } = req.params;

    try {
        const deleted = await adminModel.deleteRiderAccount(id);
        if (!deleted) {
            return res.status(404).json({ error: 'Rider not found' });
        }
        res.json({ success: true });
    } catch (error) {
        console.error('Error deleting rider:', error);
        res.status(500).json({ error: 'Failed to delete rider account' });
    }
};

const getOrderItems = async (req, res) => {
    const { id } = req.params;
    try {
        const items = await adminModel.fetchOrderItems(id);
        res.json({ items });
    } catch (error) {
        console.error('Error fetching order items:', error);
        res.status(500).json({ error: 'Failed to fetch order items' });
    }
};

const getCuisines = async (req, res) => {
    try {
        const cuisines = await adminModel.fetchCuisines();
        res.json({ cuisines });
    } catch (error) {
        console.error('Error fetching cuisines:', error);
        res.status(500).json({ error: 'Failed to fetch cuisines' });
    }
};

const createCuisine = async (req, res) => {
    const { name } = req.body;
    if (!name) {
        return res.status(400).json({ error: 'name is required' });
    }

    try {
        const cuisine = await adminModel.createCuisine(String(name).trim());
        res.status(201).json({ cuisine });
    } catch (error) {
        console.error('Error creating cuisine:', error);
        res.status(500).json({ error: 'Failed to create cuisine' });
    }
};

const updateCuisine = async (req, res) => {
    const { id } = req.params;
    const { name } = req.body;
    if (!name) {
        return res.status(400).json({ error: 'name is required' });
    }

    try {
        const cuisine = await adminModel.updateCuisine(id, String(name).trim());
        if (!cuisine) {
            return res.status(404).json({ error: 'Cuisine not found' });
        }
        res.json({ cuisine });
    } catch (error) {
        console.error('Error updating cuisine:', error);
        res.status(500).json({ error: 'Failed to update cuisine' });
    }
};

const deleteCuisine = async (req, res) => {
    const { id } = req.params;
    try {
        const deleted = await adminModel.deleteCuisine(id);
        if (!deleted) {
            return res.status(404).json({ error: 'Cuisine not found' });
        }
        res.json({ success: true });
    } catch (error) {
        console.error('Error deleting cuisine:', error);
        res.status(500).json({ error: 'Failed to delete cuisine' });
    }
};

const getReviews = async (req, res) => {
    try {
        const reviews = await adminModel.fetchReviews();
        res.json({ reviews });
    } catch (error) {
        console.error('Error fetching reviews:', error);
        res.status(500).json({ error: 'Failed to fetch reviews' });
    }
};

const deleteReview = async (req, res) => {
    const { id } = req.params;
    try {
        const review = await adminModel.getReviewById(id);
        if (!review) {
            return res.status(404).json({ error: 'Review not found' });
        }

        const deleted = await adminModel.deleteReview(id);
        if (!deleted) {
            return res.status(404).json({ error: 'Review not found' });
        }

        await orderModel.refreshStakeholderRating(review.stakeholder_id);
        res.json({ success: true });
    } catch (error) {
        console.error('Error deleting review:', error);
        res.status(500).json({ error: 'Failed to delete review' });
    }
};

const getActiveDeliveries = async (req, res) => {
    try {
        const deliveries = await adminModel.fetchActiveDeliveries();
        res.json({ deliveries });
    } catch (error) {
        console.error('Error fetching active deliveries:', error);
        res.status(500).json({ error: 'Failed to fetch active deliveries' });
    }
};

const getDeliveryTracking = async (req, res) => {
    const { orderId } = req.params;
    try {
        const tracking = await adminModel.fetchDeliveryTracking(orderId);
        res.json({ tracking });
    } catch (error) {
        console.error('Error fetching delivery tracking:', error);
        res.status(500).json({ error: 'Failed to fetch delivery tracking' });
    }
};

const getAvailableRiders = async (req, res) => {
    try {
        const riders = await adminModel.fetchAvailableRiders();
        res.json({ riders });
    } catch (error) {
        console.error('Error fetching available riders:', error);
        res.status(500).json({ error: 'Failed to fetch available riders' });
    }
};

const getRiderPerformance = async (req, res) => {
    try {
        const performance = await adminModel.fetchRiderPerformance();
        res.json({ performance });
    } catch (error) {
        console.error('Error fetching rider performance:', error);
        res.status(500).json({ error: 'Failed to fetch rider performance' });
    }
};

const getRiderEarnings = async (req, res) => {
    try {
        const earnings = await adminModel.fetchRiderEarnings();
        res.json({ earnings });
    } catch (error) {
        console.error('Error fetching rider earnings:', error);
        res.status(500).json({ error: 'Failed to fetch rider earnings' });
    }
};

const updateRiderEarningStatus = async (req, res) => {
    const { id } = req.params;
    const { payment_status } = req.body;
    if (!payment_status) {
        return res.status(400).json({ error: 'payment_status is required' });
    }

    try {
        const updated = await adminModel.updateRiderEarningStatus(id, payment_status);
        if (!updated) {
            return res.status(404).json({ error: 'Earning not found' });
        }
        res.json({ success: true });
    } catch (error) {
        console.error('Error updating rider earnings:', error);
        res.status(500).json({ error: 'Failed to update rider earnings' });
    }
};

const getRiderAvailability = async (req, res) => {
    try {
        const availability = await adminModel.fetchRiderAvailability();
        res.json({ availability });
    } catch (error) {
        console.error('Error fetching rider availability:', error);
        res.status(500).json({ error: 'Failed to fetch rider availability' });
    }
};

const getPickups = async (req, res) => {
    try {
        const pickups = await adminModel.fetchPickups();
        res.json({ pickups });
    } catch (error) {
        console.error('Error fetching pickups:', error);
        res.status(500).json({ error: 'Failed to fetch pickups' });
    }
};

const getInteriors = async (req, res) => {
    try {
        const interiors = await adminModel.fetchInteriors();
        res.json({ interiors });
    } catch (error) {
        console.error('Error fetching interiors:', error);
        res.status(500).json({ error: 'Failed to fetch interiors' });
    }
};

const getInteriorPics = async (req, res) => {
    try {
        const pictures = await adminModel.fetchInteriorPics();
        res.json({ pictures });
    } catch (error) {
        console.error('Error fetching interior pics:', error);
        res.status(500).json({ error: 'Failed to fetch interior pics' });
    }
};

const getRestaurantInteriors = async (req, res) => {
    try {
        const interiors = await adminModel.fetchRestaurantInteriors();
        res.json({ interiors });
    } catch (error) {
        console.error('Error fetching restaurant interiors:', error);
        res.status(500).json({ error: 'Failed to fetch restaurant interiors' });
    }
};

const getUsers = async (req, res) => {
    try {
        const users = await adminModel.fetchUsers();
        res.json({ users });
    } catch (error) {
        console.error('Error fetching users:', error);
        res.status(500).json({ error: 'Failed to fetch users' });
    }
};

module.exports = {
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
};


