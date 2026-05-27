document.addEventListener('DOMContentLoaded', () => {
  const params = new URLSearchParams(window.location.search);
  const stakeholderId = params.get('restaurant_id');

  const loadingEl = document.getElementById('loading');
  const contentEl = document.getElementById('content');
  const restaurantNameEl = document.getElementById('restaurant-name');
  const restaurantMetaEl = document.getElementById('restaurant-meta');
  const tabsContainer = document.getElementById('categoryTabs');
  const sectionsContainer = document.getElementById('menuSections');
  const searchInput = document.getElementById('searchInput');
  const sortSelect = document.getElementById('sortSelect');

  let allItems = [];
  let categories = [];

  if (!stakeholderId) {
    loadingEl.innerHTML = '<p>No restaurant selected. <a href="index.html">Go home</a></p>';
    return;
  }

  init();

  async function init() {
    try {
      await fetchRestaurantInfo();
      categories = await fetchCategories();
      allItems = await fetchMenuItems();
      loadingEl.style.display = 'none';
      contentEl.style.display = 'block';
      renderTabs(categories);
      renderSections(categories);
      setupSort();
      setupSearch();
    } catch (err) {
      console.error(err);
      loadingEl.innerHTML = '<p>Failed to load menu. <a href="index.html">Go home</a></p>';
    }
  }

  async function fetchRestaurantInfo() {
    const res = await fetch(`/api/restaurant/${stakeholderId}`);
    if (!res.ok) throw new Error('Restaurant not found');
    const data = await res.json();
    restaurantNameEl.textContent = data.restaurant_name || 'Restaurant';
    const parts = [];
    if (data.ratings != null) parts.push(`★ ${Number(data.ratings).toFixed(1)}`);
    if (data.address) parts.push(data.address);
    restaurantMetaEl.textContent = parts.join(' · ') || '';
    document.title = `${data.restaurant_name || 'Menu'} | Khadok`;
  }

  async function fetchCategories() {
    const res = await fetch(`/api/menu/get-menu-categories/${stakeholderId}`);
    const data = await res.json();
    const cats = Array.isArray(data.cuisines)
      ? data.cuisines.map((c) => c.cuisine_name)
      : [];
    if (Array.isArray(data.savedOrder)) {
      const ordered = data.savedOrder.filter((n) => cats.includes(n));
      const leftovers = cats.filter((n) => !ordered.includes(n));
      return [...ordered, ...leftovers];
    }
    return cats;
  }

  async function fetchMenuItems() {
    const res = await fetch(`/api/menu/get-menu-items/${stakeholderId}`);
    const data = await res.json();
    return Array.isArray(data.menuItems) ? data.menuItems : [];
  }

  function renderTabs(cats) {
    tabsContainer.innerHTML = '';
    cats.forEach((name, index) => {
      const btn = document.createElement('button');
      btn.className = 'tab-btn' + (index === 0 ? ' active' : '');
      btn.textContent = name;
      btn.addEventListener('click', () => {
        document.querySelectorAll('.tab-btn').forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');
        const section = document.getElementById(`section-${name.toLowerCase()}`);
        if (section) section.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
      tabsContainer.appendChild(btn);
    });
  }

  function renderSections(cats) {
    sectionsContainer.innerHTML = '';
    if (!allItems.length) {
      sectionsContainer.innerHTML =
        '<div class="preview-empty"><i class="fas fa-utensils"></i><p>No menu items available yet.</p></div>';
      return;
    }
    cats.forEach((name) => {
      const section = document.createElement('section');
      section.id = `section-${name.toLowerCase()}`;
      section.className = 'menu-section';
      section.innerHTML = `<h2>${name}</h2><div class="menu-grid"></div>`;
      sectionsContainer.appendChild(section);
      updateSection(name);
    });
  }

  function updateSection(name) {
    const grid = document
      .getElementById(`section-${name.toLowerCase()}`)
      ?.querySelector('.menu-grid');
    if (!grid) return;

    let list = allItems.filter(
      (i) => i.cuisine_name && i.cuisine_name.toLowerCase() === name.toLowerCase()
    );

    const kw = searchInput.value.trim().toLowerCase();
    if (kw) {
      list = list.filter(
        (i) =>
          i.item_name.toLowerCase().includes(kw) ||
          (i.description && i.description.toLowerCase().includes(kw))
      );
    }

    const s = sortSelect.value;
    if (s === 'priceLow') list.sort((a, b) => a.item_price - b.item_price);
    if (s === 'priceHigh') list.sort((a, b) => b.item_price - a.item_price);
    if (s === 'alphaAZ') list.sort((a, b) => a.item_name.localeCompare(b.item_name));
    if (s === 'alphaZA') list.sort((a, b) => b.item_name.localeCompare(a.item_name));

    grid.innerHTML = '';
    list.forEach((item) => {
      const card = document.createElement('div');
      card.className = 'menu-card';
      const imgSrc = item.item_picture || 'images/khadok2.png';
      card.innerHTML = `
        <div class="image-container">
          <img src="${imgSrc}" alt="${item.item_name}" onerror="this.src='images/khadok2.png'">
        </div>
        <div class="info">
          <h3>${item.item_name}</h3>
          <p class="desc">${item.description || ''}</p>
          <div class="price">Tk ${item.item_price}</div>
          <p class="login-hint"><i class="fas fa-lock"></i> Login to order</p>
        </div>
      `;
      grid.appendChild(card);
    });

    if (!list.length) {
      grid.innerHTML = '<p class="preview-empty">No items match your search.</p>';
    }
  }

  function setupSort() {
    sortSelect.addEventListener('change', () => categories.forEach(updateSection));
  }

  function setupSearch() {
    searchInput.addEventListener('input', () => categories.forEach(updateSection));
  }
});
