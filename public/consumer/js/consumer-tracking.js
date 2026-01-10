// Real-Time Consumer Delivery Tracking with OSRM Road Routing
(function() {
    'use strict';

    // Get order ID from URL
    const urlParams = new URLSearchParams(window.location.search);
    const orderId = urlParams.get('orderId');
    const consumerId = localStorage.getItem('consumer_id');

    if (!orderId || !consumerId) {
        alert('Missing order information!');
        window.location.href = 'khadok.consumer.dashboard.html';
        return;
    }

    // Initialize map variables
    let map, tileURL;
    let riderMarker, restaurantMarker, customerMarker;
    let routeLine, fullRouteLine;
    let socket;
    let orderData = null;

    // Initialize on page load
    document.addEventListener('DOMContentLoaded', async function() {
        await loadMapTileURL();
        await loadOrderData();
        initializeSocket();
        setupEventListeners();
    });

    // Load tile URL from backend
    async function loadMapTileURL() {
        try {
            const response = await fetch('/api/map/tile-url');
            const data = await response.json();
            tileURL = data.tileURL;
        } catch (error) {
            console.error('Error loading tile URL:', error);
            tileURL = 'https://api.maptiler.com/maps/streets-v2/{z}/{x}/{y}.png?key=YOUR_KEY';
        }
    }

    // Load order data from backend
    async function loadOrderData() {
        try {
            const response = await fetch(`/api/consumer/tracking/order/${orderId}?consumer_id=${consumerId}`);
            const data = await response.json();

            if (data.success && data.order) {
                orderData = data.order;
                initializeMap();
                displayOrderInfo();
                hideLoading();
            } else {
                throw new Error(data.message || 'Failed to load order data');
            }
        } catch (error) {
            console.error('Error loading order data:', error);
            alert('Failed to load order information: ' + error.message);
            window.location.href = 'khadok.consumer.dashboard.html';
        }
    }

    // Initialize Leaflet map
    function initializeMap() {
        // Create map centered between restaurant and customer
        const centerLat = (parseFloat(orderData.restaurant_lat) + parseFloat(orderData.delivery_lat)) / 2;
        const centerLng = (parseFloat(orderData.restaurant_lng) + parseFloat(orderData.delivery_lng)) / 2;

        map = L.map('map', {
            zoomControl: true,
            scrollWheelZoom: true
        }).setView([centerLat, centerLng], 13);

        L.tileLayer(tileURL, {
            tileSize: 512,
            zoomOffset: -1,
            attribution: '© MapTiler © OpenStreetMap contributors',
            crossOrigin: true
        }).addTo(map);

        // Add restaurant marker
        const restaurantIcon = L.divIcon({
            html: `<div class="restaurant-marker-icon"><i class="fas fa-utensils"></i></div>`,
            iconSize: [50, 50],
            iconAnchor: [25, 50],
            popupAnchor: [0, -50],
            className: 'custom-div-icon'
        });

        restaurantMarker = L.marker(
            [parseFloat(orderData.restaurant_lat), parseFloat(orderData.restaurant_lng)],
            { icon: restaurantIcon }
        ).addTo(map);

        restaurantMarker.bindPopup(`
            <div style="text-align: center; padding: 12px; min-width: 200px;">
                <div style="font-size: 2rem; margin-bottom: 8px;">🍴</div>
                <h3 style="margin: 0 0 8px 0; color: #FF6B6B; font-size: 1.1rem;">${orderData.restaurant_name}</h3>
                <small style="color: #666; line-height: 1.5;">${orderData.restaurant_address}</small>
            </div>
        `);

        // Add customer marker (your location)
        const customerIcon = L.divIcon({
            html: `<div class="customer-marker-icon"><i class="fas fa-home"></i></div>`,
            iconSize: [50, 50],
            iconAnchor: [25, 50],
            popupAnchor: [0, -50],
            className: 'custom-div-icon'
        });

        customerMarker = L.marker(
            [parseFloat(orderData.delivery_lat), parseFloat(orderData.delivery_lng)],
            { icon: customerIcon }
        ).addTo(map);

        customerMarker.bindPopup(`
            <div style="text-align: center; padding: 12px; min-width: 200px;">
                <div style="font-size: 2rem; margin-bottom: 8px;">🏠</div>
                <h3 style="margin: 0 0 8px 0; color: #4CAF50; font-size: 1.1rem;">Your Location</h3>
                <small style="color: #666; line-height: 1.5;">${orderData.delivery_address}</small>
            </div>
        `);

        // Draw OSRM route from restaurant to customer
        drawOSRMRoute(
            parseFloat(orderData.restaurant_lat),
            parseFloat(orderData.restaurant_lng),
            parseFloat(orderData.delivery_lat),
            parseFloat(orderData.delivery_lng),
            '#95a5a6',
            5,
            0.4,
            true
        ).then(route => {
            fullRouteLine = route;
        });

        // Fit map to show all markers
        const bounds = L.latLngBounds([
            [parseFloat(orderData.restaurant_lat), parseFloat(orderData.restaurant_lng)],
            [parseFloat(orderData.delivery_lat), parseFloat(orderData.delivery_lng)]
        ]);
        map.fitBounds(bounds, { padding: [80, 80] });
    }

    // Draw route using OSRM (actual roads, not straight lines!)
    async function drawOSRMRoute(lat1, lng1, lat2, lng2, color, weight, opacity, dashed = false) {
        try {
            const url = `https://router.project-osrm.org/route/v1/driving/${lng1},${lat1};${lng2},${lat2}?overview=full&geometries=geojson`;
            
            const response = await fetch(url);
            const data = await response.json();

            if (data.code === 'Ok' && data.routes && data.routes.length > 0) {
                const route = data.routes[0];
                const coordinates = route.geometry.coordinates;
                const latLngs = coordinates.map(coord => [coord[1], coord[0]]);

                const polylineOptions = {
                    color: color,
                    weight: weight,
                    opacity: opacity,
                    smoothFactor: 1,
                    lineJoin: 'round',
                    lineCap: 'round'
                };

                if (dashed) {
                    polylineOptions.dashArray = '15, 10';
                }

                const polyline = L.polyline(latLngs, polylineOptions).addTo(map);

                return {
                    polyline: polyline,
                    distance: route.distance,
                    duration: route.duration
                };
            } else {
                return drawStraightLine(lat1, lng1, lat2, lng2, color, weight, opacity, dashed);
            }
        } catch (error) {
            console.error('OSRM routing error:', error);
            return drawStraightLine(lat1, lng1, lat2, lng2, color, weight, opacity, dashed);
        }
    }

    // Fallback: Draw straight line
    function drawStraightLine(lat1, lng1, lat2, lng2, color, weight, opacity, dashed) {
        const polylineOptions = {
            color: color,
            weight: weight,
            opacity: opacity
        };

        if (dashed) {
            polylineOptions.dashArray = '15, 10';
        }

        const polyline = L.polyline([[lat1, lng1], [lat2, lng2]], polylineOptions).addTo(map);

        return {
            polyline: polyline,
            distance: null,
            duration: null
        };
    }

    // Display order information in sidebar
    function displayOrderInfo() {
        const statusClass = `status-${orderData.delivery_status}`;
        const itemsHtml = orderData.items?.map(item => 
            `<li><i class="fas fa-check-circle"></i> ${item.quantity}x ${item.item_name}</li>`
        ).join('') || '<li>No items</li>';

        let riderInfoHtml = '';
        if (orderData.rider_name && orderData.rider_phone) {
            riderInfoHtml = `
                <div class="rider-info-card">
                    <h3><i class="fas fa-motorcycle"></i> Your Rider</h3>
                    <p><i class="fas fa-user"></i> ${orderData.rider_name}</p>
                    <p><i class="fas fa-phone-alt"></i> ${orderData.rider_phone}</p>
                </div>
            `;
        }

        document.getElementById('orderInfo').innerHTML = `
            <div class="info-card">
                <h3><i class="fas fa-receipt"></i> Order Details</h3>
                <p><strong>Order #${orderData.id}</strong></p>
                <p><i class="fas fa-store"></i> ${orderData.restaurant_name}</p>
                <span class="status-badge ${statusClass}">${formatStatus(orderData.delivery_status)}</span>
            </div>

            ${riderInfoHtml}

            <div class="info-card">
                <h3><i class="fas fa-shopping-bag"></i> Your Items</h3>
                <ul class="items-list">${itemsHtml}</ul>
            </div>

            <div class="info-card">
                <h3><i class="fas fa-money-bill-wave"></i> Total Amount</h3>
                <p class="amount">৳${formatNumber(orderData.total_amount)}</p>
                <p><i class="fas fa-credit-card"></i> ${orderData.payment_method.toUpperCase()}</p>
            </div>
        `;
    }

    // Initialize Socket.IO connection
    function initializeSocket() {
        socket = io();

        // Join tracking room for this order
        socket.emit('join-tracking', {
            orderId: orderId,
            consumerId: consumerId
        });

        // Listen for rider location updates
        socket.on('rider-location-update', (data) => {
            if (data.orderId === orderId) {
                updateRiderLocation(data.lat, data.lng);
            }
        });

        // Connection status
        socket.on('connect', () => {
            console.log('Socket connected');
            document.getElementById('locationIndicator').style.display = 'flex';
        });

        socket.on('disconnect', () => {
            console.log('Socket disconnected');
            document.getElementById('locationIndicator').style.display = 'none';
        });
    }

    // Update rider marker on map
    function updateRiderMarker(lat, lng) {
        const riderIcon = L.divIcon({
            html: `<div class="rider-marker-icon"><i class="fas fa-motorcycle"></i></div>`,
            iconSize: [60, 60],
            iconAnchor: [30, 30],
            popupAnchor: [0, -30],
            className: 'custom-div-icon'
        });

        if (riderMarker) {
            riderMarker.setLatLng([lat, lng]);
        } else {
            riderMarker = L.marker([lat, lng], { icon: riderIcon }).addTo(map);
            riderMarker.bindPopup(`
                <div style="text-align: center; padding: 12px;">
                    <div style="font-size: 2rem; margin-bottom: 8px;">🏍️</div>
                    <h3 style="margin: 0 0 8px 0; color: #2196F3; font-size: 1.1rem;">Rider Location</h3>
                    <strong style="color: #333;">${orderData.rider_name || 'Your Rider'}</strong>
                </div>
            `);
        }

        // Draw OSRM route from rider to customer
        updateRouteLine(lat, lng);
    }

    // Update route line using OSRM
    async function updateRouteLine(riderLat, riderLng) {
        if (routeLine && routeLine.polyline) {
            map.removeLayer(routeLine.polyline);
        }

        const destLat = parseFloat(orderData.delivery_lat);
        const destLng = parseFloat(orderData.delivery_lng);
        const color = '#4CAF50'; // Green route to customer

        routeLine = await drawOSRMRoute(riderLat, riderLng, destLat, destLng, color, 6, 0.9, false);
    }

    // Update distance and ETA
    async function updateDistanceInfo(riderLat, riderLng) {
        const customerLat = parseFloat(orderData.delivery_lat);
        const customerLng = parseFloat(orderData.delivery_lng);

        const distToYou = await getOSRMDistance(riderLat, riderLng, customerLat, customerLng);

        document.getElementById('distanceToYou').textContent = 
            distToYou ? distToYou.toFixed(2) + ' km' : '--';

        // Calculate ETA (assuming 30 km/h average speed)
        const avgSpeed = 30; // km/h
        const etaMinutes = distToYou ? (distToYou / avgSpeed) * 60 : 0;

        document.getElementById('etaInfo').innerHTML = 
            `<i class="fas fa-clock"></i><span>Arriving in ${Math.ceil(etaMinutes)} minutes</span>`;
    }

    // Get OSRM distance
    async function getOSRMDistance(lat1, lng1, lat2, lng2) {
        try {
            const url = `https://router.project-osrm.org/route/v1/driving/${lng1},${lat1};${lng2},${lat2}?overview=false`;
            const response = await fetch(url);
            const data = await response.json();

            if (data.code === 'Ok' && data.routes && data.routes.length > 0) {
                return data.routes[0].distance / 1000;
            }
            return null;
        } catch (error) {
            console.error('OSRM distance error:', error);
            return calculateDistance(lat1, lng1, lat2, lng2);
        }
    }

    // Calculate distance (Haversine formula - fallback)
    function calculateDistance(lat1, lon1, lat2, lon2) {
        const R = 6371;
        const dLat = toRad(lat2 - lat1);
        const dLon = toRad(lon2 - lon1);
        
        const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                  Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
                  Math.sin(dLon / 2) * Math.sin(dLon / 2);
        
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c;
    }

    function toRad(degrees) {
        return degrees * (Math.PI / 180);
    }

    // Update rider location from socket
    function updateRiderLocation(lat, lng) {
        updateRiderMarker(lat, lng);
        updateDistanceInfo(lat, lng);
    }

    // Setup event listeners
    function setupEventListeners() {
        const toggleBtn = document.getElementById('toggleSidebar');
        const sidebar = document.getElementById('sidebar');
        
        toggleBtn.addEventListener('click', () => {
            sidebar.classList.toggle('hidden');
            toggleBtn.classList.toggle('sidebar-hidden');
        });
    }

    // Show full route
    window.showRoute = function() {
        if (!orderData) return;

        const bounds = L.latLngBounds([
            [parseFloat(orderData.restaurant_lat), parseFloat(orderData.restaurant_lng)],
            [parseFloat(orderData.delivery_lat), parseFloat(orderData.delivery_lng)]
        ]);

        if (riderMarker) {
            const riderPos = riderMarker.getLatLng();
            bounds.extend([riderPos.lat, riderPos.lng]);
        }

        map.fitBounds(bounds, { padding: [80, 80] });
    };

    // Call rider
    window.callRider = function() {
        if (orderData && orderData.rider_phone) {
            window.location.href = `tel:${orderData.rider_phone}`;
        } else {
            alert('Rider contact not available yet.');
        }
    };

    // Go back to dashboard
    window.goBack = function() {
        window.location.href = 'khadok.consumer.dashboard.html';
    };

    // Format status text
    function formatStatus(status) {
        const statusMap = {
            'assigned': '📋 Assigned',
            'picked_up': '📦 Picked Up',
            'out_for_delivery': '🚚 Out for Delivery',
            'arrived': '📍 Arrived',
            'delivered': '✅ Delivered'
        };
        return statusMap[status] || status;
    }

    // Format numbers
    function formatNumber(num) {
        return Number(num).toLocaleString('en-IN');
    }

    // Hide loading overlay
    function hideLoading() {
        const overlay = document.getElementById('loadingOverlay');
        overlay.style.opacity = '0';
        setTimeout(() => {
            overlay.style.display = 'none';
        }, 300);
    }

})();
