// controllers/cartController.js
const db = require("../config/configdb");

const toTypeVariants = (type) => {
  const raw = String(type ?? "").trim();
  return {
    raw,
    json: JSON.stringify(raw),
  };
};

const safeParseCartType = (value) => {
  if (value === null || value === undefined) return null;
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return null;
    try {
      // Handles values like "delivery" stored as JSON string ("\"delivery\"")
      return JSON.parse(trimmed);
    } catch {
      // Handles plain values like delivery
      return trimmed;
    }
  }
  // For json/jsonb columns, pg may already deserialize into JS
  return value;
};

// Add item to cart
const addToCart = async (req, res) => {
  try {
    const { consumer_id, menu_id, quantity, stakeholder_id, item_name, item_price, item_picture, type } = req.body;

    if (!consumer_id || !menu_id || !stakeholder_id || !type) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    // Validate type
    const { raw: rawType, json: jsonType } = toTypeVariants(type);
    if (rawType !== 'delivery' && rawType !== 'pickup') {
      return res.status(400).json({ error: "Type must be 'delivery' or 'pickup'" });
    }

    // Match both raw and JSON-encoded representations; use ::text to support json/jsonb columns.
    const checkQuery = `
      SELECT cart_id
      FROM cart
      WHERE consumer_id = $1
        AND menu_id = $2
        AND (type::text = $3 OR type::text = $4)
      LIMIT 1
    `;
    const { rows: existing } = await db.query(checkQuery, [consumer_id, menu_id, rawType, jsonType]);

    if (existing.length > 0) {
      const updateQuery = `UPDATE cart SET quantity = quantity + $1 WHERE cart_id = $2`;
      await db.query(updateQuery, [quantity || 1, existing[0].cart_id]);
      return res.status(200).json({ message: "Cart updated successfully" });
    }

    const categoryQuery = `SELECT category FROM menu WHERE menu_id = $1`;
    const { rows: menuResults } = await db.query(categoryQuery, [menu_id]);
    const category = menuResults.length > 0 ? (menuResults[0].category ?? null) : null;

    const insertQuery = `
      INSERT INTO cart (consumer_id, menu_id, quantity, stakeholder_id, item_name, item_price, item_picture, type, category)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    `;
    await db.query(insertQuery, [
      consumer_id,
      menu_id,
      quantity || 1,
      stakeholder_id,
      item_name,
      item_price,
      item_picture,
      jsonType,
      category || ''
    ]);
    return res.status(201).json({ message: "Item added to cart successfully" });
  } catch (error) {
    console.error("Error in addToCart:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};

// Get cart items for a consumer by type
const getCartItems = async (req, res) => {
  try {
    // Support both /get-cart?consumer_id=X and /:consumer_id formats
    const consumer_id = req.query.consumer_id || req.params.consumer_id;
    const stakeholder_id = req.query.stakeholder_id;
    const { type } = req.query; // Get type from query parameter

    if (!consumer_id) {
      return res.status(400).json({ error: "Consumer ID is required" });
    }

    let query = `SELECT * FROM cart WHERE consumer_id = $1`;
    let params = [consumer_id];

    // Filter by stakeholder_id if provided
    if (stakeholder_id) {
      params.push(stakeholder_id);
      query += ` AND stakeholder_id = $${params.length}`;
    }

    // Filter by type if provided; match both raw and JSON-encoded representations.
    if (type) {
      const variants = toTypeVariants(type);
      params.push(variants.raw, variants.json);
      query += ` AND (type::text = $${params.length - 1} OR type::text = $${params.length})`;
    }

    query += ` ORDER BY added_at DESC`;

    const { rows } = await db.query(query, params);

    const cartItems = rows.map(item => ({
      ...item,
      type: safeParseCartType(item.type)
    }));

    return res.status(200).json({ cartItems });
  } catch (error) {
    console.error("Error in getCartItems:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};

// Update cart item quantity
const updateCartItem = async (req, res) => {
  try {
    const { cart_id } = req.params;
    const { quantity } = req.body;

    if (!cart_id || quantity === undefined) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    if (quantity <= 0) {
      return res.status(400).json({ error: "Quantity must be greater than 0" });
    }

    const query = `UPDATE cart SET quantity = $1 WHERE cart_id = $2`;
    await db.query(query, [quantity, cart_id]);
    return res.status(200).json({ message: "Cart item updated successfully" });
  } catch (error) {
    console.error("Error in updateCartItem:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};

// Remove item from cart
const removeFromCart = async (req, res) => {
  try {
    const { cart_id } = req.params;

    if (!cart_id) {
      return res.status(400).json({ error: "Cart ID is required" });
    }

    const query = `DELETE FROM cart WHERE cart_id = $1`;
    await db.query(query, [cart_id]);
    return res.status(200).json({ message: "Item removed from cart successfully" });
  } catch (error) {
    console.error("Error in removeFromCart:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};

// Clear entire cart for a consumer
const clearCart = async (req, res) => {
  try {
    const { consumer_id } = req.params;
    const { type } = req.query; // Optional type filter

    if (!consumer_id) {
      return res.status(400).json({ error: "Consumer ID is required" });
    }

    let query = `DELETE FROM cart WHERE consumer_id = $1`;
    const params = [consumer_id];

    if (type) {
      const variants = toTypeVariants(type);
      params.push(variants.raw, variants.json);
      query += ` AND (type::text = $${params.length - 1} OR type::text = $${params.length})`;
    }

    await db.query(query, params);
    return res.status(200).json({ message: "Cart cleared successfully" });
  } catch (error) {
    console.error("Error in clearCart:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};

// Check if switching between delivery/pickup is allowed
const canSwitchType = async (req, res) => {
  try {
    const { consumer_id, from_type, to_type } = req.body;

    if (!consumer_id || !from_type || !to_type) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    // Get all cart items for the consumer
    const cartQuery = `SELECT DISTINCT stakeholder_id FROM cart WHERE consumer_id = $1`;
    const { rows: cartResults } = await db.query(cartQuery, [consumer_id]);

    if (cartResults.length === 0) {
      return res.status(200).json({
        canSwitch: true,
        message: "Cart is empty, switching allowed"
      });
    }

    const stakeholderIds = cartResults.map(row => row.stakeholder_id);
    const stakeholderQuery = `
      SELECT stakeholder_id, type
      FROM stakeholder
      WHERE stakeholder_id = ANY($1)
    `;
    const { rows: stakeholderResults } = await db.query(stakeholderQuery, [stakeholderIds]);

    const unsupportedRestaurants = [];
    for (const stakeholder of stakeholderResults) {
      const types = stakeholder.type ? stakeholder.type.toLowerCase().split(',').map(t => t.trim()) : [];
      if (!types.includes(to_type.toLowerCase())) {
        unsupportedRestaurants.push(stakeholder.stakeholder_id);
      }
    }

    if (unsupportedRestaurants.length > 0) {
      return res.status(200).json({
        canSwitch: false,
        message: `Some restaurants in your cart don't support ${to_type}`,
        unsupportedRestaurants
      });
    }

    return res.status(200).json({
      canSwitch: true,
      message: "All restaurants support the target type"
    });
  } catch (error) {
    console.error("Error in canSwitchType:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};

// Switch cart type (delivery to pickup or vice versa)
const switchCartType = async (req, res) => {
  try {
    const { consumer_id, from_type, to_type } = req.body;

    if (!consumer_id || !from_type || !to_type) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    // Update all cart items from one type to another (convert to JSON format)
    const updateQuery = `
      UPDATE cart
      SET type = $1
      WHERE consumer_id = $2 AND type = $3
    `;

    const result = await db.query(updateQuery, [JSON.stringify(to_type), consumer_id, JSON.stringify(from_type)]);
    return res.status(200).json({
      message: "Cart type switched successfully",
      rowsAffected: result.rowCount
    });
  } catch (error) {
    console.error("Error in switchCartType:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};

// Validate if switching between delivery/pickup is allowed (GET request)
const validateSwitch = async (req, res) => {
  try {
    const { consumer_id, current_type, target_type, stakeholder_id } = req.query;

    if (!consumer_id || !current_type || !target_type || !stakeholder_id) {
      return res.status(400).json({ 
        canSwitch: false,
        error: "Missing required parameters" 
      });
    }

    // Check if restaurant supports the target type
    const stakeholderQuery = `SELECT type FROM stakeholder WHERE stakeholder_id = $1`;
    const { rows: results } = await db.query(stakeholderQuery, [stakeholder_id]);

    if (results.length === 0) {
      return res.status(404).json({
        canSwitch: false,
        error: "Restaurant not found"
      });
    }

    const restaurantTypes = results[0].type
      ? results[0].type.toLowerCase().split(',').map(t => t.trim())
      : [];

    const supportsTargetType = restaurantTypes.includes(target_type.toLowerCase());

    if (!supportsTargetType) {
      return res.status(200).json({
        canSwitch: false,
        message: `This restaurant doesn't support ${target_type}`,
        restaurantTypes
      });
    }

    const cartQuery = `
      SELECT DISTINCT stakeholder_id
      FROM cart
      WHERE consumer_id = $1 AND type = $2 AND stakeholder_id != $3
    `;

    const { rows: cartResults } = await db.query(cartQuery, [
      consumer_id,
      JSON.stringify(current_type),
      stakeholder_id
    ]);

    if (cartResults.length > 0) {
      const otherStakeholderIds = cartResults.map(row => row.stakeholder_id);
      const otherStakeholdersQuery = `
        SELECT stakeholder_id, type
        FROM stakeholder
        WHERE stakeholder_id = ANY($1)
      `;

      const { rows: otherResults } = await db.query(otherStakeholdersQuery, [otherStakeholderIds]);

      const unsupportedRestaurants = [];
      for (const stakeholder of otherResults) {
        const types = stakeholder.type
          ? stakeholder.type.toLowerCase().split(',').map(t => t.trim())
          : [];
        if (!types.includes(target_type.toLowerCase())) {
          unsupportedRestaurants.push(stakeholder.stakeholder_id);
        }
      }

      if (unsupportedRestaurants.length > 0) {
        return res.status(200).json({
          canSwitch: false,
          needsClear: true,
          message: `Some restaurants in your ${current_type} cart don't support ${target_type}. Clear your ${current_type} cart to continue.`,
          unsupportedRestaurants
        });
      }
    }

    return res.status(200).json({
      canSwitch: true,
      message: "You can switch to this tab"
    });
  } catch (error) {
    console.error("Error in validateSwitch:", error);
    return res.status(500).json({ 
      canSwitch: false,
      error: "Internal server error" 
    });
  }
};

module.exports = {
  addToCart,
  getCartItems,
  updateCartItem,
  removeFromCart,
  clearCart,
  canSwitchType,
  switchCartType,
  validateSwitch
};