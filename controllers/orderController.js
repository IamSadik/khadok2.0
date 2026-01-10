const orderModel = require('../models/orderModel');

// 🔥 Get Socket.IO instance for real-time notifications
let io;
try {
  const server = require('../server');
  io = server.io;
} catch (error) {
  console.warn('⚠️ Socket.IO not available yet');
}

// Helper function to calculate distance between two coordinates (Haversine formula)
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c; // Distance in km
}

// Helper function to estimate delivery time based on distance
function calculateDeliveryTime(distance) {
  // Base time: 15 minutes
  // Add 3 minutes per km
  const baseTime = 15;
  const timePerKm = 3;
  return Math.round(baseTime + (distance * timePerKm));
}

// Create a new order
exports.createOrder = async (req, res) => {
  try {
    const {
      consumer_id,
      stakeholder_id,
      order_type,
      payment_method,
      subtotal,
      delivery_fee,
      service_fee,
      total_amount,
      delivery_address,
      delivery_lat,
      delivery_lng,
      pickup_time,
      notes,
      items
    } = req.body;

    // Validate required fields
    if (!consumer_id || !stakeholder_id || !order_type || !payment_method || !total_amount || !items || items.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields'
      });
    }

    // Validate order type
    if (!['delivery', 'pickup'].includes(order_type)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid order type'
      });
    }

    // Validate delivery requirements for delivery orders
    if (order_type === 'delivery') {
      if (!delivery_address) {
        return res.status(400).json({
          success: false,
          message: 'Delivery address is required for delivery orders'
        });
      }
      
      if (!delivery_lat || !delivery_lng) {
        return res.status(400).json({
          success: false,
          message: 'Delivery coordinates (lat/lng) are required for delivery orders'
        });
      }
    }

    // Create order data
    const orderData = {
      consumer_id,
      stakeholder_id,
      order_type,
      order_status: 'pending',
      payment_status: payment_method === 'cash' ? 'pending' : 'paid',
      payment_method,
      subtotal: parseFloat(subtotal),
      delivery_fee: parseFloat(delivery_fee || 0),
      service_fee: parseFloat(service_fee || 0),
      total_amount: parseFloat(total_amount),
      delivery_address: order_type === 'delivery' ? delivery_address : null,
      pickup_time: order_type === 'pickup' ? pickup_time : null,
      notes: notes || null
    };

    // Add delivery-specific fields
    if (order_type === 'delivery') {
      // Get restaurant coordinates
      const restaurant = await orderModel.getRestaurantCoordinates(stakeholder_id);
      
      if (!restaurant) {
        return res.status(404).json({
          success: false,
          message: 'Restaurant not found'
        });
      }

      if (!restaurant.lat || !restaurant.lng) {
        return res.status(400).json({
          success: false,
          message: 'Restaurant location not configured. Please contact support.'
        });
      }

      orderData.restaurant_lat = restaurant.lat;
      orderData.restaurant_lng = restaurant.lng;
      orderData.delivery_lat = delivery_lat;
      orderData.delivery_lng = delivery_lng;
      orderData.delivery_status = 'pending_rider';

      // Calculate distance and estimated delivery time
      const distance = calculateDistance(
        parseFloat(restaurant.lat),
        parseFloat(restaurant.lng),
        parseFloat(delivery_lat),
        parseFloat(delivery_lng)
      );
      orderData.estimated_delivery_time = calculateDeliveryTime(distance);
      
      console.log(`📍 Order delivery distance: ${distance.toFixed(2)} km, estimated time: ${orderData.estimated_delivery_time} min`);
    }

    const orderId = await orderModel.createOrder(orderData);
    console.log(`✅ Order ${orderId} created successfully (${order_type})`);

    // Create order items
    const orderItems = items.map(item => ({
      order_id: orderId,
      menu_id: item.menu_id,
      item_name: item.item_name,
      item_price: parseFloat(item.item_price),
      quantity: parseInt(item.quantity),
      category: item.category || null, // ✅ Include category from cart
      subtotal: parseFloat(item.subtotal)
    }));

    await orderModel.createOrderItems(orderItems);

    // 🔥 IMMEDIATE RIDER ASSIGNMENT FOR DELIVERY ORDERS
    if (order_type === 'delivery') {
      // Create initial tracking entry
      await orderModel.createTrackingEntry(orderId, null, 'order_placed', 'Order has been placed');
      
      console.log(`🚴 Starting immediate rider assignment for order ${orderId}...`);
      
      // Auto-assign rider immediately after order creation
      const assignmentResult = await assignRiderToOrder(orderId);
      
      if (assignmentResult.success) {
        console.log(`✅ Rider ${assignmentResult.rider.name} assigned immediately to order ${orderId}`);
        
        // Update delivery status to 'assigned'
        await orderModel.updateDeliveryStatus(orderId, 'assigned');
        
        res.json({
          success: true,
          message: 'Order created and rider assigned successfully',
          orderId: orderId,
          estimated_delivery_time: orderData.estimated_delivery_time,
          rider_assigned: true,
          rider_name: assignmentResult.rider.name,
          rider_phone: assignmentResult.rider.phone
        });
      } else {
        console.warn(`⚠️ Rider assignment failed for order ${orderId}: ${assignmentResult.message}`);
        
        res.json({
          success: true,
          message: 'Order created successfully but no rider available yet',
          orderId: orderId,
          estimated_delivery_time: orderData.estimated_delivery_time,
          rider_assigned: false,
          rider_message: assignmentResult.message
        });
      }
    } else {
      // Pickup order - no rider needed
      res.json({
        success: true,
        message: 'Pickup order created successfully',
        orderId: orderId
      });
    }

  } catch (error) {
    console.error('❌ Create order error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create order',
      error: error.message
    });
  }
};

// Get orders for a consumer
exports.getConsumerOrders = async (req, res) => {
  try {
    const { consumer_id } = req.params;

    if (!consumer_id) {
      return res.status(400).json({
        success: false,
        message: 'Consumer ID is required'
      });
    }

    const orders = await orderModel.getOrdersByConsumer(consumer_id);

    res.json({
      success: true,
      orders: orders
    });

  } catch (error) {
    console.error('Get consumer orders error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch orders',
      error: error.message
    });
  }
};

// ✅ NEW: Get orders for a consumer (query params version)
exports.getConsumerOrdersQuery = async (req, res) => {
  try {
    const { consumer_id } = req.query;

    if (!consumer_id) {
      return res.status(400).json({
        success: false,
        message: 'Consumer ID is required'
      });
    }

    console.log(`📦 Fetching delivery orders for consumer ${consumer_id}...`);

    // Get all orders and filter for delivery orders
    const allOrders = await orderModel.getOrdersByConsumer(consumer_id);
    const deliveryOrders = allOrders.filter(order => order.order_type === 'delivery');

    console.log(`✅ Found ${deliveryOrders.length} delivery orders for consumer ${consumer_id}`);

    res.json({
      success: true,
      orders: deliveryOrders
    });

  } catch (error) {
    console.error('❌ Get consumer delivery orders error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch orders',
      error: error.message
    });
  }
};

// ✅ NEW: Get pickup orders for a consumer (query params version)
exports.getConsumerPickupOrdersQuery = async (req, res) => {
  try {
    const { consumer_id } = req.query;

    if (!consumer_id) {
      return res.status(400).json({
        success: false,
        message: 'Consumer ID is required'
      });
    }

    console.log(`📦 Fetching pickup orders for consumer ${consumer_id}...`);

    // Get all orders and filter for pickup orders
    const allOrders = await orderModel.getOrdersByConsumer(consumer_id);
    const pickupOrders = allOrders.filter(order => order.order_type === 'pickup');

    console.log(`✅ Found ${pickupOrders.length} pickup orders for consumer ${consumer_id}`);

    res.json({
      success: true,
      orders: pickupOrders
    });

  } catch (error) {
    console.error('❌ Get consumer pickup orders error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch pickup orders',
      error: error.message
    });
  }
};

// ✅ NEW: Get single order by ID (for tracking page)
exports.getOrderById = async (req, res) => {
  try {
    const { order_id } = req.params;

    if (!order_id) {
      return res.status(400).json({
        success: false,
        message: 'Order ID is required'
      });
    }

    console.log(`📦 Fetching order details for order ${order_id}...`);

    const order = await orderModel.getOrderById(order_id);

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    // Get order items
    const items = await orderModel.getOrderItems(order_id);

    // Get tracking history if it's a delivery order
    let tracking = [];
    if (order.order_type === 'delivery') {
      tracking = await orderModel.getTrackingHistory(order_id);
    }

    console.log(`✅ Order ${order_id} fetched successfully`);

    res.json({
      success: true,
      order: {
        ...order,
        items: items,
        tracking: tracking
      }
    });

  } catch (error) {
    console.error('❌ Get order by ID error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch order',
      error: error.message
    });
  }
};

// ✅ NEW: Get active delivery orders for a consumer
exports.getActiveDeliveryOrders = async (req, res) => {
  try {
    const { consumer_id } = req.params;

    if (!consumer_id) {
      return res.status(400).json({
        success: false,
        message: 'Consumer ID is required'
      });
    }

    console.log(`🚚 Fetching active delivery orders for consumer ${consumer_id}...`);

    // Get all orders for consumer
    const allOrders = await orderModel.getOrdersByConsumer(consumer_id);
    
    // ✅ SIMPLIFIED: Active order = any order that is NOT completed or cancelled
    // Don't check delivery_status at all - just order_status
    const activeDeliveryOrders = allOrders.filter(order => {
      const isDeliveryOrder = order.order_type === 'delivery';
      const isActive = !['completed', 'cancelled'].includes(order.order_status);
      
      return isDeliveryOrder && isActive;
    });

    console.log(`✅ Found ${activeDeliveryOrders.length} active delivery orders for consumer ${consumer_id}`);
    console.log(`📊 Active orders:`, activeDeliveryOrders.map(o => ({
      id: o.id,
      order_status: o.order_status,
      delivery_status: o.delivery_status
    })));

    // If there are active orders, return the most recent one with full details
    if (activeDeliveryOrders.length > 0) {
      const activeOrder = activeDeliveryOrders[0]; // Most recent active order
      
      // Get tracking history for the order
      const tracking = await orderModel.getTrackingHistory(activeOrder.id);
      
      res.json({
        success: true,
        hasActiveOrder: true,
        order: {
          id: activeOrder.id,
          restaurant_name: activeOrder.restaurant_name,
          order_status: activeOrder.order_status,
          delivery_status: activeOrder.delivery_status,
          estimated_delivery_time: activeOrder.estimated_delivery_time,
          rider_name: activeOrder.rider_name,
          rider_phone: activeOrder.rider_phone,
          total_amount: activeOrder.total_amount,
          created_at: activeOrder.created_at,
          tracking: tracking
        }
      });
    } else {
      res.json({
        success: true,
        hasActiveOrder: false,
        message: 'No active delivery orders'
      });
    }

  } catch (error) {
    console.error('❌ Get active delivery orders error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch active delivery orders',
      error: error.message
    });
  }
};

// Get orders for a stakeholder (restaurant)
exports.getStakeholderOrders = async (req, res) => {
  try {
    const { stakeholder_id } = req.params;

    if (!stakeholder_id) {
      return res.status(400).json({
        success: false,
        message: 'Stakeholder ID is required'
      });
    }

    const orders = await orderModel.getOrdersByStakeholder(stakeholder_id);

    res.json({
      success: true,
      orders: orders
    });

  } catch (error) {
    console.error('Get stakeholder orders error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch orders',
      error: error.message
    });
  }
};

// Get orders for a stakeholder with date filter (query params)
exports.getOrdersByStakeholderWithDate = async (req, res) => {
  try {
    const { stakeholder_id, date } = req.query;

    if (!stakeholder_id) {
      return res.status(400).json({
        success: false,
        message: 'Stakeholder ID is required'
      });
    }

    let orders;
    if (date) {
      // Get delivery orders for specific date using the correct function name
      orders = await orderModel.getOrdersByStakeholderWithDate(stakeholder_id, date, 'delivery');
    } else {
      // Get all orders
      orders = await orderModel.getOrdersByStakeholder(stakeholder_id);
    }

    res.json({
      success: true,
      orders: orders
    });

  } catch (error) {
    console.error('Get stakeholder orders with date error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch orders',
      error: error.message
    });
  }
};

// Get pickup orders for a stakeholder with date filter
exports.getPickupOrdersByStakeholderWithDate = async (req, res) => {
  try {
    const { stakeholder_id, date } = req.query;

    if (!stakeholder_id) {
      return res.status(400).json({
        success: false,
        message: 'Stakeholder ID is required'
      });
    }

    let orders;
    if (date) {
      // Get pickup orders for specific date using the correct function with 'pickup' order type
      orders = await orderModel.getOrdersByStakeholderWithDate(stakeholder_id, date, 'pickup');
    } else {
      // Get all orders and filter for pickup orders
      const allOrders = await orderModel.getOrdersByStakeholder(stakeholder_id);
      orders = allOrders.filter(order => order.order_type === 'pickup');
    }

    res.json({
      success: true,
      orders: orders
    });

  } catch (error) {
    console.error('Get pickup orders with date error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch pickup orders',
      error: error.message
    });
  }
};

// Update order status
exports.updateOrderStatus = async (req, res) => {
  try {
    const { order_id } = req.params;
    const { order_status } = req.body;

    if (!order_id || !order_status) {
      return res.status(400).json({
        success: false,
        message: 'Order ID and status are required'
      });
    }

    // Validate order status
    const validStatuses = ['pending', 'confirmed', 'preparing', 'ready', 'completed', 'cancelled'];
    if (!validStatuses.includes(order_status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid order status'
      });
    }

    await orderModel.updateOrderStatus(order_id, order_status);
    console.log(`📦 Order ${order_id} status updated to: ${order_status}`);

    // Get order details
    const order = await orderModel.getOrderById(order_id);
    
    // 🔥 EMIT SOCKET.IO NOTIFICATION TO CONSUMER
    if (order && req.app.get('io')) {
      const io = req.app.get('io');
      const notificationData = {
        order_id: order.id,
        status: order_status,
        restaurant_name: order.restaurant_name || 'Restaurant',
        rider_name: order.rider_name || null,
        estimated_time: order.estimated_delivery_time || null
      };
      
      // Emit to specific consumer
      io.to(`consumer-${order.consumer_id}`).emit('deliveryStatusUpdate', notificationData);
      console.log(`🔔 Notification sent to consumer ${order.consumer_id} for order ${order_id}`);
    }
    
    if (order && order.order_type === 'delivery') {
      // Create tracking entry for status changes
      let trackingMessage = '';
      
      switch(order_status) {
        case 'confirmed':
          trackingMessage = 'Restaurant confirmed your order';
          await orderModel.createTrackingEntry(order_id, order.rider_id, 'restaurant_confirmed', trackingMessage);
          
          // 🔥 Try to assign rider if not already assigned
          if (!order.rider_id) {
            console.log(`🚴 Order ${order_id} confirmed but no rider - attempting assignment...`);
            const assigned = await assignRiderToOrder(order_id);
            if (assigned.success) {
              await orderModel.updateDeliveryStatus(order_id, 'assigned');
              console.log(`✅ Rider assigned during confirmation: ${assigned.rider.name}`);
            } else {
              console.warn(`⚠️ Rider assignment failed: ${assigned.message}`);
            }
          }
          break;
          
        case 'preparing':
          trackingMessage = 'Restaurant is preparing your order';
          await orderModel.createTrackingEntry(order_id, order.rider_id, 'preparing', trackingMessage);
          break;
          
        case 'ready':
          trackingMessage = 'Order is ready for pickup by rider';
          await orderModel.createTrackingEntry(order_id, order.rider_id, 'ready_for_pickup', trackingMessage);
          
          // Notify rider if assigned
          if (order.rider_id) {
            console.log(`🔔 Notifying rider ${order.rider_id} that order ${order_id} is ready`);
          }
          break;
          
        case 'completed':
          trackingMessage = 'Order completed';
          await orderModel.createTrackingEntry(order_id, order.rider_id, 'completed', trackingMessage);
          break;
          
        case 'cancelled':
          trackingMessage = 'Order cancelled';
          await orderModel.createTrackingEntry(order_id, order.rider_id, 'cancelled', trackingMessage);
          
          // Free up rider if assigned
          if (order.rider_id) {
            await orderModel.updateRiderStatus(order.rider_id, 'available');
            console.log(`🚴 Rider ${order.rider_id} marked available after order ${order_id} cancelled`);
          }
          break;
      }
    }

    res.json({
      success: true,
      message: 'Order status updated successfully'
    });

  } catch (error) {
    console.error('❌ Update order status error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update order status',
      error: error.message
    });
  }
};

// ✅ NEW: Update pickup order status (for compatibility)
exports.updatePickupOrderStatus = async (req, res) => {
  try {
    const { pickup_id } = req.params;
    const { order_status } = req.body;

    if (!pickup_id || !order_status) {
      return res.status(400).json({
        success: false,
        message: 'Pickup ID and status are required'
      });
    }

    // Validate order status
    const validStatuses = ['pending', 'confirmed', 'preparing', 'ready', 'completed', 'cancelled'];
    if (!validStatuses.includes(order_status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid order status'
      });
    }

    await orderModel.updateOrderStatus(pickup_id, order_status);
    console.log(`📦 Pickup order ${pickup_id} status updated to: ${order_status}`);

    res.json({
      success: true,
      message: 'Pickup order status updated successfully'
    });

  } catch (error) {
    console.error('❌ Update pickup order status error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update pickup order status',
      error: error.message
    });
  }
};

// Link payment to order (called after successful bKash payment)
exports.linkPaymentToOrder = async (req, res) => {
  try {
    const {
      order_id,
      payment_id,
      transaction_id
    } = req.body;

    if (!order_id || !payment_id) {
      return res.status(400).json({
        success: false,
        message: 'Order ID and Payment ID are required'
      });
    }

    // Update order payment status
    await orderModel.updateOrderPaymentStatus(order_id, 'paid');

    // Update payment record with order_id
    await orderModel.linkPaymentToOrder(payment_id, order_id, transaction_id);

    res.json({
      success: true,
      message: 'Payment linked to order successfully'
    });

  } catch (error) {
    console.error('Link payment to order error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to link payment to order',
      error: error.message
    });
  }
};

// AUTO RIDER ASSIGNMENT ALGORITHM
async function assignRiderToOrder(orderId) {
  try {
    console.log(`🔍 Attempting to assign rider to order ${orderId}...`);
    
    const order = await orderModel.getOrderById(orderId);
    
    if (!order || order.order_type !== 'delivery') {
      return { success: false, message: 'Invalid order for delivery' };
    }

    // Check if rider already assigned
    if (order.rider_id) {
      console.log(`⚠️ Order ${orderId} already has rider ${order.rider_id} assigned`);
      return { success: false, message: 'Rider already assigned to this order' };
    }

    if (!order.restaurant_lat || !order.restaurant_lng) {
      return { success: false, message: 'Restaurant location not available' };
    }

    if (!order.delivery_lat || !order.delivery_lng) {
      return { success: false, message: 'Delivery location not available' };
    }

    // Find available riders within 5km of restaurant
    console.log(`🔍 Searching for riders within 5km of restaurant (${order.restaurant_lat}, ${order.restaurant_lng})...`);
    
    const availableRiders = await orderModel.getAvailableRiders(
      order.restaurant_lat,
      order.restaurant_lng,
      5 // radius in km
    );

    console.log(`📋 Found ${availableRiders.length} available riders`);

    if (availableRiders.length === 0) {
      return { success: false, message: 'No riders available within 5km radius' };
    }

    // Calculate delivery feasibility score for each rider
    const scoredRiders = availableRiders.map(rider => {
      const restaurantDistance = rider.distance_to_restaurant;
      const deliveryDistance = calculateDistance(
        parseFloat(order.restaurant_lat),
        parseFloat(order.restaurant_lng),
        parseFloat(order.delivery_lat),
        parseFloat(order.delivery_lng)
      );

      // Score based on: distance (50%), rating (30%), experience (20%)
      const distanceScore = restaurantDistance * 0.5;
      const ratingScore = (5 - (rider.rating || 3)) * 0.3;
      const experienceScore = (100 - (rider.total_deliveries || 0)) * 0.002;
      
      const totalScore = distanceScore + ratingScore + experienceScore;

      return { ...rider, score: totalScore, deliveryDistance };
    });

    // Assign to best rider (lowest score = best)
    const bestRider = scoredRiders.sort((a, b) => a.score - b.score)[0];

    console.log(`🎯 Best rider selected: ${bestRider.name} (ID: ${bestRider.rider_id}) - Score: ${bestRider.score.toFixed(2)}`);

    // Update order with rider assignment
    await orderModel.assignRider(orderId, bestRider.rider_id);

    // Update rider status to busy
    await orderModel.updateRiderStatus(bestRider.rider_id, 'busy');

    // Create tracking entry
    await orderModel.createTrackingEntry(
      orderId, 
      bestRider.rider_id, 
      'rider_assigned', 
      `Rider ${bestRider.name} has been assigned to your order`
    );

    console.log(`✅ Rider ${bestRider.name} assigned to order ${orderId} successfully`);

    return { 
      success: true, 
      rider: bestRider,
      message: `Rider ${bestRider.name} assigned successfully`
    };

  } catch (error) {
    console.error('❌ Rider assignment error:', error);
    return { success: false, message: error.message };
  }
}

// NEW: Update delivery status
exports.updateDeliveryStatus = async (req, res) => {
  try {
    const { order_id } = req.params;
    const { delivery_status, notes, rider_id } = req.body;

    if (!order_id || !delivery_status) {
      return res.status(400).json({
        success: false,
        message: 'Order ID and delivery status are required'
      });
    }

    const validStatuses = ['pending_rider', 'assigned', 'picked_up', 'out_for_delivery', 'arrived', 'delivered'];
    if (!validStatuses.includes(delivery_status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid delivery status'
      });
    }

    await orderModel.updateDeliveryStatus(order_id, delivery_status);

    // Create tracking entry
    const trackingStatus = delivery_status === 'pending_rider' ? 'order_placed' : delivery_status;
    await orderModel.createTrackingEntry(order_id, rider_id, trackingStatus, notes);

    // Handle specific status changes
    if (delivery_status === 'picked_up') {
      await orderModel.updatePickupTime(order_id);
    } else if (delivery_status === 'delivered') {
      await orderModel.completeDelivery(order_id);
      
      // Calculate and create rider earnings
      const order = await orderModel.getOrderById(order_id);
      if (order && order.rider_id) {
        await createRiderEarnings(order);
      }
    }

    res.json({
      success: true,
      message: 'Delivery status updated successfully'
    });

  } catch (error) {
    console.error('Update delivery status error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update delivery status',
      error: error.message
    });
  }
};

// NEW: Get delivery tracking history
exports.getTrackingHistory = async (req, res) => {
  try {
    const { order_id } = req.params;

    if (!order_id) {
      return res.status(400).json({
        success: false,
        message: 'Order ID is required'
      });
    }

    const tracking = await orderModel.getTrackingHistory(order_id);

    res.json({
      success: true,
      tracking: tracking
    });

  } catch (error) {
    console.error('Get tracking history error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch tracking history',
      error: error.message
    });
  }
};

// NEW: Calculate rider earnings
async function createRiderEarnings(order) {
  try {
    const deliveryFee = parseFloat(order.delivery_fee || 50);
    const platformCommission = 0.20; // 20%
    const riderShare = 0.80; // 80%

    const riderCommission = deliveryFee * riderShare;
    const platformFee = deliveryFee * platformCommission;

    // Calculate distance
    const deliveryDistance = calculateDistance(
      parseFloat(order.restaurant_lat),
      parseFloat(order.restaurant_lng),
      parseFloat(order.delivery_lat),
      parseFloat(order.delivery_lng)
    );

    // Distance-based bonus
    let bonus = 0;
    if (deliveryDistance > 5) {
      bonus = 10; // 10 BDT bonus for deliveries over 5km
    }

    const netEarning = riderCommission + bonus;

    // Calculate actual delivery time
    const deliveryTime = order.actual_delivery_time;

    await orderModel.createRiderEarning({
      rider_id: order.rider_id,
      order_id: order.id,
      delivery_fee: deliveryFee,
      rider_commission: riderCommission,
      platform_fee: platformFee,
      bonus_amount: bonus,
      net_earning: netEarning,
      delivery_distance: deliveryDistance.toFixed(2),
      delivery_time: deliveryTime
    });

    // Update rider statistics
    await orderModel.updateRiderStats(order.rider_id, deliveryTime);

    console.log(`💰 Rider earnings created: ${netEarning} BDT for order ${order.id}`);

  } catch (error) {
    console.error('Create rider earnings error:', error);
  }
}

// NEW: Manual rider assignment (for admin/restaurant panel)
exports.assignRiderManually = async (req, res) => {
  try {
    const { order_id, rider_id } = req.body;

    if (!order_id || !rider_id) {
      return res.status(400).json({
        success: false,
        message: 'Order ID and Rider ID are required'
      });
    }

    // Verify rider is available
    const rider = await orderModel.getRiderById(rider_id);
    if (!rider || rider.status !== 'available') {
      return res.status(400).json({
        success: false,
        message: 'Rider is not available'
      });
    }

    // Assign rider
    await orderModel.assignRider(order_id, rider_id);
    await orderModel.updateRiderStatus(rider_id, 'busy');
    await orderModel.createTrackingEntry(
      order_id, 
      rider_id, 
      'rider_assigned', 
      `Rider ${rider.name} manually assigned`
    );

    res.json({
      success: true,
      message: 'Rider assigned successfully',
      rider: rider
    });

  } catch (error) {
    console.error('Manual rider assignment error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to assign rider',
      error: error.message
    });
  }
};

// 🔥 DEBUG ENDPOINT: Get all orders for stakeholder without any filters
exports.debugGetAllOrders = async (req, res) => {
  try {
    const { stakeholder_id } = req.query;

    if (!stakeholder_id) {
      return res.status(400).json({
        success: false,
        message: 'Stakeholder ID is required'
      });
    }

    const orders = await orderModel.debugGetAllOrdersByStakeholder(stakeholder_id);

    res.json({
      success: true,
      message: `Found ${orders.length} total orders in database`,
      orders: orders,
      debug_info: {
        total_count: orders.length,
        order_types: [...new Set(orders.map(o => o.order_type))],
        order_statuses: [...new Set(orders.map(o => o.order_status))]
      }
    });

  } catch (error) {
    console.error('Debug get all orders error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch debug orders',
      error: error.message
    });
  }
};

module.exports = exports;
