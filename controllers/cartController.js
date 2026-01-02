// controllers/cartController.js
const db = require("../config/configdb");

// Add item to cart
const addToCart = async (req, res) => {
  try {
    const { consumer_id, menu_id, quantity, stakeholder_id, item_name, item_price, item_picture, type } = req.body;

    if (!consumer_id || !menu_id || !stakeholder_id || !type) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    // Validate type
    if (type !== 'delivery' && type !== 'pickup') {
      return res.status(400).json({ error: "Type must be 'delivery' or 'pickup'" });
    }

    // Convert type to JSON format for database storage
    const jsonType = JSON.stringify(type);

    // Check if item already exists in cart with same type
    const checkQuery = `SELECT * FROM cart WHERE consumer_id = ? AND menu_id = ? AND type = ?`;
    
    db.query(checkQuery, [consumer_id, menu_id, jsonType], (err, results) => {
      if (err) {
        console.error("Error checking cart:", err);
        return res.status(500).json({ error: "Database error" });
      }

      if (results.length > 0) {
        // Update quantity if item exists
        const updateQuery = `UPDATE cart SET quatity = quatity + ? WHERE consumer_id = ? AND menu_id = ? AND type = ?`;
        db.query(updateQuery, [quantity || 1, consumer_id, menu_id, jsonType], (err) => {
          if (err) {
            console.error("Error updating cart:", err);
            return res.status(500).json({ error: "Failed to update cart" });
          }
          return res.status(200).json({ message: "Cart updated successfully" });
        });
      } else {
        // Fetch category from menu table
        const categoryQuery = `SELECT category FROM menu WHERE menu_id = ?`;
        db.query(categoryQuery, [menu_id], (err, menuResults) => {
          if (err) {
            console.error("Error fetching category:", err);
            return res.status(500).json({ error: "Database error" });
          }

          const category = menuResults.length > 0 ? menuResults[0].category : null;

          // Insert new item with category
          const insertQuery = `
            INSERT INTO cart (consumer_id, menu_id, quatity, stakeholder_id, item_name, item_price, item_picture, type, category)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
          `;
          db.query(insertQuery, [consumer_id, menu_id, quantity || 1, stakeholder_id, item_name, item_price, item_picture, jsonType, category], (err) => {
            if (err) {
              console.error("Error adding to cart:", err);
              return res.status(500).json({ error: "Failed to add to cart" });
            }
            return res.status(201).json({ message: "Item added to cart successfully" });
          });
        });
      }
    });
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

    let query = `SELECT * FROM cart WHERE consumer_id = ?`;
    let params = [consumer_id];

    // Filter by stakeholder_id if provided
    if (stakeholder_id) {
      query += ` AND stakeholder_id = ?`;
      params.push(stakeholder_id);
    }

    // Filter by type if provided (convert to JSON format)
    if (type) {
      query += ` AND type = ?`;
      params.push(JSON.stringify(type));
    }

    query += ` ORDER BY added_at DESC`;
    
    db.query(query, params, (err, results) => {
      if (err) {
        console.error("Error fetching cart:", err);
        return res.status(500).json({ error: "Database error" });
      }
      
      // Parse JSON type back to string for response
      const cartItems = results.map(item => ({
        ...item,
        type: item.type ? JSON.parse(item.type) : null
      }));
      
      return res.status(200).json({ cartItems });
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
    const { type } = req.query; // Optional type filter

    if (!consumer_id) {
      return res.status(400).json({ error: "Consumer ID is required" });
    }

    let query = `DELETE FROM cart WHERE consumer_id = ?`;
    let params = [consumer_id];

    if (type) {
      query += ` AND type = ?`;
      params.push(JSON.stringify(type));
    }
    
    db.query(query, params, (err) => {
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

// Check if switching between delivery/pickup is allowed
const canSwitchType = async (req, res) => {
  try {
    const { consumer_id, from_type, to_type } = req.body;

    if (!consumer_id || !from_type || !to_type) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    // Get all cart items for the consumer
    const cartQuery = `SELECT DISTINCT stakeholder_id FROM cart WHERE consumer_id = ?`;
    
    db.query(cartQuery, [consumer_id], (err, cartResults) => {
      if (err) {
        console.error("Error fetching cart:", err);
        return res.status(500).json({ error: "Database error" });
      }

      // If cart is empty, switching is allowed
      if (cartResults.length === 0) {
        return res.status(200).json({ 
          canSwitch: true, 
          message: "Cart is empty, switching allowed" 
        });
      }

      // Get stakeholder IDs from cart
      const stakeholderIds = cartResults.map(row => row.stakeholder_id);

      // Check if all stakeholders support the target type
      const stakeholderQuery = `SELECT stakeholder_id, type FROM stakeholder WHERE stakeholder_id IN (?)`;
      
      db.query(stakeholderQuery, [stakeholderIds], (err, stakeholderResults) => {
        if (err) {
          console.error("Error fetching stakeholder types:", err);
          return res.status(500).json({ error: "Database error" });
        }

        // Check if all restaurants support the target type
        const unsupportedRestaurants = [];
        
        for (const stakeholder of stakeholderResults) {
          const types = stakeholder.type ? stakeholder.type.toLowerCase().split(',').map(t => t.trim()) : [];
          
          // Check if restaurant supports the target type
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
      });
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
    const updateQuery = `UPDATE cart SET type = ? WHERE consumer_id = ? AND type = ?`;
    
    db.query(updateQuery, [JSON.stringify(to_type), consumer_id, JSON.stringify(from_type)], (err, result) => {
      if (err) {
        console.error("Error switching cart type:", err);
        return res.status(500).json({ error: "Failed to switch cart type" });
      }
      return res.status(200).json({ 
        message: "Cart type switched successfully",
        rowsAffected: result.affectedRows 
      });
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
    const stakeholderQuery = `SELECT type FROM stakeholder WHERE stakeholder_id = ?`;
    
    db.query(stakeholderQuery, [stakeholder_id], (err, results) => {
      if (err) {
        console.error("Error fetching stakeholder:", err);
        return res.status(500).json({ 
          canSwitch: false,
          error: "Database error" 
        });
      }

      if (results.length === 0) {
        return res.status(404).json({ 
          canSwitch: false,
          error: "Restaurant not found" 
        });
      }

      const restaurantTypes = results[0].type ? 
        results[0].type.toLowerCase().split(',').map(t => t.trim()) : [];

      const supportsTargetType = restaurantTypes.includes(target_type.toLowerCase());

      if (!supportsTargetType) {
        return res.status(200).json({ 
          canSwitch: false,
          message: `This restaurant doesn't support ${target_type}`,
          restaurantTypes
        });
      }

      // Check if there are items in the cart with current_type from other restaurants (convert to JSON)
      const cartQuery = `
        SELECT DISTINCT stakeholder_id 
        FROM cart 
        WHERE consumer_id = ? AND type = ? AND stakeholder_id != ?
      `;
      
      db.query(cartQuery, [consumer_id, JSON.stringify(current_type), stakeholder_id], (err, cartResults) => {
        if (err) {
          console.error("Error checking cart:", err);
          return res.status(500).json({ 
            canSwitch: false,
            error: "Database error" 
          });
        }

        if (cartResults.length > 0) {
          const otherStakeholderIds = cartResults.map(row => row.stakeholder_id);
          
          const otherStakeholdersQuery = `
            SELECT stakeholder_id, type 
            FROM stakeholder 
            WHERE stakeholder_id IN (?)
          `;
          
          db.query(otherStakeholdersQuery, [otherStakeholderIds], (err, otherResults) => {
            if (err) {
              console.error("Error fetching other stakeholders:", err);
              return res.status(500).json({ 
                canSwitch: false,
                error: "Database error" 
              });
            }

            const unsupportedRestaurants = [];
            
            for (const stakeholder of otherResults) {
              const types = stakeholder.type ? 
                stakeholder.type.toLowerCase().split(',').map(t => t.trim()) : [];
              
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

            return res.status(200).json({ 
              canSwitch: true,
              message: "You can switch to this tab" 
            });
          });
        } else {
          return res.status(200).json({ 
            canSwitch: true,
            message: "You can switch to this tab" 
          });
        }
      });
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