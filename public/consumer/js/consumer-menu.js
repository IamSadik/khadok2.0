document.addEventListener("DOMContentLoaded", () => {
  const sortSelect = document.getElementById("sortSelect");
  const searchInput = document.getElementById("searchInput");
  const tabsContainer = document.getElementById("categoryTabs");
  const sectionsContainer = document.getElementById("menuSections");
  const restaurantNameEl = document.getElementById("restaurant-name");
  const restaurantBreadcrumb = document.getElementById("restaurant-breadcrumb");
  const resultsContainer = document.getElementById("searchResults");
  const cartIcon = document.getElementById("cart-icon");
  const cartPopup = document.getElementById("cart-popup");
  const cartCount = document.getElementById("cart-count");
  const cartItems = document.getElementById("cart-items");

  let allItems = [];
  let categories = [];
  let cart = [];
  let stakeholderId = null;
  let restaurantName = "";
  let consumerId = localStorage.getItem('consumer_id');
  let orderType = 'delivery'; // default to delivery
  let restaurantTypes = []; // Will store restaurant delivery/pickup capabilities

  // Get restaurant data from localStorage
  let restaurantDistance = parseFloat(localStorage.getItem('selectedRestaurantDistance')) || 0;
  let restaurantDistanceMeters = parseFloat(localStorage.getItem('selectedRestaurantDistanceMeters')) || 0;
  let restaurantEstimatedTime = parseFloat(localStorage.getItem('selectedRestaurantEstimatedTime')) || 0;

  // Get stakeholder_id from URL parameter
  const urlParams = new URLSearchParams(window.location.search);
  stakeholderId = urlParams.get('restaurant_id');

  if (!stakeholderId) {
    alert("No restaurant selected");
    window.location.href = "khadok.consumer.dashboard.html";
    return;
  }

  // Get restaurant types from localStorage
  try {
    const typesStr = localStorage.getItem('selectedRestaurantType');
    if (typesStr) {
      restaurantTypes = JSON.parse(typesStr);
      // Normalize to lowercase for consistent comparison
      restaurantTypes = restaurantTypes.map(type => type.toLowerCase());
    } else {
      restaurantTypes = [];
    }
  } catch (e) {
    console.error('Failed to parse selectedRestaurantType:', e);
    restaurantTypes = [];
  }

  // Check if restaurant supports both delivery and pickup
  const supportsDelivery = restaurantTypes.includes('delivery');
  const supportsPickup = restaurantTypes.includes('pickup') || restaurantTypes.includes('pick-up');

  // Calculate delivery fee based on distance
  function calculateDeliveryFee() {
    if (orderType !== 'delivery') return 0;

    // Use distance in km
    const distanceKm = restaurantDistance;
    
    // Distance-based pricing:
    // < 0.5 km = 20 Tk
    // < 1 km = 25 Tk
    // >= 1 km = 25 Tk + (5 Tk per 500 meters above 1 km)
    
    if (distanceKm < 0.5) {
      return 20;
    } else if (distanceKm < 1) {
      return 25;
    } else {
      // For distances >= 1 km
      // Base fee: 25 Tk
      // Additional: 5 Tk per 500 meters (0.5 km) above 1 km
      const extraDistance = distanceKm - 1; // Distance above 1 km
      const extra500mSegments = Math.ceil(extraDistance / 0.5); // Number of 500m segments
      return 25 + (extra500mSegments * 5);
    }
  }

  // Get estimated delivery time based on order type
  function getEstimatedTime() {
    if (orderType === 'pickup') {
      return '20-25 mins';
    } else {
      // Use stored estimated time from dashboard
      if (restaurantEstimatedTime > 0) {
        const minTime = Math.max(1, Math.round(restaurantEstimatedTime));
        const maxTime = minTime + 10; // Add 10 minutes range
        return `${minTime}-${maxTime} mins`;
      }
      return '20-35 mins'; // fallback if no time stored
    }
  }

  // Initialize
  init();

  async function init() {
    await fetchRestaurantInfo();
    categories = await fetchCategories();
    allItems = await fetchMenuItems();
    await loadCartFromDatabase(); // Load cart from database
    renderTabs(categories);
    renderSections(categories, allItems);
    setupScrollButtons();
    setupSearch();
    setupSort();
    setupCart();
  }

  // Fetch restaurant info
  async function fetchRestaurantInfo() {
    try {
      const res = await fetch(`/api/restaurant/${stakeholderId}`);
      const data = await res.json();
      if (data && data.restaurant_name) {
        restaurantName = data.restaurant_name;
        restaurantNameEl.textContent = restaurantName;
        restaurantBreadcrumb.textContent = restaurantName;
      }
    } catch (error) {
      console.error("Failed to fetch restaurant info:", error);
    }
  }

  // Fetch categories with saved order
  async function fetchCategories() {
    try {
      const res = await fetch(`/api/menu/get-menu-categories/${stakeholderId}`);
      const data = await res.json();
      const cats = Array.isArray(data.cuisines)
        ? data.cuisines.map(c => c.cuisine_name)
        : [];
      
      if (Array.isArray(data.savedOrder)) {
        const ordered = data.savedOrder.filter(n => cats.includes(n));
        const leftovers = cats.filter(n => !ordered.includes(n));
        return [...ordered, ...leftovers];
      }
      return cats;
    } catch (error) {
      console.error("Failed to fetch categories:", error);
      return [];
    }
  }

  // Fetch menu items
  async function fetchMenuItems() {
    try {
      const res = await fetch(`/api/menu/get-menu-items/${stakeholderId}`);
      const data = await res.json();
      return Array.isArray(data.menuItems) ? data.menuItems : [];
    } catch (error) {
      console.error("Failed to fetch menu items:", error);
      return [];
    }
  }

  // Render tabs
  function renderTabs(cats) {
    tabsContainer.innerHTML = "";
    cats.forEach((name, index) => {
      const btn = document.createElement("button");
      btn.className = "tab-btn";
      if (index === 0) btn.classList.add("active");
      btn.textContent = name;
      btn.dataset.tab = name.toLowerCase();
      
      btn.addEventListener("click", () => {
        document
          .getElementById(`section-${name.toLowerCase()}`)
          .scrollIntoView({ behavior: "smooth", block: "start" });
  
        // Highlight active tab
        document.querySelectorAll(".tab-btn").forEach(b => b.classList.remove("active"));
        btn.classList.add("active");
      });
  
      tabsContainer.appendChild(btn);
    });
  }

  // Render sections
  function renderSections(cats, items) {
    sectionsContainer.innerHTML = "";
    
    // Check if there are no menu items at all
    if (!items || items.length === 0) {
      sectionsContainer.innerHTML = `
        <div style="
          text-align: center;
          padding: 4rem 2rem;
          background: white;
          border-radius: 12px;
          margin-top: 2rem;
          box-shadow: 0 2px 8px rgba(0,0,0,0.08);
        ">
          <i class="fas fa-utensils" style="font-size: 4rem; color: #ddd; margin-bottom: 1rem;"></i>
          <h2 style="color: #666; font-size: 1.5rem; margin-bottom: 0.5rem;">No Menu Items Available</h2>
          <p style="color: #999; font-size: 1rem;">This restaurant doesn't have any menu items yet.</p>
        </div>
      `;
      
      // Hide tabs, search, and sort controls when no items
      if (tabsContainer) tabsContainer.style.display = 'none';
      document.querySelector('.controls')?.style.setProperty('display', 'none');
      document.querySelector('.tabs-container')?.style.setProperty('display', 'none');
      
      return;
    }
    
    // Show controls if items exist
    if (tabsContainer) tabsContainer.style.display = '';
    document.querySelector('.controls')?.style.removeProperty('display');
    document.querySelector('.tabs-container')?.style.removeProperty('display');
    
    cats.forEach(name => {
      const section = document.createElement("section");
      section.id = `section-${name.toLowerCase()}`;
      section.className = "menu-section";
      section.innerHTML = `<h2>${name}</h2><div class="menu-grid"></div>`;
      sectionsContainer.appendChild(section);
      updateSection(name);
    });
  }

  // Update section with items
  function updateSection(name) {
    const grid = document
      .getElementById(`section-${name.toLowerCase()}`)
      .querySelector(".menu-grid");
  
    // Filter by category
    let list = allItems.filter(i =>
      i.cuisine_name.toLowerCase() === name.toLowerCase()
    );
  
    // Apply sorting
    const s = sortSelect.value;
    if (s === "priceLow") list.sort((a, b) => a.item_price - b.item_price);
    if (s === "priceHigh") list.sort((a, b) => b.item_price - a.item_price);
    if (s === "alphaAZ") list.sort((a, b) => a.item_name.localeCompare(b.item_name));
    if (s === "alphaZA") list.sort((a, b) => b.item_name.localeCompare(a.item_name));
  
    grid.innerHTML = "";
  
    list.forEach(item => {
      const card = document.createElement("div");
      card.className = "menu-card";
      card.dataset.id = item.menu_id;
      card.innerHTML = `
        <div class="image-container">
          <img src="${item.item_picture}" alt="${item.item_name}" />
        </div>
        <div class="info">
          <h3>${item.item_name}</h3>
          <p class="desc">${item.description}</p>
          <div class="price">Tk ${item.item_price}</div>
          <button class="add-to-cart-btn" data-id="${item.menu_id}" data-name="${item.item_name}" data-price="${item.item_price}">
            <i class="fas fa-cart-plus"></i> Add to Cart
          </button>
        </div>
      `;
      grid.appendChild(card);
    });

    if (list.length === 0) {
      grid.innerHTML = '<p style="padding: 2rem; text-align: center; color: #999;">No items in this category</p>';
    }
  }

  // Setup scroll buttons
  function setupScrollButtons() {
    const scrollContainer = document.querySelector('.scrollable-tabs');
    const btnLeft = document.getElementById('scrollLeft');
    const btnRight = document.getElementById('scrollRight');

    if (scrollContainer && btnLeft && btnRight) {
      const scrollAmt = 200;

      btnLeft.addEventListener('click', () => {
        scrollContainer.scrollBy({ left: -scrollAmt, behavior: 'smooth' });
      });

      btnRight.addEventListener('click', () => {
        scrollContainer.scrollBy({ left: scrollAmt, behavior: 'smooth' });
      });
    }
  }

  // Setup search functionality
  function setupSearch() {
    searchInput.addEventListener("input", () => {
      const kw = searchInput.value.trim().toLowerCase();
      if (!kw) {
        resultsContainer.style.display = "none";
        return;
      }

      const matches = allItems.filter(item =>
        item.item_name.toLowerCase().includes(kw) ||
        item.description.toLowerCase().includes(kw)
      );

      if (!matches.length) {
        resultsContainer.innerHTML = `
          <div class="search-result-item">No results for "${kw}"</div>`;
      } else {
        resultsContainer.innerHTML = matches.map(item => `
          <div class="search-result-item" data-id="${item.menu_id}">
            <span class="item-name">${item.item_name}</span>
            <span class="category-label">${item.cuisine_name}</span>
          </div>
        `).join("");
      }

      resultsContainer.style.display = "block";

      resultsContainer.querySelectorAll(".search-result-item[data-id]")
        .forEach(el => {
          el.addEventListener("click", () => {
            const id = el.dataset.id;
            const card = document.querySelector(`.menu-card[data-id="${id}"]`);
            if (card) {
              card.closest("section")
                .scrollIntoView({ behavior: "smooth", block: "start" });
              card.scrollIntoView({ behavior: "smooth", block: "center" });

              card.classList.add("flash-highlight");
              setTimeout(() => card.classList.remove("flash-highlight"), 5000);
            }

            searchInput.value = "";
            resultsContainer.style.display = "none";
          });
        });
    });
  }

  // Setup sort functionality
  function setupSort() {
    sortSelect.addEventListener("change", () => {
      categories.forEach(updateSection);
    });
  }

  // Load cart from database
  async function loadCartFromDatabase() {
    if (!consumerId) return;
    
    try {
      // ✅ Use correct API endpoint (matches working pickup-menu.js)
      const res = await fetch(`/api/cart/get-cart?consumer_id=${consumerId}&type=${orderType}`);
      const data = await res.json();
      
      if (data.cartItems && data.cartItems.length > 0) {
        cart = data.cartItems.map(item => ({
          cart_id: item.cart_id,
          id: item.menu_id,
          name: item.item_name,
          price: parseFloat(item.item_price),
          quantity: item.quatity, // ✅ Use 'quatity' (database column name)
          picture: item.item_picture
        }));
      } else {
        cart = [];
      }
      updateCartUI();
    } catch (error) {
      console.error("Failed to load cart:", error);
      cart = [];
      updateCartUI();
    }
  }

  // Setup cart functionality
  function setupCart() {
    // ✅ REMOVED DUPLICATE: Add to cart button clicks (this was causing double additions)
    // The event listener is already set up at line 637 below setupCart()

    // Toggle cart popup
    cartIcon.addEventListener("click", () => {
      cartPopup.classList.toggle("active");
    });

    // Close cart when clicking outside
    document.addEventListener("click", (e) => {
      if (!cartIcon.contains(e.target) && !cartPopup.contains(e.target)) {
        cartPopup.classList.remove("active");
      }
    });

    // Order type toggle buttons
    document.getElementById("delivery-tab").addEventListener("click", async () => {
      // Check if switching from pickup to delivery
      if (orderType === 'pickup' && cart.length > 0) {
        // Check if current restaurant supports delivery
        if (!supportsDelivery) {
          alert("This restaurant doesn't support delivery. Please clear your pickup cart first or switch to a restaurant that supports delivery.");
          return;
        }

        // Validate if switching is allowed (check if cart has items from different restaurant)
        const canSwitch = await validateCartSwitch(stakeholderId, 'delivery');
        if (!canSwitch) {
          const confirmSwitch = confirm(
            "Switching to delivery will clear your current pickup cart. Do you want to continue?"
          );
          if (!confirmSwitch) return;
          
          // Clear pickup cart from database
          await clearCartByType('pickup');
        }
      }

      orderType = 'delivery';
      document.getElementById("delivery-tab").classList.add("active");
      document.getElementById("pickup-tab").classList.remove("active");
      await loadCartFromDatabase(); // Reload cart for delivery type
    });

    document.getElementById("pickup-tab").addEventListener("click", async () => {
      // Check if switching from delivery to pickup
      if (orderType === 'delivery' && cart.length > 0) {
        // Check if current restaurant supports pickup
        if (!supportsPickup) {
          alert("This restaurant doesn't support pickup. Please clear your delivery cart first or switch to a restaurant that supports pickup.");
          return;
        }

        // Validate if switching is allowed
        const canSwitch = await validateCartSwitch(stakeholderId, 'pickup');
        if (!canSwitch) {
          const confirmSwitch = confirm(
            "Switching to pickup will clear your current delivery cart. Do you want to continue?"
          );
          if (!confirmSwitch) return;
          
          // Clear delivery cart from database
          await clearCartByType('delivery');
        }
      }

      orderType = 'pickup';
      document.getElementById("pickup-tab").classList.add("active");
      document.getElementById("delivery-tab").classList.remove("active");
      await loadCartFromDatabase(); // Reload cart for pickup type
    });

    // Checkout button
    document.getElementById("checkout-btn").addEventListener("click", async () => {
      if (cart.length === 0) {
        alert("Your cart is empty!");
        return;
      }
      
      // Open payment modal
      openPaymentModal();
    });
  }

  // ============================================================================
  // PAYMENT MODAL FUNCTIONALITY
  // ============================================================================
  
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
    const modal = document.getElementById("payment-modal");
    const orderItemsList = document.getElementById("order-items-list");
    
    // Calculate totals
    const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const deliveryFee = calculateDeliveryFee();
    const serviceFee = 5;
    const total = subtotal + deliveryFee + serviceFee;
    
    // Populate order items
    orderItemsList.innerHTML = cart.map(item => `
      <div class="order-item-row">
        <div>
          <div class="order-item-name">${item.name}</div>
          <div class="order-item-quantity">Qty: ${item.quantity}</div>
        </div>
        <div class="order-item-price">Tk ${(item.price * item.quantity).toFixed(2)}</div>
      </div>
    `).join("");
    
    // Update totals in modal
    document.getElementById("modal-subtotal").textContent = `Tk ${subtotal.toFixed(2)}`;
    document.getElementById("modal-delivery-fee").textContent = `Tk ${deliveryFee.toFixed(2)}`;
    document.getElementById("modal-service-fee").textContent = `Tk ${serviceFee.toFixed(2)}`;
    document.getElementById("modal-total").textContent = `Tk ${total.toFixed(2)}`;
    
    // Show/hide sections based on order type
    const deliverySection = document.getElementById("delivery-address-section");
    const pickupSection = document.getElementById("pickup-time-section");
    const cashOption = document.getElementById("cash-option");
    const deliveryRow = document.getElementById("modal-delivery-row");
    
    if (orderType === 'delivery') {
      deliverySection.style.display = 'block';
      pickupSection.style.display = 'none';
      cashOption.style.display = 'flex';
      deliveryRow.style.display = 'flex';
      
      // 🗺️ Initialize delivery map with user's location
      initDeliveryMap();
    } else {
      deliverySection.style.display = 'none';
      pickupSection.style.display = 'block';
      cashOption.style.display = 'none';
      deliveryRow.style.display = 'none';
      
      // Set default pickup time (30 minutes from now)
      const now = new Date();
      now.setMinutes(now.getMinutes() + 30);
      const formatted = now.toISOString().slice(0, 16);
      document.getElementById("pickup-time").value = formatted;
      
      // Force bKash selection for pickup
      document.getElementById("payment-bkash").checked = true;
    }
    
    // Show modal
    modal.style.display = 'flex';
    
    // Close modal handlers
    document.getElementById("close-payment-modal").onclick = closePaymentModal;
    document.getElementById("cancel-payment").onclick = closePaymentModal;
    
    // Confirm payment handler
    document.getElementById("confirm-payment").onclick = handlePaymentConfirmation;
  }
  
  function closePaymentModal() {
    document.getElementById("payment-modal").style.display = 'none';
    
    // Clean up map instance
    if (deliveryMap) {
      deliveryMap.remove();
      deliveryMap = null;
    }
  }
  
  async function handlePaymentConfirmation() {
    const paymentMethod = document.querySelector('input[name="payment-method"]:checked').value;
    const confirmBtn = document.getElementById("confirm-payment");
    
    // Validate inputs
    if (orderType === 'delivery') {
      const address = document.getElementById("delivery-address").value.trim();
      if (!address) {
        alert("Please enter your delivery address!");
        return;
      }
    } else {
      const pickupTime = document.getElementById("pickup-time").value;
      if (!pickupTime) {
        alert("Please select a pickup time!");
        return;
      }
    }
    
    // Disable button during processing
    confirmBtn.disabled = true;
    confirmBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processing...';
    
    try {
      if (paymentMethod === 'bkash') {
        await handleBkashPayment();
      } else {
        await handleCashPayment();
      }
    } catch (error) {
      console.error("Payment error:", error);
      alert("Payment failed. Please try again.");
      confirmBtn.disabled = false;
      confirmBtn.innerHTML = '<i class="fas fa-lock"></i> Place Order';
    }
  }
  
  async function handleBkashPayment() {
    const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const deliveryFee = calculateDeliveryFee();
    const serviceFee = 5;
    const total = subtotal + deliveryFee + serviceFee;
    
    // 🔥 Get delivery coordinates from localStorage
    const deliveryLat = localStorage.getItem('current_user_lat');
    const deliveryLng = localStorage.getItem('current_user_lng');
    
    try {
      // Create bKash payment
      const response = await fetch('/api/payment/bkash/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: total,
          consumer_id: consumerId,
          stakeholder_id: stakeholderId,
          order_type: orderType
        })
      });
      
      const data = await response.json();
      
      if (data.success && data.data.bkashURL) {
        // Store order details in localStorage for after payment
        const orderDetails = {
          cart: cart,
          orderType: orderType,
          subtotal: subtotal,
          deliveryFee: deliveryFee,
          serviceFee: serviceFee,
          totalAmount: total,
          deliveryAddress: orderType === 'delivery' ? document.getElementById("delivery-address").value : null,
          deliveryLat: orderType === 'delivery' ? deliveryLat : null, // 🔥 NEW
          deliveryLng: orderType === 'delivery' ? deliveryLng : null, // 🔥 NEW
          pickupTime: orderType === 'pickup' ? document.getElementById("pickup-time").value : null,
          notes: document.getElementById("order-notes").value,
          stakeholderId: stakeholderId,
          consumerId: consumerId,
          paymentId: data.data.paymentID,
          paymentRecordId: data.data.paymentRecordId
        };
        
        localStorage.setItem('pendingOrder', JSON.stringify(orderDetails));
        
        // Redirect to bKash payment page
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
  
  async function handleCashPayment() {
    const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const deliveryFee = calculateDeliveryFee();
    const serviceFee = 5;
    const total = subtotal + deliveryFee + serviceFee;
    
    // 🔥 Get delivery coordinates from localStorage
    const deliveryLat = localStorage.getItem('current_user_lat');
    const deliveryLng = localStorage.getItem('current_user_lng');
    
    try {
      // Create order with cash payment
      const orderData = {
        consumer_id: consumerId,
        stakeholder_id: stakeholderId,
        order_type: orderType,
        payment_method: 'cash',
        subtotal: subtotal,
        delivery_fee: deliveryFee,
        service_fee: serviceFee,
        total_amount: total,
        delivery_address: orderType === 'delivery' ? document.getElementById("delivery-address").value : null,
        delivery_lat: orderType === 'delivery' ? deliveryLat : null, // 🔥 NEW
        delivery_lng: orderType === 'delivery' ? deliveryLng : null, // 🔥 NEW
        pickup_time: orderType === 'pickup' ? document.getElementById("pickup-time").value : null,
        notes: document.getElementById("order-notes").value,
        items: cart.map(item => ({
          menu_id: item.id,
          item_name: item.name,
          item_price: item.price,
          quantity: item.quantity,
          subtotal: item.price * item.quantity
        }))
      };
      
      const response = await fetch('/api/orders/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(orderData)
      });
      
      const data = await response.json();
      
      if (data.success) {
        // Clear cart
        await clearCart();
        
        // Show success message
        alert(`Order placed successfully! Order ID: ${data.orderId}\n\nYou can pay cash when your order arrives.`);
        
        // Close modal and redirect
        closePaymentModal();
        window.location.href = 'khadok.consumer.order.html';
      } else {
        throw new Error(data.message || 'Failed to create order');
      }
    } catch (error) {
      console.error("Cash order error:", error);
      alert("Failed to place order. Please try again.");
      throw error;
    }
  }
  
  async function clearCart() {
    try {
      await fetch(`/api/cart/clear?consumer_id=${consumerId}&type=${orderType}`, {
        method: 'DELETE'
      });
      cart = [];
      updateCartUI();
    } catch (error) {
      console.error("Failed to clear cart:", error);
    }
  }

  // ✅ KEEP THIS ONE: Add to cart button clicks (single event listener)
  document.body.addEventListener("click", async (e) => {
    const addBtn = e.target.closest(".add-to-cart-btn");
    if (addBtn) {
      const itemId = addBtn.dataset.id;
      const itemName = addBtn.dataset.name;
      const itemPrice = parseFloat(addBtn.dataset.price);
      const itemPicture = addBtn.closest('.menu-card').querySelector('img').src;

      await addToCart({ id: itemId, name: itemName, price: itemPrice, picture: itemPicture });
    }
  });

  // Add item to cart (with database save)
  async function addToCart(item) {
    try {
      const res = await fetch('/api/cart/add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          consumer_id: consumerId,
          menu_id: item.id,
          quantity: 1,
          stakeholder_id: stakeholderId,
          item_name: item.name,
          item_price: item.price,
          item_picture: item.picture,
          type: orderType // Add type parameter
        })
      });

      if (res.ok) {
        // Reload cart from database to get updated cart_id
        await loadCartFromDatabase();
        
        // Show brief feedback
        const feedback = document.createElement("div");
        feedback.style.cssText = `
          position: fixed;
          bottom: 100px;
          right: 30px;
          background: #00b894;
          color: white;
          padding: 12px 20px;
          border-radius: 8px;
          box-shadow: 0 4px 12px rgba(0,0,0,0.2);
          z-index: 10000;
          animation: slideIn 0.3s ease;
        `;
        feedback.textContent = "Added to cart!";
        document.body.appendChild(feedback);
        
        setTimeout(() => {
          feedback.style.animation = "slideOut 0.3s ease";
          setTimeout(() => feedback.remove(), 300);
        }, 2000);
      }
    } catch (error) {
      console.error("Failed to add to cart:", error);
      alert("Failed to add item to cart");
    }
  }

  // Update cart UI
  async function updateCartUI() {
    if (!consumerId) {
      cartCount.textContent = '0';
      cartItems.innerHTML = '';
      document.getElementById('cart-summary').style.display = 'none';
      return;
    }

    try {
      // ✅ Fetch cart from database
      const res = await fetch(`/api/cart/get-cart?consumer_id=${consumerId}&type=${orderType}`);
      const data = await res.json();
      
      // ✅ Reset cart array and map from database response
      if (data.cartItems && data.cartItems.length > 0) {
        cart = data.cartItems.map(item => ({
          cart_id: item.cart_id,
          id: item.menu_id,
          name: item.item_name,
          price: parseFloat(item.item_price),
          quantity: item.quatity, // ✅ Use 'quatity' (database column name)
          picture: item.item_picture
        }));
      } else {
        cart = [];
      }

      const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
      
      cartCount.textContent = totalItems;

      // ✅ Show empty cart state without fees
      if (cart.length === 0) {
        cartItems.innerHTML = '<div style="text-align: center; color: #999; padding: 2rem;">Your cart is empty</div>';
        document.getElementById('cart-summary').style.display = 'none';
        return; // ✅ Exit early - don't show fees
      }

      // ✅ Only calculate fees when cart has items
      const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
      const deliveryFee = calculateDeliveryFee();
      const serviceFee = 5; // Fixed 5 Tk service charge
      const total = subtotal + deliveryFee + serviceFee;

      // ✅ Show cart summary
      document.getElementById('cart-summary').style.display = 'block';
      
      cartItems.innerHTML = cart.map(item => `
        <div class="cart-item">
          <img src="${item.picture}" alt="${item.name}" class="cart-item-image" />
          <div class="cart-item-details">
            <h4>${item.name}</h4>
            <p class="cart-item-price">Tk ${item.price}</p>
          </div>
          <div class="cart-item-controls">
            <button class="quantity-btn" data-cart-id="${item.cart_id}" data-action="decrease">
              <i class="fas fa-minus"></i>
            </button>
            <span class="quantity">${item.quantity}</span>
            <button class="quantity-btn" data-cart-id="${item.cart_id}" data-action="increase">
              <i class="fas fa-plus"></i>
            </button>
          </div>
        </div>
      `).join("");

      // Update summary
      document.getElementById('subtotal-amount').textContent = `Tk ${subtotal}`;
      document.getElementById('delivery-fee-amount').textContent = `Tk ${deliveryFee}`;
      document.getElementById('service-fee-amount').textContent = `Tk ${serviceFee}`;
      document.getElementById('total-amount').textContent = `Tk ${total}`;

      // ✅ Add quantity button listeners AFTER rendering (matches pickup-menu.js)
      document.querySelectorAll(".quantity-btn").forEach(btn => {
        btn.addEventListener("click", async (e) => {
          e.stopPropagation();
          const cartId = btn.dataset.cartId;
          const action = btn.dataset.action;

          if (action === "increase") {
            await updateQuantity(cartId, 1);
          } else if (action === "decrease") {
            await updateQuantity(cartId, -1);
          }
        });
      });
    } catch (error) {
      console.error("Failed to update cart UI:", error);
    }
  }

  // ✅ Update quantity in database (matches pickup-menu.js implementation)
  async function updateQuantity(cartId, change) {
    try {
      // First, get current item from cart array
      const cartItem = cart.find(i => i.cart_id == cartId);
      if (!cartItem) return;

      const newQuantity = cartItem.quantity + change;

      // If quantity would be 0 or less, remove the item instead
      if (newQuantity <= 0) {
        await removeFromCart(cartId);
        return;
      }

      const res = await fetch(`/api/cart/update-quantity/${cartId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          quantity: newQuantity
        })
      });

      if (res.ok) {
        await updateCartUI();
      } else {
        console.error("Failed to update quantity");
      }
    } catch (error) {
      console.error("Failed to update quantity:", error);
    }
  }

  // Remove item from cart
  async function removeFromCart(cartId) {
    try {
      const res = await fetch(`/api/cart/remove/${cartId}`, {
        method: 'DELETE'
      });

      if (res.ok) {
        await updateCartUI();
      }
    } catch (error) {
      console.error("Failed to remove from cart:", error);
    }
  }

  // Validate if cart can be switched to different type
  async function validateCartSwitch(restaurantId, newType) {
    if (!consumerId) return true;
    
    try {
      const res = await fetch(`/api/cart/validate-switch?consumer_id=${consumerId}&stakeholder_id=${restaurantId}&type=${newType}`);
      const data = await res.json();
      return data.canSwitch || false;
    } catch (error) {
      console.error("Failed to validate cart switch:", error);
      return false;
    }
  }

  // Clear cart items by type
  async function clearCartByType(type) {
    if (!consumerId) return;
    
    try {
      await fetch(`/api/cart/clear-by-type?consumer_id=${consumerId}&type=${type}`, {
        method: 'DELETE'
      });
    } catch (error) {
      console.error("Failed to clear cart:", error);
    }
  }
});

// Add CSS animations
const style = document.createElement("style");
style.textContent = `
  @keyframes slideIn {
    from { transform: translateX(400px); opacity: 0; }
    to { transform: translateX(0); opacity: 1; }
  }
  @keyframes slideOut {
    from { transform: translateX(0); opacity: 1; }
    to { transform: translateX(400px); opacity: 0; }
  }
`;
document.head.appendChild(style);