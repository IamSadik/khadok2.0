document.addEventListener("DOMContentLoaded", () => {
  const restaurantNameEl = document.getElementById("restaurant-name");
  const restaurantBreadcrumb = document.getElementById("restaurant-breadcrumb");
  const restaurantNameDetail = document.getElementById("restaurant-name-detail");
  const restaurantPicture = document.getElementById("restaurant-picture");
  const restaurantAddress = document.getElementById("restaurant-address");
  const restaurantHours = document.getElementById("restaurant-hours");
  const restaurantRating = document.getElementById("restaurant-rating");
  const restaurantPhone = document.getElementById("restaurant-phone");
  const reservationForm = document.getElementById("reservation-form");

  let stakeholderId = null;
  let restaurantData = null;

  // Get stakeholder_id from URL parameter
  const urlParams = new URLSearchParams(window.location.search);
  stakeholderId = urlParams.get('restaurant_id');

  if (!stakeholderId) {
    alert("No restaurant selected");
    window.location.href = "khadok.consumer.dashboard.html";
    return;
  }

  // Initialize
  init();

  async function init() {
    await fetchRestaurantInfo();
    setupReservationForm();
    setMinimumDate();
  }

  // Fetch restaurant info
  async function fetchRestaurantInfo() {
    try {
      const res = await fetch(`/api/restaurant/${stakeholderId}`);
      const data = await res.json();
      
      if (data) {
        restaurantData = data;
        displayRestaurantInfo(data);
      }
    } catch (error) {
      console.error("Failed to fetch restaurant info:", error);
      alert("Could not load restaurant information");
    }
  }

  // Display restaurant information
  function displayRestaurantInfo(restaurant) {
    const name = restaurant.restaurant_name || "Restaurant";
    
    restaurantNameEl.textContent = name;
    restaurantBreadcrumb.textContent = name;
    restaurantNameDetail.textContent = name;

    // Set restaurant picture
    if (restaurant.picture) {
      restaurantPicture.src = `/uploads/${restaurant.picture}`;
    }

    // Set address
    if (restaurant.address) {
      restaurantAddress.querySelector('span').textContent = restaurant.address;
    }

    // Set hours
    if (restaurant.opens_at && restaurant.closes_at) {
      const opensAt = convertTo12Hour(restaurant.opens_at);
      const closesAt = convertTo12Hour(restaurant.closes_at);
      restaurantHours.querySelector('span').textContent = `${opensAt} - ${closesAt}`;
    } else {
      restaurantHours.querySelector('span').textContent = 'Hours not available';
    }

    // Set rating
    if (restaurant.ratings) {
      restaurantRating.querySelector('span').textContent = `${restaurant.ratings} / 5.0`;
    } else {
      restaurantRating.querySelector('span').textContent = 'No ratings yet';
    }

    // Set phone
    if (restaurant.phone_number) {
      restaurantPhone.querySelector('span').textContent = restaurant.phone_number;
    } else {
      restaurantPhone.querySelector('span').textContent = 'Contact not available';
    }
  }

  // Convert 24hr to 12hr format
  function convertTo12Hour(time24) {
    if (!time24) return '';
    const [hours, minutes] = time24.split(':').map(Number);
    const period = hours >= 12 ? 'PM' : 'AM';
    const hours12 = hours % 12 || 12;
    return `${hours12}:${minutes.toString().padStart(2, '0')} ${period}`;
  }

  // Set minimum date to today
  function setMinimumDate() {
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('reservation-date').setAttribute('min', today);
  }

  // Setup reservation form
  function setupReservationForm() {
    reservationForm.addEventListener('submit', async (e) => {
      e.preventDefault();

      const consumerId = localStorage.getItem('consumer_id');
      if (!consumerId) {
        alert('Please log in to make a reservation');
        return;
      }

      // Get form values
      const guestName = document.getElementById('guest-name').value.trim();
      const guestPhone = document.getElementById('guest-phone').value.trim();
      const reservationDate = document.getElementById('reservation-date').value;
      const reservationTime = document.getElementById('reservation-time').value;
      const numGuests = document.getElementById('num-guests').value;
      const tablePreference = document.getElementById('table-preference').value;
      const specialRequests = document.getElementById('special-requests').value.trim();

      // Validate date is not in the past
      const selectedDate = new Date(`${reservationDate}T${reservationTime}`);
      const now = new Date();
      if (selectedDate < now) {
        alert('Please select a future date and time');
        return;
      }

      // Create reservation object
      const reservationData = {
        consumer_id: consumerId,
        stakeholder_id: stakeholderId,
        restaurant_name: restaurantData?.restaurant_name || 'Restaurant',
        guest_name: guestName,
        guest_phone: guestPhone,
        reservation_date: reservationDate,
        reservation_time: reservationTime,
        num_guests: numGuests,
        table_preference: tablePreference || 'No preference',
        special_requests: specialRequests || 'None'
      };

      try {
        // TODO: Replace with actual API endpoint when backend is ready
        console.log('Reservation data:', reservationData);
        
        // For now, show success message
        alert(`
          ✅ Reservation Request Submitted!
          
          Restaurant: ${reservationData.restaurant_name}
          Date: ${reservationDate}
          Time: ${reservationTime}
          Guests: ${numGuests}
          
          The restaurant will contact you shortly to confirm your reservation.
        `);

        // Reset form
        reservationForm.reset();
        
        // Redirect to dashboard
        setTimeout(() => {
          window.location.href = 'khadok.consumer.dashboard.html';
        }, 2000);

      } catch (error) {
        console.error('Reservation error:', error);
        alert('Failed to submit reservation. Please try again.');
      }
    });
  }
});