const orderModel = require('../models/orderModel');

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

    // Create order
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

    res.json({
      success: true,
      message: 'Order created successfully',
      orderId: orderId
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

module.exports = exports;
