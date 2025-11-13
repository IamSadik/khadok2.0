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

document.querySelectorAll(".restaurant-card").forEach((card) => {
    card.addEventListener("click", () => {
        const restaurantId = card.getAttribute("data-id");
        const restaurantName = card.getAttribute("data-name");

        // Save to localStorage
        localStorage.setItem("selectedRestaurantId", restaurantId);
        localStorage.setItem("selectedRestaurantName", restaurantName);

        // Navigate to the menu page
        window.location.href = "menu.html";
    });
});


(function checkAuthOnLoad() {
    const sessionId = localStorage.getItem("sessionId");

    if (!sessionId) {
      // Prevent access if not logged in
      window.location.replace("../login.html");
    }
  })();


  


  //<!-- Load Nearby Restaurants -->
  document.addEventListener('DOMContentLoaded', async () => {
    const restaurantContainer = document.getElementById('restaurant-container');
    const consumerId = localStorage.getItem("consumer_id");

    // 🔹 FIRST: Fetch location from database and update localStorage
    async function fetchLocationFromDatabase() {
      if (!consumerId) {
        console.error("No consumer_id found");
        return false;
      }

      try {
        const res = await fetch(`/api/location/${consumerId}`);
        const data = await res.json();

        if (data.success && data.lat && data.lng) {
          const lat = parseFloat(data.lat);
          const lng = parseFloat(data.lng);

          // Update localStorage with fresh data from database
          localStorage.setItem("current_user_lat", lat);
          localStorage.setItem("current_user_lng", lng);

          console.log("✅ Location refreshed from database:", { lat, lng });
          return true;
        } else {
          console.warn("⚠️ No location data in database");
          return false;
        }
      } catch (err) {
        console.error("❌ Failed to fetch location from database:", err);
        return false;
      }
    }

    // Function to fetch and display nearby restaurants
    async function loadNearbyRestaurants() {
      try {
        // Get coordinates from localStorage (already updated from database)
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
          return;
        }

        // Show loading state
        restaurantContainer.innerHTML = '<div class="loading">🔍 Finding delicious restaurants near you...</div>';

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
          restaurantContainer.innerHTML = `
            <div class="no-restaurants">
              <i class="fas fa-utensils" style="font-size: 3rem; color: #ccc;"></i>
              <h3>No restaurants found nearby</h3>
              <p>Try expanding your search radius or check back later</p>
            </div>
          `;
          return;
        }

        // Display restaurants
        displayRestaurants(data.restaurants);

      } catch (error) {
        console.error('❌ Error loading restaurants:', error);
        restaurantContainer.innerHTML = `
          <div class="error-message">
            <i class="fas fa-exclamation-triangle" style="font-size: 3rem; color: #ff6b6b;"></i>
            <h3>Oops! Something went wrong</h3>
            <p>Unable to load restaurants. Please try again later.</p>
            <button onclick="loadNearbyRestaurants()" class="primary-btn" style="margin-top: 15px;">
              <i class="fas fa-redo"></i> Retry
            </button>
          </div>
        `;
      }
    }

    // Function to display restaurants in the grid
    function displayRestaurants(restaurants) {
      if (!restaurants || restaurants.length === 0) {
        restaurantContainer.innerHTML = '<div class="loading">No restaurants available</div>';
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

    // Function to view restaurant details (you can implement this later)
    window.viewRestaurant = function(restaurantId) {
      console.log('Opening restaurant:', restaurantId);
      // TODO: Navigate to restaurant details page or show modal
      window.location.href = `restaurant-details.html?id=${restaurantId}`;
    };

    // Make loadNearbyRestaurants globally accessible for retry button
    window.loadNearbyRestaurants = loadNearbyRestaurants;

    // 🔹 IMPORTANT: First fetch location from database, THEN load restaurants
    const locationFetched = await fetchLocationFromDatabase();
    if (locationFetched) {
      await loadNearbyRestaurants();
    } else {
      // Try to load with existing localStorage data if database fetch fails
      await loadNearbyRestaurants();
    }

    // Reload restaurants when location is updated from the modal
    const saveLocationBtn = document.getElementById('location-save-btn');
    if (saveLocationBtn) {
      saveLocationBtn.addEventListener('click', () => {
        // Wait a bit for localStorage to update, then reload
        setTimeout(() => {
          loadNearbyRestaurants();
        }, 500);
      });
    }
  });