// Dashboard.js - Fetch and display real rider data
(function() {
    'use strict';

    // Get rider ID from session/localStorage
    const riderId = sessionStorage.getItem('rider_id') || localStorage.getItem('rider_id');

    if (!riderId) {
        console.warn('No rider ID found in session. Redirecting to login...');
        window.location.href = '../rider_login.html';
        return;
    }

    // Initialize dashboard on page load
    document.addEventListener('DOMContentLoaded', function() {
        loadRiderProfile();
        loadRiderStats();
        loadActiveDeliveries(); // Load active deliveries first
        loadRecentOrders();
        loadRecentCustomers();
        setupSignOut();
        setupStatusToggle();
        
        // Refresh data every 30 seconds
        setInterval(() => {
            loadRiderStats();
            loadActiveDeliveries(); // Refresh active deliveries
            loadRecentOrders();
            loadRiderStatus();
        }, 30000);
    });

    // Load rider profile information
    async function loadRiderProfile() {
        try {
            const response = await fetch(`/api/rider/profile/${riderId}`);
            const data = await response.json();

            if (data.success && data.rider) {
                const rider = data.rider;
                // Update avatar if available
                if (rider.profile_image) {
                    document.getElementById('riderAvatar').src = rider.profile_image;
                }
            }
        } catch (error) {
            console.error('Error loading rider profile:', error);
        }
    }

    // Load rider statistics
    async function loadRiderStats() {
        try {
            const response = await fetch(`/api/rider/stats/${riderId}`);
            const data = await response.json();

            if (data.success && data.stats) {
                const stats = data.stats;
                
                // Update statistics cards
                document.getElementById('totalDeliveries').textContent = 
                    formatNumber(stats.total_deliveries || 0);
                
                document.getElementById('successfulDeliveries').textContent = 
                    formatNumber(stats.successful_deliveries || 0);
                
                document.getElementById('cancelledDeliveries').textContent = 
                    formatNumber(stats.cancelled_deliveries || 0);
                
                // Calculate total earnings (this would come from order history)
                const earnings = stats.today_earnings || 0;
                document.getElementById('totalEarnings').textContent = 
                    '৳' + formatNumber(earnings);
            }
        } catch (error) {
            console.error('Error loading rider stats:', error);
            showErrorInStats();
        }
    }

    // Load recent orders
    async function loadRecentOrders() {
        try {
            const response = await fetch(`/api/rider/recent-orders/${riderId}?limit=10`);
            const data = await response.json();

            if (data.success && data.orders) {
                displayRecentOrders(data.orders);
            } else {
                showNoOrders();
            }
        } catch (error) {
            console.error('Error loading recent orders:', error);
            showOrdersError();
        }
    }

    // Display recent orders in table with full details
    function displayRecentOrders(orders) {
        const tbody = document.getElementById('recentOrdersBody');
        
        if (!orders || orders.length === 0) {
            showNoOrders();
            return;
        }

        tbody.innerHTML = orders.map(order => {
            const orderStatusClass = getOrderStatusClass(order.order_status, order.delivery_status);
            const orderStatusText = formatOrderStatus(order.order_status, order.delivery_status);
            const paymentStatus = formatPaymentStatus(order.payment_method, order.payment_status);
            const date = formatDate(order.created_at);
            const amount = parseFloat(order.total_amount || 0);
            const customerName = order.consumer_name || 'Unknown';
            const restaurantName = order.restaurant_name || 'Restaurant';
            
            // Get item count and preview
            const itemCount = order.items?.length || 0;
            const itemPreview = order.items?.slice(0, 2).map(item => 
                `${item.quantity}x ${item.item_name}`
            ).join(', ') || 'No items';

            return `
                <tr onclick="viewOrderDetails(${order.id})" style="cursor: pointer;" title="Click to view full details">
                    <td>
                        <strong>#${order.id}</strong><br>
                        <small style="color: #666;">${escapeHtml(restaurantName)}</small><br>
                        <small style="color: #888;">👤 ${escapeHtml(customerName)}</small>
                    </td>
                    <td>
                        <strong>৳${formatNumber(amount)}</strong><br>
                        <small style="color: #666;">${itemCount} item${itemCount !== 1 ? 's' : ''}</small><br>
                        <small style="color: #888;" title="${escapeHtml(itemPreview)}">${escapeHtml(truncate(itemPreview, 30))}</small>
                    </td>
                    <td>
                        ${date}<br>
                        <small style="color: #666;">${formatTime(order.created_at)}</small>
                    </td>
                    <td>
                        <span style="display: inline-block; padding: 3px 8px; border-radius: 4px; font-size: 0.85rem; ${getPaymentMethodStyle(order.payment_method)}">
                            ${paymentStatus}
                        </span>
                    </td>
                    <td>
                        <span class="status ${orderStatusClass}">${orderStatusText}</span>
                    </td>
                </tr>
            `;
        }).join('');
    }

    // Get order status CSS class
    function getOrderStatusClass(orderStatus, deliveryStatus) {
        const status = (deliveryStatus || orderStatus || '').toLowerCase();
        
        if (status === 'delivered' || status === 'completed') {
            return 'delivered';
        } else if (status === 'cancelled' || status === 'rejected') {
            return 'return';
        } else if (status === 'assigned' || status === 'picked_up' || status === 'out_for_delivery') {
            return 'inProgress';
        } else {
            return 'pending';
        }
    }

    // Format order status text
    function formatOrderStatus(orderStatus, deliveryStatus) {
        // Prioritize delivery status for delivery orders
        const status = deliveryStatus || orderStatus;
        if (!status) return 'Pending';
        
        const statusMap = {
            'pending_rider': '⏳ Pending Assignment',
            'assigned': '📋 Assigned',
            'picked_up': '📦 Picked Up',
            'out_for_delivery': '🚚 Out for Delivery',
            'arrived': '📍 Arrived',
            'delivered': '✅ Delivered',
            'completed': '✅ Completed',
            'cancelled': '❌ Cancelled',
            'pending': '⏳ Pending',
            'confirmed': '✔️ Confirmed',
            'preparing': '👨‍🍳 Preparing',
            'ready': '✅ Ready'
        };

        return statusMap[status.toLowerCase()] || status.charAt(0).toUpperCase() + status.slice(1);
    }

    // Format payment status
    function formatPaymentStatus(paymentMethod, paymentStatus) {
        const method = (paymentMethod || 'cash').toUpperCase();
        const status = (paymentStatus || 'pending').toLowerCase();
        
        if (method === 'CASH') {
            return '💵 Cash';
        } else if (method === 'BKASH') {
            return status === 'paid' ? '💳 bKash (Paid)' : '💳 bKash';
        }
        return method;
    }

    // Get payment method styling
    function getPaymentMethodStyle(paymentMethod) {
        if (paymentMethod === 'cash') {
            return 'background: #d4edda; color: #155724;';
        } else if (paymentMethod === 'bkash') {
            return 'background: #ffe4e8; color: #d81b60;';
        }
        return 'background: #e2e3e5; color: #383d41;';
    }

    // Format time from datetime
    function formatTime(dateString) {
        if (!dateString) return '';
        
        const date = new Date(dateString);
        if (isNaN(date.getTime())) return '';
        
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');
        
        return `${hours}:${minutes}`;
    }

    // View order details (modal or navigation)
    window.viewOrderDetails = function(orderId) {
        // You can implement a modal here or navigate to order details page
        console.log('View order details:', orderId);
        // For now, just show an alert - you can expand this later
        alert(`Order #${orderId}\n\nClick OK to continue.\n\n(Feature: Full order details view can be implemented here)`);
    };

    // Load recent customers from order history
    async function loadRecentCustomers() {
        try {
            const response = await fetch(`/api/rider/history/${riderId}?limit=8`);
            const data = await response.json();

            if (data.success && data.orders) {
                displayRecentCustomers(data.orders);
            } else {
                showNoCustomers();
            }
        } catch (error) {
            console.error('Error loading recent customers:', error);
            showCustomersError();
        }
    }

    // Display recent customers
    function displayRecentCustomers(orders) {
        const table = document.getElementById('recentCustomersTable');
        
        if (!orders || orders.length === 0) {
            showNoCustomers();
            return;
        }

        // Get unique customers
        const uniqueCustomers = [];
        const seenCustomers = new Set();

        for (const order of orders) {
            const customerId = order.consumer_id || order.customer_id;
            if (customerId && !seenCustomers.has(customerId)) {
                seenCustomers.add(customerId);
                uniqueCustomers.push(order);
                if (uniqueCustomers.length >= 8) break;
            }
        }

        table.innerHTML = uniqueCustomers.map((order, index) => {
            const imgSrc = order.consumer_image || 
                          (index % 2 === 0 ? 'assets/imgs/customer01.jpg' : 'assets/imgs/customer02.jpg');
            const name = order.consumer_name || order.customer_name || 'Customer';
            const location = order.delivery_address || order.address || 'Unknown Location';
            
            return `
                <tr>
                    <td width="60px">
                        <div class="imgBx"><img src="${escapeHtml(imgSrc)}" alt="${escapeHtml(name)}" onerror="this.src='assets/imgs/customer01.jpg'"></div>
                    </td>
                    <td>
                        <h4>${escapeHtml(name)} <br> <span>${escapeHtml(truncate(location, 25))}</span></h4>
                    </td>
                </tr>
            `;
        }).join('');
    }

    // Get status CSS class
    function getStatusClass(status) {
        const statusLower = (status || '').toLowerCase();
        if (statusLower.includes('deliver') || statusLower.includes('complete')) {
            return 'delivered';
        } else if (statusLower.includes('cancel') || statusLower.includes('reject')) {
            return 'return';
        } else {
            return 'pending';
        }
    }

    // Format status text
    function formatStatus(status) {
        if (!status) return 'Pending';
        
        const statusMap = {
            'delivered': 'Delivered',
            'pending': 'Pending',
            'on_the_way': 'On the Way',
            'picked_up': 'Picked Up',
            'cancelled': 'Cancelled',
            'rejected': 'Rejected',
            'completed': 'Completed'
        };

        return statusMap[status.toLowerCase()] || status.charAt(0).toUpperCase() + status.slice(1);
    }

    // Format date
    function formatDate(dateString) {
        if (!dateString) return 'N/A';
        
        const date = new Date(dateString);
        if (isNaN(date.getTime())) return 'Invalid Date';
        
        const day = String(date.getDate()).padStart(2, '0');
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const year = String(date.getFullYear()).slice(-2);
        
        return `${day}.${month}.${year}`;
    }

    // Format numbers with commas
    function formatNumber(num) {
        return Number(num).toLocaleString('en-IN');
    }

    // Truncate text
    function truncate(text, length) {
        if (!text) return '';
        return text.length > length ? text.substring(0, length) + '...' : text;
    }

    // Escape HTML to prevent XSS
    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    // Show error messages
    function showErrorInStats() {
        document.getElementById('totalDeliveries').textContent = 'N/A';
        document.getElementById('successfulDeliveries').textContent = 'N/A';
        document.getElementById('cancelledDeliveries').textContent = 'N/A';
        document.getElementById('totalEarnings').textContent = 'N/A';
    }

    function showNoOrders() {
        document.getElementById('recentOrdersBody').innerHTML = `
            <tr>
                <td colspan="5" style="text-align: center; padding: 20px; color: #999;">
                    No orders found
                </td>
            </tr>
        `;
    }

    function showOrdersError() {
        document.getElementById('recentOrdersBody').innerHTML = `
            <tr>
                <td colspan="5" style="text-align: center; padding: 20px; color: #f00;">
                    Error loading orders
                </td>
            </tr>
        `;
    }

    function showNoCustomers() {
        document.getElementById('recentCustomersTable').innerHTML = `
            <tr>
                <td colspan="2" style="text-align: center; padding: 20px; color: #999;">
                    No customers found
                </td>
            </tr>
        `;
    }

    function showCustomersError() {
        document.getElementById('recentCustomersTable').innerHTML = `
            <tr>
                <td colspan="2" style="text-align: center; padding: 20px; color: #f00;">
                    Error loading customers
                </td>
            </tr>
        `;
    }

    // Setup sign out functionality
    function setupSignOut() {
        const signOutBtn = document.getElementById('signOutBtn');
        if (signOutBtn) {
            signOutBtn.addEventListener('click', async function(e) {
                e.preventDefault();
                await logout();
            });
        }
    }

    // Logout function
    async function logout() {
        const sessionId = localStorage.getItem("sessionId");

        if (!sessionId) {
            console.warn("No session found.");
            // Clear all session data anyway
            sessionStorage.clear();
            localStorage.removeItem('rider_id');
            window.location.href = '../rider_login.html';
            return;
        }

        try {
            const res = await fetch("/api/auth/logout", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ sessionId }),
                credentials: "include", // Include the session cookie in the request
            });

            const data = await res.json();

            if (res.ok) {
                localStorage.removeItem("sessionId"); // Clear sessionId from localStorage after logout
                sessionStorage.clear(); // Clear all session data
                localStorage.removeItem('rider_id'); // Clear rider ID
                alert(data.message || "Logged out successfully"); // Show success message
                window.location.href = '../rider_login.html';
            } else {
                // Even if logout fails on server, clear local data
                localStorage.removeItem("sessionId");
                sessionStorage.clear();
                localStorage.removeItem('rider_id');
                alert(data.message || "Logout failed.");
                window.location.href = '../rider_login.html'; // Redirect to login page on error
            }
        } catch (err) {
            console.error("Logout error:", err);
            // Clear local data even on error
            localStorage.removeItem("sessionId");
            sessionStorage.clear();
            localStorage.removeItem('rider_id');
            alert("Something went wrong during logout.");
            window.location.href = '../rider_login.html'; // Redirect to login page on error
        }
    }

    // Setup status toggle buttons
    function setupStatusToggle() {
        const statusButtons = document.querySelectorAll('.status-btn');
        
        statusButtons.forEach(button => {
            button.addEventListener('click', async function() {
                const newStatus = this.getAttribute('data-status');
                
                // Don't allow manually setting to 'busy' - only system can do that
                if (newStatus === 'busy') {
                    alert('Status "Busy" is automatically set when you accept an order.');
                    return;
                }
                
                // Confirm status change
                const confirmMsg = `Change your status to "${formatStatusForDisplay(newStatus)}"?`;
                if (!confirm(confirmMsg)) return;
                
                await updateRiderStatus(newStatus);
            });
        });
        
        // Load current status
        loadRiderStatus();
    }

    // Load and display current rider status
    async function loadRiderStatus() {
        try {
            const response = await fetch(`/api/rider/profile/${riderId}`);
            const data = await response.json();

            if (data.success && data.rider) {
                const rider = data.rider;
                const currentStatus = rider.status || 'offline';
                const startsAt = rider.starts_at || '--:--';
                const endsAt = rider.ends_at || '--:--';
                
                // Update status display
                updateStatusDisplay(currentStatus);
                
                // Update work schedule display
                document.getElementById('work-schedule-text').textContent = 
                    `Schedule: ${startsAt} to ${endsAt}`;
                
                // Update button states
                const statusButtons = document.querySelectorAll('.status-btn');
                statusButtons.forEach(btn => {
                    const btnStatus = btn.getAttribute('data-status');
                    
                    // Remove active class from all
                    btn.classList.remove('active');
                    
                    // Add active to current status
                    if (btnStatus === currentStatus) {
                        btn.classList.add('active');
                    }
                    
                    // Disable/enable based on status
                    // Only 'busy' status should be disabled for manual selection
                    if (btnStatus === 'busy' && currentStatus !== 'busy') {
                        btn.disabled = true;
                    } else {
                        btn.disabled = false;
                    }
                });
            }
        } catch (error) {
            console.error('Error loading rider status:', error);
            document.getElementById('current-status-text').textContent = 'Error loading status';
        }
    }

    // Update rider status on server
    async function updateRiderStatus(newStatus) {
        try {
            const response = await fetch('/api/rider/status', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    rider_id: riderId,
                    status: newStatus
                })
            });

            const data = await response.json();

            if (response.ok && data.success) {
                // Update UI immediately
                updateStatusDisplay(newStatus);
                
                // Reload status to sync with server
                await loadRiderStatus();
                
                // Show success message
                showStatusChangeNotification(newStatus);
            } else {
                alert('Failed to update status: ' + (data.message || 'Unknown error'));
                // Reload current status
                await loadRiderStatus();
            }
        } catch (error) {
            console.error('Error updating status:', error);
            alert('Failed to update status. Please try again.');
            await loadRiderStatus();
        }
    }

    // Update status display text and color
    function updateStatusDisplay(status) {
        const statusText = document.getElementById('current-status-text');
        const displayText = formatStatusForDisplay(status);
        
        // Update text
        statusText.textContent = displayText;
        
        // Update color based on status
        const colors = {
            'available': '#00b894',
            'busy': '#f39c12',
            'offline': '#e74c3c',
            'on_break': '#3498db'
        };
        
        statusText.style.color = colors[status] || '#fff';
    }

    // Format status for display
    function formatStatusForDisplay(status) {
        const statusMap = {
            'available': '🟢 Available',
            'busy': '🟡 Busy',
            'offline': '🔴 Offline',
            'on_break': '🔵 On Break'
        };
        
        return statusMap[status] || status;
    }

    // Show notification for status change
    function showStatusChangeNotification(status) {
        const messages = {
            'available': '✅ You are now AVAILABLE to receive orders!',
            'offline': '⭕ You are now OFFLINE. You won\'t receive new orders.',
            'on_break': '☕ You are now ON BREAK. Enjoy your rest!'
        };
        
        const message = messages[status] || `Status changed to ${status}`;
        
        // Create notification element
        const notification = document.createElement('div');
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: #2ecc71;
            color: white;
            padding: 15px 25px;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.2);
            z-index: 10000;
            font-weight: 600;
            animation: slideInRight 0.3s ease-out;
        `;
        notification.textContent = message;
        
        document.body.appendChild(notification);
        
        // Remove after 3 seconds
        setTimeout(() => {
            notification.style.animation = 'slideOutRight 0.3s ease-in';
            setTimeout(() => notification.remove(), 300);
        }, 3000);
    }

    // Load active deliveries (orders currently being delivered)
    async function loadActiveDeliveries() {
        try {
            const response = await fetch(`/api/rider/active-orders/${riderId}`);
            const data = await response.json();

            if (data.success && data.orders && data.orders.length > 0) {
                displayActiveDeliveries(data.orders);
            } else {
                hideActiveDeliveriesSection();
            }
        } catch (error) {
            console.error('Error loading active deliveries:', error);
            hideActiveDeliveriesSection();
        }
    }

    // Display active deliveries with action buttons
    function displayActiveDeliveries(orders) {
        const section = document.getElementById('activeDeliveriesSection');
        const container = document.getElementById('activeDeliveriesContainer');
        const countBadge = document.getElementById('activeDeliveryCount');
        
        section.style.display = 'block';
        countBadge.textContent = orders.length;

        container.innerHTML = orders.map(order => {
            const deliveryStatus = order.delivery_status || 'assigned';
            const itemsHtml = order.items?.map(item => 
                `<li>${item.quantity}x ${escapeHtml(item.item_name)}</li>`
            ).join('') || '<li>No items</li>';

            return `
                <div class="active-delivery-card" onclick="openTracking(${order.id})" style="
                    background: white; 
                    border-radius: 12px; 
                    padding: 20px; 
                    margin-bottom: 15px; 
                    box-shadow: 0 2px 8px rgba(0,0,0,0.1); 
                    border-left: 4px solid #f39c12;
                    cursor: pointer;
                    transition: all 0.3s ease;
                    position: relative;
                " onmouseover="this.style.transform='translateY(-2px)'; this.style.boxShadow='0 4px 16px rgba(0,0,0,0.15)';"
                   onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='0 2px 8px rgba(0,0,0,0.1)';"
                   title="Click to open live tracking">
                   
                    <!-- Live Tracking Button (Top Right) -->
                    <button onclick="event.stopPropagation(); openTracking(${order.id})" style="
                        position: absolute;
                        top: 15px;
                        right: 15px;
                        padding: 8px 16px;
                        background: linear-gradient(135deg, #2196F3 0%, #1976D2 100%);
                        color: white;
                        border: none;
                        border-radius: 8px;
                        font-weight: 600;
                        cursor: pointer;
                        font-size: 0.85rem;
                        display: flex;
                        align-items: center;
                        gap: 6px;
                        box-shadow: 0 2px 8px rgba(33, 150, 243, 0.3);
                        transition: all 0.3s;
                        z-index: 10;
                    " onmouseover="this.style.transform='translateY(-2px)'; this.style.boxShadow='0 4px 12px rgba(33, 150, 243, 0.4)';"
                       onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='0 2px 8px rgba(33, 150, 243, 0.3)';">
                        📍 Live Tracking
                    </button>
                    
                    <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 15px; padding-right: 140px;">
                        <div style="flex: 1;">
                            <h3 style="margin: 0 0 10px 0; color: #2c3e50; font-size: 1.2rem;">
                                Order #${order.id} - ${escapeHtml(order.restaurant_name || 'Restaurant')}
                            </h3>
                            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 10px; margin-bottom: 10px;">
                                <div>
                                    <strong>📍 Pick Up:</strong><br>
                                    <small style="color: #666;">${escapeHtml(truncate(order.restaurant_address || 'N/A', 40))}</small>
                                </div>
                                <div>
                                    <strong>🏠 Deliver To:</strong><br>
                                    <small style="color: #666;">${escapeHtml(truncate(order.delivery_address || 'N/A', 40))}</small>
                                </div>
                                <div>
                                    <strong>👤 Customer:</strong><br>
                                    <small style="color: #666;">${escapeHtml(order.consumer_name || 'Unknown')}</small><br>
                                    <small style="color: #666;">📞 ${escapeHtml(order.consumer_phone || 'N/A')}</small>
                                </div>
                                <div>
                                    <strong>💰 Amount:</strong><br>
                                    <span style="font-size: 1.3rem; color: #27ae60; font-weight: bold;">৳${formatNumber(order.total_amount)}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div style="background: #f8f9fa; padding: 12px; border-radius: 8px; margin-bottom: 15px;">
                        <strong>📦 Order Items:</strong>
                        <ul style="margin: 8px 0 0 0; padding-left: 20px; max-height: 100px; overflow-y: auto;">
                            ${itemsHtml}
                        </ul>
                    </div>

                    <div style="display: flex; gap: 10px; flex-wrap: wrap; align-items: center; justify-content: space-between;">
                        <div style="display: flex; gap: 10px; flex-wrap: wrap; flex: 1;">
                            ${getDeliveryActionButtons(order.id, deliveryStatus)}
                        </div>
                        <div>
                            <span style="padding: 8px 16px; background: ${getStatusColor(deliveryStatus)}; color: white; border-radius: 20px; font-weight: 600; font-size: 0.9rem;">
                                ${formatOrderStatus('', deliveryStatus)}
                            </span>
                        </div>
                    </div>
                </div>
            `;
        }).join('');

        // Add event listeners to action buttons
        attachDeliveryActionListeners();
    }

    // Open live tracking page
    window.openTracking = function(orderId) {
        // Open tracking page with order ID
        window.location.href = `tracking.html?orderId=${orderId}`;
    };

    // Get delivery action buttons based on current status
    function getDeliveryActionButtons(orderId, status) {
        const btnStyle = 'padding: 10px 20px; border: none; border-radius: 8px; font-weight: 600; cursor: pointer; transition: all 0.3s; font-size: 0.9rem;';
        
        switch (status) {
            case 'assigned':
                return `
                    <button class="delivery-action-btn" data-action="pickup" data-order-id="${orderId}" 
                        style="${btnStyle} background: #3498db; color: white;">
                        📦 Pick Up Order
                    </button>
                `;
            
            case 'picked_up':
                return `
                    <button class="delivery-action-btn" data-action="on-way" data-order-id="${orderId}" 
                        style="${btnStyle} background: #9b59b6; color: white;">
                        🚚 Start Delivery
                    </button>
                `;
            
            case 'out_for_delivery':
                return `
                    <button class="delivery-action-btn" data-action="arrived" data-order-id="${orderId}" 
                        style="${btnStyle} background: #e67e22; color: white;">
                        📍 Mark as Arrived
                    </button>
                `;
            
            case 'arrived':
                return `
                    <button class="delivery-action-btn" data-action="complete" data-order-id="${orderId}" 
                        style="${btnStyle} background: #27ae60; color: white;">
                        ✅ Complete Delivery
                    </button>
                `;
            
            default:
                return '';
        }
    }

    // Get status color
    function getStatusColor(status) {
        const colors = {
            'assigned': '#3498db',
            'picked_up': '#9b59b6',
            'out_for_delivery': '#e67e22',
            'arrived': '#f39c12',
            'delivered': '#27ae60'
        };
        return colors[status] || '#95a5a6';
    }

    // Attach event listeners to delivery action buttons
    function attachDeliveryActionListeners() {
        const buttons = document.querySelectorAll('.delivery-action-btn');
        buttons.forEach(button => {
            button.addEventListener('click', async function(e) {
                e.stopPropagation(); // Prevent card click
                const action = this.getAttribute('data-action');
                const orderId = this.getAttribute('data-order-id');
                await handleDeliveryAction(action, orderId);
            });
        });
    }

    // Handle delivery actions
    async function handleDeliveryAction(action, orderId) {
        const actionMap = {
            'pickup': {
                endpoint: '/api/rider/orders/picked-up',
                confirmMsg: 'Have you picked up the order from the restaurant?',
                successMsg: '📦 Order marked as picked up!'
            },
            'on-way': {
                endpoint: '/api/rider/orders/out-for-delivery',
                confirmMsg: 'Start delivery to customer?',
                successMsg: '🚚 You\'re on your way to the customer!'
            },
            'arrived': {
                endpoint: '/api/rider/orders/arrived',
                confirmMsg: 'Have you arrived at the delivery location?',
                successMsg: '📍 Marked as arrived!'
            },
            'complete': {
                endpoint: '/api/rider/orders/complete',
                confirmMsg: 'Confirm that you have successfully delivered the order to the customer?',
                successMsg: '✅ Delivery completed! Great job!'
            }
        };

        const config = actionMap[action];
        if (!config) return;

        // Confirm action
        if (!confirm(config.confirmMsg)) return;

        // Show loading state
        showNotification('Processing...', 'info');

        try {
            const response = await fetch(config.endpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    order_id: orderId,
                    rider_id: riderId
                })
            });

            const data = await response.json();

            if (response.ok && data.success) {
                showNotification(config.successMsg, 'success');
                
                // Show earnings for completed delivery
                if (action === 'complete' && data.earnings) {
                    setTimeout(() => {
                        showNotification(`💰 You earned ৳${formatNumber(data.earnings)}!`, 'success');
                    }, 1500);
                }

                // Reload deliveries and stats
                await loadActiveDeliveries();
                await loadRiderStats();
                await loadRiderStatus();
                await loadRecentOrders();
            } else {
                showNotification(data.message || 'Failed to update status', 'error');
            }
        } catch (error) {
            console.error('Error handling delivery action:', error);
            showNotification('Something went wrong. Please try again.', 'error');
        }
    }

    // Show notification
    function showNotification(message, type = 'info') {
        const colors = {
            success: '#27ae60',
            error: '#e74c3c',
            info: '#3498db',
            warning: '#f39c12'
        };

        const notification = document.createElement('div');
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: ${colors[type]};
            color: white;
            padding: 15px 25px;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.3);
            z-index: 10000;
            font-weight: 600;
            animation: slideInRight 0.3s ease-out;
            max-width: 400px;
        `;
        notification.textContent = message;
        
        document.body.appendChild(notification);
        
        // Remove after 4 seconds
        setTimeout(() => {
            notification.style.animation = 'slideOutRight 0.3s ease-in';
            setTimeout(() => notification.remove(), 300);
        }, 4000);
    }

    // Hide active deliveries section
    function hideActiveDeliveriesSection() {
        const section = document.getElementById('activeDeliveriesSection');
        section.style.display = 'none';
    }

})();
