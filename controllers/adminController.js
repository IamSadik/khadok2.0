const adminModel = require('../models/adminModel');

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

module.exports = {
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
};


