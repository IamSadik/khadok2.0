document.addEventListener('DOMContentLoaded', () => {
  // Tab switching (if used elsewhere)
  const tabs = document.querySelectorAll('.tab-btn');
  const panes = document.querySelectorAll('.tab-pane');
  tabs.forEach(btn => {
    btn.onclick = () => {
      tabs.forEach(b => b.classList.remove('active'));
      panes.forEach(p => p.classList.remove('active'));
      btn.classList.add('active');
      document.getElementById(btn.dataset.tab).classList.add('active');
    };
  });

  const popup = document.getElementById('add-item-popup');
  const cancel = document.getElementById('item-cancel-1');
  const finish = document.getElementById('item-finish');
  const addBtns = document.querySelectorAll('.add-card');

  // ✅ Utility: Reset all form inputs
  function resetMenuForm() {
    document.getElementById("item-name").value = "";
    document.getElementById("item-price").value = "";
    document.getElementById("item-desc").value = "";
    document.getElementById("edit-menu-id").value = "";
    document.getElementById("item-pic").value = "";

    const preview = document.getElementById("image-preview");
    if (preview) preview.style.display = "none";

    // Uncheck all cuisine radios
    document.querySelectorAll('input[name="cuisine"]').forEach(cb => cb.checked = false);
  }

  // Show popup when any "Add New" button clicked
  addBtns.forEach(b => b.onclick = () => {
    resetMenuForm(); // ✅ Reset before opening
    popup.style.display = 'flex';
  });

  // Cancel button closes and resets popup
  cancel.onclick = () => {
    popup.style.display = 'none';
    resetMenuForm(); // ✅ Reset on cancel too
  };

  // Close popup if background is clicked
  popup.onclick = e => {
    if (e.target === popup) {
      popup.style.display = 'none';
      resetMenuForm(); // ✅ Reset on outside click
    }
  };

  // Submit menu item
 finish.addEventListener('click', async () => {
  const menuId = document.getElementById("edit-menu-id").value;
  const name = document.getElementById('item-name').value.trim();
  const price = parseFloat(document.getElementById('item-price').value);
  const description = document.getElementById('item-desc').value.trim();
  const imageFile = document.getElementById('item-pic').files[0];
  const stakeholder_id = localStorage.getItem('stakeholder_id');
  const selectedCuisine = document.querySelector('input[name="cuisine"]:checked');

  const formData = new FormData();
  formData.append('stakeholder_id', stakeholder_id);
  if (name) formData.append('name', name);
  if (!isNaN(price)) formData.append('price', price);
  if (description) formData.append('description', description);
  if (selectedCuisine) formData.append('cuisine', selectedCuisine.value);
  if (imageFile) formData.append('itemPic', imageFile);

  try {
    const endpoint = menuId ? `/api/menu/edit-menu-item/${menuId}` : '/api/menu/add-menu-item';
    const method = menuId ? 'PUT' : 'POST';

    const res = await fetch(endpoint, {
      method,
      body: formData
    });

    const result = await res.json();

    if (res.ok) {
      alert(menuId ? 'Item updated successfully!' : 'Menu item added successfully!');
      popup.style.display = 'none';
      location.reload();
    } else {
      alert(result.message || 'Failed to save item');
    }
  } catch (err) {
    console.error('Error:', err);
    alert('An error occurred while saving the item.');
  }
});

  
  // Load cuisines (radio buttons)
  async function loadCuisines() {
    try {
      const res = await fetch('/api/menu/cuisines');
      const { cuisines } = await res.json();

      const container = document.querySelector('.checkbox-group');
      if (!container) return;

      container.innerHTML = cuisines.map(c =>
        `<label>
           <input type="radio" name="cuisine" value="${c.id}" />
           ${c.name}
         </label>`
      ).join('');
    } catch (error) {
      console.error('Failed to load cuisines:', error);
      alert('Could not load cuisine categories.');
    }
  }

  // Load cuisines on page load
  loadCuisines();
});


document.addEventListener("DOMContentLoaded", () => {
  const stakeholderId     = localStorage.getItem("stakeholder_id");
  const sortSelect        = document.getElementById("sortSelect");
  const searchInput       = document.getElementById("searchInput");
  const tabsContainer     = document.getElementById("categoryTabs");
  const sectionsContainer = document.getElementById("menuSections");
  const popup             = document.getElementById("add-item-popup");
  const cancelBtn         = document.getElementById("item-cancel-1");
  const finishBtn         = document.getElementById("item-finish");
  const editBtn           = document.getElementById("editBtn");
  const reorderBtn = document.getElementById("reorderCategoriesBtn");
  const reorderMessage = document.getElementById("reorderMessage");


  let allItems    = [];
  let categories  = [];
  let reorderMode = false;
  let draggedTab  = null;

  // 1) Add-card popup
  document.body.addEventListener("click", e => {
    if (e.target.closest(".add-card")) popup.style.display = "flex";
  });
  cancelBtn.addEventListener("click", () => popup.style.display = "none");
  popup.addEventListener("click", e => {
    if (e.target === popup) popup.style.display = "none";
  });

  // 2) Initialize
  init();

  async function init() {
    categories = await fetchCategories();
    allItems   = await fetchMenuItems();
    renderTabs(categories);
    renderSections(categories, allItems);
    setupEditDrag(); // wire the edit button
  }

  // fetch with savedOrder
  async function fetchCategories() {
    const res  = await fetch(`/api/menu/get-menu-categories/${stakeholderId}`);
    const data = await res.json();
    const cats = Array.isArray(data.cuisines)
      ? data.cuisines.map(c => c.cuisine_name)
      : [];
    if (Array.isArray(data.savedOrder)) {
      const ordered   = data.savedOrder.filter(n => cats.includes(n));
      const leftovers = cats.filter(n => !ordered.includes(n));
      return [...ordered, ...leftovers];
    }
    return cats;
  }

  async function fetchMenuItems() {
    const res  = await fetch(`/api/menu/get-menu-items/${stakeholderId}`);
    const data = await res.json();
   
    return Array.isArray(data.menuItems) ? data.menuItems : [];
  }

  // 3) Render tabs
  function renderTabs(cats) {
    tabsContainer.innerHTML = "";
    cats.forEach(name => {
      const btn = document.createElement("button");
      btn.className   = "tab-btn";
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
  

  // 4) Render sections
  function renderSections(cats, items) {
    sectionsContainer.innerHTML = "";
    cats.forEach(name => {
      const section = document.createElement("section");
      section.id        = `section-${name.toLowerCase()}`;
      section.className = "menu-section";
      section.innerHTML = `<h2>${name}</h2><div class="menu-grid"></div>`;
      sectionsContainer.appendChild(section);
      updateSection(name);
    });
    // only resort on sort change:
    sortSelect.addEventListener("change", () => cats.forEach(updateSection));
  }


  document.body.addEventListener("click", async (e) => {
  const editBtn = e.target.closest(".edit-btn");
  if (!editBtn) return;

  const menuId = editBtn.dataset.id;

  try {
    const res  = await fetch(`/api/menu/item/${menuId}`);
    if (!res.ok) throw new Error('Failed to fetch item');
    const item = await res.json();

    // Populate fields:
    document.getElementById("item-name").value    = item.item_name;
    document.getElementById("item-price").value   = item.item_price;
    document.getElementById("item-desc").value    = item.description;
    document.getElementById("edit-menu-id").value = item.menu_id;

    // Clear & re-check cuisines:
    document.querySelectorAll('input[name="cuisine"]').forEach(cb => cb.checked = false);
    item.cuisines.forEach(id => {
      const checkbox = document.querySelector(`input[name="cuisine"][value="${id}"]`);
      if (checkbox) checkbox.checked = true;
    });

    // Open the popup:
    document.getElementById("add-item-popup").style.display = "flex";
  } catch (error) {
    console.error("Error loading item:", error);
    alert("Could not load menu item for editing.");
  }
});

  
  
  function updateSection(name) {
    const grid = document
      .getElementById(`section-${name.toLowerCase()}`)
      .querySelector(".menu-grid");
  
    // filter just by category
    let list = allItems.filter(i =>
      i.cuisine_name.toLowerCase() === name.toLowerCase()
    );
  
    // sort as before…
    const s = sortSelect.value;
    if (s === "priceLow")    list.sort((a,b)=>a.item_price - b.item_price);
    if (s === "priceHigh")   list.sort((a,b)=>b.item_price - a.item_price);
    if (s === "ratingHigh")  list.sort((a,b)=>(b.rating||0)-(a.rating||0));
    if (s === "alphaAZ")     list.sort((a,b)=>
                               a.item_name.localeCompare(b.item_name));
    if (s === "alphaZA")     list.sort((a,b)=>
                               b.item_name.localeCompare(a.item_name));
  
    grid.innerHTML = "";
   // same rendering of cards + add-card
  
  
    list.forEach(item => {
      const card = document.createElement("div");
      card.className = "menu-card";
      card.innerHTML = `
        <div class="image-container">
          <img src="${item.item_picture}" alt="${item.item_name}" />
          <div class="action-icons">
            <button class="icon-btn edit-btn" title="Edit" data-id="${item.menu_id}">
              <i class="fas fa-pen"></i>
            </button>
            <button class="icon-btn delete-btn" title="Delete" data-id="${item.menu_id}">
              <i class="fas fa-trash"></i>
            </button>
          </div>
        </div>
        <div class="info">
          <h3>${item.item_name}</h3>
          <p class="desc">${item.description}</p>
          <div class="price">Tk ${item.item_price}</div>
        </div>
      `;
      grid.appendChild(card);
    });
  
    // Add-card button
    const add = document.createElement("div");
    add.className = "menu-card add-card";
    add.innerHTML = `<i class="fas fa-plus-circle"></i><span>Add New Item</span>`;
    grid.appendChild(add);
  }
  
  // Confirm and delete menu item
  document.body.addEventListener("click", async (e) => {
    const btn = e.target.closest(".delete-btn");
    if (!btn) return;

    const menuId = btn.dataset.id;

    const confirmDelete = confirm("Are you sure you want to delete this menu item?");
    if (!confirmDelete) return;

    try {
      const res = await fetch(`/api/menu/delete-menu-item/${menuId}`, {
        method: "DELETE"
      });

      const result = await res.json();
      if (res.ok) {
        alert("Item deleted successfully!");
        window.location.reload();
        allItems = allItems.filter(i => i.menu_id != menuId);
        updateSection(btn.closest("section").querySelector("h2").textContent);
      } else {
        alert(result.error || "Failed to delete item.");
      }
    } catch (err) {
      console.error("Delete failed:", err);
      alert("Server error. Could not delete item.");
    }
  });


  // 5) Edit + Drag-Drop setup
  function setupEditDrag() {
    reorderBtn.addEventListener("click", () => {
      reorderMode = !reorderMode;
      // Toggle glow on tabs
      tabsContainer.classList.toggle("tabs-flash-highlight", reorderMode);

      // Show/hide reorder message
      reorderMessage.classList.toggle("active", reorderMode);
      reorderBtn.classList.toggle("active", reorderMode);
      setTabsDraggable(reorderMode);
    });
  }
  

  function setTabsDraggable(on) {
    tabsContainer.querySelectorAll(".tab-btn").forEach(tab => {
      tab.draggable    = on;
      tab.style.cursor = on ? "move" : "pointer";
  
      if (on) {
        tab.addEventListener("dragstart", handleDragStart);
        tab.addEventListener("dragenter", handleDragEnter);
        tab.addEventListener("dragover",  handleDragOver);
        tab.addEventListener("dragleave", handleDragLeave);
        tab.addEventListener("drop",      handleDrop);
        tab.addEventListener("dragend",   handleDragEnd);
      } else {
        tab.removeEventListener("dragstart", handleDragStart);
        tab.removeEventListener("dragenter", handleDragEnter);
        tab.removeEventListener("dragover",  handleDragOver);
        tab.removeEventListener("dragleave", handleDragLeave);
        tab.removeEventListener("drop",      handleDrop);
        tab.removeEventListener("dragend",   handleDragEnd);
      }
    });
  }
  function handleDragStart(e) {
    draggedTab = e.target;
    e.target.classList.add("dragging");
    e.dataTransfer.effectAllowed = "move";
  }
  function handleDragEnd(e) {
    e.target.classList.remove("dragging");
    draggedTab = null;
  }
  function handleDragOver(e) {
    e.preventDefault();
  }
  function handleDragEnter(e) {
    e.preventDefault();
    const tgt = e.target.closest(".tab-btn");
    if (tgt && tgt !== draggedTab) tgt.classList.add("drag-over");
  }
  
  function handleDragLeave(e) {
    const tgt = e.target.closest(".tab-btn");
    if (tgt) tgt.classList.remove("drag-over");
  }
  function handleDrop(e) {
    e.preventDefault();
    const to = e.target.closest(".tab-btn");
    if (!draggedTab || !to || draggedTab === to) return;

    // reposition tab in DOM
    const tabs    = Array.from(tabsContainer.children);
    const fromIdx = tabs.indexOf(draggedTab);
    const toIdx   = tabs.indexOf(to);
    if (fromIdx < toIdx) to.after(draggedTab);
    else                 to.before(draggedTab);

    // re-render in new order
    const newOrder = Array.from(tabsContainer.querySelectorAll(".tab-btn"))
      .map(b => b.textContent.trim());
    renderTabs(newOrder);
    renderSections(newOrder, allItems);

    // if still in edit mode, re-enable dragging
    if (reorderMode) {
      setTabsDraggable(true);
      reorderBtn.classList.add("active");

    }

    // persist
    fetch(`/api/menu/save-category-order/${stakeholderId}`, {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ orderedCategories: newOrder })
    }).catch(console.error);
  }


// grab the scroll container and arrow buttons
const scrollContainer = document.querySelector('.scrollable-tabs');
const btnLeft  = document.getElementById('scrollLeft');
const btnRight = document.getElementById('scrollRight');

if (scrollContainer && btnLeft && btnRight) {
  const scrollAmt = 200; // pixels per click

  btnLeft.addEventListener('click', () => {
    scrollContainer.scrollBy({ left: -scrollAmt, behavior: 'smooth' });
  });

  btnRight.addEventListener('click', () => {
    scrollContainer.scrollBy({ left: scrollAmt, behavior: 'smooth' });
  });
}


// Live search results (decoupled from updateSection)
const resultsContainer = document.getElementById("searchResults");

searchInput.addEventListener("input", () => {
  const kw = searchInput.value.trim().toLowerCase();
  if (!kw) {
    resultsContainer.style.display = "none";
    return;
  }

  // find matches by name or description
  const matches = allItems.filter(item =>
    item.item_name.toLowerCase().includes(kw) ||
    item.description.toLowerCase().includes(kw)
  );

  if (!matches.length) {
    resultsContainer.innerHTML = `
      <div class="search-result-item">No results for “${kw}”</div>`;
  } else {
    resultsContainer.innerHTML = matches.map(item => `
      <div class="search-result-item" data-id="${item.menu_id}">
        <span>${item.item_name}</span>
        <span class="category-label">${item.cuisine_name}</span>
      </div>
    `).join("");
  }

  resultsContainer.style.display = "block";

  // attach click handlers
  resultsContainer.querySelectorAll(".search-result-item[data-id]")
  .forEach(el => {
    el.addEventListener("click", () => {
      const id = el.dataset.id;
      // find that card
      const card = document.querySelector(`.menu-card .icon-btn[data-id="${id}"]`)
                             .closest(".menu-card");
      if (card) {
        // scroll section into view
        card.closest("section")
            .scrollIntoView({ behavior: "smooth", block: "start" });
        // then scroll the card itself into center
        card.scrollIntoView({ behavior: "smooth", block: "center" });

        // flash highlight
        card.classList.add("flash-highlight");
  setTimeout(() => card.classList.remove("flash-highlight"), 5000);  // match the 5s animation
      }

      // clear search
      searchInput.value = "";
      resultsContainer.style.display = "none";
    });
  });

});




});


