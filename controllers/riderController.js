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

// Update rider status (available/busy/offline/on_break)
exports.updateRiderStatus = async (req, res) => {
    try {
        const { rider_id, status } = req.body;

        if (!['available', 'busy', 'offline', 'on_break'].includes(status)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid status. Must be: available, busy, offline, or on_break'
            });
        }

        // Check if rider has active deliveries - prevent manual status change from "busy"
        const activeOrders = await orderModel.getActiveOrdersByRider(rider_id);
        
        if (activeOrders && activeOrders.length > 0) {
            // Rider has active deliveries - cannot change status manually
            return res.status(403).json({
                success: false,
                message: 'Cannot change status while you have active deliveries. Please complete or cancel your current deliveries first.',
                activeOrders: activeOrders.length
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
        const { order_id, rider_id } = req.body;

        if (!order_id || !rider_id) {
            return res.status(400).json({
                success: false,
                message: 'Order ID and Rider ID are required'
            });
        }

        // Update order status
        await orderModel.updateDeliveryStatus(order_id, 'picked_up');
        await orderModel.updatePickupTime(order_id);
        
        // Create tracking entry
        await orderModel.createTrackingEntry(
            order_id, 
            rider_id, 
            'picked_up', 
            'Order picked up from restaurant'
        );

        // Ensure rider is busy
        await riderModel.updateRiderStatus(rider_id, 'busy');

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

// Mark order as out for delivery
exports.markOutForDelivery = async (req, res) => {
    try {
        const { order_id, rider_id } = req.body;

        if (!order_id || !rider_id) {
            return res.status(400).json({
                success: false,
                message: 'Order ID and Rider ID are required'
            });
        }

        // Update order status
        await orderModel.updateDeliveryStatus(order_id, 'out_for_delivery');
        
        // Create tracking entry
        await orderModel.createTrackingEntry(
            order_id, 
            rider_id, 
            'out_for_delivery', 
            'Order is on the way to customer'
        );

        res.json({
            success: true,
            message: 'Order marked as out for delivery'
        });
    } catch (error) {
        console.error('Error marking order as out for delivery:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update order status',
            error: error.message
        });
    }
};

// Mark rider as arrived at delivery location
exports.markArrived = async (req, res) => {
    try {
        const { order_id, rider_id } = req.body;

        if (!order_id || !rider_id) {
            return res.status(400).json({
                success: false,
                message: 'Order ID and Rider ID are required'
            });
        }

        // Update order status
        await orderModel.updateDeliveryStatus(order_id, 'arrived');
        
        // Create tracking entry
        await orderModel.createTrackingEntry(
            order_id, 
            rider_id, 
            'arrived', 
            'Rider has arrived at delivery location'
        );

        res.json({
            success: true,
            message: 'Marked as arrived at delivery location'
        });
    } catch (error) {
        console.error('Error marking as arrived:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update status',
            error: error.message
        });
    }
};

// Complete delivery
exports.completeDelivery = async (req, res) => {
    try {
        const { order_id, rider_id, delivery_notes, delivery_photo } = req.body;

        if (!order_id || !rider_id) {
            return res.status(400).json({
                success: false,
                message: 'Order ID and Rider ID are required'
            });
        }

        // Get order details for calculating delivery time
        const order = await orderModel.getOrderById(order_id);
        
        if (!order) {
            return res.status(404).json({
                success: false,
                message: 'Order not found'
            });
        }

        // Complete the delivery
        await orderModel.completeDelivery(order_id);
        
        // Create tracking entry with notes
        await orderModel.createTrackingEntry(
            order_id, 
            rider_id, 
            'delivered', 
            delivery_notes || 'Order delivered successfully'
        );

        // Calculate actual delivery time in minutes
        const deliveryTime = Math.round((Date.now() - new Date(order.created_at).getTime()) / 60000);

        // Update rider stats
        await riderModel.updateDeliveryStats(rider_id, deliveryTime, true);

        // Calculate earnings (80% of delivery fee goes to rider)
        const deliveryFee = parseFloat(order.delivery_fee) || 0;
        const riderCommission = deliveryFee * 0.8;
        const platformFee = deliveryFee * 0.2;

        // Create earning record
        await orderModel.createRiderEarning({
            rider_id: rider_id,
            order_id: order_id,
            delivery_fee: deliveryFee,
            rider_commission: riderCommission,
            platform_fee: platformFee,
            bonus_amount: 0,
            net_earning: riderCommission,
            delivery_distance: null,
            delivery_time: deliveryTime
        });

        // Check if rider has more active orders
        const remainingOrders = await orderModel.getActiveOrdersByRider(rider_id);
        
        // If no more active orders, set status back to available
        if (!remainingOrders || remainingOrders.length === 0) {
            await riderModel.updateRiderStatus(rider_id, 'available');
        }

        res.json({
            success: true,
            message: 'Delivery completed successfully! 🎉',
            earnings: riderCommission,
            hasMoreOrders: remainingOrders && remainingOrders.length > 0
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

// Get active orders for rider (orders in progress)
exports.getActiveOrders = async (req, res) => {
    try {
        const riderId = req.params.riderId || req.query.rider_id;

        const orders = await orderModel.getActiveOrdersByRider(riderId);

        res.json({
            success: true,
            orders: orders || [],
            count: orders?.length || 0
        });
    } catch (error) {
        console.error('Error fetching active orders:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch active orders',
            error: error.message
        });
    }
};

// Get order tracking data (for real-time tracking page)
exports.getOrderTrackingData = async (req, res) => {
    try {
        const orderId = req.params.orderId;
        const riderId = req.query.rider_id;

        if (!orderId || !riderId) {
            return res.status(400).json({
                success: false,
                message: 'Order ID and Rider ID are required'
            });
        }

        // Get order with all details
        const orders = await orderModel.getRecentOrdersByRider(riderId, 1, null);
        const order = orders.find(o => o.id == orderId);

        if (!order) {
            return res.status(404).json({
                success: false,
                message: 'Order not found or not assigned to this rider'
            });
        }

        // Verify order is assigned to this rider
        if (order.rider_id != riderId) {
            return res.status(403).json({
                success: false,
                message: 'This order is not assigned to you'
            });
        }

        res.json({
            success: true,
            order: order
        });
    } catch (error) {
        console.error('Error fetching order tracking data:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch order tracking data',
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

// Get recent orders with full details (including active orders)
exports.getRecentOrders = async (req, res) => {
    try {
        const riderId = req.params.riderId || req.query.rider_id;
        const limit = parseInt(req.query.limit) || 20;
        const status = req.query.status; // Optional filter: 'active', 'completed', 'cancelled', 'all'

        const orders = await orderModel.getRecentOrdersByRider(riderId, limit, status);

        res.json({
            success: true,
            orders: orders || [],
            count: orders?.length || 0
        });
    } catch (error) {
        console.error('Error fetching recent orders:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch recent orders',
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
        const { 
            rider_id, 
            name, 
            number, 
            address, 
            vehicle_type, 
            vehicle_number, 
            lat, 
            lng,
            start_time,
            end_time,
            available_now
        } = req.body;
        
        if (!rider_id) {
            return res.status(400).json({
                success: false,
                message: 'Rider ID is required'
            });
        }

        if (!name || !number || !address || !vehicle_type || !start_time || !end_time) {
            return res.status(400).json({
                success: false,
                message: 'Missing required fields'
            });
        }

        // Determine initial status based on available_now checkbox
        const initialStatus = (available_now === 'true' || available_now === true) ? 'available' : 'offline';

        const updates = {
            name: name,
            number: number,
            address: address,
            vehicle_type: vehicle_type,
            vehicle_number: vehicle_number || null,
            lat: lat || '',
            lng: lng || '',
            starts_at: start_time,
            ends_at: end_time,
            is_active: 1,
            status: initialStatus
        };

        // Handle profile picture if uploaded
        if (req.file) {
            updates.picture = req.file.filename;
        }

        await riderModel.updateRiderProfile(rider_id, updates);

        res.json({
            success: true,
            message: 'Rider information updated successfully',
            status: initialStatus
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

// Update rider work schedule
exports.updateWorkSchedule = async (req, res) => {
    try {
        const { rider_id, starts_at, ends_at } = req.body;

        if (!rider_id || !starts_at || !ends_at) {
            return res.status(400).json({
                success: false,
                message: 'Rider ID, start time, and end time are required'
            });
        }

        // Validate time format (HH:MM)
        const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;
        if (!timeRegex.test(starts_at) || !timeRegex.test(ends_at)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid time format. Use HH:MM (24-hour format)'
            });
        }

        await riderModel.updateRiderProfile(rider_id, { starts_at, ends_at });

        res.json({
            success: true,
            message: 'Work schedule updated successfully'
        });
    } catch (error) {
        console.error('Error updating work schedule:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update work schedule',
            error: error.message
        });
    }
};

// Check if rider is within working hours
exports.checkWorkingHours = async (req, res) => {
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

        // Check if rider has set work schedule
        if (!rider.starts_at || !rider.ends_at) {
            return res.json({
                success: true,
                isWithinWorkingHours: false,
                message: 'Work schedule not set'
            });
        }

        // Get current time in HH:MM format
        const now = new Date();
        const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

        // Compare times
        const isWithinHours = currentTime >= rider.starts_at && currentTime <= rider.ends_at;

        res.json({
            success: true,
            isWithinWorkingHours: isWithinHours,
            starts_at: rider.starts_at,
            ends_at: rider.ends_at,
            current_time: currentTime,
            current_status: rider.status
        });
    } catch (error) {
        console.error('Error checking working hours:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to check working hours',
            error: error.message
        });
    }
};

// Export multer upload middleware
exports.uploadProfilePicture = upload.single('profile_pic');
