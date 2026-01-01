// ========== GLOBAL STATE ==========
let allOrders = [];
let currentOrderType = 'delivery'; // 'delivery' or 'pickup'
let currentFilters = {
    status: 'all',
    date: 'all', // ✅ Changed from 'today' to 'all'
    search: ''
};

// ========== DOM ELEMENTS ==========
const ordersContainer = document.getElementById('orders-container');
const emptyState = document.getElementById('empty-state');
const searchInput = document.getElementById('search-input');
const statusFilter = document.getElementById('status-filter');
const dateFilter = document.getElementById('date-filter');
const refreshBtn = document.getElementById('refresh-btn');
const approveAllBtn = document.getElementById('approve-all-btn');
const declineAllBtn = document.getElementById('decline-all-btn');
const orderModal = document.getElementById('order-modal');
const closeModalBtn = document.getElementById('close-modal');
const modalBody = document.getElementById('modal-body');

// Stat counters
const pendingCount = document.getElementById('pending-count');
const preparingCount = document.getElementById('preparing-count');
const completedCount = document.getElementById('completed-count');
const deliveryBadge = document.getElementById('delivery-badge');
const pickupBadge = document.getElementById('pickup-badge');

// ========== INITIALIZATION ==========
document.addEventListener('DOMContentLoaded', async () => {
    const stakeholderId = localStorage.getItem('stakeholder_id');

    if (!stakeholderId) {
        showError('Please log in to view orders');
        return;
    }

    // Setup event listeners
    setupEventListeners();

    // Initial fetch
    await fetchOrders();

    // Auto-refresh every 30 seconds
    setInterval(fetchOrders, 30000);
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

    // Search
    searchInput.addEventListener('input', debounce((e) => {
        currentFilters.search = e.target.value.toLowerCase();
        renderOrders();
    }, 300));

    // Filters
    statusFilter.addEventListener('change', (e) => {
        currentFilters.status = e.target.value;
        renderOrders();
    });

    dateFilter.addEventListener('change', (e) => {
        currentFilters.date = e.target.value;
        fetchOrders();
    });

    // Refresh
    refreshBtn.addEventListener('click', () => {
        refreshBtn.querySelector('i').classList.add('fa-spin');
        fetchOrders().finally(() => {
            setTimeout(() => {
                refreshBtn.querySelector('i').classList.remove('fa-spin');
            }, 500);
        });
    });

    // 🔥 DEBUG BUTTON - Check what's actually in the database
    const debugBtn = document.getElementById('debug-btn');
    if (debugBtn) {
        debugBtn.addEventListener('click', async () => {
            const stakeholderId = localStorage.getItem('stakeholder_id');
            
            debugBtn.disabled = true;
            debugBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Checking...';
            
            try {
                const response = await fetch(`/api/orders/debug/all?stakeholder_id=${stakeholderId}`);
                const data = await response.json();
                
                console.log('🔥 DEBUG: Database Orders', data);
                
                if (data.success) {
                    alert(`✅ DATABASE CHECK:\n\n` +
                          `Total Orders Found: ${data.orders.length}\n` +
                          `Order Types: ${data.debug_info.order_types.join(', ') || 'None'}\n` +
                          `Order Statuses: ${data.debug_info.order_statuses.join(', ') || 'None'}\n\n` +
                          `Current Filter: ${currentFilters.date}\n` +
                          `Current Type: ${currentOrderType}\n\n` +
                          `Check the browser console (F12) for full details.`);
                } else {
                    alert('❌ Debug check failed: ' + data.message);
                }
            } catch (error) {
                console.error('Debug error:', error);
                alert('❌ Debug check failed. Check console for details.');
            } finally {
                debugBtn.disabled = false;
                debugBtn.innerHTML = '<i class="fas fa-bug"></i> Debug DB';
            }
        });
    }

    // Bulk actions
    approveAllBtn.addEventListener('click', handleApproveAll);
    declineAllBtn.addEventListener('click', handleDeclineAll);

    // Modal
    closeModalBtn.addEventListener('click', closeModal);
    orderModal.addEventListener('click', (e) => {
        if (e.target === orderModal) closeModal();
    });
}

// ========== FETCH ORDERS ==========
async function fetchOrders() {
    const stakeholderId = localStorage.getItem('stakeholder_id');
    
    try {
        showLoading();
        
        const endpoint = currentOrderType === 'delivery' 
            ? `/api/orders?stakeholder_id=${stakeholderId}&date=${currentFilters.date}`
            : `/api/orders/pickups?stakeholder_id=${stakeholderId}&date=${currentFilters.date}`;

        const response = await fetch(endpoint);
        const data = await response.json();

        console.log('📦 Fetch Response:', { 
            type: currentOrderType, 
            success: data.success, 
            data 
        });

        if (data.success) {
            // ✅ FIX: Handle both delivery and pickup orders properly
            if (currentOrderType === 'delivery') {
                allOrders = Array.isArray(data.orders) ? data.orders : [];
            } else {
                allOrders = Array.isArray(data.pickups) ? data.pickups : [];
            }
            
            console.log('✅ Orders loaded:', allOrders.length);
            renderOrders();
            updateStats();
        } else {
            // ✅ FIX: Set to empty array on failure
            allOrders = [];
            showError(data.message || 'Failed to load orders');
        }
    } catch (error) {
        console.error('Error fetching orders:', error);
        // ✅ FIX: Set to empty array on error
        allOrders = [];
        showError('Network error. Please try again.');
    }
}

// ========== RENDER ORDERS ==========
function renderOrders() {
    const filteredOrders = filterOrders(allOrders);
    
    ordersContainer.innerHTML = '';
    
    if (filteredOrders.length === 0) {
        ordersContainer.style.display = 'none';
        emptyState.style.display = 'block';
        return;
    }

    ordersContainer.style.display = 'grid';
    emptyState.style.display = 'none';

    filteredOrders.forEach(order => {
        const orderCard = createOrderCard(order);
        ordersContainer.appendChild(orderCard);
    });
}

// ========== CREATE ORDER CARD ==========
function createOrderCard(order) {
    const card = document.createElement('div');
    card.className = 'order-card';
    
    const orderId = order.id || order.order_id || order.pickup_id;
    const status = order.order_status || order.status;
    const createdAt = new Date(order.created_at || order.pickup_date);
    const items = order.items || [];
    
    card.innerHTML = `
        <div class="order-card-header">
            <div class="order-id">
                <i class="fas fa-receipt"></i>
                <span>#${orderId}</span>
            </div>
            <span class="order-badge ${status}">${formatStatus(status)}</span>
        </div>

        <div class="order-card-body">
            <div class="order-meta">
                <div class="meta-item">
                    <i class="fas fa-clock"></i>
                    <span>${formatDateTime(createdAt)}</span>
                </div>
                ${order.consumer_name ? `
                    <div class="meta-item">
                        <i class="fas fa-user"></i>
                        <span>${order.consumer_name}</span>
                    </div>
                ` : ''}
                ${order.consumer_phone ? `
                    <div class="meta-item">
                        <i class="fas fa-phone"></i>
                        <span>${order.consumer_phone}</span>
                    </div>
                ` : ''}
                ${order.delivery_address ? `
                    <div class="meta-item address">
                        <i class="fas fa-map-marker-alt"></i>
                        <span>${truncate(order.delivery_address, 45)}</span>
                    </div>
                ` : ''}
                ${order.payment_method ? `
                    <div class="meta-item">
                        <i class="fas fa-credit-card"></i>
                        <span>${order.payment_method.toUpperCase()}</span>
                    </div>
                ` : ''}
            </div>

            ${items.length > 0 ? `
                <div class="order-items">
                    <div class="items-header">
                        <i class="fas fa-shopping-cart"></i>
                        <span>Items (${items.length})</span>
                    </div>
                    <div class="items-list">
                        ${items.slice(0, 3).map(item => `
                            <div class="item-row">
                                <span class="item-name">${item.quantity}× ${item.item_name}</span>
                                <span class="item-price">৳${item.item_price}</span>
                            </div>
                        `).join('')}
                        ${items.length > 3 ? `
                            <div class="item-row more-items">
                                <span>+${items.length - 3} more item${items.length - 3 > 1 ? 's' : ''}</span>
                            </div>
                        ` : ''}
                    </div>
                </div>
            ` : ''}
        </div>

        <div class="order-footer">
            <div class="order-total">
                <span class="total-label">Total Amount</span>
                <span class="total-amount">৳${order.total_amount}</span>
            </div>
            
            <div class="order-actions">
                ${status === 'pending' ? `
                    <button class="action-btn btn-accept" onclick="handleOrderAction(${orderId}, 'accept')">
                        <i class="fas fa-check"></i>
                        <span>Accept</span>
                    </button>
                    <button class="action-btn btn-reject" onclick="handleOrderAction(${orderId}, 'reject')">
                        <i class="fas fa-times"></i>
                        <span>Reject</span>
                    </button>
                ` : status === 'confirmed' ? `
                    <button class="action-btn btn-update" onclick="handleOrderAction(${orderId}, 'preparing')">
                        <i class="fas fa-fire"></i>
                        <span>Start Preparing</span>
                    </button>
                ` : status === 'preparing' ? `
                    <button class="action-btn btn-update" onclick="handleOrderAction(${orderId}, 'ready')">
                        <i class="fas fa-check-circle"></i>
                        <span>Mark Ready</span>
                    </button>
                ` : ''}
                <button class="action-btn btn-view" onclick="showOrderDetails(${orderId})">
                    <i class="fas fa-eye"></i>
                    <span>View Details</span>
                </button>
            </div>
        </div>
    `;

    return card;
}

// ========== ORDER ACTIONS ==========
async function handleOrderAction(orderId, action) {
    const stakeholderId = localStorage.getItem('stakeholder_id');
    
    let newStatus;
    switch(action) {
        case 'accept':
            newStatus = 'confirmed';
            break;
        case 'reject':
            newStatus = 'cancelled';
            break;
        case 'preparing':
            newStatus = 'preparing';
            break;
        case 'ready':
            newStatus = 'ready';
            break;
        default:
            return;
    }

    try {
        const endpoint = currentOrderType === 'delivery'
            ? `/api/orders/status/${orderId}`
            : `/api/orders/pickup/status/${orderId}`;

        const response = await fetch(endpoint, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                stakeholder_id: stakeholderId,
                order_status: newStatus  // ✅ FIXED: Changed from 'status' to 'order_status'
            })
        });

        const data = await response.json();

        if (data.success) {
            showNotification(`Order ${action}ed successfully!`, 'success');
            await fetchOrders();
        } else {
            showNotification(data.message || 'Action failed', 'error');
        }
    } catch (error) {
        console.error('Order action error:', error);
        showNotification('Network error. Please try again.', 'error');
    }
}

// Make function global
window.handleOrderAction = handleOrderAction;

// ========== BULK ACTIONS ==========
async function handleApproveAll() {
    const pendingOrders = allOrders.filter(o => (o.order_status || o.status) === 'pending');
    
    if (pendingOrders.length === 0) {
        showNotification('No pending orders to approve', 'info');
        return;
    }

    if (!confirm(`Are you sure you want to approve ${pendingOrders.length} pending order(s)?`)) {
        return;
    }

    approveAllBtn.disabled = true;
    approveAllBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processing...';

    try {
        const promises = pendingOrders.map(order => 
            handleOrderAction(order.id || order.order_id || order.pickup_id, 'accept')
        );
        
        await Promise.all(promises);
        showNotification(`${pendingOrders.length} orders approved!`, 'success');
    } catch (error) {
        showNotification('Some orders failed to approve', 'error');
    } finally {
        approveAllBtn.disabled = false;
        approveAllBtn.innerHTML = '<i class="fas fa-check-double"></i> Auto Approve All';
    }
}

async function handleDeclineAll() {
    const pendingOrders = allOrders.filter(o => (o.order_status || o.status) === 'pending');
    
    if (pendingOrders.length === 0) {
        showNotification('No pending orders to decline', 'info');
        return;
    }

    if (!confirm(`⚠️ Are you sure you want to decline ${pendingOrders.length} pending order(s)? This action cannot be undone!`)) {
        return;
    }

    declineAllBtn.disabled = true;
    declineAllBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processing...';

    try {
        const promises = pendingOrders.map(order => 
            handleOrderAction(order.id || order.order_id || order.pickup_id, 'reject')
        );
        
        await Promise.all(promises);
        showNotification(`${pendingOrders.length} orders declined`, 'success');
    } catch (error) {
        showNotification('Some orders failed to decline', 'error');
    } finally {
        declineAllBtn.disabled = false;
        declineAllBtn.innerHTML = '<i class="fas fa-times-circle"></i> Auto Decline All';
    }
}

// ========== ORDER DETAILS MODAL ==========
async function showOrderDetails(orderId) {
    const order = allOrders.find(o => (o.id || o.order_id || o.pickup_id) == orderId);
    
    if (!order) return;

    const status = order.order_status || order.status;
    const createdAt = new Date(order.created_at || order.pickup_date);
    const items = order.items || [];

    modalBody.innerHTML = `
        <div style="padding: 10px 0;">
            <div class="order-detail-section">
                <h3 style="color: var(--primary-color); margin-bottom: 15px; display: flex; align-items: center; gap: 10px;">
                    <i class="fas fa-info-circle"></i> Order Information
                </h3>
                <div style="display: grid; gap: 12px;">
                    <div class="detail-row">
                        <strong>Order ID:</strong> <span>#${orderId}</span>
                    </div>
                    <div class="detail-row">
                        <strong>Status:</strong> <span class="order-badge ${status}">${formatStatus(status)}</span>
                    </div>
                    <div class="detail-row">
                        <strong>Order Type:</strong> <span>${currentOrderType === 'delivery' ? '🏍️ Delivery' : '🛍️ Pickup'}</span>
                    </div>
                    <div class="detail-row">
                        <strong>Date & Time:</strong> <span>${formatDateTime(createdAt)}</span>
                    </div>
                    ${order.payment_method ? `
                        <div class="detail-row">
                            <strong>Payment Method:</strong> <span>${order.payment_method.toUpperCase()}</span>
                        </div>
                    ` : ''}
                    ${order.payment_status ? `
                        <div class="detail-row">
                            <strong>Payment Status:</strong> <span>${order.payment_status.toUpperCase()}</span>
                        </div>
                    ` : ''}
                </div>
            </div>

            ${order.consumer_name ? `
                <div class="order-detail-section" style="margin-top: 25px;">
                    <h3 style="color: var(--primary-color); margin-bottom: 15px; display: flex; align-items: center; gap: 10px;">
                        <i class="fas fa-user"></i> Customer Information
                    </h3>
                    <div style="display: grid; gap: 12px;">
                        <div class="detail-row">
                            <strong>Name:</strong> <span>${order.consumer_name}</span>
                        </div>
                        ${order.consumer_phone ? `
                            <div class="detail-row">
                                <strong>Phone:</strong> <span>${order.consumer_phone}</span>
                            </div>
                        ` : ''}
                        ${order.delivery_address ? `
                            <div class="detail-row">
                                <strong>Delivery Address:</strong> <span>${order.delivery_address}</span>
                            </div>
                        ` : ''}
                    </div>
                </div>
            ` : ''}

            ${items.length > 0 ? `
                <div class="order-detail-section" style="margin-top: 25px;">
                    <h3 style="color: var(--primary-color); margin-bottom: 15px; display: flex; align-items: center; gap: 10px;">
                        <i class="fas fa-shopping-cart"></i> Order Items
                    </h3>
                    <div style="background: var(--light-bg); padding: 15px; border-radius: 8px;">
                        ${items.map(item => `
                            <div style="display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #ddd;">
                                <div>
                                    <div style="font-weight: 600;">${item.item_name}</div>
                                    <div style="color: var(--text-muted); font-size: 0.9rem;">Quantity: ${item.quantity}</div>
                                </div>
                                <div style="text-align: right;">
                                    <div style="font-weight: 600; color: var(--success-color);">৳${item.subtotal}</div>
                                    <div style="color: var(--text-muted); font-size: 0.9rem;">@৳${item.item_price}</div>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>
            ` : ''}

            <div class="order-detail-section" style="margin-top: 25px;">
                <h3 style="color: var(--primary-color); margin-bottom: 15px; display: flex; align-items: center; gap: 10px;">
                    <i class="fas fa-calculator"></i> Order Summary
                </h3>
                <div style="background: var(--light-bg); padding: 15px; border-radius: 8px;">
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
                    <div style="display: flex; justify-content: space-between; padding: 15px 0; margin-top: 10px; border-top: 2px solid var(--border-color); font-size: 1.2rem; font-weight: 700;">
                        <span>Total Amount:</span>
                        <span style="color: var(--success-color);">৳${order.total_amount}</span>
                    </div>
                </div>
            </div>

            ${order.notes ? `
                <div class="order-detail-section" style="margin-top: 25px;">
                    <h3 style="color: var(--primary-color); margin-bottom: 15px; display: flex; align-items: center; gap: 10px;">
                        <i class="fas fa-sticky-note"></i> Special Notes
                    </h3>
                    <div style="background: #fff3cd; padding: 15px; border-radius: 8px; border-left: 4px solid var(--warning-color);">
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
    // ✅ FIX: Add safety check for undefined/null orders
    if (!orders || !Array.isArray(orders)) {
        console.warn('⚠️ filterOrders received invalid data:', orders);
        return [];
    }
    
    return orders.filter(order => {
        const status = order.order_status || order.status;
        const orderId = String(order.id || order.order_id || order.pickup_id);
        const customerName = (order.consumer_name || '').toLowerCase();
        
        // Status filter
        if (currentFilters.status !== 'all' && status !== currentFilters.status) {
            return false;
        }

        // Search filter
        if (currentFilters.search) {
            const searchMatch = orderId.includes(currentFilters.search) ||
                              customerName.includes(currentFilters.search);
            if (!searchMatch) return false;
        }

        return true;
    });
}

// ========== UPDATE STATS ==========
function updateStats() {
    // ✅ FIX: Add safety check for allOrders
    if (!allOrders || !Array.isArray(allOrders)) {
        allOrders = [];
    }
    
    const pending = allOrders.filter(o => (o.order_status || o.status) === 'pending').length;
    const preparing = allOrders.filter(o => (o.order_status || o.status) === 'preparing').length;
    const today = allOrders.filter(o => {
        const orderDate = new Date(o.created_at || o.pickup_date);
        return isToday(orderDate) && (o.order_status || o.status) === 'completed';
    }).length;

    pendingCount.textContent = pending;
    preparingCount.textContent = preparing;
    completedCount.textContent = today;

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

function isToday(date) {
    const today = new Date();
    return date.getDate() === today.getDate() &&
           date.getMonth() === today.getMonth() &&
           date.getFullYear() === today.getFullYear();
}

function truncate(str, length) {
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
    ordersContainer.innerHTML = `
        <div class="loading-state">
            <i class="fas fa-spinner fa-spin"></i>
            <p>Loading orders...</p>
        </div>
    `;
    emptyState.style.display = 'none';
}

function showError(message) {
    ordersContainer.innerHTML = `
        <div class="empty-state">
            <i class="fas fa-exclamation-triangle"></i>
            <h3>Error</h3>
            <p>${message}</p>
        </div>
    `;
}

function showNotification(message, type = 'info') {
    // Create notification element
    const notification = document.createElement('div');
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 15px 25px;
        background: ${type === 'success' ? 'var(--success-color)' : type === 'error' ? 'var(--danger-color)' : 'var(--info-color)'};
        color: white;
        border-radius: 8px;
        box-shadow: var(--shadow-lg);
        z-index: 10000;
        animation: slideInRight 0.3s ease;
        font-weight: 600;
        display: flex;
        align-items: center;
        gap: 10px;
    `;
    
    const icon = type === 'success' ? 'fa-check-circle' : type === 'error' ? 'fa-exclamation-circle' : 'fa-info-circle';
    notification.innerHTML = `<i class="fas ${icon}"></i> ${message}`;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.style.animation = 'slideOutRight 0.3s ease';
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

// Add CSS animations
const style = document.createElement('style');
style.textContent = `
    @keyframes slideInRight {
        from {
            transform: translateX(400px);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
    
    @keyframes slideOutRight {
        from {
            transform: translateX(0);
            opacity: 1;
        }
        to {
            transform: translateX(400px);
            opacity: 0;
        }
    }
    
    .detail-row {
        display: flex;
        justify-content: space-between;
        padding: 8px 0;
        border-bottom: 1px solid var(--border-color);
    }
    
    .detail-row:last-child {
        border-bottom: none;
    }
    
    .order-detail-section {
        animation: fadeIn 0.3s ease;
    }
    
    @keyframes fadeIn {
        from { opacity: 0; transform: translateY(10px); }
        to { opacity: 1; transform: translateY(0); }
    }
`;
document.head.appendChild(style);
