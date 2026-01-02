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
  
  // 🚀 Cache for faster subsequent loads
  let restaurantDetailsCache = {};
  let lastFetchTime = 0;
  const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

  // User location
  const userLat = parseFloat(localStorage.getItem('current_user_lat')) || 23.703512;
  const userLng = parseFloat(localStorage.getItem('current_user_lng')) || 90.450709;

  // 🎯 Show loading indicator
  function showLoading() {
    cartItemsContainer.innerHTML = `
      <div style="text-align: center; padding: 3rem; color: #667eea;">
        <i class="fas fa-spinner fa-spin" style="font-size: 3rem; margin-bottom: 1rem;"></i>
        <p style="font-size: 1.1rem;">Loading your cart...</p>
      </div>
    `;
  }

  // Initialize
  init();

  async function init() {
    if (!consumerId) {
      alert("Please login to view your cart");
      window.location.href = '../login.html';
      return;
    }

    showLoading();
    await loadCartItems();
    setupEventListeners();
    renderCart();
  }

  // ==================== FETCH CART ITEMS (WITH CACHING) ====================
  async function loadCartItems() {
    try {
      // 🚀 Parallel fetch for both carts - much faster!
      const [deliveryData, pickupData] = await Promise.all([
        fetch(`/api/cart/get-cart?consumer_id=${consumerId}&type=delivery`).then(r => r.json()),
        fetch(`/api/cart/get-cart?consumer_id=${consumerId}&type=pickup`).then(r => r.json())
      ]);

      deliveryCart = deliveryData.cartItems || [];
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

      // 🚀 Fetch restaurant details (with caching)
      await fetchRestaurantDetails(allStakeholderIds);

    } catch (error) {
      console.error("Failed to load cart:", error);
      deliveryCart = [];
      pickupCart = [];
      cartItemsContainer.innerHTML = `
        <div style="text-align: center; padding: 3rem; color: #e74c3c;">
          <i class="fas fa-exclamation-triangle" style="font-size: 3rem; margin-bottom: 1rem;"></i>
          <p>Failed to load cart. Please refresh the page.</p>
        </div>
      `;
    }
  }

  // ==================== FETCH RESTAURANT DETAILS (OPTIMIZED WITH CACHING) ====================
  async function fetchRestaurantDetails(stakeholderIds) {
    if (stakeholderIds.length === 0) return;

    const now = Date.now();
    
    // 🚀 Check cache first
    const cachedIds = stakeholderIds.filter(id => 
      restaurantDetailsCache[id] && (now - lastFetchTime < CACHE_DURATION)
    );
    
    const uncachedIds = stakeholderIds.filter(id => !cachedIds.includes(id));

    // Use cached data immediately
    cachedIds.forEach(id => {
      restaurantDetails[id] = restaurantDetailsCache[id];
    });

    if (uncachedIds.length === 0) {
      console.log('✅ Using cached restaurant details');
      return;
    }

    try {
      // 🚀 Fetch nearby restaurants and individual details in parallel
      const [nearbyData, ...restaurantDataArray] = await Promise.all([
        fetch(`/api/restaurant/nearby?lat=${userLat}&lng=${userLng}&radius=50&useRoadDistance=true`)
          .then(r => r.json()),
        ...uncachedIds.map(id => 
          fetch(`/api/restaurant/${id}`).then(r => r.json()).catch(() => null)
        )
      ]);

      const nearbyRestaurants = nearbyData.restaurants || [];

      // Process restaurant data
      restaurantDataArray.forEach((data, index) => {
        if (!data) return;
        
        const stakeholderId = uncachedIds[index];
        const nearbyMatch = nearbyRestaurants.find(r => r.stakeholder_id == stakeholderId);

        // ✅ Use fixed estimated_time from nearby API instead of random calculation
        let estimatedDeliveryMins = 25; // Default fallback
        let estimatedPickupMins = 20;   // Default fallback

        if (nearbyMatch && nearbyMatch.estimated_time) {
          // ✅ Use the exact estimated_time from API
          const baseTime = Math.ceil(nearbyMatch.estimated_time);
          
          // For delivery: estimated_time to (estimated_time + 15) mins
          estimatedDeliveryMins = baseTime;
          const maxDeliveryMins = baseTime + 15;
          
          // For pickup: estimated_time - 5 to (estimated_time + 10) mins
          estimatedPickupMins = Math.max(15, baseTime - 5);
          const maxPickupMins = baseTime + 10;

          const restaurantInfo = {
            ...data,
            distance: nearbyMatch?.distance || 0,
            roadDistance: nearbyMatch?.road_distance || 0,
            estimatedDeliveryTime: `${estimatedDeliveryMins}-${maxDeliveryMins} mins`,
            estimatedPickupTime: `${estimatedPickupMins}-${maxPickupMins} mins`,
            estimatedDeliveryMins,
            estimatedPickupMins
          };

          restaurantDetails[stakeholderId] = restaurantInfo;
          restaurantDetailsCache[stakeholderId] = restaurantInfo; // 🚀 Cache it
        } else {
          // No nearby match - use defaults
          const restaurantInfo = {
            ...data,
            distance: 0,
            roadDistance: 0,
            estimatedDeliveryTime: `${estimatedDeliveryMins}-${estimatedDeliveryMins + 15} mins`,
            estimatedPickupTime: `${estimatedPickupMins}-${estimatedPickupMins + 10} mins`,
            estimatedDeliveryMins,
            estimatedPickupMins
          };

          restaurantDetails[stakeholderId] = restaurantInfo;
          restaurantDetailsCache[stakeholderId] = restaurantInfo;
        }
      });

      lastFetchTime = now;
      console.log('🏪 Restaurant details loaded and cached');

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
      renderCart(); // Instant re-render
    });

    pickupTab.addEventListener("click", () => {
      currentOrderType = 'pickup';
      pickupTab.classList.add("active");
      deliveryTab.classList.remove("active");
      renderCart(); // Instant re-render
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

  // ==================== RENDER CART (OPTIMIZED) ====================
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
      
      document.querySelector('.summary-card').style.display = 'none';
      document.querySelector('.promo-card').style.display = 'none';
      return;
    }

    document.querySelector('.summary-card').style.display = 'block';
    document.querySelector('.promo-card').style.display = 'block';

    // Group items by restaurant
    const groupedByRestaurant = activeCart.reduce((acc, item) => {
      const restaurantId = item.stakeholder_id;
      if (!acc[restaurantId]) acc[restaurantId] = [];
      acc[restaurantId].push(item);
      return acc;
    }, {});

    // 🚀 Build HTML using array join for better performance
    const restaurantGroups = [];
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

      // Build restaurant group HTML
      restaurantGroups.push(`
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
                <span><i class="fas fa-clock"></i> ${estimatedTime || '20-30 mins'}</span>
                ${currentOrderType === 'delivery' ? `
                  <span><i class="fas fa-motorcycle"></i> ৳${deliveryFee} delivery</span>
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
      `);
    });

    // 🚀 Single DOM update - much faster than multiple updates
    cartItemsContainer.innerHTML = restaurantGroups.join('');
    
    // Update order summary
    updateOrderSummary(grandSubtotal, totalDeliveryFee);
  }

  // ==================== RENDER CART ITEM ====================
  function renderCartItem(item) {
    const itemSubtotal = parseFloat(item.item_price) * item.quatity;
    
    return `
      <div class="cart-item-card" data-cart-id="${item.cart_id}">
        <div class="item-image-wrapper">
          <img src="${item.item_picture || '/images/placeholder.png'}" 
               alt="${item.item_name}" 
               class="item-image"
               loading="lazy">
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

    const deliveryFeeRow = document.getElementById('delivery-fee-row');
    if (deliveryFeeRow) {
      deliveryFeeRow.style.display = currentOrderType === 'delivery' ? 'flex' : 'none';
    }
  }

  // ==================== UPDATE ITEM QUANTITY (OPTIMISTIC UPDATE) ====================
  window.updateItemQuantity = async function (cartId, newQuantity) {
    if (newQuantity < 1) {
      removeCartItem(cartId);
      return;
    }

    // 🚀 OPTIMISTIC UPDATE - Update UI immediately
    const activeCart = currentOrderType === 'delivery' ? deliveryCart : pickupCart;
    const itemIndex = activeCart.findIndex(item => item.cart_id === cartId);
    
    if (itemIndex !== -1) {
      const oldQuantity = activeCart[itemIndex].quatity;
      activeCart[itemIndex].quatity = newQuantity;
      
      // 🎯 Instant UI update
      const itemCard = document.querySelector(`[data-cart-id="${cartId}"]`);
      if (itemCard) {
        const quantityDisplay = itemCard.querySelector('.quantity-display');
        const subtotalEl = itemCard.querySelector('.item-subtotal strong');
        if (quantityDisplay) quantityDisplay.textContent = newQuantity;
        if (subtotalEl) {
          const price = parseFloat(activeCart[itemIndex].item_price);
          subtotalEl.textContent = `৳${(price * newQuantity).toFixed(2)}`;
        }
      }
      
      // Update summary immediately
      renderCart();
      
      // 🔄 Then update backend in background
      try {
        const res = await fetch(`/api/cart/update-quantity/${cartId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ quantity: newQuantity })
        });

        if (!res.ok) {
          // 🔙 Rollback on failure
          activeCart[itemIndex].quatity = oldQuantity;
          renderCart();
          alert('Failed to update quantity');
        }
      } catch (error) {
        // 🔙 Rollback on error
        activeCart[itemIndex].quatity = oldQuantity;
        renderCart();
        console.error('Error updating quantity:', error);
        alert('Failed to update quantity');
      }
    }
  };

  // ==================== REMOVE CART ITEM (OPTIMISTIC UPDATE) ====================
  window.removeCartItem = async function (cartId) {
    if (!confirm('Remove this item from your cart?')) return;

    // 🚀 OPTIMISTIC UPDATE - Remove from UI immediately
    const activeCart = currentOrderType === 'delivery' ? deliveryCart : pickupCart;
    const itemIndex = activeCart.findIndex(item => item.cart_id === cartId);
    
    if (itemIndex !== -1) {
      const removedItem = activeCart.splice(itemIndex, 1)[0];
      
      // 🎯 Instant UI update with smooth animation
      const itemCard = document.querySelector(`[data-cart-id="${cartId}"]`);
      if (itemCard) {
        itemCard.style.transition = 'opacity 0.3s, transform 0.3s';
        itemCard.style.opacity = '0';
        itemCard.style.transform = 'translateX(-20px)';
        setTimeout(() => renderCart(), 300);
      } else {
        renderCart();
      }
      
      // 🔄 Then update backend in background
      try {
        const res = await fetch(`/api/cart/remove/${cartId}`, {
          method: 'DELETE'
        });

        if (!res.ok) {
          // 🔙 Rollback on failure
          activeCart.splice(itemIndex, 0, removedItem);
          renderCart();
          alert('Failed to remove item');
        }
      } catch (error) {
        // 🔙 Rollback on error
        activeCart.splice(itemIndex, 0, removedItem);
        renderCart();
        console.error('Error removing item:', error);
        alert('Failed to remove item');
      }
    }
  };

  // ==================== CLEAR RESTAURANT CART ====================
  window.clearRestaurantCart = async function (stakeholderId) {
    if (!confirm('Remove all items from this restaurant?')) return;

    const activeCart = currentOrderType === 'delivery' ? deliveryCart : pickupCart;
    const itemsToRemove = activeCart.filter(item => item.stakeholder_id == stakeholderId);
    
    // 🚀 OPTIMISTIC UPDATE
    const removedItems = [];
    itemsToRemove.forEach(item => {
      const index = activeCart.findIndex(i => i.cart_id === item.cart_id);
      if (index !== -1) {
        removedItems.push({ item, index });
        activeCart.splice(index, 1);
      }
    });
    
    renderCart();

    // 🔄 Update backend
    try {
      await Promise.all(
        itemsToRemove.map(item => 
          fetch(`/api/cart/remove/${item.cart_id}`, { method: 'DELETE' })
        )
      );
    } catch (error) {
      // 🔙 Rollback
      removedItems.reverse().forEach(({ item, index }) => {
        activeCart.splice(index, 0, item);
      });
      renderCart();
      console.error('Error clearing restaurant cart:', error);
      alert('Failed to clear cart');
    }
  };

  // ==================== PAYMENT MODAL ====================
  
  let deliveryMap = null; // Store map instance
  let tileURL = ''; // Store tile URL
  
  // Fetch tile URL for map
  async function fetchMapTileURL() {
    try {
      const res = await fetch('/api/map/tile-url');
      const data = await res.json();
      tileURL = data.tileURL;
      
    } catch (err) {
      console.error('❌ Failed to fetch tile URL:', err);
      tileURL = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png'; // Fallback
    }
  }
  
  // Reverse geocode to get address from coordinates
  async function reverseGeocode(lat, lng) {
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=16&addressdetails=1&accept-language=en`
      );
      const data = await res.json();
      return data.display_name || 'Unknown location';
    } catch (err) {
      console.error('Reverse geocode failed:', err);
      return 'Unknown location';
    }
  }
  
  // Initialize delivery location map
  async function initDeliveryMap() {
    // Get user's location from localStorage
    const userLat = parseFloat(localStorage.getItem('current_user_lat'));
    const userLng = parseFloat(localStorage.getItem('current_user_lng'));
    
    if (!userLat || !userLng) {
      console.error('❌ No user location found in localStorage');
      document.getElementById('delivery-address-display').textContent = 
        'Location not set. Please set your location from the dashboard.';
      return;
    }
    
    // Fetch tile URL if not already loaded
    if (!tileURL) {
      await fetchMapTileURL();
    }
    
    const mapContainer = document.getElementById('delivery-map-container');
    
    // Clear any existing map
    if (deliveryMap) {
      deliveryMap.remove();
      deliveryMap = null;
    }
    
    // Clear container
    mapContainer.innerHTML = '';
    
    // Wait a bit for the modal to be visible
    setTimeout(() => {
      try {
        console.log('🗺️ Initializing delivery map at:', { lat: userLat, lng: userLng });
        
        // Create map instance
        deliveryMap = L.map(mapContainer, {
          center: [userLat, userLng],
          zoom: 16,
          zoomControl: true,
          scrollWheelZoom: true, // Allow zoom in/out
          dragging: false, // Disable panning
          doubleClickZoom: false,
          touchZoom: true,
          keyboard: false
        });
        
        // Add tile layer
        L.tileLayer(tileURL, {
          tileSize: 512,
          zoomOffset: -1,
          attribution: '<a href="https://www.maptiler.com/">© MapTiler</a> <a href="https://www.openstreetmap.org/">© OSM</a>'
        }).addTo(deliveryMap);
        
        // Add custom marker at user's location
        const userIcon = L.divIcon({
          html: `<div style="
            background-color: #00b894;
            width: 36px;
            height: 36px;
            border-radius: 50%;
            border: 4px solid white;
            box-shadow: 0 3px 10px rgba(0,0,0,0.4);
            display: flex;
            align-items: center;
            justify-content: center;
            animation: pulse 2s infinite;
          ">
            <i class="fas fa-map-marker-alt" style="color: white; font-size: 18px;"></i>
          </div>
          <style>
            @keyframes pulse {
              0%, 100% { transform: scale(1); opacity: 1; }
              50% { transform: scale(1.1); opacity: 0.8; }
            }
          </style>`,
          className: 'delivery-location-marker',
          iconSize: [36, 36],
          iconAnchor: [18, 36]
        });
        
        const marker = L.marker([userLat, userLng], { icon: userIcon }).addTo(deliveryMap);
        
        marker.bindPopup(`
          <div style="text-align: center; padding: 0.5rem;">
            <strong style="color: #00b894;">📍 Your Delivery Location</strong>
            <p style="margin: 0.5rem 0 0; font-size: 0.85rem; color: #666;">Items will be delivered here</p>
          </div>
        `).openPopup();
        
        console.log('✅ Delivery map initialized successfully');
        
      } catch (error) {
        console.error('❌ Error initializing delivery map:', error);
        mapContainer.innerHTML = `
          <div style="
            display: flex;
            align-items: center;
            justify-content: center;
            height: 100%;
            background: #f8f9fa;
            color: #666;
          ">
            <p><i class="fas fa-exclamation-circle"></i> Failed to load map</p>
          </div>
        `;
      }
    }, 300); // Wait for modal animation
    
    // Get and display address
    const address = await reverseGeocode(userLat, userLng);
    document.getElementById('delivery-address-display').textContent = address;
  }
  
  function openPaymentModal() {
    const activeCart = currentOrderType === 'delivery' ? deliveryCart : pickupCart;
    const modal = document.getElementById('payment-modal');

    // ...existing order summary code...
    let subtotal = 0;
    let totalDeliveryFee = 0;

    const groupedByRestaurant = activeCart.reduce((acc, item) => {
      const restaurantId = item.stakeholder_id;
      if (!acc[restaurantId]) acc[restaurantId] = [];
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

    const deliveryAddressSection = document.getElementById('delivery-address-section');
    const pickupTimeSection = document.getElementById('pickup-time-section');
    const modalDeliveryRow = document.getElementById('modal-delivery-row');
    const cashOption = document.getElementById('cash-option');

    if (currentOrderType === 'delivery') {
      deliveryAddressSection.style.display = 'block';
      pickupTimeSection.style.display = 'none';
      modalDeliveryRow.style.display = 'flex';
      cashOption.style.display = 'flex';
      
      // 🗺️ Initialize delivery map with user's location
      initDeliveryMap();
    } else {
      deliveryAddressSection.style.display = 'none';
      pickupTimeSection.style.display = 'block';
      modalDeliveryRow.style.display = 'none';
      cashOption.style.display = 'none';
      document.getElementById('payment-bkash').checked = true;

      const now = new Date();
      now.setMinutes(now.getMinutes() + 30);
      document.getElementById('pickup-time').value = now.toISOString().slice(0, 16);
    }

    modal.style.display = 'flex';

    document.getElementById('close-payment-modal').onclick = closePaymentModal;
    document.getElementById('cancel-payment').onclick = closePaymentModal;
    document.getElementById('confirm-payment').onclick = async () => {
      await handlePaymentConfirmation(subtotal, totalDeliveryFee, serviceFee, total);
    };
  }
  
  function closePaymentModal() {
    document.getElementById('payment-modal').style.display = 'none';
    
    // Clean up map instance
    if (deliveryMap) {
      deliveryMap.remove();
      deliveryMap = null;
    }
  }

  // ==================== HANDLE PAYMENT ====================
  async function handlePaymentConfirmation(subtotal, deliveryFee, serviceFee, total) {
    const paymentMethod = document.querySelector('input[name="payment-method"]:checked').value;
    const orderNotes = document.getElementById('order-notes').value;
    const confirmBtn = document.getElementById('confirm-payment');

    let deliveryAddress = null;
    let pickupTime = null;

    if (currentOrderType === 'delivery') {
      // ✅ FIX: Get text content from paragraph element instead of value from input
      deliveryAddress = document.getElementById('delivery-address-display').textContent.trim();
      if (!deliveryAddress || deliveryAddress === 'Loading address...') {
        alert('Please wait for your delivery address to load, or set your location from the dashboard!');
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
      // Get user's delivery coordinates from localStorage
      const deliveryLat = parseFloat(localStorage.getItem('current_user_lat'));
      const deliveryLng = parseFloat(localStorage.getItem('current_user_lng'));

      // Group by restaurant to get first stakeholder_id and calculate fees
      const groupedByRestaurant = cart.reduce((acc, item) => {
        if (!acc[item.stakeholder_id]) acc[item.stakeholder_id] = [];
        acc[item.stakeholder_id].push(item);
        return acc;
      }, {});

      const firstStakeholderId = Object.keys(groupedByRestaurant)[0];
      const restaurant = restaurantDetails[firstStakeholderId] || {};
      
      const subtotal = cart.reduce((sum, item) => 
        sum + (parseFloat(item.item_price) * item.quatity), 0
      );
      
      const deliveryFee = currentOrderType === 'delivery'
        ? calculateDeliveryFee(restaurant.roadDistance || restaurant.distance)
        : 0;

      const response = await fetch('/api/payment/bkash/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: totalAmount,
          consumer_id: consumerId,
          stakeholder_id: firstStakeholderId,
          order_type: currentOrderType
        })
      });

      const data = await response.json();

      if (data.success && data.data.bkashURL) {
        const orderDetails = {
          cart: cart, // ✅ Full cart with category field
          consumerId: consumerId,
          stakeholderId: firstStakeholderId,
          orderType: currentOrderType,
          deliveryAddress: deliveryAddress,
          deliveryLat: currentOrderType === 'delivery' ? deliveryLat : null,
          deliveryLng: currentOrderType === 'delivery' ? deliveryLng : null,
          pickupTime: pickupTime,
          notes: notes,
          subtotal: subtotal,
          deliveryFee: deliveryFee,
          serviceFee: 5,
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
      const groupedByRestaurant = cart.reduce((acc, item) => {
        if (!acc[item.stakeholder_id]) acc[item.stakeholder_id] = [];
        acc[item.stakeholder_id].push(item);
        return acc;
      }, {});

      // Get user's delivery coordinates from localStorage
      const deliveryLat = parseFloat(localStorage.getItem('current_user_lat'));
      const deliveryLng = parseFloat(localStorage.getItem('current_user_lng'));

      // Validate coordinates for delivery orders
      if (currentOrderType === 'delivery' && (!deliveryLat || !deliveryLng)) {
        throw new Error('Delivery coordinates (lat/lng) are required for delivery orders');
      }

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
          delivery_lat: currentOrderType === 'delivery' ? deliveryLat : null,
          delivery_lng: currentOrderType === 'delivery' ? deliveryLng : null,
          notes: notes,
          items: items.map(item => ({
            menu_id: item.menu_id,
            item_name: item.item_name,
            item_price: parseFloat(item.item_price),
            quantity: item.quatity,
            category: item.category || null, // ✅ Include category from cart
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

