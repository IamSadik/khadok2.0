// /controllers/consumerController.js
const consumerModel = require('../models/consumerModel');
const orderModel = require('../models/orderModel');
const restaurantModel = require('../models/restaurantModel');
const checkFirstTimeLogin = async (req, res) => {
    const { consumer_id } = req.query;

    if (!consumer_id) {
        return res.status(400).json({ error: 'consumer_id is required' });
    }

    try {
        const consumer = await consumerModel.getConsumerById(consumer_id);

        if (!consumer) {
            return res.status(404).json({ error: 'Consumer not found' });
        }

        const number = consumer.number;
        const isFirstTime = (number === null || number === undefined || number.toString().trim() === '');

        

        return res.status(200).json({ firstTime: isFirstTime });

    } catch (error) {
        console.error('Error in checkFirstTimeLogin:', error);
        return res.status(500).json({ error: 'Server error' });
    }
};


const updateConsumerInfo = async (req, res) => {
  const {
    consumer_id,
    full_name,
    number,
    address,
    gender,
    age,
    lat,
    lng
  } = req.body;

  // multer has put the uploaded file info on req.file
  const profilePic = req.file ? req.file.filename : null;

  // required field check
  if (!consumer_id || !full_name || !number || !address || !gender || !age || !lat || !lng) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  try {
    const success = await consumerModel.updateConsumerInfo({
      consumer_id,
      full_name,
      number,
      address,
      gender,
      age,
      lat,
      lng,
      profile_pic: profilePic
    });

    if (success) {
      return res.json({ success: true });
    } else {
      return res.status(500).json({ error: "Update failed" });
    }
  } catch (err) {
    console.error("Update error:", err);
    return res.status(500).json({ error: "Server error" });
  }
};

const buildMonthlySeries = (rows) => {
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const now = new Date();
  const map = new Map();

  rows.forEach((row) => {
    const monthDate = new Date(row.month);
    const key = `${monthDate.getFullYear()}-${String(monthDate.getMonth() + 1).padStart(2, '0')}`;
    map.set(key, row.order_count);
  });

  const labels = [];
  const data = [];

  for (let i = 5; i >= 0; i -= 1) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    labels.push(monthNames[d.getMonth()]);
    data.push(map.get(key) || 0);
  }

  return { labels, data };
};

const toUploadUrl = (filename) => (filename ? `/uploads/${filename}` : null);

const getConsumerProfile = async (req, res) => {
  const consumer_id = req.session?.userId;

  if (!consumer_id) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const [profile, stats, lastOrder, favoriteRestaurant, monthlyOrders, reviews, orders] = await Promise.all([
      consumerModel.getConsumerProfile(consumer_id),
      consumerModel.getConsumerStats(consumer_id),
      consumerModel.getConsumerLastOrder(consumer_id),
      consumerModel.getConsumerFavoriteRestaurant(consumer_id),
      consumerModel.getConsumerMonthlyOrders(consumer_id),
      consumerModel.getConsumerRecentReviews(consumer_id, 4),
      orderModel.getOrdersByConsumer(consumer_id),
    ]);

    if (!profile) {
      return res.status(404).json({ error: 'Consumer not found' });
    }

    const recentOrders = (orders || []).slice(0, 5).map((order) => ({
      id: order.id,
      restaurant_name: order.restaurant_name,
      restaurant_logo: toUploadUrl(order.logo_url),
      order_status: order.order_status,
      order_type: order.order_type,
      total_amount: Number(order.total_amount || 0),
      created_at: order.created_at,
      item_count: Array.isArray(order.items) ? order.items.reduce((sum, item) => sum + Number(item.quantity || 0), 0) : 0,
      items: Array.isArray(order.items) ? order.items.slice(0, 3) : [],
    }));

    const monthlySeries = buildMonthlySeries(monthlyOrders || []);

    return res.json({
      profile: {
        ...profile,
        picture_url: toUploadUrl(profile.picture),
      },
      stats: {
        total_orders: Number(stats.total_orders || 0),
        completed_orders: Number(stats.completed_orders || 0),
        total_spend: Number(stats.total_spend || 0),
      },
      last_order: lastOrder
        ? {
            ...lastOrder,
            total_amount: Number(lastOrder.total_amount || 0),
            restaurant_logo: toUploadUrl(lastOrder.restaurant_logo),
          }
        : null,
      favorite_restaurant: favoriteRestaurant
        ? {
            ...favoriteRestaurant,
            restaurant_logo: toUploadUrl(favoriteRestaurant.restaurant_logo),
          }
        : null,
      monthly_orders: monthlySeries,
      recent_orders: recentOrders,
      reviews: (reviews || []).map((review) => ({
        ...review,
        restaurant_logo: toUploadUrl(review.restaurant_logo),
      })),
    });
  } catch (error) {
    console.error('Error fetching consumer profile:', error);
    return res.status(500).json({ error: 'Server error' });
  }
};

const updateConsumerProfile = async (req, res) => {
  const consumer_id = req.session?.userId;

  if (!consumer_id) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const { name, number, address, gender, age, lat, lng } = req.body;
    const profilePic = req.file ? req.file.filename : null;

    const parsedAge = age !== undefined && age !== '' ? Number(age) : undefined;

    const payload = {
      consumer_id,
      name: name !== undefined ? String(name).trim() : undefined,
      number: number !== undefined ? String(number).trim() : undefined,
      address: address !== undefined ? String(address).trim() : undefined,
      gender: gender !== undefined ? String(gender).trim() : undefined,
      age: Number.isFinite(parsedAge) ? parsedAge : undefined,
      lat: lat !== undefined && lat !== '' ? String(lat).trim() : undefined,
      lng: lng !== undefined && lng !== '' ? String(lng).trim() : undefined,
      picture: profilePic,
    };

    const updated = await consumerModel.updateConsumerProfile(payload);
    if (!updated) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    const profile = await consumerModel.getConsumerProfile(consumer_id);
    return res.json({
      success: true,
      profile: {
        ...profile,
        picture_url: toUploadUrl(profile?.picture),
      },
    });
  } catch (error) {
    console.error('Error updating consumer profile:', error);
    return res.status(500).json({ error: 'Server error' });
  }
};




module.exports = {
  checkFirstTimeLogin,
  updateConsumerInfo,
  getRecommendedRestaurants: async (req, res) => {
    const consumer_id = req.session?.userId;
    if (!consumer_id) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { lat, lng, radius, orderType, limit } = req.query;
    if (!lat || !lng) {
      return res.status(400).json({ error: 'Latitude and longitude are required' });
    }

    const parsedRadius = Number(radius);
    const searchRadius = Number.isFinite(parsedRadius) && parsedRadius > 0 ? parsedRadius : 12;

    const parsedBreakdownLimit = Number(limit);
    const breakdownLimit = Number.isFinite(parsedBreakdownLimit) && parsedBreakdownLimit > 0
      ? Math.min(parsedBreakdownLimit, 8)
      : 5;

    try {
      // Step 1: Figure out which cuisines this user has been ordering
      // (e.g. { pizza: 3, burger: 2, drinks: 1 }).
      const breakdown = await restaurantModel.getCuisineBreakdownForConsumer(
        consumer_id,
        { orderType, limit: breakdownLimit }
      );

      // Step 2: Pull restaurant ids matching any of the user's top cuisines
      // within the requested radius. The model already de-duplicates and
      // orders by distance / rating.
      const topCategories = breakdown.map((row) => row.category);

      const result = await restaurantModel.getCuisineRecommendedRestaurantIdsForConsumer(
        consumer_id,
        String(lat),
        String(lng),
        searchRadius,
        {
          categories: topCategories,
          limit: 30,
        }
      );

      return res.status(200).json({
        // The single top cuisine (used for relevance sort + the "because you
        // love X" banner).
        category: result.category,
        categories: topCategories,
        cuisine_breakdown: breakdown,
        // Restaurant ids the dashboard uses to bubble the right shops to the top.
        recommended_ids: result.restaurantIds,
        // Full restaurant rows for the dedicated recommendation section.
        recommended_restaurants: result.restaurants || [],
        radius: searchRadius,
        order_type: orderType || null,
      });
    } catch (error) {
      console.error('Error fetching recommended restaurants:', error);
      return res.status(500).json({ error: 'Server error' });
    }
  },
  getConsumerProfile,
  updateConsumerProfile,
};
