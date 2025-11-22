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
      const res = await fetch(`/api/cart/${consumerId}`);
      const data = await res.json();
      
      if (data.cartItems && data.cartItems.length > 0) {
        cart = data.cartItems.map(item => ({
          cart_id: item.cart_id,
          id: item.menu_id,
          name: item.item_name,
          price: parseFloat(item.item_price),
          quantity: item.quatity,
          picture: item.item_picture
        }));
      } else {
        // ✅ Clear cart if empty from database
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
    // Add to cart button clicks
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
    document.getElementById("delivery-tab").addEventListener("click", () => {
      orderType = 'delivery';
      document.getElementById("delivery-tab").classList.add("active");
      document.getElementById("pickup-tab").classList.remove("active");
      updateCartUI(); // Recalculate fees when switching
    });

    document.getElementById("pickup-tab").addEventListener("click", () => {
      orderType = 'pickup';
      document.getElementById("pickup-tab").classList.add("active");
      document.getElementById("delivery-tab").classList.remove("active");
      updateCartUI(); // Recalculate fees when switching
    });

    // Checkout button
    document.getElementById("checkout-btn").addEventListener("click", async () => {
      if (cart.length === 0) {
        alert("Your cart is empty!");
        return;
      }
      alert(`${orderType === 'delivery' ? 'Delivery' : 'Pickup'} checkout - Feature coming soon!`);
      // TODO: Implement checkout
    });
  }

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
          item_picture: item.picture
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
  function updateCartUI() {
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

    // Add quantity button listeners
    document.querySelectorAll(".quantity-btn").forEach(btn => {
      btn.addEventListener("click", async (e) => {
        e.stopPropagation();
        const cartId = btn.dataset.cartId;
        const action = btn.dataset.action;
        const cartItem = cart.find(i => i.cart_id == cartId);

        if (!cartItem) return;

        if (action === "increase") {
          await updateCartQuantity(cartId, cartItem.quantity + 1);
        } else if (action === "decrease") {
          if (cartItem.quantity > 1) {
            await updateCartQuantity(cartId, cartItem.quantity - 1);
          } else {
            // ✅ Remove item when quantity is 1 and user clicks minus
            await removeFromCart(cartId);
          }
        }
      });
    });
  }

  // Update cart quantity in database
  async function updateCartQuantity(cartId, newQuantity) {
    try {
      const res = await fetch(`/api/cart/update/${cartId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ quantity: newQuantity })
      });

      if (res.ok) {
        await loadCartFromDatabase();
      }
    } catch (error) {
      console.error("Failed to update cart:", error);
    }
  }

  // Remove item from cart
  async function removeFromCart(cartId) {
    try {
      const res = await fetch(`/api/cart/remove/${cartId}`, {
        method: 'DELETE'
      });

      if (res.ok) {
        await loadCartFromDatabase();
      }
    } catch (error) {
      console.error("Failed to remove from cart:", error);
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