const orderModel = require('../models/orderModel');

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

// NEW: Get orders for stakeholder with date filter (for delivery orders)
exports.getOrdersByStakeholderWithDate = async (req, res) => {
  try {
    const { stakeholder_id, date } = req.query;

    if (!stakeholder_id) {
      return res.status(400).json({
        success: false,
        message: 'Stakeholder ID is required'
      });
    }

    const orders = await orderModel.getOrdersByStakeholderWithDate(stakeholder_id, date || 'today', 'delivery');

    res.json({
      success: true,
      orders: orders
    });

  } catch (error) {
    console.error('Get orders with date filter error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch orders',
      error: error.message
    });
  }
};

// NEW: Get pickup orders for stakeholder with date filter
exports.getPickupOrdersByStakeholderWithDate = async (req, res) => {
  try {
    const { stakeholder_id, date } = req.query;

    if (!stakeholder_id) {
      return res.status(400).json({
        success: false,
        message: 'Stakeholder ID is required'
      });
    }

    const pickups = await orderModel.getOrdersByStakeholderWithDate(stakeholder_id, date || 'today', 'pickup');

    res.json({
      success: true,
      pickups: pickups
    });

  } catch (error) {
    console.error('Get pickup orders with date filter error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch pickup orders',
      error: error.message
    });
  }
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

    // Validate delivery address for delivery orders
    if (order_type === 'delivery' && !delivery_address) {
      return res.status(400).json({
        success: false,
        message: 'Delivery address is required for delivery orders'
      });
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

      orderData.restaurant_lat = restaurant.lat;
      orderData.restaurant_lng = restaurant.lng;
      orderData.delivery_lat = delivery_lat;
      orderData.delivery_lng = delivery_lng;
      orderData.delivery_status = 'pending_rider';

      // Calculate distance and estimated delivery time
      if (delivery_lat && delivery_lng && restaurant.lat && restaurant.lng) {
        const distance = calculateDistance(
          parseFloat(restaurant.lat),
          parseFloat(restaurant.lng),
          parseFloat(delivery_lat),
          parseFloat(delivery_lng)
        );
        orderData.estimated_delivery_time = calculateDeliveryTime(distance);
      }
    }

    const orderId = await orderModel.createOrder(orderData);

    // Create order items
    const orderItems = items.map(item => ({
      order_id: orderId,
      menu_id: item.menu_id,
      item_name: item.item_name,
      item_price: parseFloat(item.item_price),
      quantity: parseInt(item.quantity),
      subtotal: parseFloat(item.subtotal)
    }));

    await orderModel.createOrderItems(orderItems);

    // Create initial delivery tracking entry for delivery orders
    if (order_type === 'delivery') {
      await orderModel.createTrackingEntry(orderId, null, 'order_placed', 'Order has been placed');
    }

    res.json({
      success: true,
      message: 'Order created successfully',
      orderId: orderId,
      estimated_delivery_time: orderData.estimated_delivery_time || null
    });

  } catch (error) {
    console.error('Create order error:', error);
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

    // Create tracking entry when restaurant confirms order
    if (order_status === 'confirmed') {
      const order = await orderModel.getOrderById(order_id);
      if (order && order.order_type === 'delivery') {
        await orderModel.createTrackingEntry(order_id, null, 'restaurant_confirmed', 'Restaurant confirmed your order');
        
        // Try to auto-assign rider
        const assigned = await assignRiderToOrder(order_id);
        if (!assigned.success) {
          console.warn('Auto rider assignment failed:', assigned.message);
        }
      }
    }

    res.json({
      success: true,
      message: 'Order status updated successfully'
    });

  } catch (error) {
    console.error('Update order status error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update order status',
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
    const order = await orderModel.getOrderById(orderId);
    
    if (!order || order.order_type !== 'delivery') {
      return { success: false, message: 'Invalid order for delivery' };
    }

    if (!order.restaurant_lat || !order.restaurant_lng) {
      return { success: false, message: 'Restaurant location not available' };
    }

    // Find available riders within 5km of restaurant
    const availableRiders = await orderModel.getAvailableRiders(
      order.restaurant_lat,
      order.restaurant_lng,
      5 // radius in km
    );

    if (availableRiders.length === 0) {
      return { success: false, message: 'No riders available' };
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

    console.log(`✅ Rider ${bestRider.name} assigned to order ${orderId}`);

    return { 
      success: true, 
      rider: bestRider,
      message: `Rider ${bestRider.name} assigned successfully`
    };

  } catch (error) {
    console.error('Rider assignment error:', error);
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
