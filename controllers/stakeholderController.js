const stakeholderModel = require('../models/stakeholderModel');
const orderModel = require('../models/orderModel');
const dineInModel = require('../models/dineInModel');
const pool = require('../config/configdb');

const checkFirstTimeLogin = async (req, res) => {
  const { stakeholder_id } = req.query;

  if (!stakeholder_id) {
    return res.status(400).json({ error: 'stakeholder_id is required' });
  }

  try {
    const stakeholder = await stakeholderModel.getStakeholderById(stakeholder_id);

    if (!stakeholder) {
      return res.status(404).json({ error: 'Stakeholder not found' });
    }

    const number = stakeholder.number;
    const isFirstTime = (
      number === null ||
      number === undefined ||
      number.toString().trim() === ''
    );

    return res.status(200).json({ firstTime: isFirstTime });
  } catch (error) {
    console.error('Error in checkFirstTimeLogin:', error);
    return res.status(500).json({ error: 'Server error' });
  }
};

const updateStakeholderInfo = async (req, res) => {
  const {
    stakeholder_id,
    restaurant_name,
    contact_number,    // from FormData
    address,
    types,             // JSON string of array
    opens_at,
    closes_at,
    lat,
    lng
  } = req.body;

  // multer has put the uploaded file info on req.file
  const interiorPic = req.file ? req.file.filename : null;

  // required fields check
  if (
    !stakeholder_id ||
    !restaurant_name ||
    !contact_number ||
    !address ||
    !types ||
    !opens_at ||
    !closes_at ||
    !lat ||
    !lng
  ) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
    const success = await stakeholderModel.updateStakeholderInfo({
      stakeholder_id,
      restaurant_name,
      number: contact_number,
      address,
      type: types,       // store JSON string or parse if needed
      opens_at,
      closes_at,
      lat,
      lng,
      picture: interiorPic
    });

    if (success) {
      return res.json({ success: true });
    } else {
      return res.status(500).json({ error: 'Update failed' });
    }
  } catch (err) {
    console.error('Update error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
};

// ========== DASHBOARD API CONTROLLERS ==========

// Get stakeholder info
const getStakeholderInfo = async (req, res) => {
  const { stakeholder_id } = req.query;

  if (!stakeholder_id) {
    return res.status(400).json({ success: false, error: 'stakeholder_id is required' });
  }

  try {
    const stakeholder = await stakeholderModel.getStakeholderById(stakeholder_id);

    if (!stakeholder) {
      return res.status(404).json({ success: false, error: 'Stakeholder not found' });
    }

    return res.json({ success: true, stakeholder });
  } catch (error) {
    console.error('Error getting stakeholder info:', error);
    return res.status(500).json({ success: false, error: 'Server error' });
  }
};

// Get dashboard orders
const getDashboardOrders = async (req, res) => {
  const { stakeholder_id } = req.query;

  if (!stakeholder_id) {
    return res.status(400).json({ success: false, error: 'stakeholder_id is required' });
  }

  try {
    // Fetch both delivery and pickup orders in parallel for better performance
    const [deliveryOrders, pickupOrders] = await Promise.all([
      orderModel.getOrdersByStakeholderWithDate(stakeholder_id, 'today', 'delivery'),
      orderModel.getOrdersByStakeholderWithDate(stakeholder_id, 'today', 'pickup')
    ]);
    
    const allOrders = [...deliveryOrders, ...pickupOrders];

    return res.json({ success: true, orders: allOrders });
  } catch (error) {
    console.error('Error getting dashboard orders:', error);
    return res.status(500).json({ success: false, error: 'Server error', orders: [] });
  }
};

// Get dashboard reservations
const getDashboardReservations = async (req, res) => {
  const { stakeholder_id } = req.query;

  if (!stakeholder_id) {
    return res.status(400).json({ success: false, error: 'stakeholder_id is required' });
  }

  try {
    // Use callback-based function with promise wrapper
    const reservations = await new Promise((resolve, reject) => {
      dineInModel.getReservationsByStakeholder(stakeholder_id, (err, results) => {
        if (err) return reject(err);
        resolve(results || []);
      });
    });

    return res.json({ success: true, reservations });
  } catch (error) {
    console.error('Error getting dashboard reservations:', error);
    return res.status(500).json({ success: false, error: 'Server error', reservations: [] });
  }
};

// Get revenue data for charts
const getRevenueData = async (req, res) => {
  const { stakeholder_id, period = 'month' } = req.query;

  if (!stakeholder_id) {
    return res.status(400).json({ success: false, error: 'stakeholder_id is required' });
  }

  try {
    // Determine date filter based on period
    const dateFilter = period === 'week' ? 'week' : period === 'year' ? 'year' : 'month';
    
    // Fetch both order types in parallel
    const [deliveryOrders, pickupOrders] = await Promise.all([
      orderModel.getOrdersByStakeholderWithDate(stakeholder_id, dateFilter, 'delivery'),
      orderModel.getOrdersByStakeholderWithDate(stakeholder_id, dateFilter, 'pickup')
    ]);

    const allOrders = [...deliveryOrders, ...pickupOrders];

    // Create a date-indexed map to ensure chronological order
    const count = period === 'week' ? 7 : period === 'month' ? 30 : 12;
    const dateMap = new Map();
    
    // Initialize all dates with 0 revenue (from oldest to newest)
    for (let i = count - 1; i >= 0; i--) {
      const date = new Date();
      let key;
      
      if (period === 'year') {
        date.setMonth(date.getMonth() - i);
        key = date.toLocaleString('default', { month: 'short' }) + ' ' + date.getFullYear();
      } else {
        date.setDate(date.getDate() - i);
        // Format: DD/MM/YY (2-digit year for minimal look)
        const year = date.getFullYear().toString().slice(-2);
        key = `${date.getDate()}/${date.getMonth() + 1}/${year}`;
      }
      
      dateMap.set(key, 0);
    }
    
    // Add actual revenue data
    allOrders.forEach(order => {
      if (order.payment_status === 'paid' || order.payment_status === 'pending') {
        const date = new Date(order.created_at);
        let key;
        
        if (period === 'year') {
          key = date.toLocaleString('default', { month: 'short' }) + ' ' + date.getFullYear();
        } else {
          // Format: DD/MM/YY (2-digit year)
          const year = date.getFullYear().toString().slice(-2);
          key = `${date.getDate()}/${date.getMonth() + 1}/${year}`;
        }

        if (dateMap.has(key)) {
          const currentValue = dateMap.get(key);
          dateMap.set(key, currentValue + parseFloat(order.total_amount || 0));
        }
      }
    });

    const labels = Array.from(dateMap.keys());
    const values = Array.from(dateMap.values());

    return res.json({ success: true, labels, values });
  } catch (error) {
    console.error('Error getting revenue data:', error);
    return res.status(500).json({ success: false, error: 'Server error', labels: [], values: [] });
  }
};

// Get popular items data
const getPopularItems = async (req, res) => {
  const { stakeholder_id, limit = 5 } = req.query;

  if (!stakeholder_id) {
    return res.status(400).json({ success: false, error: 'stakeholder_id is required' });
  }

  try {
    const parsedLimit = Number.parseInt(limit, 10) || 5;
    const query = `
      SELECT
        oi.item_name,
        oi.category,
        SUM(oi.quantity) as total_orders,
        COUNT(DISTINCT oi.order_id) as order_count
      FROM order_items oi
      INNER JOIN orders o ON oi.order_id = o.id
      WHERE o.stakeholder_id = $1
        AND o.order_status != 'cancelled'
        AND o.created_at >= NOW() - INTERVAL '30 days'
      GROUP BY oi.item_name, oi.category
      ORDER BY total_orders DESC
      LIMIT $2
    `;

    const { rows: popularItems } = await pool.query(query, [stakeholder_id, parsedLimit]);

    const labels = popularItems.map(item => item.item_name);
    const values = popularItems.map(item => parseInt(item.total_orders));

    return res.json({ success: true, labels, values, items: popularItems });
  } catch (error) {
    console.error('Error getting popular items:', error);
    return res.status(500).json({ success: false, error: 'Server error', labels: [], values: [], items: [] });
  }
};

// Get dashboard statistics (ultra-fast version with minimal data)
const getDashboardStats = async (req, res) => {
  const { stakeholder_id } = req.query;

  if (!stakeholder_id) {
    return res.status(400).json({ success: false, error: 'stakeholder_id is required' });
  }

  try {
    const [orderStatsResult, hourlyStatsResult, dineInCountResult] = await Promise.all([
      pool.query(
        `
          SELECT
            order_type,
            COUNT(*)::int as count
          FROM orders
          WHERE stakeholder_id = $1
            AND created_at::date = CURRENT_DATE
            AND order_status != 'cancelled'
          GROUP BY order_type
        `,
        [stakeholder_id]
      ),
      pool.query(
        `
          SELECT
            EXTRACT(HOUR FROM created_at)::int as hour,
            COUNT(*)::int as count
          FROM orders
          WHERE stakeholder_id = $1
            AND created_at::date = CURRENT_DATE
            AND order_status != 'cancelled'
          GROUP BY EXTRACT(HOUR FROM created_at)
        `,
        [stakeholder_id]
      ),
      pool.query(
        `
          SELECT COUNT(*)::int as count
          FROM dine_in
          WHERE stakeholder_id = $1
            AND created_at::date = CURRENT_DATE
            AND status = 'completed'
        `,
        [stakeholder_id]
      )
    ]);

    const orderStats = orderStatsResult.rows || [];
    const hourlyStats = hourlyStatsResult.rows || [];
    const dineInCount = dineInCountResult.rows?.[0]?.count || 0;

    // Process order distribution
    const orderDistribution = {
      delivery: 0,
      pickup: 0,
      dineIn: parseInt(dineInCount) || 0
    };

    orderStats.forEach(stat => {
      if (stat.order_type === 'delivery') {
        orderDistribution.delivery = parseInt(stat.count);
      } else if (stat.order_type === 'pickup') {
        orderDistribution.pickup = parseInt(stat.count);
      }
    });

    // Process hourly data into 8 slots (3-hour intervals)
    const hourlyData = Array(8).fill(0);
    hourlyStats.forEach(stat => {
      const hour = parseInt(stat.hour);
      const slotIndex = Math.floor(hour / 3);
      if (slotIndex >= 0 && slotIndex < 8) {
        hourlyData[slotIndex] += parseInt(stat.count);
      }
    });

    return res.json({
      success: true,
      orderDistribution,
      hourlyData
    });

  } catch (error) {
    console.error('Error getting dashboard stats:', error);
    return res.status(500).json({
      success: false,
      error: 'Server error',
      orderDistribution: { delivery: 0, pickup: 0, dineIn: 0 },
      hourlyData: Array(8).fill(0)
    });
  }
};

module.exports = {
  checkFirstTimeLogin,
  updateStakeholderInfo,
  getStakeholderInfo,
  getDashboardOrders,
  getDashboardReservations,
  getRevenueData,
  getPopularItems,
  getDashboardStats
};