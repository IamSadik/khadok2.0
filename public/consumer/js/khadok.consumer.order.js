// ========== CONSUMER ORDERS PAGE - FULL BACKEND INTEGRATION ==========

// Global State
let allOrders = [];
let currentOrderType = 'delivery'; // 'delivery' or 'pickup'
let currentFilters = {
    status: 'all',
    search: ''
};

// DOM Elements
const ordersGrid = document.getElementById('orders-grid');
const emptyState = document.getElementById('empty-state');
const statusFilter = document.getElementById('status-filter');
const searchInput = document.getElementById('search-orders');
const refreshBtn = document.getElementById('refresh-orders');
const orderModal = document.getElementById('order-modal');
const closeModalBtn = document.getElementById('close-modal');
const modalBody = document.getElementById('modal-body');

// Stat counters
const pendingCount = document.getElementById('pending-count');
const activeCount = document.getElementById('active-count');
const completedCount = document.getElementById('completed-count');
const totalCount = document.getElementById('total-count');
const deliveryBadge = document.getElementById('delivery-badge');
const pickupBadge = document.getElementById('pickup-badge');

// ========== INITIALIZATION ==========
document.addEventListener('DOMContentLoaded', async () => {
    const consumerId = localStorage.getItem('consumer_id');

    if (!consumerId) {
        showError('Please log in to view your orders');
        return;
    }

    // Setup event listeners
    setupEventListeners();

    // Initial fetch
    await fetchOrders();
});

// ========== EVENT LISTENERS ==========
function setupEventListeners() {
    // Tab switching
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentOrderType = btn.dataset.type;
            fetchOrders();
        });
    });

    // Status filter
    statusFilter.addEventListener('change', () => {
        currentFilters.status = statusFilter.value;
        renderOrders();
    });

    // Search
    searchInput.addEventListener('input', debounce(() => {
        currentFilters.search = searchInput.value.toLowerCase();
        renderOrders();
    }, 300));

    // Refresh
    refreshBtn.addEventListener('click', () => {
        refreshBtn.querySelector('i').classList.add('bx-spin');
        fetchOrders().finally(() => {
            setTimeout(() => {
                refreshBtn.querySelector('i').classList.remove('bx-spin');
            }, 500);
        });
    });

    // Modal close
    closeModalBtn.addEventListener('click', closeModal);
    orderModal.addEventListener('click', (e) => {
        if (e.target === orderModal) closeModal();
    });
}

// ========== FETCH ORDERS ==========
async function fetchOrders() {
    const consumerId = localStorage.getItem('consumer_id');

    try {
        showLoading();

        const endpoint = currentOrderType === 'delivery'
            ? `/api/orders/consumer?consumer_id=${consumerId}`
            : `/api/orders/pickup?consumer_id=${consumerId}`;

        const response = await fetch(endpoint);
        const data = await response.json();

        console.log('📦 Orders Response:', data);

        if (data.success) {
            allOrders = Array.isArray(data.orders) ? data.orders : [];
            console.log('✅ Orders loaded:', allOrders.length);
            renderOrders();
            updateStats();
        } else {
            allOrders = [];
            showEmptyState();
        }
    } catch (error) {
        console.error('Error fetching orders:', error);
        allOrders = [];
        showError('Failed to load orders. Please try again.');
    }
}

// ========== RENDER ORDERS ==========
function renderOrders() {
    const filteredOrders = filterOrders(allOrders);

    ordersGrid.innerHTML = '';

    if (filteredOrders.length === 0) {
        showEmptyState();
        return;
    }

    ordersGrid.style.display = 'grid';
    emptyState.style.display = 'none';

    filteredOrders.forEach(order => {
        const orderCard = createOrderCard(order);
        ordersGrid.appendChild(orderCard);
    });
}

// ========== CREATE ORDER CARD ==========
function createOrderCard(order) {
    const card = document.createElement('div');
    card.className = 'order-card';

    const orderId = order.order_id || order.pickup_id || order.id;
    const status = order.order_status || order.status || 'pending';
    const createdAt = new Date(order.order_date || order.pickup_date || order.created_at);
    const items = order.items || [];
    const restaurantName = order.restaurant_name || 'Restaurant';

    // Get first 3 items for preview
    const itemsPreview = items.slice(0, 3).map(item => item.item_name || item.name).join(', ');
    const moreItems = items.length > 3 ? ` +${items.length - 3} more` : '';

    card.innerHTML = `
        <div class="order-card-header">
            <div class="order-id">
                <i class='bx bx-receipt'></i>
                <span>#${orderId}</span>
            </div>
            <span class="status-badge ${status}">${formatStatus(status)}</span>
        </div>

        <div class="order-card-body">
            <div class="restaurant-info">
                <div class="restaurant-icon">
                    <i class='bx bx-restaurant'></i>
                </div>
                <div class="restaurant-details">
                    <h4>${restaurantName}</h4>
                    <p>${formatDateTime(createdAt)}</p>
                </div>
            </div>

            <div class="order-meta">
                ${order.delivery_address ? `
                    <div class="meta-item">
                        <i class='bx bx-map'></i>
                        <span>${truncate(order.delivery_address, 40)}</span>
                    </div>
                ` : ''}
                <div class="meta-item">
                    <i class='bx bx-time'></i>
                    <span>${currentOrderType === 'delivery' ? 'Delivery' : 'Pickup'} Order</span>
                </div>
                ${order.payment_method ? `
                    <div class="meta-item">
                        <i class='bx bx-credit-card'></i>
                        <span>${order.payment_method.toUpperCase()}</span>
                    </div>
                ` : ''}
            </div>

            ${items.length > 0 ? `
                <div class="order-items-preview">
                    <div class="items-preview-header">
                        <i class='bx bx-cart'></i>
                        ${items.length} item${items.length > 1 ? 's' : ''}
                    </div>
                    <div class="items-list">${itemsPreview}${moreItems}</div>
                </div>
            ` : ''}
        </div>

        <div class="order-card-footer">
            <div class="order-total">
                Total:
                <span class="total-amount">৳${order.total_amount || 0}</span>
            </div>
            <button class="view-details-btn" onclick="showOrderDetails(${orderId})">
                <i class='bx bx-show'></i> View Details
            </button>
        </div>
    `;

    return card;
}

// ========== SHOW ORDER DETAILS MODAL ==========
async function showOrderDetails(orderId) {
    const order = allOrders.find(o => 
        (o.order_id || o.pickup_id || o.id) == orderId
    );

    if (!order) return;

    const status = order.order_status || order.status || 'pending';
    const createdAt = new Date(order.order_date || order.pickup_date || order.created_at);
    const items = order.items || [];

    modalBody.innerHTML = `
        <div style="padding: 10px 0;">
            <!-- Order Info -->
            <div class="detail-section">
                <h4 style="color: var(--primary-color); margin-bottom: 15px; display: flex; align-items: center; gap: 10px;">
                    <i class='bx bx-info-circle'></i> Order Information
                </h4>
                <div class="detail-grid">
                    <div class="detail-row">
                        <strong>Order ID:</strong>
                        <span>#${orderId}</span>
                    </div>
                    <div class="detail-row">
                        <strong>Status:</strong>
                        <span class="status-badge ${status}">${formatStatus(status)}</span>
                    </div>
                    <div class="detail-row">
                        <strong>Order Type:</strong>
                        <span>${currentOrderType === 'delivery' ? '🏍️ Delivery' : '🛍️ Pickup'}</span>
                    </div>
                    <div class="detail-row">
                        <strong>Date & Time:</strong>
                        <span>${createdAt.toLocaleString()}</span>
                    </div>
                    ${order.payment_method ? `
                        <div class="detail-row">
                            <strong>Payment Method:</strong>
                            <span>${order.payment_method.toUpperCase()}</span>
                        </div>
                    ` : ''}
                </div>
            </div>

            <!-- Restaurant Info -->
            ${order.restaurant_name ? `
                <div class="detail-section" style="margin-top: 25px;">
                    <h4 style="color: var(--primary-color); margin-bottom: 15px; display: flex; align-items: center; gap: 10px;">
                        <i class='bx bx-restaurant'></i> Restaurant
                    </h4>
                    <div class="detail-grid">
                        <div class="detail-row">
                            <strong>Name:</strong>
                            <span>${order.restaurant_name}</span>
                        </div>
                        ${order.delivery_address ? `
                            <div class="detail-row">
                                <strong>Delivery Address:</strong>
                                <span>${order.delivery_address}</span>
                            </div>
                        ` : ''}
                    </div>
                </div>
            ` : ''}

            <!-- Order Items -->
            ${items.length > 0 ? `
                <div class="detail-section" style="margin-top: 25px;">
                    <h4 style="color: var(--primary-color); margin-bottom: 15px; display: flex; align-items: center; gap: 10px;">
                        <i class='bx bx-cart'></i> Order Items
                    </h4>
                    <div style="background: var(--bg-light); padding: 15px; border-radius: 12px;">
                        ${items.map(item => `
                            <div style="display: flex; justify-content: space-between; padding: 12px 0; border-bottom: 1px solid var(--border-color);">
                                <div>
                                    <div style="font-weight: 600; color: var(--text-dark);">${item.item_name || item.name}</div>
                                    <div style="color: var(--text-muted); font-size: 0.9rem;">Quantity: ${item.quantity}</div>
                                </div>
                                <div style="text-align: right;">
                                    <div style="font-weight: 700; color: var(--success-color);">৳${item.subtotal || (item.quantity * item.item_price)}</div>
                                    <div style="color: var(--text-muted); font-size: 0.9rem;">@৳${item.item_price || item.price}</div>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>
            ` : ''}

            <!-- Order Summary -->
            <div class="detail-section" style="margin-top: 25px;">
                <h4 style="color: var(--primary-color); margin-bottom: 15px; display: flex; align-items: center; gap: 10px;">
                    <i class='bx bx-calculator'></i> Order Summary
                </h4>
                <div style="background: var(--bg-light); padding: 20px; border-radius: 12px;">
                    ${order.subtotal ? `
                        <div style="display: flex; justify-content: space-between; padding: 8px 0;">
                            <span>Subtotal:</span>
                            <span>৳${order.subtotal}</span>
                        </div>
                    ` : ''}
                    ${order.delivery_fee ? `
                        <div style="display: flex; justify-content: space-between; padding: 8px 0;">
                            <span>Delivery Fee:</span>
                            <span>৳${order.delivery_fee}</span>
                        </div>
                    ` : ''}
                    ${order.service_fee ? `
                        <div style="display: flex; justify-content: space-between; padding: 8px 0;">
                            <span>Service Fee:</span>
                            <span>৳${order.service_fee}</span>
                        </div>
                    ` : ''}
                    <div style="display: flex; justify-content: space-between; padding: 15px 0; margin-top: 10px; border-top: 2px solid var(--border-color); font-size: 1.3rem; font-weight: 700;">
                        <span>Total Amount:</span>
                        <span style="color: var(--success-color);">৳${order.total_amount || 0}</span>
                    </div>
                </div>
            </div>

            ${order.notes ? `
                <div class="detail-section" style="margin-top: 25px;">
                    <h4 style="color: var(--primary-color); margin-bottom: 15px; display: flex; align-items: center; gap: 10px;">
                        <i class='bx bx-message-detail'></i> Special Notes
                    </h4>
                    <div style="background: #fef3c7; padding: 15px; border-radius: 12px; border-left: 4px solid var(--warning-color);">
                        ${order.notes}
                    </div>
                </div>
            ` : ''}
        </div>
    `;

    orderModal.classList.add('active');
}

// Make function global
window.showOrderDetails = showOrderDetails;

function closeModal() {
    orderModal.classList.remove('active');
}

// ========== FILTER ORDERS ==========
function filterOrders(orders) {
    if (!orders || !Array.isArray(orders)) {
        return [];
    }

    return orders.filter(order => {
        const status = order.order_status || order.status || 'pending';
        const orderId = String(order.order_id || order.pickup_id || order.id);
        const restaurantName = (order.restaurant_name || '').toLowerCase();

        // Status filter
        if (currentFilters.status !== 'all' && status !== currentFilters.status) {
            return false;
        }

        // Search filter
        if (currentFilters.search) {
            const searchMatch = orderId.includes(currentFilters.search) ||
                restaurantName.includes(currentFilters.search);
            if (!searchMatch) return false;
        }

        return true;
    });
}

// ========== UPDATE STATS ==========
function updateStats() {
    if (!allOrders || !Array.isArray(allOrders)) {
        allOrders = [];
    }

    const pending = allOrders.filter(o => (o.order_status || o.status) === 'pending').length;
    const active = allOrders.filter(o => {
        const status = o.order_status || o.status;
        return ['confirmed', 'preparing', 'ready'].includes(status);
    }).length;
    const completed = allOrders.filter(o => (o.order_status || o.status) === 'completed').length;

    pendingCount.textContent = pending;
    activeCount.textContent = active;
    completedCount.textContent = completed;
    totalCount.textContent = allOrders.length;

    // Update tab badges
    if (currentOrderType === 'delivery') {
        deliveryBadge.textContent = allOrders.length;
    } else {
        pickupBadge.textContent = allOrders.length;
    }
}

// ========== UTILITY FUNCTIONS ==========
function formatStatus(status) {
    const statusMap = {
        'pending': 'Pending',
        'confirmed': 'Confirmed',
        'preparing': 'Preparing',
        'ready': 'Ready',
        'completed': 'Completed',
        'cancelled': 'Cancelled'
    };
    return statusMap[status] || status;
}

function formatDateTime(date) {
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} min${diffMins > 1 ? 's' : ''} ago`;

    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;

    return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

function truncate(str, length) {
    if (!str) return '';
    return str.length > length ? str.substring(0, length) + '...' : str;
}

function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

function showLoading() {
    ordersGrid.innerHTML = `
        <div class="loading-state">
            <i class='bx bx-loader-alt bx-spin'></i>
            <p>Loading your orders...</p>
        </div>
    `;
    ordersGrid.style.display = 'grid';
    emptyState.style.display = 'none';
}

function showEmptyState() {
    ordersGrid.style.display = 'none';
    emptyState.style.display = 'block';
}

function showError(message) {
    ordersGrid.innerHTML = `
        <div class="empty-state">
            <i class='bx bx-error-circle'></i>
            <h3>Error</h3>
            <p>${message}</p>
        </div>
    `;
    ordersGrid.style.display = 'grid';
    emptyState.style.display = 'none';
}

// ========== AUTH CHECK ==========
(function checkAuthOnLoad() {
    const sessionId = localStorage.getItem("sessionId");
    if (!sessionId) {
        window.location.replace("../login.html");
    }
})();

// Add CSS for modal detail sections
const style = document.createElement('style');
style.textContent = `
    .detail-section {
        animation: fadeIn 0.3s ease;
    }

    .detail-grid {
        display: grid;
        gap: 12px;
    }

    .detail-row {
        display: flex;
        justify-content: space-between;
        padding: 10px 0;
        border-bottom: 1px solid var(--border-color);
    }

    .detail-row:last-child {
        border-bottom: none;
    }

    @keyframes fadeIn {
        from {
            opacity: 0;
            transform: translateY(10px);
        }
        to {
            opacity: 1;
            transform: translateY(0);
        }
    }
`;
document.head.appendChild(style);

