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

  // Get stakeholder_id from URL parameter
  const urlParams = new URLSearchParams(window.location.search);
  stakeholderId = urlParams.get('restaurant_id');

  if (!stakeholderId) {
    alert("No restaurant selected");
    window.location.href = "khadok.consumer.dashboard.html";
    return;
  }

  // Initialize
  init();

  async function init() {
    await fetchRestaurantInfo();
    categories = await fetchCategories();
    allItems = await fetchMenuItems();
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

  // Setup cart functionality
  function setupCart() {
    // Add to cart button clicks
    document.body.addEventListener("click", (e) => {
      const addBtn = e.target.closest(".add-to-cart-btn");
      if (addBtn) {
        const itemId = addBtn.dataset.id;
        const itemName = addBtn.dataset.name;
        const itemPrice = parseFloat(addBtn.dataset.price);

        addToCart({ id: itemId, name: itemName, price: itemPrice });
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

    // Checkout button for pickup only
    document.getElementById("checkout-pickup-btn").addEventListener("click", () => {
      if (cart.length === 0) {
        alert("Your cart is empty!");
        return;
      }
      alert("Pickup checkout - Feature coming soon!");
      // TODO: Implement pickup checkout
    });
  }

  // Add item to cart
  function addToCart(item) {
    const existingItem = cart.find(i => i.id === item.id);
    
    if (existingItem) {
      existingItem.quantity++;
    } else {
      cart.push({ ...item, quantity: 1 });
    }

    updateCartUI();
    
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

  // Update cart UI
  function updateCartUI() {
    const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
    cartCount.textContent = totalItems;

    if (totalItems === 0) {
      cartItems.innerHTML = '<li style="text-align: center; color: #999;">Your cart is empty</li>';
    } else {
      cartItems.innerHTML = cart.map(item => `
        <li>
          <div>
            <strong>${item.name}</strong><br>
            <small>Tk ${item.price} × ${item.quantity}</small>
          </div>
          <div>
            <strong>Tk ${(item.price * item.quantity).toFixed(2)}</strong>
            <button class="remove-btn" data-id="${item.id}" style="
              margin-left: 10px;
              background: #ff6b6b;
              color: white;
              border: none;
              border-radius: 4px;
              padding: 4px 8px;
              cursor: pointer;
            ">×</button>
          </div>
        </li>
      `).join("");

      // Add remove button listeners
      document.querySelectorAll(".remove-btn").forEach(btn => {
        btn.addEventListener("click", () => {
          const itemId = btn.dataset.id;
          cart = cart.filter(i => i.id !== itemId);
          updateCartUI();
        });
      });
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