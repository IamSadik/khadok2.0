// ==================== KHADOK RIDER DASHBOARD ====================
// Global Variables
let currentRider = null;
let activeOrders = [];
let updateInterval = null;

// ==================== INITIALIZATION ====================
document.addEventListener('DOMContentLoaded', async () => {
    await initRiderDashboard();
    startAutoUpdate();
});

async function initRiderDashboard() {
    try {
        // Get rider ID from session/localStorage
        const riderId = localStorage.getItem('rider_id');
        
        if (!riderId) {
            window.location.href = '/rider_login.html';
            return;
        }

        // Fetch rider profile and stats
        await loadRiderProfile(riderId);
        await loadRiderStats(riderId);
        await loadActiveOrders(riderId);
        
        // Initialize location tracking
        initLocationTracking(riderId);
        
    } catch (error) {
        console.error('Dashboard initialization error:', error);
        showNotification('Failed to load dashboard', 'error');
    }
}

// ==================== LOAD RIDER DATA ====================
async function loadRiderProfile(riderId) {
    try {
        const response = await fetch(`/api/rider/profile/${riderId}`, {
            credentials: 'include'
        });

        const data = await response.json();

        if (data.success) {
            currentRider = data.rider;
            updateProfileDisplay(data.rider);
        } else {
            throw new Error(data.message);
        }
    } catch (error) {
        console.error('Load profile error:', error);
        throw error;
    }
}

async function loadRiderStats(riderId) {
    try {
        const response = await fetch(`/api/rider/stats/${riderId}`, {
            credentials: 'include'
        });

        const data = await response.json();

        if (data.success) {
            updateStatsDisplay(data.stats);
        }
    } catch (error) {
        console.error('Load stats error:', error);
    }
}

async function loadActiveOrders(riderId) {
    try {
        const response = await fetch(`/api/rider/orders/${riderId}?status=all`, {
            credentials: 'include'
        });

        const data = await response.json();

        if (data.success) {
            activeOrders = data.orders || [];
            updateOrdersDisplay(data.orders);
        }
    } catch (error) {
        console.error('Load orders error:', error);
    }
}

// ==================== UPDATE UI ====================
function updateProfileDisplay(rider) {
    const nameEl = document.querySelector('.rider-name');
    const emailEl = document.querySelector('.rider-email');
    const statusEl = document.querySelector('.rider-status');
    const profileImg = document.querySelector('.rider-profile-img');

    if (nameEl) nameEl.textContent = rider.name || 'Rider';
    if (emailEl) emailEl.textContent = rider.email || '';
    if (statusEl) {
        statusEl.textContent = rider.status || 'offline';
        statusEl.className = `rider-status status-${rider.status}`;
    }
    if (profileImg && rider.profile_image) {
        profileImg.src = rider.profile_image;
    }
}

function updateStatsDisplay(stats) {
    // Update dashboard cards
    const totalDeliveriesEl = document.querySelector('.stat-total-deliveries');
    const todayDeliveriesEl = document.querySelector('.stat-today-deliveries');
    const successRateEl = document.querySelector('.stat-success-rate');
    const earningsEl = document.querySelector('.stat-earnings');

    if (totalDeliveriesEl) {
        totalDeliveriesEl.textContent = stats.total_deliveries || 0;
    }
    if (todayDeliveriesEl) {
        todayDeliveriesEl.textContent = stats.today_deliveries || 0;
    }
    if (successRateEl) {
        const rate = stats.total_deliveries > 0 
            ? Math.round((stats.successful_deliveries / stats.total_deliveries) * 100)
            : 0;
        successRateEl.textContent = `${rate}%`;
    }
    if (earningsEl) {
        earningsEl.textContent = `৳${(stats.today_earnings || 0).toFixed(2)}`;
    }
}

function updateOrdersDisplay(orders) {
    const ordersTableBody = document.querySelector('.orders-table tbody');
    
    if (!ordersTableBody) return;

    if (!orders || orders.length === 0) {
        ordersTableBody.innerHTML = '<tr><td colspan="6" style="text-align: center;">No active orders</td></tr>';
        return;
    }

    ordersTableBody.innerHTML = orders.map(order => `
        <tr data-order-id="${order.id}">
            <td>#${order.id}</td>
            <td>${order.restaurant_name || 'N/A'}</td>
            <td>${order.consumer_name || 'Customer'}</td>
            <td>৳${parseFloat(order.total_amount).toFixed(2)}</td>
            <td><span class="status-badge status-${order.delivery_status}">${order.delivery_status || 'pending'}</span></td>
            <td>
                ${getOrderActionButtons(order)}
            </td>
        </tr>
    `).join('');

    // Add event listeners to action buttons
    addOrderActionListeners();
}

function getOrderActionButtons(order) {
    const status = order.delivery_status;

    if (status === 'assigned' || status === 'pending') {
        return `
            <button class="btn-accept" onclick="acceptOrder(${order.id})">Accept</button>
            <button class="btn-reject" onclick="rejectOrder(${order.id})">Reject</button>
        `;
    } else if (status === 'on_the_way' || status === 'accepted') {
        return `
            <button class="btn-pickup" onclick="markPickedUp(${order.id})">Mark Picked Up</button>
            <button class="btn-view" onclick="viewOrderDetails(${order.id})">View</button>
        `;
    } else if (status === 'picked_up') {
        return `
            <button class="btn-complete" onclick="completeDelivery(${order.id})">Complete Delivery</button>
            <button class="btn-view" onclick="viewOrderDetails(${order.id})">View</button>
        `;
    } else {
        return `<button class="btn-view" onclick="viewOrderDetails(${order.id})">View</button>`;
    }
}

// ==================== ORDER ACTIONS ====================
async function acceptOrder(orderId) {
    if (!confirm('Accept this delivery?')) return;

    try {
        const response = await fetch('/api/rider/orders/accept', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({
                order_id: orderId,
                rider_id: currentRider.rider_id
            })
        });

        const data = await response.json();

        if (data.success) {
            showNotification('Order accepted successfully!', 'success');
            await loadActiveOrders(currentRider.rider_id);
            await loadRiderStats(currentRider.rider_id);
        } else {
            throw new Error(data.message);
        }
    } catch (error) {
        console.error('Accept order error:', error);
        showNotification('Failed to accept order: ' + error.message, 'error');
    }
}

async function markPickedUp(orderId) {
    if (!confirm('Mark this order as picked up from restaurant?')) return;

    try {
        const response = await fetch('/api/rider/orders/picked-up', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ order_id: orderId })
        });

        const data = await response.json();

        if (data.success) {
            showNotification('Order marked as picked up!', 'success');
            await loadActiveOrders(currentRider.rider_id);
        } else {
            throw new Error(data.message);
        }
    } catch (error) {
        console.error('Mark picked up error:', error);
        showNotification('Failed to update order: ' + error.message, 'error');
    }
}

async function completeDelivery(orderId) {
    if (!confirm('Mark this delivery as completed?')) return;

    try {
        const deliveryTime = prompt('Enter delivery time in minutes (optional):');
        
        const response = await fetch('/api/rider/orders/complete', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({
                order_id: orderId,
                rider_id: currentRider.rider_id,
                delivery_time: deliveryTime ? parseInt(deliveryTime) : null
            })
        });

        const data = await response.json();

        if (data.success) {
            showNotification('Delivery completed! Great job!', 'success');
            await loadActiveOrders(currentRider.rider_id);
            await loadRiderStats(currentRider.rider_id);
        } else {
            throw new Error(data.message);
        }
    } catch (error) {
        console.error('Complete delivery error:', error);
        showNotification('Failed to complete delivery: ' + error.message, 'error');
    }
}

async function rejectOrder(orderId) {
    const reason = prompt('Please provide a reason for rejection:');
    if (!reason) return;

    try {
        const response = await fetch('/api/rider/orders/cancel', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({
                order_id: orderId,
                rider_id: currentRider.rider_id,
                reason: reason
            })
        });

        const data = await response.json();

        if (data.success) {
            showNotification('Order rejected', 'info');
            await loadActiveOrders(currentRider.rider_id);
        } else {
            throw new Error(data.message);
        }
    } catch (error) {
        console.error('Reject order error:', error);
        showNotification('Failed to reject order: ' + error.message, 'error');
    }
}

function viewOrderDetails(orderId) {
    const order = activeOrders.find(o => o.id === orderId);
    if (!order) return;

    // Create modal or navigate to order details page
    alert(`Order #${orderId}\nRestaurant: ${order.restaurant_name}\nCustomer: ${order.consumer_name}\nAddress: ${order.delivery_address}\nTotal: ৳${order.total_amount}`);
}

// ==================== STATUS MANAGEMENT ====================
async function updateRiderStatus(newStatus) {
    try {
        const response = await fetch('/api/rider/status', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({
                rider_id: currentRider.rider_id,
                status: newStatus
            })
        });

        const data = await response.json();

        if (data.success) {
            currentRider.status = newStatus;
            updateProfileDisplay(currentRider);
            showNotification(`Status updated to ${newStatus}`, 'success');
        } else {
            throw new Error(data.message);
        }
    } catch (error) {
        console.error('Update status error:', error);
        showNotification('Failed to update status', 'error');
    }
}

// ==================== LOCATION TRACKING ====================
function initLocationTracking(riderId) {
    if (!navigator.geolocation) {
        console.warn('Geolocation not supported');
        return;
    }

    // Update location every 30 seconds
    setInterval(() => {
        navigator.geolocation.getCurrentPosition(
            (position) => updateRiderLocation(riderId, position.coords.latitude, position.coords.longitude),
            (error) => console.error('Location error:', error)
        );
    }, 30000);

    // Initial update
    navigator.geolocation.getCurrentPosition(
        (position) => updateRiderLocation(riderId, position.coords.latitude, position.coords.longitude)
    );
}

async function updateRiderLocation(riderId, lat, lng) {
    try {
        await fetch('/api/rider/location', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({
                rider_id: riderId,
                lat: lat,
                lng: lng
            })
        });
    } catch (error) {
        console.error('Update location error:', error);
    }
}

// ==================== AUTO UPDATE ====================
function startAutoUpdate() {
    // Refresh orders every 15 seconds
    updateInterval = setInterval(async () => {
        if (currentRider) {
            await loadActiveOrders(currentRider.rider_id);
        }
    }, 15000);
}

// ==================== UTILITY FUNCTIONS ====================
function showNotification(message, type = 'info') {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.textContent = message;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.classList.add('show');
    }, 100);
    
    setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

function addOrderActionListeners() {
    // Additional event listeners if needed
}

// ==================== LOGOUT ====================
function logoutRider() {
    if (confirm('Are you sure you want to logout?')) {
        localStorage.removeItem('rider_id');
        window.location.href = '/rider_login.html';
    }
}
