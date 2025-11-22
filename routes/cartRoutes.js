// routes/cartRoutes.js
const express = require("express");
const router = express.Router();
const cartController = require("../controllers/cartController");

// Add item to cart
router.post("/add", cartController.addToCart);

// Get cart items for a consumer
router.get("/:consumer_id", cartController.getCartItems);

// Update cart item quantity
router.put("/update/:cart_id", cartController.updateCartItem);

// Remove item from cart
router.delete("/remove/:cart_id", cartController.removeFromCart);

// Clear entire cart
router.delete("/clear/:consumer_id", cartController.clearCart);

module.exports = router;