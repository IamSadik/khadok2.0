// ==================== CART PAGE FUNCTIONALITY ====================

document.addEventListener("DOMContentLoaded", () => {
  // Elements
  const cartItemsContainer = document.getElementById("cart-items-container");
  const deliveryTab = document.getElementById("delivery-tab");
  const pickupTab = document.getElementById("pickup-tab");
  const checkoutBtn = document.getElementById("checkout-btn");
  const totalItemsBadge = document.getElementById("total-items-badge");

  // State
  let consumerId = localStorage.getItem('consumer_id');
  let currentOrderType = 'delivery';
  let deliveryCart = [];
  let pickupCart = [];
  let restaurantDetails = {};

  // User location
  const userLat = parseFloat(localStorage.getItem('current_user_lat')) || 23.703512;
  const userLng = parseFloat(localStorage.getItem('current_user_lng')) || 90.450709;

  // Initialize
  init();

  async function init() {
    if (!consumerId) {
      alert("Please login to view your cart");
      window.location.href = '../login.html';
      return;
    }

    await loadCartItems();
    setupEventListeners();
    renderCart();
  }

  // ==================== FETCH CART ITEMS ====================
  async function loadCartItems() {
    try {
      // Fetch delivery cart
      const deliveryRes = await fetch(`/api/cart/get-cart?consumer_id=${consumerId}&type=delivery`);
      const deliveryData = await deliveryRes.json();
      deliveryCart = deliveryData.cartItems || [];

      // Fetch pickup cart
      const pickupRes = await fetch(`/api/cart/get-cart?consumer_id=${consumerId}&type=pickup`);
      const pickupData = await pickupRes.json();
      pickupCart = pickupData.cartItems || [];

      console.log('📦 Cart items loaded:', { 
        delivery: deliveryCart.length, 
        pickup: pickupCart.length 
      });

      // Get all unique stakeholder IDs
      const allStakeholderIds = [...new Set([
        ...deliveryCart.map(item => item.stakeholder_id),
        ...pickupCart.map(item => item.stakeholder_id)
      ])];

      // Fetch restaurant details for all stakeholders
      await fetchRestaurantDetails(allStakeholderIds);

    } catch (error) {
      console.error("Failed to load cart:", error);
      deliveryCart = [];
      pickupCart = [];
    }
  }

  // ==================== FETCH RESTAURANT DETAILS ====================
  async function fetchRestaurantDetails(stakeholderIds) {
    if (stakeholderIds.length === 0) return;

    try {
      // Fetch nearby restaurants to get distance/time data
      const nearbyRes = await fetch(
        `/api/restaurant/nearby?lat=${userLat}&lng=${userLng}&radius=50&useRoadDistance=true`
      );
      const nearbyData = await nearbyRes.json();
      const nearbyRestaurants = nearbyData.restaurants || [];

      // Fetch each restaurant's details
      for (const stakeholderId of stakeholderIds) {
        try {
          const res = await fetch(`/api/restaurant/${stakeholderId}`);
          const data = await res.json();

          if (data) {
            const nearbyMatch = nearbyRestaurants.find(
              r => r.stakeholder_id == stakeholderId
            );

            // Calculate estimated delivery/pickup times
            let estimatedDeliveryMins = 25;
            let estimatedPickupMins = 20;

            if (nearbyMatch && nearbyMatch.estimated_time) {
              const travelTimeMins = Math.ceil(nearbyMatch.estimated_time);
              estimatedDeliveryMins = travelTimeMins + Math.floor(Math.random() * 6) + 10;
              estimatedPickupMins = Math.max(15, travelTimeMins - 5);
            }

            restaurantDetails[stakeholderId] = {
              ...data,
              distance: nearbyMatch?.distance || 0,
              roadDistance: nearbyMatch?.road_distance || 0,
              estimatedDeliveryTime: `${estimatedDeliveryMins}-${estimatedDeliveryMins + 10} mins`,
              estimatedPickupTime: `${estimatedPickupMins}-${estimatedPickupMins + 5} mins`,
              estimatedDeliveryMins,
              estimatedPickupMins
            };
          }
        } catch (err) {
          console.error(`Failed to fetch restaurant ${stakeholderId}:`, err);
        }
      }

      console.log('🏪 Restaurant details loaded:', restaurantDetails);

    } catch (error) {
      console.error("Failed to fetch restaurant details:", error);
    }
  }

  // ==================== CALCULATE DELIVERY FEE ====================
  function calculateDeliveryFee(distance) {
    const distanceKm = distance || 0;

    if (distanceKm < 0.5) return 20;
    if (distanceKm < 1) return 25;

    const extraDistance = distanceKm - 1;
    const extra500mSegments = Math.ceil(extraDistance / 0.5);
    return 25 + (extra500mSegments * 5);
  }

  // ==================== SETUP EVENT LISTENERS ====================
  function setupEventListeners() {
    // Order type tabs
    deliveryTab.addEventListener("click", () => {
      currentOrderType = 'delivery';
      deliveryTab.classList.add("active");
      pickupTab.classList.remove("active");
      renderCart();
    });

    pickupTab.addEventListener("click", () => {
      currentOrderType = 'pickup';
      pickupTab.classList.add("active");
      deliveryTab.classList.remove("active");
      renderCart();
    });

    // Checkout button
    checkoutBtn.addEventListener("click", () => {
      const activeCart = currentOrderType === 'delivery' ? deliveryCart : pickupCart;
      if (activeCart.length === 0) {
        alert("Your cart is empty!");
        return;
      }
      openPaymentModal();
    });
  }

  // ==================== RENDER CART ====================
  function renderCart() {
    const activeCart = currentOrderType === 'delivery' ? deliveryCart : pickupCart;

    // Update total items badge
    const totalItems = activeCart.reduce((sum, item) => sum + item.quatity, 0);
    totalItemsBadge.textContent = `${totalItems} item${totalItems !== 1 ? 's' : ''}`;

    // Show empty state if cart is empty
    if (activeCart.length === 0) {
      cartItemsContainer.innerHTML = `
        <div class="empty-cart-state">
          <div class="empty-cart-icon">
            <i class="fas fa-shopping-cart"></i>
          </div>
          <h3>Your ${currentOrderType} cart is empty</h3>
          <p>Add items from your favorite restaurants to get started</p>
          <a href="khadok.consumer.dashboard.html" class="browse-menu-btn">
            <i class="fas fa-store"></i> Browse Restaurants
          </a>
        </div>
      `;
      
      // Hide summary when cart is empty
      document.querySelector('.summary-card').style.display = 'none';
      document.querySelector('.promo-card').style.display = 'none';
      return;
    }

    // Show summary when cart has items
    document.querySelector('.summary-card').style.display = 'block';
    document.querySelector('.promo-card').style.display = 'block';

    // Group items by restaurant
    const groupedByRestaurant = activeCart.reduce((acc, item) => {
      const restaurantId = item.stakeholder_id;
      if (!acc[restaurantId]) {
        acc[restaurantId] = [];
      }
      acc[restaurantId].push(item);
      return acc;
    }, {});

    // Render grouped items
    let html = '';
    let grandSubtotal = 0;
    let totalDeliveryFee = 0;

    Object.keys(groupedByRestaurant).forEach(stakeholderId => {
      const items = groupedByRestaurant[stakeholderId];
      const restaurant = restaurantDetails[stakeholderId] || { restaurant_name: 'Restaurant' };

      const restaurantSubtotal = items.reduce((sum, item) =>
        sum + (parseFloat(item.item_price) * item.quatity), 0
      );
      grandSubtotal += restaurantSubtotal;

      const deliveryFee = currentOrderType === 'delivery'
        ? calculateDeliveryFee(restaurant.roadDistance || restaurant.distance)
        : 0;
      totalDeliveryFee += deliveryFee;

      const estimatedTime = currentOrderType === 'delivery'
        ? restaurant.estimatedDeliveryTime
        : restaurant.estimatedPickupTime;

      html += `
        <div class="restaurant-group">
          <div class="restaurant-header">
            <div class="restaurant-info">
              <div class="restaurant-name-section">
                <div class="restaurant-name-wrapper">
                  <i class="fas fa-store"></i>
                  <h3>${restaurant.restaurant_name || 'Restaurant'}</h3>
                </div>
                <button class="clear-restaurant-btn" onclick="clearRestaurantCart(${stakeholderId})">
                  <i class="fas fa-trash-alt"></i> Clear
                </button>
              </div>
              <div class="restaurant-details">
                <span>
                  <i class="fas fa-clock"></i> ${estimatedTime || '20-30 mins'}
                </span>
                ${currentOrderType === 'delivery' ? `
                  <span>
                    <i class="fas fa-motorcycle"></i> ৳${deliveryFee} delivery
                  </span>
                ` : ''}
              </div>
            </div>
          </div>
          <div class="restaurant-items">
            ${items.map(item => renderCartItem(item)).join('')}
          </div>
          <div class="restaurant-subtotal">
            Restaurant Subtotal: <span>৳${restaurantSubtotal.toFixed(2)}</span>
          </div>
        </div>
      `;
    });

    cartItemsContainer.innerHTML = html;

    // Update order summary
    updateOrderSummary(grandSubtotal, totalDeliveryFee);
  }

  // ==================== RENDER CART ITEM ====================
  function renderCartItem(item) {
    const itemSubtotal = parseFloat(item.item_price) * item.quatity;
    
    return `
      <div class="cart-item-card">
        <div class="item-image-wrapper">
          <img src="${item.item_picture || '/images/placeholder.png'}" 
               alt="${item.item_name}" 
               class="item-image">
        </div>
        <div class="item-details">
          <h4 class="item-name">${item.item_name}</h4>
          <p class="item-price">৳${parseFloat(item.item_price).toFixed(2)}</p>
        </div>
        <div class="item-actions">
          <div class="quantity-controls">
            <button class="qty-btn" onclick="updateItemQuantity(${item.cart_id}, ${item.quatity - 1})">
              <i class="fas fa-minus"></i>
            </button>
            <span class="quantity-display">${item.quatity}</span>
            <button class="qty-btn" onclick="updateItemQuantity(${item.cart_id}, ${item.quatity + 1})">
              <i class="fas fa-plus"></i>
            </button>
          </div>
          <div class="item-subtotal">
            Subtotal: <strong>৳${itemSubtotal.toFixed(2)}</strong>
          </div>
          <button class="remove-item-btn" onclick="removeCartItem(${item.cart_id})">
            <i class="fas fa-trash-alt"></i> Remove
          </button>
        </div>
      </div>
    `;
  }

  // ==================== UPDATE ORDER SUMMARY ====================
  function updateOrderSummary(subtotal, deliveryFee) {
    const serviceFee = 5;
    const total = subtotal + deliveryFee + serviceFee;

    document.getElementById('subtotal-amount').textContent = `৳${subtotal.toFixed(2)}`;
    document.getElementById('delivery-fee-amount').textContent = `৳${deliveryFee.toFixed(2)}`;
    document.getElementById('service-fee-amount').textContent = `৳${serviceFee.toFixed(2)}`;
    document.getElementById('total-amount').textContent = `৳${total.toFixed(2)}`;

    // Show/hide delivery fee row
    const deliveryFeeRow = document.getElementById('delivery-fee-row');
    if (deliveryFeeRow) {
      deliveryFeeRow.style.display = currentOrderType === 'delivery' ? 'flex' : 'none';
    }
  }

  // ==================== UPDATE ITEM QUANTITY ====================
  window.updateItemQuantity = async function (cartId, newQuantity) {
    if (newQuantity < 1) {
      removeCartItem(cartId);
      return;
    }

    try {
      const res = await fetch(`/api/cart/update-quantity/${cartId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ quantity: newQuantity })
      });

      if (res.ok) {
        await loadCartItems();
        renderCart();
      } else {
        alert('Failed to update quantity');
      }
    } catch (error) {
      console.error('Error updating quantity:', error);
      alert('Failed to update quantity');
    }
  };

  // ==================== REMOVE CART ITEM ====================
  window.removeCartItem = async function (cartId) {
    if (!confirm('Remove this item from your cart?')) return;

    try {
      const res = await fetch(`/api/cart/remove/${cartId}`, {
        method: 'DELETE'
      });

      if (res.ok) {
        await loadCartItems();
        renderCart();
      } else {
        alert('Failed to remove item');
      }
    } catch (error) {
      console.error('Error removing item:', error);
      alert('Failed to remove item');
    }
  };

  // ==================== CLEAR RESTAURANT CART ====================
  window.clearRestaurantCart = async function (stakeholderId) {
    if (!confirm('Remove all items from this restaurant?')) return;

    try {
      const activeCart = currentOrderType === 'delivery' ? deliveryCart : pickupCart;
      const itemsToRemove = activeCart.filter(item => item.stakeholder_id == stakeholderId);

      for (const item of itemsToRemove) {
        await fetch(`/api/cart/remove/${item.cart_id}`, { method: 'DELETE' });
      }

      await loadCartItems();
      renderCart();
    } catch (error) {
      console.error('Error clearing restaurant cart:', error);
      alert('Failed to clear cart');
    }
  };

  // ==================== PAYMENT MODAL ====================
  function openPaymentModal() {
    const activeCart = currentOrderType === 'delivery' ? deliveryCart : pickupCart;
    const modal = document.getElementById('payment-modal');

    let subtotal = 0;
    let totalDeliveryFee = 0;

    // Group items by restaurant for modal display
    const groupedByRestaurant = activeCart.reduce((acc, item) => {
      const restaurantId = item.stakeholder_id;
      if (!acc[restaurantId]) {
        acc[restaurantId] = [];
      }
      acc[restaurantId].push(item);
      return acc;
    }, {});

    let orderItemsHtml = '';
    Object.keys(groupedByRestaurant).forEach(stakeholderId => {
      const items = groupedByRestaurant[stakeholderId];
      const restaurant = restaurantDetails[stakeholderId] || { restaurant_name: 'Restaurant' };

      const restaurantSubtotal = items.reduce((sum, item) =>
        sum + (parseFloat(item.item_price) * item.quatity), 0
      );
      subtotal += restaurantSubtotal;

      const deliveryFee = currentOrderType === 'delivery'
        ? calculateDeliveryFee(restaurant.roadDistance || restaurant.distance)
        : 0;
      totalDeliveryFee += deliveryFee;

      orderItemsHtml += `
        <div class="modal-restaurant-group">
          <div class="modal-restaurant-name">
            <i class="fas fa-store"></i> ${restaurant.restaurant_name || 'Restaurant'}
          </div>
          ${items.map(item => `
            <div class="order-item-row">
              <div>
                <div class="order-item-name">${item.item_name}</div>
                <div class="order-item-quantity">Qty: ${item.quatity}</div>
              </div>
              <div class="order-item-price">৳${(parseFloat(item.item_price) * item.quatity).toFixed(2)}</div>
            </div>
          `).join('')}
        </div>
      `;
    });

    document.getElementById('order-items-list').innerHTML = orderItemsHtml;

    const serviceFee = 5;
    const total = subtotal + totalDeliveryFee + serviceFee;

    document.getElementById('modal-subtotal').textContent = `৳${subtotal.toFixed(2)}`;
    document.getElementById('modal-delivery-fee').textContent = `৳${totalDeliveryFee.toFixed(2)}`;
    document.getElementById('modal-service-fee').textContent = `৳${serviceFee.toFixed(2)}`;
    document.getElementById('modal-total').textContent = `৳${total.toFixed(2)}`;

    // Show/hide sections based on order type
    const deliveryAddressSection = document.getElementById('delivery-address-section');
    const pickupTimeSection = document.getElementById('pickup-time-section');
    const modalDeliveryRow = document.getElementById('modal-delivery-row');
    const cashOption = document.getElementById('cash-option');

    if (currentOrderType === 'delivery') {
      deliveryAddressSection.style.display = 'block';
      pickupTimeSection.style.display = 'none';
      modalDeliveryRow.style.display = 'flex';
      cashOption.style.display = 'flex';
      
      // Pre-fill address
      const consumerAddress = localStorage.getItem('consumer_address');
      if (consumerAddress) {
        document.getElementById('delivery-address').value = consumerAddress;
      }
    } else {
      deliveryAddressSection.style.display = 'none';
      pickupTimeSection.style.display = 'block';
      modalDeliveryRow.style.display = 'none';
      cashOption.style.display = 'none';
      document.getElementById('payment-bkash').checked = true;

      // Set default pickup time (30 minutes from now)
      const now = new Date();
      now.setMinutes(now.getMinutes() + 30);
      document.getElementById('pickup-time').value = now.toISOString().slice(0, 16);
    }

    modal.style.display = 'flex';

    // Modal event handlers
    document.getElementById('close-payment-modal').onclick = () => {
      modal.style.display = 'none';
    };

    document.getElementById('cancel-payment').onclick = () => {
      modal.style.display = 'none';
    };

    document.getElementById('confirm-payment').onclick = async () => {
      await handlePaymentConfirmation(subtotal, totalDeliveryFee, serviceFee, total);
    };
  }

  // ==================== HANDLE PAYMENT ====================
  async function handlePaymentConfirmation(subtotal, deliveryFee, serviceFee, total) {
    const paymentMethod = document.querySelector('input[name="payment-method"]:checked').value;
    const orderNotes = document.getElementById('order-notes').value;
    const confirmBtn = document.getElementById('confirm-payment');

    let deliveryAddress = null;
    let pickupTime = null;

    if (currentOrderType === 'delivery') {
      deliveryAddress = document.getElementById('delivery-address').value.trim();
      if (!deliveryAddress) {
        alert('Please enter your delivery address!');
        return;
      }
    } else {
      pickupTime = document.getElementById('pickup-time').value;
      if (!pickupTime) {
        alert('Please select a pickup time!');
        return;
      }
    }

    confirmBtn.disabled = true;
    confirmBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processing...';

    try {
      const activeCart = currentOrderType === 'delivery' ? deliveryCart : pickupCart;

      if (paymentMethod === 'bkash') {
        await handleBkashPayment(activeCart, deliveryAddress, pickupTime, orderNotes, total);
      } else {
        await handleCashPayment(activeCart, deliveryAddress, orderNotes, subtotal, deliveryFee, serviceFee, total);
      }
    } catch (error) {
      console.error("Payment error:", error);
      alert("Payment failed. Please try again.");
      confirmBtn.disabled = false;
      confirmBtn.innerHTML = '<i class="fas fa-lock"></i> Place Order';
    }
  }

  // ==================== BKASH PAYMENT ====================
  async function handleBkashPayment(cart, deliveryAddress, pickupTime, notes, totalAmount) {
    try {
      const response = await fetch('/api/payment/bkash/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: totalAmount,
          consumer_id: consumerId,
          stakeholder_id: cart[0].stakeholder_id,
          order_type: currentOrderType
        })
      });

      const data = await response.json();

      if (data.success && data.data.bkashURL) {
        // Store order details for after payment
        const orderDetails = {
          cart: cart,
          orderType: currentOrderType,
          deliveryAddress: deliveryAddress,
          pickupTime: pickupTime,
          notes: notes,
          totalAmount: totalAmount,
          paymentId: data.data.paymentID,
          paymentRecordId: data.data.paymentRecordId
        };

        localStorage.setItem('pendingOrder', JSON.stringify(orderDetails));
        window.location.href = data.data.bkashURL;
      } else {
        throw new Error(data.message || 'Failed to create payment');
      }
    } catch (error) {
      console.error("bKash payment error:", error);
      alert("Failed to initiate bKash payment. Please try again.");
      throw error;
    }
  }

  // ==================== CASH PAYMENT ====================
  async function handleCashPayment(cart, deliveryAddress, notes, subtotal, deliveryFee, serviceFee, totalAmount) {
    try {
      // Group by restaurant and create orders
      const groupedByRestaurant = cart.reduce((acc, item) => {
        if (!acc[item.stakeholder_id]) acc[item.stakeholder_id] = [];
        acc[item.stakeholder_id].push(item);
        return acc;
      }, {});

      for (const stakeholderId of Object.keys(groupedByRestaurant)) {
        const items = groupedByRestaurant[stakeholderId];
        const restaurant = restaurantDetails[stakeholderId] || {};
        
        const restaurantSubtotal = items.reduce((sum, item) =>
          sum + (parseFloat(item.item_price) * item.quatity), 0
        );

        const restaurantDeliveryFee = currentOrderType === 'delivery'
          ? calculateDeliveryFee(restaurant.roadDistance || restaurant.distance)
          : 0;

        const orderData = {
          consumer_id: consumerId,
          stakeholder_id: stakeholderId,
          order_type: currentOrderType,
          payment_method: 'cash',
          subtotal: restaurantSubtotal,
          delivery_fee: restaurantDeliveryFee,
          service_fee: serviceFee,
          total_amount: restaurantSubtotal + restaurantDeliveryFee + serviceFee,
          delivery_address: deliveryAddress,
          notes: notes,
          items: items.map(item => ({
            menu_id: item.menu_id,
            item_name: item.item_name,
            item_price: parseFloat(item.item_price),
            quantity: item.quatity,
            subtotal: parseFloat(item.item_price) * item.quatity
          }))
        };

        const response = await fetch('/api/orders/create', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(orderData)
        });

        const data = await response.json();

        if (!data.success) {
          throw new Error(data.message || 'Failed to create order');
        }

        // Remove items from cart
        for (const item of items) {
          await fetch(`/api/cart/remove/${item.cart_id}`, { method: 'DELETE' });
        }
      }

      alert('Order placed successfully! You can pay cash on delivery.');
      document.getElementById('payment-modal').style.display = 'none';
      window.location.href = 'khadok.consumer.order.html';

    } catch (error) {
      console.error("Cash order error:", error);
      alert("Failed to place order. Please try again.");
      throw error;
    }
  }
});

