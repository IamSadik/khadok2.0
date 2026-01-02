const toggleBtn = document.getElementById('toggle-btn');
const sidebar = document.getElementById('sidebar');
const mainContent = document.getElementById('main-content');

// Default collapsed state
sidebar.classList.add('collapsed');
mainContent.classList.add('collapsed');

toggleBtn.addEventListener('click', () => {
    if (sidebar.classList.contains('collapsed')) {
        sidebar.classList.remove('collapsed');
        sidebar.classList.add('expanded');
        mainContent.classList.remove('collapsed');
        mainContent.classList.add('expanded');
    } else {
        sidebar.classList.remove('expanded');
        sidebar.classList.add('collapsed');
        mainContent.classList.remove('expanded');
        mainContent.classList.add('collapsed');
    }
});

// ========== MODERN RESTAURANT DASHBOARD - STAKEHOLDER ==========

// Global variables
let revenueChart, ordersChart, popularItemsChart, hourlyOrdersChart, revenueSparkline;
let refreshInterval;
const stakeholderId = localStorage.getItem('stakeholder_id');

// ========== INITIALIZE DASHBOARD ==========
document.addEventListener('DOMContentLoaded', async () => {
    // Set current date
    updateCurrentDate();
    
    // Load restaurant name
    await loadRestaurantInfo();
    
    // Initialize charts FIRST (before loading data)
    initializeCharts();
    
    // Then load dashboard data (which will update the charts)
    await loadDashboardData();
    
    // Setup auto-refresh (every 30 seconds)
    refreshInterval = setInterval(refreshDashboard, 30000);
});

// ========== UPDATE CURRENT DATE ==========
function updateCurrentDate() {
    const dateElement = document.getElementById('current-date');
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    const today = new Date().toLocaleDateString('en-US', options);
    dateElement.textContent = today;
}

// ========== LOAD RESTAURANT INFO ==========
async function loadRestaurantInfo() {
    try {
        const response = await fetch(`/api/stakeholder/info?stakeholder_id=${stakeholderId}`);
        const data = await response.json();
        
        if (data.success && data.stakeholder) {
            document.getElementById('restaurant-name').textContent = data.stakeholder.restaurant_name || 'Restaurant Owner';
        }
    } catch (error) {
        console.error('Error loading restaurant info:', error);
    }
}

// ========== LOAD DASHBOARD DATA ==========
async function loadDashboardData() {
    try {
        // Show loading state
        showLoadingState();
        
        // Fetch all data in parallel for faster loading
        const [ordersResponse, reservationsResponse, statsResponse] = await Promise.all([
            fetch(`/api/stakeholder/dashboard/orders?stakeholder_id=${stakeholderId}`),
            fetch(`/api/stakeholder/dashboard/reservations?stakeholder_id=${stakeholderId}`),
            fetch(`/api/stakeholder/dashboard/stats?stakeholder_id=${stakeholderId}`)
        ]);
        
        const [ordersData, reservationsData, statsData] = await Promise.all([
            ordersResponse.json(),
            reservationsResponse.json(),
            statsResponse.json()
        ]);
        
        // Update metrics
        updateMetrics(ordersData, reservationsData);
        
        // Update activities
        updateActivities(ordersData, reservationsData);
        
        // Update schedule
        updateSchedule(reservationsData);
        
        // Update live feed
        updateLiveFeed(ordersData);
        
        // Update charts data (now uses statsData for faster loading)
        updateChartsData(ordersData, statsData);
        
        // Hide loading state
        hideLoadingState();
        
    } catch (error) {
        console.error('Error loading dashboard data:', error);
        hideLoadingState();
        showErrorState();
    }
}

// ========== LOADING STATE ==========
function showLoadingState() {
    // Show shimmer effect on metric cards
    document.querySelectorAll('.metric-value').forEach(el => {
        el.style.opacity = '0.5';
    });
}

function hideLoadingState() {
    document.querySelectorAll('.metric-value').forEach(el => {
        el.style.opacity = '1';
    });
}

function showErrorState() {
    console.log('Failed to load some dashboard data. Using cached data if available.');
}

// ========== UPDATE METRICS ==========
function updateMetrics(ordersData, reservationsData) {
    const orders = ordersData.orders || [];
    const reservations = reservationsData.reservations || [];
    
    // Calculate today's revenue
    const todayRevenue = orders
        .filter(o => o.payment_status === 'paid' || o.payment_status === 'pending')
        .reduce((sum, o) => sum + parseFloat(o.total_amount || 0), 0);
    
    document.getElementById('today-revenue').textContent = todayRevenue.toFixed(2);
    
    // Active orders (pending, confirmed, preparing, ready)
    const activeOrders = orders.filter(o => 
        ['pending', 'confirmed', 'preparing', 'ready'].includes(o.order_status)
    );
    document.getElementById('active-orders').textContent = activeOrders.length;
    
    // Delivery vs Pickup
    const deliveryOrders = activeOrders.filter(o => o.order_type === 'delivery').length;
    const pickupOrders = activeOrders.filter(o => o.order_type === 'pickup').length;
    document.getElementById('delivery-orders').textContent = deliveryOrders;
    document.getElementById('pickup-orders').textContent = pickupOrders;
    document.getElementById('pending-orders-count').textContent = orders.filter(o => o.order_status === 'pending').length;
    
    // Today's reservations
    const todayReservations = reservations.filter(r => {
        const bookingDate = new Date(r.booking_time);
        const today = new Date();
        return bookingDate.toDateString() === today.toDateString();
    });
    document.getElementById('today-reservations').textContent = todayReservations.length;
    
    // Upcoming reservations
    const upcomingReservations = todayReservations.filter(r => 
        ['pending', 'approved'].includes(r.status) && new Date(r.booking_time) > new Date()
    );
    document.getElementById('upcoming-reservations').textContent = upcomingReservations.length;
    
    // Average rating (mock data - replace with actual API call)
    const avgRating = 4.5;
    document.getElementById('avg-rating').textContent = avgRating.toFixed(1);
    updateRatingStars(avgRating);
    
    // Calculate revenue trend (mock)
    const revenueTrend = ((Math.random() * 20) - 5).toFixed(1);
    const trendElement = document.getElementById('revenue-trend');
    const trendParent = trendElement.parentElement;
    trendElement.textContent = `${revenueTrend > 0 ? '+' : ''}${revenueTrend}%`;
    
    if (revenueTrend > 0) {
        trendParent.classList.add('positive');
        trendParent.classList.remove('negative');
        trendParent.querySelector('i').className = 'fas fa-arrow-up';
    } else {
        trendParent.classList.add('negative');
        trendParent.classList.remove('positive');
        trendParent.querySelector('i').className = 'fas fa-arrow-down';
    }
}

// ========== UPDATE RATING STARS ==========
function updateRatingStars(rating) {
    const starsContainer = document.getElementById('rating-stars');
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 >= 0.5;
    
    let starsHTML = '';
    for (let i = 0; i < fullStars; i++) {
        starsHTML += '<i class="fas fa-star"></i>';
    }
    if (hasHalfStar) {
        starsHTML += '<i class="fas fa-star-half-alt"></i>';
    }
    const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0);
    for (let i = 0; i < emptyStars; i++) {
        starsHTML += '<i class="far fa-star"></i>';
    }
    
    starsContainer.innerHTML = starsHTML;
}

// ========== UPDATE ACTIVITIES ==========
function updateActivities(ordersData, reservationsData) {
    const activities = [];
    const orders = ordersData.orders || [];
    const reservations = reservationsData.reservations || [];
    
    // Add recent orders
    orders.slice(0, 5).forEach(order => {
        activities.push({
            type: 'order',
            icon: 'order',
            title: `New Order #${order.id}`,
            time: getTimeAgo(order.created_at),
            timestamp: new Date(order.created_at)
        });
    });
    
    // Add recent reservations
    reservations.slice(0, 3).forEach(reservation => {
        activities.push({
            type: 'reservation',
            icon: 'reservation',
            title: `Reservation for ${reservation.quantity} table(s)`,
            time: getTimeAgo(reservation.created_at),
            timestamp: new Date(reservation.created_at)
        });
    });
    
    // Sort by timestamp
    activities.sort((a, b) => b.timestamp - a.timestamp);
    
    // Render activities
    const activitiesList = document.getElementById('activities-list');
    if (activities.length === 0) {
        activitiesList.innerHTML = `
            <div class="activity-item loading">
                <i class="fas fa-inbox"></i>
                <span>No recent activities</span>
            </div>
        `;
    } else {
        activitiesList.innerHTML = activities.slice(0, 8).map(activity => `
            <div class="activity-item">
                <div class="activity-icon ${activity.icon}">
                    <i class="fas fa-${activity.icon === 'order' ? 'shopping-bag' : 'calendar-check'}"></i>
                </div>
                <div class="activity-content">
                    <p class="activity-title">${activity.title}</p>
                    <p class="activity-time">${activity.time}</p>
                </div>
            </div>
        `).join('');
    }
}

// ========== UPDATE SCHEDULE ==========
function updateSchedule(reservationsData) {
    const reservations = reservationsData.reservations || [];
    const today = new Date();
    
    // Filter today's reservations
    const todaySchedule = reservations.filter(r => {
        const bookingDate = new Date(r.booking_time);
        return bookingDate.toDateString() === today.toDateString() &&
               ['pending', 'approved'].includes(r.status);
    }).sort((a, b) => new Date(a.booking_time) - new Date(b.booking_time));
    
    const scheduleList = document.getElementById('schedule-list');
    if (todaySchedule.length === 0) {
        scheduleList.innerHTML = `
            <div class="schedule-empty">
                <i class="fas fa-calendar-times"></i>
                <p>No reservations scheduled for today</p>
            </div>
        `;
    } else {
        scheduleList.innerHTML = todaySchedule.map(res => {
            const time = new Date(res.booking_time).toLocaleTimeString('en-US', { 
                hour: '2-digit', 
                minute: '2-digit' 
            });
            return `
                <div class="schedule-item">
                    <div class="schedule-time">${time}</div>
                    <div class="schedule-content">
                        <p class="schedule-title">Reservation - Table ${res.table_size}</p>
                        <p class="schedule-details">${res.quantity} table(s) • ${res.status}</p>
                    </div>
                </div>
            `;
        }).join('');
    }
}

// ========== UPDATE LIVE FEED ==========
function updateLiveFeed(ordersData) {
    const orders = ordersData.orders || [];
    const recentOrders = orders.filter(o => 
        ['pending', 'confirmed', 'preparing'].includes(o.order_status)
    ).slice(0, 5);
    
    const liveFeedList = document.getElementById('live-feed-list');
    if (recentOrders.length === 0) {
        liveFeedList.innerHTML = `
            <div class="feed-empty">
                <i class="fas fa-inbox"></i>
                <p>No recent orders</p>
            </div>
        `;
    } else {
        liveFeedList.innerHTML = recentOrders.map((order, index) => `
            <div class="feed-item ${index === 0 ? 'new' : ''}">
                <div class="feed-icon">
                    <i class="fas fa-bell"></i>
                </div>
                <div class="feed-content">
                    <p class="feed-title">Order #${order.id} - ৳${parseFloat(order.total_amount).toFixed(2)}</p>
                    <p class="feed-time">${getTimeAgo(order.created_at)}</p>
                </div>
            </div>
        `).join('');
    }
}

// ========== INITIALIZE CHARTS ==========
function initializeCharts() {
    // Revenue Chart
    const revenueCtx = document.getElementById('revenueChart');
    if (revenueCtx) {
        revenueChart = new Chart(revenueCtx, {
            type: 'line',
            data: {
                labels: [],
                datasets: [{
                    label: 'Revenue (৳)',
                    data: [],
                    borderColor: '#4f46e5',
                    backgroundColor: 'rgba(79, 70, 229, 0.1)',
                    tension: 0.4,
                    fill: true
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: true }
                },
                scales: {
                    y: { beginAtZero: true }
                }
            }
        });
    }
    
    // Orders Distribution Chart
    const ordersCtx = document.getElementById('ordersChart');
    if (ordersCtx) {
        ordersChart = new Chart(ordersCtx, {
            type: 'doughnut',
            data: {
                labels: ['Delivery', 'Pickup', 'Dine-in'],
                datasets: [{
                    data: [0, 0, 0],
                    backgroundColor: ['#3b82f6', '#f59e0b', '#10b981']
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { position: 'bottom' }
                }
            }
        });
    }
    
    // Popular Items Chart
    const popularCtx = document.getElementById('popularItemsChart');
    if (popularCtx) {
        popularItemsChart = new Chart(popularCtx, {
            type: 'bar',
            data: {
                labels: [],
                datasets: [{
                    label: 'Orders',
                    data: [],
                    backgroundColor: '#10b981'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                indexAxis: 'y',
                plugins: {
                    legend: { display: false }
                },
                scales: {
                    x: { beginAtZero: true }
                }
            }
        });
    }
    
    // Hourly Orders Chart
    const hourlyCtx = document.getElementById('hourlyOrdersChart');
    if (hourlyCtx) {
        hourlyOrdersChart = new Chart(hourlyCtx, {
            type: 'bar',
            data: {
                labels: ['12am', '3am', '6am', '9am', '12pm', '3pm', '6pm', '9pm'],
                datasets: [{
                    label: 'Orders',
                    data: [0, 0, 0, 0, 0, 0, 0, 0],
                    backgroundColor: '#8b5cf6'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false }
                },
                scales: {
                    y: { beginAtZero: true }
                }
            }
        });
    }
    
    // Revenue Sparkline
    const sparklineCtx = document.getElementById('revenueSparkline');
    if (sparklineCtx) {
        revenueSparkline = new Chart(sparklineCtx, {
            type: 'line',
            data: {
                labels: Array(7).fill(''),
                datasets: [{
                    data: generateSparklineData(),
                    borderColor: '#10b981',
                    borderWidth: 2,
                    pointRadius: 0,
                    fill: false
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: { x: { display: false }, y: { display: false } }
            }
        });
    }
}

// ========== UPDATE CHARTS DATA ==========
function updateChartsData(ordersData, statsData) {
    // Update Revenue Chart (last 7 days)
    updateRevenueChart();
    
    // Update Orders Distribution using statsData (ultra-fast!)
    if (ordersChart && statsData && statsData.success) {
        const { delivery, pickup, dineIn } = statsData.orderDistribution;
        ordersChart.data.datasets[0].data = [delivery, pickup, dineIn];
        ordersChart.update();
    }
    
    // Update Popular Items with real data
    updatePopularItemsChart();
    
    // Update Hourly Orders using statsData (ultra-fast!)
    if (hourlyOrdersChart && statsData && statsData.success) {
        hourlyOrdersChart.data.datasets[0].data = statsData.hourlyData;
        hourlyOrdersChart.update();
    }
}

// ========== UPDATE POPULAR ITEMS CHART ==========
async function updatePopularItemsChart() {
    try {
        const response = await fetch(`/api/stakeholder/dashboard/popular-items?stakeholder_id=${stakeholderId}&limit=5`);
        const data = await response.json();
        
        if (data.success && popularItemsChart) {
            const labels = data.labels || [];
            const values = data.values || [];
            
            // If no data, show message
            if (labels.length === 0) {
                popularItemsChart.data.labels = ['No Data'];
                popularItemsChart.data.datasets[0].data = [0];
                popularItemsChart.data.datasets[0].backgroundColor = '#e5e7eb';
            } else {
                popularItemsChart.data.labels = labels;
                popularItemsChart.data.datasets[0].data = values;
                popularItemsChart.data.datasets[0].backgroundColor = '#10b981';
            }
            
            popularItemsChart.update();
        }
    } catch (error) {
        console.error('Error updating popular items chart:', error);
        // Keep existing data or show empty state
        if (popularItemsChart) {
            popularItemsChart.data.labels = ['No Data'];
            popularItemsChart.data.datasets[0].data = [0];
            popularItemsChart.data.datasets[0].backgroundColor = '#e5e7eb';
            popularItemsChart.update();
        }
    }
}

// ========== UPDATE REVENUE CHART ==========
async function updateRevenueChart() {
    const period = document.getElementById('revenue-period').value;
    
    try {
        const response = await fetch(`/api/stakeholder/dashboard/revenue?stakeholder_id=${stakeholderId}&period=${period}`);
        const data = await response.json();
        
        if (data.success && revenueChart) {
            revenueChart.data.labels = data.labels || generateDateLabels(period);
            revenueChart.data.datasets[0].data = data.values || generateRevenueData(period);
            revenueChart.update();
        }
    } catch (error) {
        console.error('Error updating revenue chart:', error);
        // Use mock data on error
        if (revenueChart) {
            revenueChart.data.labels = generateDateLabels(period);
            revenueChart.data.datasets[0].data = generateRevenueData(period);
            revenueChart.update();
        }
    }
}

// Make updateRevenueChart globally accessible
window.updateRevenueChart = updateRevenueChart;

// ========== HELPER FUNCTIONS ==========
function getTimeAgo(dateString) {
    const now = new Date();
    const past = new Date(dateString);
    const diffMs = now - past;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} min${diffMins > 1 ? 's' : ''} ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
}

// ========== CALCULATE HOURLY ORDERS (Optimized - uses existing data) ==========
function calculateHourlyOrders(orders) {
    // Initialize 8 time slots (0-2:59am, 3-5:59am, 6-8:59am, etc.)
    const hourly = Array(8).fill(0);
    
    // Only count today's orders for hourly breakdown
    const today = new Date().toDateString();
    
    orders.forEach(order => {
        try {
            const orderDate = new Date(order.created_at);
            
            // Only count today's orders
            if (orderDate.toDateString() === today) {
                const hour = orderDate.getHours();
                // Map hour to 3-hour slots: 0-2=0, 3-5=1, 6-8=2, etc.
                const slotIndex = Math.floor(hour / 3);
                
                if (slotIndex >= 0 && slotIndex < 8) {
                    hourly[slotIndex]++;
                }
            }
        } catch (error) {
            console.error('Error processing order time:', error);
        }
    });
    
    return hourly;
}

function generateDateLabels(period) {
    const labels = [];
    const count = period === 'week' ? 7 : period === 'month' ? 30 : 12;
    
    // Generate dates from oldest to newest (left to right)
    for (let i = count - 1; i >= 0; i--) {
        const date = new Date();
        if (period === 'year') {
            date.setMonth(date.getMonth() - i);
            labels.push(date.toLocaleString('default', { month: 'short' }) + ' ' + date.getFullYear());
        } else {
            date.setDate(date.getDate() - i);
            // Format: DD/MM/YY (2-digit year for minimal look)
            const year = date.getFullYear().toString().slice(-2);
            labels.push(date.getDate() + '/' + (date.getMonth() + 1) + '/' + year);
        }
    }
    return labels;
}

function generateRevenueData(period) {
    const count = period === 'week' ? 7 : period === 'month' ? 30 : 12;
    return Array(count).fill(0).map(() => Math.floor(Math.random() * 5000) + 1000);
}

function generateSparklineData() {
    return Array(7).fill(0).map(() => Math.floor(Math.random() * 100) + 50);
}

// ========== REFRESH DASHBOARD ==========
async function refreshDashboard() {
    const refreshBtn = document.querySelector('.refresh-dashboard-btn i');
    refreshBtn.classList.add('fa-spin');
    
    await loadDashboardData();
    
    setTimeout(() => {
        refreshBtn.classList.remove('fa-spin');
    }, 1000);
}

// Make refreshDashboard globally accessible
window.refreshDashboard = refreshDashboard;

// ========== CLEANUP ==========
window.addEventListener('beforeunload', () => {
    if (refreshInterval) {
        clearInterval(refreshInterval);
    }
});
