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
        loadRecentOrders();
        loadRecentCustomers();
        setupSignOut();
        
        // Refresh data every 30 seconds
        setInterval(() => {
            loadRiderStats();
            loadRecentOrders();
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
            const response = await fetch(`/api/rider/history/${riderId}?limit=10`);
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

    // Display recent orders in table
    function displayRecentOrders(orders) {
        const tbody = document.getElementById('recentOrdersBody');
        
        if (!orders || orders.length === 0) {
            showNoOrders();
            return;
        }

        tbody.innerHTML = orders.map(order => {
            const statusClass = getStatusClass(order.delivery_status || order.status);
            const statusText = formatStatus(order.delivery_status || order.status);
            const paymentStatus = order.payment_status || 'Pending';
            const date = formatDate(order.order_date || order.created_at);
            const amount = parseFloat(order.total_amount || order.amount || 0);

            return `
                <tr>
                    <td>${escapeHtml(order.consumer_name || order.customer_name || 'Unknown')}</td>
                    <td>৳${formatNumber(amount)}</td>
                    <td>${date}</td>
                    <td>${escapeHtml(paymentStatus)}</td>
                    <td><span class="status ${statusClass}">${statusText}</span></td>
                </tr>
            `;
        }).join('');
    }

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

})();
