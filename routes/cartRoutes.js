// routes/cartRoutes.js
const express = require('express');
const router = express.Router();
const cartController = require('../controllers/cartController');

// Add item to cart
router.post('/add', cartController.addToCart);

// Get cart items (supports both query params and path params)
router.get('/get-cart', cartController.getCartItems);
router.get('/:consumer_id', cartController.getCartItems);

// Validate if switching tabs is allowed
router.get('/validate-switch', cartController.validateSwitch);

// Update cart item quantity
router.put('/update-quantity/:cart_id', cartController.updateCartItem);

// Remove item from cart
router.delete('/remove/:cart_id', cartController.removeFromCart);

// Clear cart (supports type query parameter)
router.delete('/clear/:consumer_id', cartController.clearCart);
router.delete('/clear-by-type/:consumer_id', cartController.clearCart);

// Check if switching type is allowed (POST)
router.post('/can-switch', cartController.canSwitchType);

// Switch cart type
router.post('/switch-type', cartController.switchCartType);

module.exports = router;