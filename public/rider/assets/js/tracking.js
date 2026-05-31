// Real-Time Delivery Tracking System with OSRM Road Routing
(function() {
    'use strict';

    // Get order ID from URL
    const urlParams = new URLSearchParams(window.location.search);
    const orderId = urlParams.get('orderId');
    const riderId = sessionStorage.getItem('rider_id') || localStorage.getItem('rider_id');

    if (!orderId || !riderId) {
        alert('Missing order or rider information!');
        window.location.href = 'index.html';
        return;
    }

    // Initialize map variables
    let map, tileURL;
    let riderMarker, restaurantMarker, customerMarker;
    let routeLine, fullRouteLine;
    let socket;
    let orderData = null;
    let currentRiderLocation = null;

    // Initialize on page load
    document.addEventListener('DOMContentLoaded', async function() {
        await loadMapTileURL();
        await loadOrderData();
        initializeSocket();
        await initOrderChat();
        setupEventListeners();
        startLocationTracking();
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
            const response = await fetch(`/api/rider/tracking/order/${orderId}?rider_id=${riderId}`);
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
            window.location.href = 'index.html';
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

        // Add restaurant marker with BEAUTIFUL icon
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
                <h3 style="margin: 0 0 8px 0; color: #FF6B6B; font-size: 1.1rem;">Pick Up Location</h3>
                <strong style="color: #333;">${orderData.restaurant_name}</strong><br>
                <small style="color: #666; line-height: 1.5;">${orderData.restaurant_address}</small>
            </div>
        `);

        // Add customer marker with BEAUTIFUL icon
        const customerIcon = L.divIcon({
            html: `<div class="customer-marker-icon"><i class="fas fa-user"></i></div>`,
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
                <h3 style="margin: 0 0 8px 0; color: #4CAF50; font-size: 1.1rem;">Delivery Location</h3>
                <strong style="color: #333;">${orderData.consumer_name}</strong><br>
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

    // Draw route using OSRM with fallback options
    async function drawOSRMRoute(lat1, lng1, lat2, lng2, color, weight, opacity, dashed = false) {
        try {
            // Try OSRM first with timeout
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout

            // OSRM uses lng,lat order (not lat,lng)
            const url = `https://router.project-osrm.org/route/v1/driving/${lng1},${lat1};${lng2},${lat2}?overview=full&geometries=geojson`;
            
            const response = await fetch(url, { 
                signal: controller.signal,
                mode: 'cors'
            });
            clearTimeout(timeoutId);

            const data = await response.json();

            if (data.code === 'Ok' && data.routes && data.routes.length > 0) {
                const route = data.routes[0];
                const coordinates = route.geometry.coordinates;

                // Convert to Leaflet format [lat, lng]
                const latLngs = coordinates.map(coord => [coord[1], coord[0]]);

                // Create styled polyline
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

                console.log('✅ OSRM route drawn successfully');

                // Return route info
                return {
                    polyline: polyline,
                    distance: route.distance,
                    duration: route.duration
                };
            } else {
                console.warn('⚠️ OSRM returned no routes, using straight line');
                return drawStraightLine(lat1, lng1, lat2, lng2, color, weight, opacity, dashed);
            }
        } catch (error) {
            if (error.name === 'AbortError') {
                console.warn('⚠️ OSRM request timed out, using straight line');
            } else {
                console.warn('⚠️ OSRM error:', error.message);
            }
            // Fallback to straight line
            return drawStraightLine(lat1, lng1, lat2, lng2, color, weight, opacity, dashed);
        }
    }

    // Fallback: Draw straight line if OSRM fails
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

        // Calculate approximate distance using Haversine
        const distance = calculateDistance(lat1, lng1, lat2, lng2) * 1000; // Convert to meters
        const avgSpeed = 30; // km/h
        const duration = (distance / 1000 / avgSpeed) * 3600; // Convert to seconds

        console.log('📏 Using straight line fallback');

        return {
            polyline: polyline,
            distance: distance,
            duration: duration
        };
    }

    // Display order information in sidebar
    function displayOrderInfo() {
        const statusClass = `status-${orderData.delivery_status}`;
        const itemsHtml = orderData.items?.map(item => 
            `<li><i class="fas fa-check-circle"></i> ${item.quantity}x ${item.item_name}</li>`
        ).join('') || '<li>No items</li>';

        document.getElementById('orderInfo').innerHTML = `
            <div class="info-card">
                <h3><i class="fas fa-receipt"></i> Order Details</h3>
                <p><strong>Order #${orderData.id}</strong></p>
                <p><i class="fas fa-store"></i> ${orderData.restaurant_name}</p>
                <span class="status-badge ${statusClass}">${formatStatus(orderData.delivery_status)}</span>
            </div>

            <div class="info-card">
                <h3><i class="fas fa-user-circle"></i> Customer Information</h3>
                <p><i class="fas fa-user"></i> ${orderData.consumer_name}</p>
                <p><i class="fas fa-phone-alt"></i> ${orderData.consumer_phone}</p>
                <p><i class="fas fa-map-marker-alt"></i> ${orderData.delivery_address}</p>
            </div>

            <div class="info-card">
                <h3><i class="fas fa-shopping-bag"></i> Order Items</h3>
                <ul class="items-list">${itemsHtml}</ul>
            </div>

            <div class="info-card">
                <h3><i class="fas fa-money-bill-wave"></i> Payment</h3>
                <p class="amount">৳${formatNumber(orderData.total_amount)}</p>
                <p><i class="fas fa-credit-card"></i> ${orderData.payment_method.toUpperCase()}</p>
            </div>
        `;
    }

    async function initOrderChat() {
        if (typeof OrderChat === 'undefined' || !orderData) return;
        const chat = new OrderChat({
            orderId,
            senderType: 'rider',
            senderId: riderId,
            peerLabel: orderData.consumer_name || 'Customer',
            container: '#order-chat-container',
            socket,
        });
        await chat.init();
    }

    // Initialize Socket.IO connection
    function initializeSocket() {
        socket = io();

        // Join tracking room for this order
        socket.emit('join-tracking', {
            orderId: orderId,
            riderId: riderId
        });

        // Listen for rider location updates from server
        socket.on('rider-location-update', (data) => {
            if (data.orderId === orderId) {
                updateRiderLocation(data.lat, data.lng);
            }
        });

        // Connection status
        socket.on('connect', () => {
            console.log('Socket connected');
            socket.emit('registerRider', riderId);
            document.getElementById('locationIndicator').style.display = 'flex';
        });

        socket.on('disconnect', () => {
            console.log('Socket disconnected');
            document.getElementById('locationIndicator').style.display = 'none';
        });
    }

    // Start continuous location tracking
    function startLocationTracking() {
        if (!navigator.geolocation) {
            alert('Geolocation is not supported by your browser');
            return;
        }

        // Watch position for continuous updates
        navigator.geolocation.watchPosition(
            (position) => {
                const { latitude, longitude } = position.coords;
                currentRiderLocation = { lat: latitude, lng: longitude };

                // Update rider marker on map
                updateRiderMarker(latitude, longitude);

                // Send location to server via Socket.IO
                socket.emit('update-rider-location', {
                    orderId: orderId,
                    riderId: riderId,
                    lat: latitude,
                    lng: longitude
                });

                // Update distances and ETA
                updateDistanceInfo(latitude, longitude);
            },
            (error) => {
                console.error('Geolocation error:', error);
                alert('Unable to get your location. Please enable GPS.');
            },
            {
                enableHighAccuracy: true,
                timeout: 5000,
                maximumAge: 0
            }
        );
    }

    // Update rider marker on map with GORGEOUS animated icon
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
                    <h3 style="margin: 0 0 8px 0; color: #2196F3; font-size: 1.1rem;">You Are Here</h3>
                    <strong style="color: #333;">Rider Location</strong>
                </div>
            `);
        }

        // Draw OSRM route from rider to destination
        updateRouteLine(lat, lng);
    }

    // Update route line based on delivery status using OSRM
    async function updateRouteLine(riderLat, riderLng) {
        // Remove old route line
        if (routeLine && routeLine.polyline) {
            map.removeLayer(routeLine.polyline);
        }

        let destLat, destLng, color;

        // Determine destination and color based on order status
        if (orderData.delivery_status === 'assigned' || orderData.delivery_status === 'pending_rider') {
            // Going to restaurant - use RESTAURANT ICON COLOR (RED)
            destLat = parseFloat(orderData.restaurant_lat);
            destLng = parseFloat(orderData.restaurant_lng);
            color = '#FF6B6B'; // Red - matches restaurant icon
        } else if (orderData.delivery_status === 'picked_up' || orderData.delivery_status === 'out_for_delivery' || orderData.delivery_status === 'arrived') {
            // Going to customer - use CUSTOMER ICON COLOR (GREEN)
            destLat = parseFloat(orderData.delivery_lat);
            destLng = parseFloat(orderData.delivery_lng);
            color = '#4CAF50'; // Green - matches customer icon
        } else {
            // Default: going to customer
            destLat = parseFloat(orderData.delivery_lat);
            destLng = parseFloat(orderData.delivery_lng);
            color = '#4CAF50'; // Green - matches customer icon
        }

        // Draw animated OSRM route
        routeLine = await drawOSRMRoute(riderLat, riderLng, destLat, destLng, color, 6, 0.9, false);
    }

    // Update distance information
    async function updateDistanceInfo(riderLat, riderLng) {
        const restaurantLat = parseFloat(orderData.restaurant_lat);
        const restaurantLng = parseFloat(orderData.restaurant_lng);
        const customerLat = parseFloat(orderData.delivery_lat);
        const customerLng = parseFloat(orderData.delivery_lng);

        // Get OSRM distance to restaurant
        const distToRestaurant = await getOSRMDistance(riderLat, riderLng, restaurantLat, restaurantLng);
        const distToCustomer = await getOSRMDistance(riderLat, riderLng, customerLat, customerLng);

        // Update UI
        document.getElementById('distanceToRestaurant').textContent = 
            distToRestaurant ? distToRestaurant.toFixed(2) + ' km' : '--';
        document.getElementById('distanceToCustomer').textContent = 
            distToCustomer ? distToCustomer.toFixed(2) + ' km' : '--';

        // Calculate ETA (assuming 30 km/h average speed)
        const avgSpeed = 30; // km/h
        let etaMinutes;

        if (orderData.delivery_status === 'assigned' || orderData.delivery_status === 'picked_up') {
            etaMinutes = distToRestaurant ? (distToRestaurant / avgSpeed) * 60 : 0;
        } else {
            etaMinutes = distToCustomer ? (distToCustomer / avgSpeed) * 60 : 0;
        }

        document.getElementById('etaInfo').innerHTML = 
            `<i class="fas fa-clock"></i><span>ETA: ${Math.ceil(etaMinutes)} minutes</span>`;
    }

    // Get OSRM distance with timeout and fallback
    async function getOSRMDistance(lat1, lng1, lat2, lng2) {
        try {
            // Add timeout to prevent hanging
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout

            const url = `https://router.project-osrm.org/route/v1/driving/${lng1},${lat1};${lng2},${lat2}?overview=false`;
            const response = await fetch(url, { 
                signal: controller.signal,
                mode: 'cors'
            });
            clearTimeout(timeoutId);

            const data = await response.json();

            if (data.code === 'Ok' && data.routes && data.routes.length > 0) {
                return data.routes[0].distance / 1000; // Convert to km
            }
            // If OSRM fails, fallback to Haversine
            return calculateDistance(lat1, lng1, lat2, lng2);
        } catch (error) {
            if (error.name === 'AbortError') {
                console.warn('⚠️ OSRM distance request timed out, using Haversine');
            } else {
                console.warn('⚠️ OSRM distance error:', error.message);
            }
            // Fallback to Haversine formula
            return calculateDistance(lat1, lng1, lat2, lng2);
        }
    }

    // Calculate distance between two points (Haversine formula - fallback)
    function calculateDistance(lat1, lon1, lat2, lon2) {
        const R = 6371; // Earth's radius in km
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
        // Toggle sidebar
        const toggleBtn = document.getElementById('toggleSidebar');
        const sidebar = document.getElementById('sidebar');
        
        toggleBtn.addEventListener('click', () => {
            sidebar.classList.toggle('hidden');
            toggleBtn.classList.toggle('sidebar-hidden');
        });
    }

    // Center map on rider location
    window.centerOnRider = function() {
        if (currentRiderLocation && map) {
            map.setView([currentRiderLocation.lat, currentRiderLocation.lng], 17);
            riderMarker.openPopup();
        } else {
            alert('Waiting for location...');
        }
    };

    // Show full route
    window.showRoute = function() {
        if (!orderData) return;

        const bounds = L.latLngBounds([
            [parseFloat(orderData.restaurant_lat), parseFloat(orderData.restaurant_lng)],
            [parseFloat(orderData.delivery_lat), parseFloat(orderData.delivery_lng)]
        ]);

        if (currentRiderLocation) {
            bounds.extend([currentRiderLocation.lat, currentRiderLocation.lng]);
        }

        map.fitBounds(bounds, { padding: [80, 80] });
    };

    // Go back to dashboard
    window.goBack = function() {
        if (confirm('Are you sure you want to leave tracking?')) {
            window.location.href = 'index.html';
        }
    };

    // Format status text with icons
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
