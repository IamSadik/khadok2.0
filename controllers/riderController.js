const riderModel = require('../models/riderModel');
const orderModel = require('../models/orderModel');
const multer = require('multer');
const path = require('path');

// Configure multer for profile picture upload
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'uploads/');
    },
    filename: function (req, file, cb) {
        cb(null, Date.now() + '-' + Math.round(Math.random() * 1E9) + path.extname(file.originalname));
    }
});

const upload = multer({ storage: storage });

// Get rider profile
exports.getRiderProfile = async (req, res) => {
    try {
        const riderId = req.params.riderId || req.body.rider_id;
        
        if (!riderId) {
            return res.status(400).json({
                success: false,
                message: 'Rider ID is required'
            });
        }

        const rider = await riderModel.getRiderById(riderId);
        
        if (!rider) {
            return res.status(404).json({
                success: false,
                message: 'Rider not found'
            });
        }

        // Don't send password to frontend
        delete rider.password;

        res.json({
            success: true,
            rider
        });
    } catch (error) {
        console.error('Error fetching rider profile:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch rider profile',
            error: error.message
        });
    }
};

// Update rider profile
exports.updateRiderProfile = async (req, res) => {
    try {
        const riderId = req.params.riderId || req.body.rider_id;
        const updates = req.body;

        // Remove sensitive fields
        delete updates.password;
        delete updates.rider_id;
        delete updates.email;

        await riderModel.updateRiderProfile(riderId, updates);

        res.json({
            success: true,
            message: 'Profile updated successfully'
        });
    } catch (error) {
        console.error('Error updating rider profile:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update profile',
            error: error.message
        });
    }
};

// Update rider status (available/busy/offline)
exports.updateRiderStatus = async (req, res) => {
    try {
        const { rider_id, status } = req.body;

        if (!['available', 'busy', 'offline'].includes(status)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid status. Must be: available, busy, or offline'
            });
        }

        await riderModel.updateRiderStatus(rider_id, status);

        res.json({
            success: true,
            message: `Status updated to ${status}`
        });
    } catch (error) {
        console.error('Error updating rider status:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update status',
            error: error.message
        });
    }
};

// Update rider location
exports.updateRiderLocation = async (req, res) => {
    try {
        const { rider_id, lat, lng } = req.body;

        if (!lat || !lng) {
            return res.status(400).json({
                success: false,
                message: 'Latitude and longitude are required'
            });
        }

        await riderModel.updateRiderLocation(rider_id, lat, lng);

        res.json({
            success: true,
            message: 'Location updated successfully'
        });
    } catch (error) {
        console.error('Error updating rider location:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update location',
            error: error.message
        });
    }
};

// Get assigned orders for rider
exports.getAssignedOrders = async (req, res) => {
    try {
        const riderId = req.params.riderId || req.query.rider_id;
        const status = req.query.status || 'all'; // 'pending', 'picked_up', 'delivered', 'all'

        let orders;
        if (status === 'all') {
            orders = await orderModel.getOrdersByRider(riderId);
        } else {
            orders = await orderModel.getOrdersByRiderAndStatus(riderId, status);
        }

        res.json({
            success: true,
            orders: orders || [],
            count: orders?.length || 0
        });
    } catch (error) {
        console.error('Error fetching assigned orders:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch orders',
            error: error.message
        });
    }
};

// Accept order assignment
exports.acceptOrder = async (req, res) => {
    try {
        const { order_id, rider_id } = req.body;

        // Update order status to 'picked_up' or 'on_the_way'
        await orderModel.updateOrderStatus(order_id, 'on_the_way');
        await orderModel.updateOrderRider(order_id, rider_id);

        // Update rider status to busy
        await riderModel.updateRiderStatus(rider_id, 'busy');

        res.json({
            success: true,
            message: 'Order accepted successfully'
        });
    } catch (error) {
        console.error('Error accepting order:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to accept order',
            error: error.message
        });
    }
};

// Mark order as picked up from restaurant
exports.markOrderPickedUp = async (req, res) => {
    try {
        const { order_id } = req.body;

        await orderModel.updateOrderStatus(order_id, 'picked_up');

        res.json({
            success: true,
            message: 'Order marked as picked up'
        });
    } catch (error) {
        console.error('Error marking order as picked up:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update order status',
            error: error.message
        });
    }
};

// Complete delivery
exports.completeDelivery = async (req, res) => {
    try {
        const { order_id, rider_id, delivery_time } = req.body;

        // Update order status to delivered
        await orderModel.updateOrderStatus(order_id, 'delivered');

        // Update rider stats
        await riderModel.updateDeliveryStats(rider_id, delivery_time, true);

        // Update rider status to available
        await riderModel.updateRiderStatus(rider_id, 'available');

        res.json({
            success: true,
            message: 'Delivery completed successfully'
        });
    } catch (error) {
        console.error('Error completing delivery:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to complete delivery',
            error: error.message
        });
    }
};

// Get rider statistics
exports.getRiderStats = async (req, res) => {
    try {
        const riderId = req.params.riderId || req.query.rider_id;

        const stats = await riderModel.getRiderStats(riderId);

        // Get today's deliveries
        const todayOrders = await orderModel.getTodayOrdersByRider(riderId);

        res.json({
            success: true,
            stats: {
                ...stats,
                today_deliveries: todayOrders?.length || 0,
                today_earnings: todayOrders?.reduce((sum, order) => sum + (parseFloat(order.delivery_fee) || 0), 0) || 0
            }
        });
    } catch (error) {
        console.error('Error fetching rider stats:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch statistics',
            error: error.message
        });
    }
};

// Get available riders near a location (for order assignment)
exports.getAvailableRiders = async (req, res) => {
    try {
        const { lat, lng, radius } = req.query;

        if (!lat || !lng) {
            return res.status(400).json({
                success: false,
                message: 'Latitude and longitude are required'
            });
        }

        const riders = await riderModel.getAvailableRidersNearLocation(
            parseFloat(lat),
            parseFloat(lng),
            parseFloat(radius) || 5
        );

        res.json({
            success: true,
            riders: riders || [],
            count: riders?.length || 0
        });
    } catch (error) {
        console.error('Error fetching available riders:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch available riders',
            error: error.message
        });
    }
};

// Get delivery history
exports.getDeliveryHistory = async (req, res) => {
    try {
        const riderId = req.params.riderId || req.query.rider_id;
        const limit = parseInt(req.query.limit) || 50;

        const orders = await orderModel.getDeliveryHistory(riderId, limit);

        res.json({
            success: true,
            orders: orders || [],
            count: orders?.length || 0
        });
    } catch (error) {
        console.error('Error fetching delivery history:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch delivery history',
            error: error.message
        });
    }
};

// Cancel order (rider side)
exports.cancelOrder = async (req, res) => {
    try {
        const { order_id, rider_id, reason } = req.body;

        // Update order status
        await orderModel.updateOrderStatus(order_id, 'cancelled');
        
        // Add cancellation reason
        if (reason) {
            await orderModel.addOrderNote(order_id, `Cancelled by rider: ${reason}`);
        }

        // Update rider status back to available
        await riderModel.updateRiderStatus(rider_id, 'available');

        // Update rider stats
        await riderModel.updateDeliveryStats(rider_id, 0, false);

        res.json({
            success: true,
            message: 'Order cancelled'
        });
    } catch (error) {
        console.error('Error cancelling order:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to cancel order',
            error: error.message
        });
    }
};

// Check if rider is logging in for the first time
exports.checkFirstTime = async (req, res) => {
    try {
        const riderId = req.query.rider_id;
        
        if (!riderId) {
            return res.status(400).json({
                success: false,
                message: 'Rider ID is required'
            });
        }

        const rider = await riderModel.getRiderById(riderId);
        
        if (!rider) {
            return res.status(404).json({
                success: false,
                message: 'Rider not found'
            });
        }

        // Check if essential fields are empty (indicates first-time setup is incomplete)
        const firstTime = !rider.number || !rider.address || !rider.vehicle_type;

        res.json({
            success: true,
            firstTime: firstTime
        });
    } catch (error) {
        console.error('Error checking first-time status:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to check first-time status',
            error: error.message
        });
    }
};

// Update rider info (for first-time setup)
exports.updateRiderInfo = async (req, res) => {
    try {
        const { rider_id, name, number, address, vehicle_type, vehicle_number, lat, lng } = req.body;
        
        if (!rider_id) {
            return res.status(400).json({
                success: false,
                message: 'Rider ID is required'
            });
        }

        if (!name || !number || !address || !vehicle_type) {
            return res.status(400).json({
                success: false,
                message: 'Missing required fields'
            });
        }

        const updates = {
            name: name,
            number: number,
            address: address,
            vehicle_type: vehicle_type,
            vehicle_number: vehicle_number || null,
            lat: lat || '',
            lng: lng || '',
            is_active: 1,
            status: 'offline'
        };

        // Handle profile picture if uploaded
        if (req.file) {
            updates.picture = req.file.filename;
        }

        await riderModel.updateRiderProfile(rider_id, updates);

        res.json({
            success: true,
            message: 'Rider information updated successfully'
        });
    } catch (error) {
        console.error('Error updating rider info:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update rider information',
            error: error.message
        });
    }
};

// Export multer upload middleware
exports.uploadProfilePicture = upload.single('profile_pic');
