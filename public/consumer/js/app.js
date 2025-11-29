async function logout() {
    const sessionId = localStorage.getItem("sessionId");
  
    if (!sessionId) {
      alert("No session found.");
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
        localStorage.removeItem("sessionId");   // Remove session ID
        localStorage.removeItem("consumer_id"); // Remove consumer ID
        alert(data.message); // Show success message
        window.location.href = '../login.html';
      } else {
        alert(data.message || "Logout failed.");
        window.location.href = '../login.html'; // Redirect to login page on error
      }
    } catch (err) {
      console.error("Logout error:", err);
      alert("Something went wrong.");
      window.location.href = '../login.html'; // Redirect to login page on error
    }
  }

// ───────── Location Modal Control ─────────
document.addEventListener('DOMContentLoaded', () => {
  const openLocationBtn = document.getElementById('open-location-btn');
  const locationModal = document.getElementById('location-modal');
  const locationModalClose = document.getElementById('location-modal-close');
  const locationCancelBtn = document.getElementById('location-cancel-btn');
  const locationSaveBtn = document.getElementById('location-save-btn');

  // Open modal when location button is clicked
  if (openLocationBtn) {
    openLocationBtn.addEventListener('click', () => {
      if (locationModal) {
        locationModal.classList.remove('hidden');
        locationModal.setAttribute('aria-hidden', 'false');
        // Trigger map initialization
        setTimeout(() => {
          if (window.mapInstance) {
            window.mapInstance.invalidateSize();
          }
        }, 100);
      }
    });
  }

  // Close modal when close button is clicked
  if (locationModalClose) {
    locationModalClose.addEventListener('click', () => {
      if (locationModal) {
        locationModal.classList.add('hidden');
        locationModal.setAttribute('aria-hidden', 'true');
      }
    });
  }

  // Close modal when cancel button is clicked
  if (locationCancelBtn) {
    locationCancelBtn.addEventListener('click', () => {
      if (locationModal) {
        locationModal.classList.add('hidden');
        locationModal.setAttribute('aria-hidden', 'true');
      }
    });
  }

  // Close modal when clicking on backdrop
  const backdrop = document.querySelector('.location-modal-backdrop');
  if (backdrop) {
    backdrop.addEventListener('click', () => {
      if (locationModal) {
        locationModal.classList.add('hidden');
        locationModal.setAttribute('aria-hidden', 'true');
      }
    });
  }

  // Save location button functionality
  if (locationSaveBtn) {
    locationSaveBtn.addEventListener('click', () => {
      const addressEl = document.getElementById('selected-address');
      const coordsEl = document.getElementById('selected-coords');
      const locationName = document.getElementById('location-name');
      
      if (addressEl && locationName) {
        // Update the navbar with selected location
        locationName.textContent = addressEl.textContent || 'Selected location';
        
        // Close the modal
        if (locationModal) {
          locationModal.classList.add('hidden');
          locationModal.setAttribute('aria-hidden', 'true');
        }
      }
    });
  }
});

// ✅ REMOVED OLD CODE - Now using viewRestaurant() function instead

(function checkAuthOnLoad() {
    const sessionId = localStorage.getItem("sessionId");

    if (!sessionId) {
      // Prevent access if not logged in
      window.location.replace("../login.html");
    }
  })();


  
// 🔥 GLOBAL SCOPE - Store restaurants data globally
let allRestaurants = [];
let currentFilter = 'delivery'; // Track current filter: 'all', 'delivery', 'pickup', 'dine-in'
let currentSort = 'relevance'; // Track current sort: 'relevance', 'rating', 'distance', 'fastest'
let searchQuery = ''; // Track current search query

// 🔥 GLOBAL FUNCTION - View restaurant details (must be global for onclick to work)
window.viewRestaurant = function(restaurantId) {
  console.log('🔥 Opening restaurant:', restaurantId, typeof restaurantId);
  console.log('🔥 All available restaurants:', allRestaurants);
  
  // 🔥 Convert restaurantId to number for proper comparison (since it comes from onclick as string)
  const idToFind = parseInt(restaurantId);
  
  // Find the restaurant data from allRestaurants - compare as numbers
  const restaurant = allRestaurants.find(r => parseInt(r.stakeholder_id) === idToFind);
  
  console.log('🔥 Found restaurant object:', restaurant);
  
  if (restaurant) {
    // 🔥 Store comprehensive restaurant data in localStorage for use in menu/cart
    localStorage.setItem('selectedRestaurantId', restaurantId);
    localStorage.setItem('selectedRestaurantName', restaurant.restaurant_name || '');
    
    // 🔥 Store location data (check for undefined/null)
    localStorage.setItem('selectedRestaurantLat', restaurant.lat !== undefined && restaurant.lat !== null ? restaurant.lat : '');
    localStorage.setItem('selectedRestaurantLng', restaurant.lng !== undefined && restaurant.lng !== null ? restaurant.lng : '');
    
    // 🔥 Store service types (delivery, pickup, dine-in)
    localStorage.setItem('selectedRestaurantType', restaurant.type || '[]');
    
    // 🔥 Store distance data (ensure we store as string)
    localStorage.setItem('selectedRestaurantDistance', restaurant.road_distance !== undefined && restaurant.road_distance !== null ? String(restaurant.road_distance) : '0');
    localStorage.setItem('selectedRestaurantDistanceMeters', restaurant.road_distance_meters !== undefined && restaurant.road_distance_meters !== null ? String(restaurant.road_distance_meters) : '0');
    
    // 🔥 Store time data (ensure we store as string)
    localStorage.setItem('selectedRestaurantTravelTime', restaurant.travel_time !== undefined && restaurant.travel_time !== null ? String(restaurant.travel_time) : '0');
    localStorage.setItem('selectedRestaurantFoodPrepTime', restaurant.food_prep_time !== undefined && restaurant.food_prep_time !== null ? String(restaurant.food_prep_time) : '0');
    localStorage.setItem('selectedRestaurantEstimatedTime', restaurant.estimated_time !== undefined && restaurant.estimated_time !== null ? String(restaurant.estimated_time) : '0');
    
    console.log('✅ Restaurant data saved to localStorage:', {
      id: restaurantId,
      name: restaurant.restaurant_name,
      lat: restaurant.lat,
      lng: restaurant.lng,
      type: restaurant.type,
      distance: restaurant.road_distance,
      distanceMeters: restaurant.road_distance_meters,
      travelTime: restaurant.travel_time,
      foodPrepTime: restaurant.food_prep_time,
      estimatedTime: restaurant.estimated_time
    });
    
    // 🔥 Verify data was saved
    console.log('✅ Verification - Reading back from localStorage:', {
      id: localStorage.getItem('selectedRestaurantId'),
      name: localStorage.getItem('selectedRestaurantName'),
      lat: localStorage.getItem('selectedRestaurantLat'),
      lng: localStorage.getItem('selectedRestaurantLng'),
      type: localStorage.getItem('selectedRestaurantType'),
      distance: localStorage.getItem('selectedRestaurantDistance'),
      distanceMeters: localStorage.getItem('selectedRestaurantDistanceMeters'),
      travelTime: localStorage.getItem('selectedRestaurantTravelTime'),
      foodPrepTime: localStorage.getItem('selectedRestaurantFoodPrepTime'),
      estimatedTime: localStorage.getItem('selectedRestaurantEstimatedTime')
    });
  } else {
    console.error('❌ Restaurant not found in allRestaurants array!');
    console.error('❌ Looking for ID:', idToFind, typeof idToFind);
    console.error('❌ Available restaurant IDs:', allRestaurants.map(r => ({ id: r.stakeholder_id, type: typeof r.stakeholder_id })));
  }
  
  // Check current filter to determine which page to navigate to
  if (currentFilter === 'dine-in') {
    // Navigate to dine-in page for table reservations
    window.location.href = `dine-in.html?restaurant_id=${restaurantId}`;
  } else if (currentFilter === 'pickup') {
    // Navigate to pickup page
    window.location.href = `pickup.html?restaurant_id=${restaurantId}`;
  } else {
    // Navigate to menu page for delivery
    window.location.href = `menu.html?restaurant_id=${restaurantId}`;
  }
};

  //<!-- Load Nearby Restaurants -->
  document.addEventListener('DOMContentLoaded', async () => {
    const restaurantContainer = document.getElementById('restaurant-container');
    const consumerId = localStorage.getItem("consumer_id");

    // Store the current map instance globally so we can remove it when refreshing
    let currentRestaurantsMap = null;

    // 🔹 Wait for location to be loaded from database before proceeding
    console.log('⏳ Waiting for location to be loaded from database...');
    const locationReady = await window.locationReadyPromise;
    
    if (!locationReady) {
      console.warn('❌ Location not ready, cannot load restaurants');
      restaurantContainer.innerHTML = `
        <div class="no-restaurants">
          <i class="fas fa-map-marker-alt" style="font-size: 3rem; color: #ccc;"></i>
          <h3>Location not set</h3>
          <p>Please set your location to see nearby restaurants</p>
        </div>
      `;
      return;
    }

    console.log('✅ Location ready, proceeding to load restaurants...');

    // 🔥 Check for URL parameter BEFORE loading restaurants
    const urlParams = new URLSearchParams(window.location.search);
    const filterParam = urlParams.get('filter');
    
    if (filterParam === 'dine-in') {
      currentFilter = 'dine-in';
      console.log('✅ Setting dine-in filter from URL parameter');
      // Clear URL parameter immediately
      window.history.replaceState({}, document.title, window.location.pathname);
    }

    // 🔥 Setup service filter buttons (Delivery, Pickup, Dine-in)
    function setupFilterButtons() {
      const filterButtons = document.querySelectorAll('.service-buttons button');
      
      // 🔥 Set initial active state based on currentFilter
      filterButtons.forEach((button) => {
        const buttonText = button.textContent.trim().toLowerCase();
        
        if ((buttonText.includes('delivery') && currentFilter === 'delivery') ||
            (buttonText.includes('pickup') && currentFilter === 'pickup') ||
            (buttonText.includes('dine-in') && currentFilter === 'dine-in')) {
          button.classList.add('active');
        } else {
          button.classList.remove('active');
        }
        
        // Add click event
        button.addEventListener('click', () => {
          // Remove active class from all buttons
          filterButtons.forEach(btn => btn.classList.remove('active'));
          
          // Add active class to clicked button
          button.classList.add('active');
          
          // Determine filter type based on button text
          const buttonText = button.textContent.trim().toLowerCase();
          if (buttonText.includes('delivery')) {
            currentFilter = 'delivery';
          } else if (buttonText.includes('pickup')) {
            currentFilter = 'pickup';
          } else if (buttonText.includes('dine-in')) {
            currentFilter = 'dine-in';
          }
          
          console.log('🔍 Filter applied:', currentFilter);
          
          // Apply filter and current sort
          applyFilterAndSort();
        });
      });
    }

    // 🔥 Setup sort buttons (Relevance, Top Rated, Distance, Fastest)
    function setupSortButtons() {
      const sortButtons = document.querySelectorAll('.sort-options button');
      
      sortButtons.forEach((button) => {
        button.addEventListener('click', () => {
          // Remove active class from all sort buttons
          sortButtons.forEach(btn => btn.classList.remove('active'));
          
          // Add active class to clicked button
          button.classList.add('active');
          
          // Determine sort type based on button text
          const buttonText = button.textContent.trim().toLowerCase();
          if (buttonText.includes('relevance')) {
            currentSort = 'relevance';
          } else if (buttonText.includes('top rated') || buttonText.includes('rated')) {
            currentSort = 'rating';
          } else if (buttonText.includes('distance')) {
            currentSort = 'distance';
          } else if (buttonText.includes('fastest')) {
            currentSort = 'fastest';
          }
          
          console.log('📊 Sort applied:', currentSort);
          
          // Apply current filter and new sort
          applyFilterAndSort();
        });
      });
    }

    // 🔥 Function to parse type string from database
    function parseRestaurantTypes(typeString) {
      if (!typeString) return [];
      
      try {
        // Type comes as string like: "[\"delivery\",\"pickup\",\"dine-in\"]"
        // Parse it to array
        const types = JSON.parse(typeString);
        return types.map(t => t.toLowerCase().trim());
      } catch (error) {
        console.error('Error parsing restaurant types:', error, typeString);
        return [];
      }
    }

    // 🔥 Function to sort restaurants based on selected criteria
    function sortRestaurants(restaurants) {
      const sorted = [...restaurants]; // Create a copy to avoid mutating original
      
      switch (currentSort) {
        case 'rating':
          // Sort by rating (highest first), null ratings go to end
          sorted.sort((a, b) => {
            const ratingA = a.ratings !== null ? parseFloat(a.ratings) : -1;
            const ratingB = b.ratings !== null ? parseFloat(b.ratings) : -1;
            return ratingB - ratingA;
          });
          console.log('✅ Sorted by rating (highest first)');
          break;
          
        case 'distance':
          // Sort by road distance (nearest first)
          sorted.sort((a, b) => {
            const distA = a.road_distance !== null ? parseFloat(a.road_distance) : Infinity;
            const distB = b.road_distance !== null ? parseFloat(b.road_distance) : Infinity;
            return distA - distB;
          });
          console.log('✅ Sorted by distance (nearest first)');
          break;
          
        case 'fastest':
          // Sort by estimated_time (fastest delivery first)
          sorted.sort((a, b) => {
            const timeA = a.estimated_time !== null ? parseFloat(a.estimated_time) : Infinity;
            const timeB = b.estimated_time !== null ? parseFloat(b.estimated_time) : Infinity;
            return timeA - timeB;
          });
          console.log('✅ Sorted by delivery time (fastest first)');
          break;
          
        case 'relevance':
        default:
          // Keep original order (API returns by distance by default)
          console.log('✅ Using default relevance order');
          break;
      }
      
      return sorted;
    }

    // 🔥 Function to filter and sort restaurants
    function applyFilterAndSort() {
      let filteredRestaurants = allRestaurants;
      
      // Step 1: Apply search query filter
      if (searchQuery.trim() !== '') {
        const query = searchQuery.toLowerCase().trim();
        filteredRestaurants = filteredRestaurants.filter(restaurant => {
          const name = restaurant.restaurant_name ? restaurant.restaurant_name.toLowerCase() : '';
          const address = restaurant.address ? restaurant.address.toLowerCase() : '';
          return name.includes(query) || address.includes(query);
        });
        
        console.log(`🔍 Search filtered to ${filteredRestaurants.length} restaurants matching "${searchQuery}"`);
      }
      
      // Step 2: Apply service type filter
      if (currentFilter !== 'all') {
        filteredRestaurants = filteredRestaurants.filter(restaurant => {
          const types = parseRestaurantTypes(restaurant.type);
          return types.includes(currentFilter);
        });
        
        console.log(`✅ Filtered ${filteredRestaurants.length} restaurants with ${currentFilter} service`);
      }
      
      // Step 3: Apply sorting
      const sortedRestaurants = sortRestaurants(filteredRestaurants);
      
      // Step 4: Display filtered and sorted restaurants
      displayRestaurants(sortedRestaurants);
      
      // Step 5: Update map with filtered restaurants
      const lat = parseFloat(localStorage.getItem('current_user_lat'));
      const lng = parseFloat(localStorage.getItem('current_user_lng'));
      initializeRestaurantsMap(sortedRestaurants, lat, lng);
    }

    // Function to fetch and display nearby restaurants
    async function loadNearbyRestaurants() {
      try {
        // 🔥 Get coordinates directly from localStorage
        const lat = localStorage.getItem('current_user_lat');
        const lng = localStorage.getItem('current_user_lng');

        if (!lat || !lng) {
          console.warn('No location data found in localStorage');
          restaurantContainer.innerHTML = `
            <div class="no-restaurants">
              <i class="fas fa-map-marker-alt" style="font-size: 3rem; color: #ccc;"></i>
              <h3>Location not set</h3>
              <p>Please set your location to see nearby restaurants</p>
            </div>
          `;
          
          // Show empty map container message
          const mapContainer = document.getElementById('restaurants-map-container');
          if (mapContainer) {
            mapContainer.innerHTML = `
              <div style="display: flex; align-items: center; justify-content: center; height: 100%; background: #f5f5f5; border-radius: 12px;">
                <p style="color: #999; font-size: 1.1rem;">
                  <i class="fas fa-map-marker-alt"></i> Set your location to view restaurants on map
                </p>
              </div>
            `;
          }
          return;
        }

        console.log('📍 Loading restaurants for location:', { lat, lng });

        // Show loading state
        restaurantContainer.innerHTML = '<div class="loading">🔍 Finding delicious restaurants near you...</div>';
        
        // Show loading in map section
        const mapContainer = document.getElementById('restaurants-map-container');
        if (mapContainer) {
          mapContainer.innerHTML = `
            <div style="display: flex; align-items: center; justify-content: center; height: 100%; background: #f5f5f5; border-radius: 12px;">
              <p style="color: #999; font-size: 1.1rem;">
                <i class="fas fa-spinner fa-spin"></i> Loading map...
              </p>
            </div>
          `;
        }

        // Fetch nearby restaurants from API
        const radius = 12; // 12 km radius
        const response = await fetch(
          `/api/restaurant/nearby?lat=${lat}&lng=${lng}&radius=${radius}&useRoadDistance=true`
        );

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        console.log('📍 Nearby restaurants:', data);

        // Check if we have restaurants
        if (!data.restaurants || data.restaurants.length === 0) {
          allRestaurants = []; // Clear stored restaurants
          restaurantContainer.innerHTML = `
            <div class="no-restaurants">
              <i class="fas fa-utensils" style="font-size: 3rem; color: #ccc;"></i>
              <h3>No restaurants found nearby</h3>
              <p>Try expanding your search radius or check back later</p>
            </div>
          `;
          
          // Show empty map for no restaurants
          if (mapContainer && currentRestaurantsMap) {
            currentRestaurantsMap.remove();
            currentRestaurantsMap = null;
          }
          if (mapContainer) {
            mapContainer.innerHTML = `
              <div style="display: flex; align-items: center; justify-content: center; height: 100%; background: #f5f5f5; border-radius: 12px;">
                <p style="color: #999; font-size: 1.1rem;">
                  <i class="fas fa-utensils"></i> No restaurants found in this area
                </p>
              </div>
            `;
          }
          return;
        }

        // 🔥 Store all restaurants globally for filtering and sorting
        allRestaurants = data.restaurants;
        
        // Reset sort to 'relevance' (first sort button is active by default)
        currentSort = 'relevance';
        
        // Apply initial filter and sort (currentFilter is already set from URL param check)
        applyFilterAndSort();

      } catch (error) {
        console.error('❌ Error loading restaurants:', error);
        restaurantContainer.innerHTML = `
          <div class="error-message">
            <i class="fas fa-exclamation-triangle" style="font-size: 3rem; color: #ff6b6b;"></i>
            <h3>Oops! Something went wrong</h3>
            <p>Unable to load restaurants. Please try again later.</p>
            <button onclick="window.loadNearbyRestaurants()" class="primary-btn" style="margin-top: 15px;">
              <i class="fas fa-redo"></i> Retry
            </button>
          </div>
        `;
      }
    }

    // 🗺️ Function to initialize the restaurants map
    async function initializeRestaurantsMap(restaurants, userLat, userLng) {
      const mapContainer = document.getElementById('restaurants-map-container');
      
      if (!mapContainer || !restaurants || restaurants.length === 0) {
        console.warn('Map container not found or no restaurants to display');
        
        // Show message when no restaurants match filter
        if (mapContainer && restaurants && restaurants.length === 0) {
          mapContainer.innerHTML = `
            <div style="display: flex; align-items: center; justify-content: center; height: 100%; background: #f5f5f5; border-radius: 12px;">
              <p style="color: #999; font-size: 1.1rem;">
                <i class="fas fa-filter"></i> No restaurants available for selected filter
              </p>
            </div>
          `;
        }
        return;
      }

      // 🔥 Remove existing map instance if it exists to prevent duplication
      if (currentRestaurantsMap) {
        console.log('🗑️ Removing old map instance...');
        try {
          currentRestaurantsMap.off();
          currentRestaurantsMap.remove();
          currentRestaurantsMap = null;
        } catch (err) {
          console.warn('Error removing old map:', err);
        }
      }

      // 🔥 Clear the container HTML completely and recreate it
      mapContainer.innerHTML = '';
      const mapDiv = document.createElement('div');
      mapDiv.id = 'restaurants-map-inner';
      mapDiv.style.height = '100%';
      mapDiv.style.width = '100%';
      mapContainer.appendChild(mapDiv);

      // Fetch tile URL
      let tileURL = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';
      try {
        const res = await fetch('/api/map/tile-url');
        const data = await res.json();
        tileURL = data.tileURL;
      } catch (err) {
        console.error('Failed to fetch tile URL:', err);
      }

      // Initialize map centered on user's location using the new div
      currentRestaurantsMap = L.map('restaurants-map-inner', {
        zoomControl: true,
        scrollWheelZoom: true,
        doubleClickZoom: true,
        touchZoom: true
      }).setView([userLat, userLng], 13);

      // Add tile layer
      L.tileLayer(tileURL, {
        tileSize: 512,
        zoomOffset: -1,
        attribution: "<a href='https://www.maptiler.com/' target='_blank'>© MapTiler</a> <a href='https://www.openstreetmap.org/' target='_blank'>© OSM</a>"
      }).addTo(currentRestaurantsMap);

      // Create custom user icon
      const userIcon = L.divIcon({
        html: `<div style="
          background-color: #4285f4;
          width: 24px;
          height: 24px;
          border-radius: 50%;
          border: 3px solid white;
          box-shadow: 0 2px 8px rgba(0,0,0,0.3);
          display: flex;
          align-items: center;
          justify-content: center;
        ">
          <i class="fas fa-user" style="color: white; font-size: 12px;"></i>
        </div>`,
        className: 'custom-user-marker',
        iconSize: [30, 30],
        iconAnchor: [15, 15]
      });

      // Add user marker
      const userMarker = L.marker([userLat, userLng], { icon: userIcon }).addTo(currentRestaurantsMap);
      userMarker.bindPopup(`
        <div class="restaurant-popup">
          <h4><i class="fas fa-map-marker-alt"></i> Your Location</h4>
          <p>You are here</p>
        </div>
      `);

      // Create custom restaurant icon
      const createRestaurantIcon = (restaurantName) => {
        return L.divIcon({
          html: `<div style="
            background-color: #e91e63;
            width: 28px;
            height: 28px;
            border-radius: 50%;
            border: 3px solid white;
            box-shadow: 0 2px 8px rgba(0,0,0,0.3);
            display: flex;
            align-items: center;
            justify-content: center;
            position: relative;
          ">
            <i class="fas fa-utensils" style="color: white; font-size: 13px;"></i>
          </div>`,
          className: 'custom-restaurant-marker',
          iconSize: [34, 34],
          iconAnchor: [17, 17]
        });
      };

      // Add restaurant markers
      restaurants.forEach(restaurant => {
        if (restaurant.lat && restaurant.lng) {
          const restaurantIcon = createRestaurantIcon(restaurant.restaurant_name);
          
          // Calculate distance display
          let distance;
          if (restaurant.road_distance !== null && restaurant.road_distance !== undefined) {
            if (restaurant.road_distance < 1 && restaurant.road_distance_meters !== null) {
              distance = `${restaurant.road_distance_meters} m`;
            } else {
              distance = `${restaurant.road_distance.toFixed(1)} km`;
            }
          } else {
            distance = 'N/A';
          }

          const rating = restaurant.ratings !== null && restaurant.ratings !== undefined
            ? restaurant.ratings 
            : 'N/A';
          
          const deliveryTime = restaurant.estimated_time !== null && restaurant.estimated_time !== undefined
            ? `${Math.max(1, Math.round(restaurant.estimated_time))} min` 
            : 'N/A';

          const marker = L.marker([parseFloat(restaurant.lat), parseFloat(restaurant.lng)], { 
            icon: restaurantIcon,
            title: restaurant.restaurant_name // Show name on hover
          }).addTo(currentRestaurantsMap);

          // Bind popup with restaurant details
          marker.bindPopup(`
            <div class="restaurant-popup">
              <h4><i class="fas fa-store"></i> ${restaurant.restaurant_name}</h4>
              <p style="margin: 5px 0;"><i class="fas fa-map-marker-alt" style="color: #e91e63;"></i> ${distance} away</p>
              <p style="margin: 5px 0;"><i class="fas fa-star" style="color: #ffc107;"></i> Rating: ${rating}</p>
              <p style="margin: 5px 0;"><i class="fas fa-clock" style="color: #4CAF50;"></i> ${deliveryTime}</p>
              ${restaurant.address ? `<p style="margin: 5px 0; font-size: 12px; color: #888;">${restaurant.address}</p>` : ''}
            </div>
          `);

          // Add hover effect to show restaurant name
          marker.on('mouseover', function(e) {
            this.openPopup();
          });
        }
      });

      // Fit map to show all markers
      const allLatLngs = [
        [userLat, userLng],
        ...restaurants
          .filter(r => r.lat && r.lng)
          .map(r => [parseFloat(r.lat), parseFloat(r.lng)])
      ];
      
      if (allLatLngs.length > 1) {
        const bounds = L.latLngBounds(allLatLngs);
        currentRestaurantsMap.fitBounds(bounds, { padding: [50, 50] });
      }

      console.log('✅ Restaurants map initialized with', restaurants.length, 'restaurants');
    }

    // Function to display restaurants in the grid
    function displayRestaurants(restaurants) {
      if (!restaurants || restaurants.length === 0) {
        restaurantContainer.innerHTML = `
          <div class="no-restaurants">
            <i class="fas fa-filter" style="font-size: 3rem; color: #ccc;"></i>
            <h3>No restaurants found</h3>
            <p>No restaurants available with the selected filter (${currentFilter})</p>
          </div>
        `;
        return;
      }

      restaurantContainer.innerHTML = restaurants.map(restaurant => {
        // Get restaurant image or use placeholder
        const imageUrl = restaurant.picture 
          ? `/uploads/${restaurant.picture}` 
          : 'images/placeholder-restaurant.jpg';

        // Use road_distance_meters for distances < 1km, otherwise use road_distance
        let distance;
        if (restaurant.road_distance !== null && restaurant.road_distance !== undefined) {
          if (restaurant.road_distance < 1 && restaurant.road_distance_meters !== null) {
            // Show in meters if less than 1 km
            distance = `${restaurant.road_distance_meters} m`;
          } else {
            // Show in km
            distance = `${restaurant.road_distance.toFixed(1)} km`;
          }
        } else {
          distance = 'N/A';
        }

        // Get rating from API (can be null)
        const rating = restaurant.ratings !== null && restaurant.ratings !== undefined
          ? restaurant.ratings 
          : 'N/A';
        
        // Use estimated_time from API (check for null/undefined, not falsy)
        const deliveryTime = restaurant.estimated_time !== null && restaurant.estimated_time !== undefined
          ? `${Math.max(1, Math.round(restaurant.estimated_time))} min` // Minimum 1 min
          : 'N/A';

        // Convert 24hr to 12hr format and determine if open
        function convertTo12Hour(time24) {
          if (!time24) return '';
          const [hours, minutes] = time24.split(':').map(Number);
          const period = hours >= 12 ? 'PM' : 'AM';
          const hours12 = hours % 12 || 12;
          return `${hours12}:${minutes.toString().padStart(2, '0')} ${period}`;
        }

        // Check if restaurant is currently open
        function isRestaurantOpen(opensAt, closesAt) {
          if (!opensAt || !closesAt) return true; // Default to open if times not set
          
          const now = new Date();
          const currentMinutes = now.getHours() * 60 + now.getMinutes();
          
          const [openHour, openMin] = opensAt.split(':').map(Number);
          const [closeHour, closeMin] = closesAt.split(':').map(Number);
          
          const openMinutes = openHour * 60 + openMin;
          const closeMinutes = closeHour * 60 + closeMin;
          
          // Handle cases where closing time is past midnight
          if (closeMinutes < openMinutes) {
            return currentMinutes >= openMinutes || currentMinutes <= closeMinutes;
          }
          
          return currentMinutes >= openMinutes && currentMinutes <= closeMinutes;
        }

        const isOpen = isRestaurantOpen(restaurant.opens_at, restaurant.closes_at);
        const opensAt12hr = convertTo12Hour(restaurant.opens_at);
        const closesAt12hr = convertTo12Hour(restaurant.closes_at);

        // Make card non-clickable if closed
        const cardClass = isOpen ? 'restaurant-card' : 'restaurant-card restaurant-card-closed';
        const onclickAttr = isOpen ? `onclick="viewRestaurant('${restaurant.stakeholder_id}')"` : '';

        return `
          <div class="${cardClass}" ${onclickAttr} ${!isOpen ? 'style="cursor: not-allowed; opacity: 0.7;"' : ''}>
            <img src="${imageUrl}" alt="${restaurant.restaurant_name}" onerror="this.src='images/placeholder-restaurant.jpg'">
            <div class="restaurant-info">
              <h4>${restaurant.restaurant_name}</h4>
              <p style="color: #777; font-size: 0.9rem; margin: 5px 0;">
                ${restaurant.address || 'Restaurant Address'}
              </p>
              <div class="restaurant-meta">
                <span title="Rating">
                  <i class="fas fa-star" style="color: #ffc107;"></i> ${rating}
                </span>
                <span title="Distance (Road)">
                  <i class="fas fa-map-marker-alt" style="color: #e91e63;"></i> ${distance}
                </span>
                <span title="Estimated Delivery Time">
                  <i class="fas fa-clock" style="color: #4CAF50;"></i> ${deliveryTime}
                </span>
              </div>
              ${isOpen 
                ? `<span class="badge badge-open">Open Now (${opensAt12hr} - ${closesAt12hr})</span>` 
                : `<span class="badge badge-closed">Closed (Opens at ${opensAt12hr})</span>`}
            </div>
          </div>
        `;
      }).join('');
    }

    // Make loadNearbyRestaurants globally accessible
    window.loadNearbyRestaurants = loadNearbyRestaurants;

    // 🔥 Setup filter buttons
    setupFilterButtons();
    
    // 🔥 Setup sort buttons
    setupSortButtons();

    // 🔥 Setup search functionality
    function setupSearchBar() {
      const searchInput = document.getElementById('search');
      const searchButton = document.querySelector('.search-btn');
      const searchSuggestions = document.getElementById('search-suggestions');
      
      if (!searchInput) {
        console.warn('Search input not found');
        return;
      }

      // Debounce function to avoid excessive filtering
      let searchTimeout = null;
      
      // Function to show autocomplete suggestions
      function showSuggestions(query) {
        if (!query || query.trim() === '') {
          searchSuggestions.classList.add('hidden');
          return;
        }

        const normalizedQuery = query.toLowerCase().trim();
        
        // 🔥 Filter restaurants that match the search query AND current filter
        let matchingRestaurants = allRestaurants.filter(restaurant => {
          const name = restaurant.restaurant_name ? restaurant.restaurant_name.toLowerCase() : '';
          const address = restaurant.address ? restaurant.address.toLowerCase() : '';
          const matchesSearch = name.includes(normalizedQuery) || address.includes(normalizedQuery);
          
          // 🔥 Also apply current filter (delivery, pickup, dine-in)
          if (currentFilter !== 'all') {
            const types = parseRestaurantTypes(restaurant.type);
            const matchesFilter = types.includes(currentFilter);
            return matchesSearch && matchesFilter;
          }
          
          return matchesSearch;
        });

        // Limit to top 8 suggestions
        const topSuggestions = matchingRestaurants.slice(0, 8);

        if (topSuggestions.length === 0) {
          searchSuggestions.innerHTML = `<div class="no-results"><i class="fas fa-search"></i> No restaurants found matching "${query}" for ${currentFilter} service</div>`;
          searchSuggestions.classList.remove('hidden');
          return;
        }

        // Build suggestions HTML
        const suggestionsHTML = topSuggestions.map(restaurant => {
          // Calculate distance display
          let distance = 'N/A';
          if (restaurant.road_distance !== null && restaurant.road_distance !== undefined) {
            if (restaurant.road_distance < 1 && restaurant.road_distance_meters !== null) {
              distance = `${restaurant.road_distance_meters} m`;
            } else {
              distance = `${restaurant.road_distance.toFixed(1)} km`;
            }
          }

          const rating = restaurant.ratings !== null && restaurant.ratings !== undefined
            ? restaurant.ratings 
            : 'N/A';
          
          const deliveryTime = restaurant.estimated_time !== null && restaurant.estimated_time !== undefined
            ? `${Math.max(1, Math.round(restaurant.estimated_time))} min` 
            : 'N/A';

          const address = restaurant.address || 'Address not available';

          return `
            <li data-restaurant-id="${restaurant.stakeholder_id}" class="suggestion-item">
              <span class="suggestion-icon"><i class="fas fa-utensils"></i></span>
              <div class="suggestion-text">
                <div class="suggestion-name">${restaurant.restaurant_name}</div>
                <div class="suggestion-address">${address}</div>
                <div class="suggestion-meta">
                  <span><i class="fas fa-star" style="color: #ffc107;"></i> ${rating}</span>
                  <span><i class="fas fa-map-marker-alt" style="color: #e91e63;"></i> ${distance}</span>
                  <span><i class="fas fa-clock" style="color: #4CAF50;"></i> ${deliveryTime}</span>
                </div>
              </div>
            </li>
          `;
        }).join('');

        searchSuggestions.innerHTML = suggestionsHTML;
        searchSuggestions.classList.remove('hidden');

        // Add click event to each suggestion
        const suggestionItems = searchSuggestions.querySelectorAll('.suggestion-item');
        suggestionItems.forEach(item => {
          item.addEventListener('click', () => {
            const restaurantId = item.getAttribute('data-restaurant-id');
            const restaurantName = item.querySelector('.suggestion-name').textContent;
            
            // Update search input with selected restaurant name
            searchInput.value = restaurantName;
            
            // Hide suggestions
            searchSuggestions.classList.add('hidden');
            
            // Navigate to restaurant details
            viewRestaurant(restaurantId);
          });
        });
      }

      // Handle input event (real-time search as user types)
      searchInput.addEventListener('input', (e) => {
        clearTimeout(searchTimeout);
        
        const query = e.target.value;
        
        // Show suggestions immediately for autocomplete
        searchTimeout = setTimeout(() => {
          showSuggestions(query);
        }, 150); // Faster response for autocomplete (150ms)
        
        // Also apply filter after a longer delay
        setTimeout(() => {
          searchQuery = query;
          console.log('🔍 Searching for:', searchQuery);
          applyFilterAndSort();
        }, 300);
      });

      // Handle search button click
      if (searchButton) {
        searchButton.addEventListener('click', () => {
          searchQuery = searchInput.value;
          console.log('🔍 Search button clicked:', searchQuery);
          searchSuggestions.classList.add('hidden');
          applyFilterAndSort();
        });
      }

      // Handle Enter key press
      searchInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          searchQuery = searchInput.value;
          console.log('🔍 Enter key pressed:', searchQuery);
          searchSuggestions.classList.add('hidden');
          applyFilterAndSort();
        }
      });

      // Handle Escape key to close suggestions
      searchInput.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
          searchSuggestions.classList.add('hidden');
        }
      });

      // Close suggestions when clicking outside
      document.addEventListener('click', (e) => {
        if (!searchInput.contains(e.target) && !searchSuggestions.contains(e.target)) {
          searchSuggestions.classList.add('hidden');
        }
      });

      // Focus event - show suggestions if there's a value
      searchInput.addEventListener('focus', () => {
        if (searchInput.value.trim() !== '') {
          showSuggestions(searchInput.value);
        }
      });
    }

    // 🔥 Setup search bar
    setupSearchBar();

    // 🔹 Load restaurants (localStorage is now guaranteed to be set)
    await loadNearbyRestaurants();
  });