// controllers/cartController.js
const db = require("../config/configdb");

// Add item to cart
const addToCart = async (req, res) => {
  try {
    const { consumer_id, menu_id, quantity, stakeholder_id, item_name, item_price, item_picture } = req.body;

    if (!consumer_id || !menu_id || !stakeholder_id) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    // Check if item already exists in cart
    const checkQuery = `SELECT * FROM cart WHERE consumer_id = ? AND menu_id = ?`;
    
    db.query(checkQuery, [consumer_id, menu_id], (err, results) => {
      if (err) {
        console.error("Error checking cart:", err);
        return res.status(500).json({ error: "Database error" });
      }

      if (results.length > 0) {
        // Update quantity if item exists
        const updateQuery = `UPDATE cart SET quatity = quatity + ? WHERE consumer_id = ? AND menu_id = ?`;
        db.query(updateQuery, [quantity || 1, consumer_id, menu_id], (err) => {
          if (err) {
            console.error("Error updating cart:", err);
            return res.status(500).json({ error: "Failed to update cart" });
          }
          return res.status(200).json({ message: "Cart updated successfully" });
        });
      } else {
        // Insert new item
        const insertQuery = `
          INSERT INTO cart (consumer_id, menu_id, quatity, stakeholder_id, item_name, item_price, item_picture)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `;
        db.query(insertQuery, [consumer_id, menu_id, quantity || 1, stakeholder_id, item_name, item_price, item_picture], (err) => {
          if (err) {
            console.error("Error adding to cart:", err);
            return res.status(500).json({ error: "Failed to add to cart" });
          }
          return res.status(201).json({ message: "Item added to cart successfully" });
        });
      }
    });
  } catch (error) {
    console.error("Error in addToCart:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};

// Get cart items for a consumer
const getCartItems = async (req, res) => {
  try {
    const { consumer_id } = req.params;

    if (!consumer_id) {
      return res.status(400).json({ error: "Consumer ID is required" });
    }

    const query = `SELECT * FROM cart WHERE consumer_id = ? ORDER BY added_at DESC`;
    
    db.query(query, [consumer_id], (err, results) => {
      if (err) {
        console.error("Error fetching cart:", err);
        return res.status(500).json({ error: "Database error" });
      }
      return res.status(200).json({ cartItems: results });
    });
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

    const query = `UPDATE cart SET quatity = ? WHERE cart_id = ?`;
    
    db.query(query, [quantity, cart_id], (err) => {
      if (err) {
        console.error("Error updating cart item:", err);
        return res.status(500).json({ error: "Failed to update cart item" });
      }
      return res.status(200).json({ message: "Cart item updated successfully" });
    });
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

    const query = `DELETE FROM cart WHERE cart_id = ?`;
    
    db.query(query, [cart_id], (err) => {
      if (err) {
        console.error("Error removing from cart:", err);
        return res.status(500).json({ error: "Failed to remove from cart" });
      }
      return res.status(200).json({ message: "Item removed from cart successfully" });
    });
  } catch (error) {
    console.error("Error in removeFromCart:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};

// Clear entire cart for a consumer
const clearCart = async (req, res) => {
  try {
    const { consumer_id } = req.params;

    if (!consumer_id) {
      return res.status(400).json({ error: "Consumer ID is required" });
    }

    const query = `DELETE FROM cart WHERE consumer_id = ?`;
    
    db.query(query, [consumer_id], (err) => {
      if (err) {
        console.error("Error clearing cart:", err);
        return res.status(500).json({ error: "Failed to clear cart" });
      }
      return res.status(200).json({ message: "Cart cleared successfully" });
    });
  } catch (error) {
    console.error("Error in clearCart:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};

module.exports = {
  addToCart,
  getCartItems,
  updateCartItem,
  removeFromCart,
  clearCart
};