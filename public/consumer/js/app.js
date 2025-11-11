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
