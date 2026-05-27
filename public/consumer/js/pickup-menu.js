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
  let consumerId = localStorage.getItem('consumer_id');
  let stakeholderId = null;
  let restaurantName = "";
  let orderType = 'pickup'; // default to pickup for pickup page
  let restaurantTypes = []; // Will store restaurant delivery/pickup capabilities

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

  // Initialize
  init();

  async function init() {
    await fetchRestaurantInfo();
    categories = await fetchCategories();
    allItems = await fetchMenuItems();
    await loadCartFromDatabase(); // Load cart from database filtered by type='pickup'
    renderTabs(categories);
    renderSections(categories, allItems);
    setupScrollButtons();
    setupSearch();
    setupSort();
    setupCart();
    updateCartUI();
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

  // Load cart from database filtered by type
  async function loadCartFromDatabase() {
    if (!consumerId) return;
    
    try {
      // Remove stakeholder_id filter - show all items for this type across all restaurants
      const res = await fetch(`/api/cart/get-cart?consumer_id=${consumerId}&type=${orderType}`);
      const data = await res.json();
      
      // Cart is already loaded via updateCartUI which will fetch again, but we can use this for initial state
      updateCartUI();
    } catch (error) {
      console.error("Failed to load cart from database:", error);
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
          <button class="add-to-cart-btn" data-id="${item.menu_id}" data-name="${item.item_name}" data-price="${item.item_price}" data-picture="${item.item_picture}">
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

  // Setup cart functionality
  function setupCart() {
    // Add to cart button clicks
    document.body.addEventListener("click", async (e) => {
      const addBtn = e.target.closest(".add-to-cart-btn");
      if (addBtn) {
        const itemId = addBtn.dataset.id;
        const itemName = addBtn.dataset.name;
        const itemPrice = parseFloat(addBtn.dataset.price);
        const itemPicture = addBtn.dataset.picture;

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

    // Order type toggle buttons with validation
    const deliveryTab = document.getElementById("delivery-tab");
    const pickupTab = document.getElementById("pickup-tab");

    if (supportsDelivery && supportsPickup) {
      // Both tabs enabled with validation
      deliveryTab.addEventListener("click", async () => {
        // Validate if we can switch to delivery
        const canSwitch = await validateCartSwitch(stakeholderId, 'delivery');
        
        if (!canSwitch) {
          const confirmSwitch = confirm(
            "You have pickup items in your cart from a different restaurant. Switching to delivery will clear your current cart. Continue?"
          );
          
          if (confirmSwitch) {
            await clearCartByType('pickup');
          } else {
            return; // User cancelled
          }
        }
        
        orderType = 'delivery';
        deliveryTab.classList.add("active");
        pickupTab.classList.remove("active");
        await loadCartFromDatabase();
      });

      pickupTab.addEventListener("click", async () => {
        // Already on pickup tab, but validate anyway
        const canSwitch = await validateCartSwitch(stakeholderId, 'pickup');
        
        if (!canSwitch) {
          const confirmSwitch = confirm(
            "You have delivery items in your cart from a different restaurant. Switching to pickup will clear your current cart. Continue?"
          );
          
          if (confirmSwitch) {
            await clearCartByType('delivery');
          } else {
            return;
          }
        }
        
        orderType = 'pickup';
        pickupTab.classList.add("active");
        deliveryTab.classList.remove("active");
        await loadCartFromDatabase();
      });
    } else {
      // Disable tabs not supported
      if (!supportsDelivery) {
        deliveryTab.style.opacity = '0.5';
        deliveryTab.style.cursor = 'not-allowed';
        deliveryTab.disabled = true;
      }
      if (!supportsPickup) {
        pickupTab.style.opacity = '0.5';
        pickupTab.style.cursor = 'not-allowed';
        pickupTab.disabled = true;
      }
    }

    // Checkout button
    document.getElementById("checkout-btn").addEventListener("click", () => {
      // Cart count from UI
      const totalItems = parseInt(cartCount.textContent) || 0;
      if (totalItems === 0) {
        alert("Your cart is empty!");
        return;
      }
      alert(`${orderType === 'delivery' ? 'Delivery' : 'Pickup'} checkout - Feature coming soon!`);
      // TODO: Implement checkout
    });
  }

  // Add item to cart (database version)
  async function addToCart(item) {
    if (!consumerId) {
      alert("Please log in to add items to cart");
      return;
    }

    try {
      const res = await fetch('/api/cart/add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          consumer_id: consumerId,
          stakeholder_id: stakeholderId,
          menu_id: item.id,
          quantity: 1,
          item_name: item.name,
          item_price: item.price,
          item_picture: item.picture,
          type: orderType // 'pickup' for this page
        })
      });

      const data = await res.json();

      if (res.ok) {
        await updateCartUI();
        
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
        feedback.textContent = `Added to ${orderType} cart!`;
        document.body.appendChild(feedback);
        
        setTimeout(() => {
          feedback.style.animation = "slideOut 0.3s ease";
          setTimeout(() => feedback.remove(), 300);
        }, 2000);
      } else {
        alert(data.message || "Failed to add item to cart");
      }
    } catch (error) {
      console.error("Failed to add to cart:", error);
      alert("Failed to add item to cart");
    }
  }

  // Update cart UI (fetch from database)
  async function updateCartUI() {
    if (!consumerId) {
      cartCount.textContent = '0';
      cartItems.innerHTML = '';
      document.getElementById('cart-summary').style.display = 'none';
      return;
    }

    try {
      // Remove stakeholder_id filter - show all items for this type across all restaurants
      const res = await fetch(`/api/cart/get-cart?consumer_id=${consumerId}&type=${orderType}`);
      const data = await res.json();
      
      const cart = data.cartItems || [];
      const totalItems = cart.reduce((sum, item) => sum + (item.quantity || 0), 0);
      
      cartCount.textContent = totalItems;

      // Empty cart state
      if (cart.length === 0) {
        cartItems.innerHTML = '';
        document.getElementById('cart-summary').style.display = 'none';
        return;
      }

      // Calculate fees
      const subtotal = cart.reduce((sum, item) => sum + (item.item_price * (item.quantity || 0)), 0);
      const deliveryFee = orderType === 'delivery' ? 0 : 0; // Update based on your logic
      const serviceFee = 4;
      const total = subtotal + deliveryFee + serviceFee;

      // Show cart summary
      document.getElementById('cart-summary').style.display = 'block';
      
      // Render cart items
      cartItems.innerHTML = cart.map(item => `
        <div class="cart-item">
          <img src="${item.item_picture}" alt="${item.item_name}" class="cart-item-image" />
          <div class="cart-item-details">
            <h4>${item.item_name}</h4>
            <p class="cart-item-price">Tk ${item.item_price}</p>
          </div>
          <div class="cart-item-controls">
            <button class="quantity-btn" data-cart-id="${item.cart_id}" data-action="decrease">
              <i class="fas fa-minus"></i>
            </button>
            <span class="quantity">${item.quantity || 0}</span>
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

  // Update quantity in database
  async function updateQuantity(cartId, change) {
    try {
      // First, get current quantity from the UI
      const cartItemElement = document.querySelector(`[data-cart-id="${cartId}"]`).closest('.cart-item');
      const currentQuantity = parseInt(cartItemElement.querySelector('.quantity').textContent);
      const newQuantity = currentQuantity + change;

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
      await updateCartUI();
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
  
  .cart-item {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 12px;
    border-bottom: 1px solid #eee;
  }
  
  .cart-item-image {
    width: 60px;
    height: 60px;
    border-radius: 8px;
    object-fit: cover;
  }
  
  .cart-item-details {
    flex: 1;
  }
  
  .cart-item-details h4 {
    margin: 0 0 4px 0;
    font-size: 14px;
    font-weight: 600;
  }
  
  .cart-item-price {
    margin: 0;
    font-size: 12px;
    color: #666;
  }
  
  .cart-item-controls {
    display: flex;
    align-items: center;
    gap: 8px;
  }
  
  .quantity-btn {
    width: 28px;
    height: 28px;
    border: 1px solid #ddd;
    background: white;
    border-radius: 50%;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.2s;
  }
  
  .quantity-btn:hover {
    background: #f0f0f0;
    border-color: #00b894;
  }
  
  .quantity {
    font-weight: 600;
    min-width: 24px;
    text-align: center;
  }
`;
document.head.appendChild(style);