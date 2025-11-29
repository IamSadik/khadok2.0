// Reservation Page JavaScript
document.addEventListener("DOMContentLoaded", () => {
  const consumerId = localStorage.getItem('consumer_id');
  
  if (!consumerId) {
    window.location.href = '../login.html';
    return;
  }

  let reservationToCancel = null;

  // Initialize
  init();

  async function init() {
    setupTabs();
    await loadAllReservations();
  }

  // Setup tab switching
  function setupTabs() {
    const tabButtons = document.querySelectorAll('.tab-btn');
    const tabContents = document.querySelectorAll('.tab-content');

    tabButtons.forEach(button => {
      button.addEventListener('click', () => {
        const tabName = button.dataset.tab;

        // Remove active class from all buttons and contents
        tabButtons.forEach(btn => btn.classList.remove('active'));
        tabContents.forEach(content => content.classList.remove('active'));

        // Add active class to clicked button and corresponding content
        button.classList.add('active');
        document.getElementById(`${tabName}-tab`).classList.add('active');
      });
    });
  }

  // Load all reservations
  async function loadAllReservations() {
    try {
      const response = await fetch(`/api/dine-in/consumer/${consumerId}`);
      const data = await response.json();

      if (data.success && data.reservations) {
        const reservations = data.reservations;
        
        // Separate reservations by type
        const upcoming = reservations.filter(r => 
          (r.status === 'approved') && 
          new Date(r.booking_time) > new Date()
        );
        
        const pending = reservations.filter(r => r.status === 'pending');
        
        const history = reservations.filter(r => 
          r.status === 'completed' || 
          r.status === 'cancelled' || 
          r.status === 'rejected' ||
          (r.status === 'approved' && new Date(r.booking_time) < new Date())
        );

        // Update badge counts
        document.getElementById('upcoming-count').textContent = upcoming.length;
        document.getElementById('pending-count').textContent = pending.length;

        // Update stats cards
        document.getElementById('upcoming-count-stat').textContent = upcoming.length;
        document.getElementById('pending-count-stat').textContent = pending.length;
        document.getElementById('total-count-stat').textContent = reservations.length;

        // Render each section
        renderReservations('upcoming-reservations', upcoming, 'upcoming');
        renderReservations('pending-reservations', pending, 'pending');
        renderReservations('history-reservations', history, 'history');
      } else {
        showEmptyState('upcoming-reservations', 'upcoming');
        showEmptyState('pending-reservations', 'pending');
        showEmptyState('history-reservations', 'history');
      }
    } catch (error) {
      console.error('Error loading reservations:', error);
      showError('upcoming-reservations');
      showError('pending-reservations');
      showError('history-reservations');
    }
  }

  // Render reservations
  function renderReservations(containerId, reservations, type) {
    const container = document.getElementById(containerId);

    if (reservations.length === 0) {
      showEmptyState(containerId, type);
      return;
    }

    container.innerHTML = reservations.map(reservation => createReservationCard(reservation, type)).join('');
  }

  // Create reservation card HTML
  function createReservationCard(reservation, type) {
    const bookingDate = new Date(reservation.booking_time);
    const formattedDate = bookingDate.toLocaleDateString('en-US', { 
      weekday: 'short', 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric' 
    });
    const formattedTime = bookingDate.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });

    const statusClass = `status-${reservation.status.toLowerCase()}`;
    
    // User can only cancel if status is 'pending' (not yet approved by restaurant)
    const canCancel = (reservation.status === 'pending') && 
                      new Date(reservation.booking_time) > new Date();

    return `
      <div class="reservation-card">
        <div class="card-header">
          <div class="restaurant-info">
            <h3>
              <i class="fas fa-utensils"></i>
              ${reservation.restaurant_name || 'Restaurant'}
            </h3>
            <p class="restaurant-address">
              <i class="fas fa-map-marker-alt"></i>
              ${reservation.address || 'Address not available'}
            </p>
          </div>
          <span class="status-badge ${statusClass}">${reservation.status}</span>
        </div>

        <div class="card-body">
          <div class="reservation-details">
            <div class="detail-item">
              <i class="fas fa-calendar-alt"></i>
              <div class="detail-content">
                <div class="detail-label">Date</div>
                <div class="detail-value">${formattedDate}</div>
              </div>
            </div>

            <div class="detail-item">
              <i class="fas fa-clock"></i>
              <div class="detail-content">
                <div class="detail-label">Time</div>
                <div class="detail-value">${formattedTime}</div>
              </div>
            </div>

            <div class="detail-item">
              <i class="fas fa-chair"></i>
              <div class="detail-content">
                <div class="detail-label">Table Type</div>
                <div class="detail-value">${reservation.table_size}-Person Table</div>
              </div>
            </div>

            <div class="detail-item">
              <i class="fas fa-hashtag"></i>
              <div class="detail-content">
                <div class="detail-label">Quantity</div>
                <div class="detail-value">${reservation.quantity} Table${reservation.quantity > 1 ? 's' : ''}</div>
              </div>
            </div>
          </div>

          ${reservation.message ? `
            <div class="message-section">
              <div class="detail-label">Special Message</div>
              <div class="detail-value">${reservation.message}</div>
            </div>
          ` : ''}
        </div>

        <div class="card-footer">
          ${canCancel ? `
            <button class="btn btn-cancel" onclick="openCancelModal(${reservation.dine_in_id})">
              <i class="fas fa-times-circle"></i> Cancel Reservation
            </button>
          ` : ''}
          
          ${reservation.phone_number ? `
            <button class="btn btn-view" onclick="window.location.href='tel:${reservation.phone_number}'">
              <i class="fas fa-phone"></i> Call Restaurant
            </button>
          ` : ''}
          
          ${type === 'history' && reservation.status === 'completed' ? `
            <button class="btn btn-reorder" onclick="bookAgain(${reservation.stakeholder_id})">
              <i class="fas fa-redo"></i> Book Again
            </button>
          ` : ''}
        </div>
      </div>
    `;
  }

  // Show empty state
  function showEmptyState(containerId, type) {
    const container = document.getElementById(containerId);
    let message = '';
    let icon = '';

    switch (type) {
      case 'upcoming':
        icon = 'fa-calendar-times';
        message = 'No upcoming reservations';
        break;
      case 'pending':
        icon = 'fa-hourglass-half';
        message = 'No pending reservations';
        break;
      case 'history':
        icon = 'fa-history';
        message = 'No reservation history';
        break;
    }

    container.innerHTML = `
      <div class="empty-state">
        <i class="fas ${icon}"></i>
        <h3>${message}</h3>
        <p>You haven't made any ${type} reservations yet.</p>
        <button class="btn-primary" onclick="window.location.href='khadok.consumer.dashboard.html'">
          <i class="fas fa-search"></i> Find Restaurants
        </button>
      </div>
    `;
  }

  // Show error state
  function showError(containerId) {
    const container = document.getElementById(containerId);
    container.innerHTML = `
      <div class="empty-state">
        <i class="fas fa-exclamation-triangle" style="color: #f56565;"></i>
        <h3>Failed to load reservations</h3>
        <p>Please try refreshing the page.</p>
        <button class="btn-primary" onclick="location.reload()">
          <i class="fas fa-sync"></i> Refresh
        </button>
      </div>
    `;
  }

  // Cancel modal functions
  window.openCancelModal = function(reservationId) {
    reservationToCancel = reservationId;
    document.getElementById('cancel-modal').classList.add('active');
  };

  window.closeCancelModal = function() {
    reservationToCancel = null;
    document.getElementById('cancel-modal').classList.remove('active');
  };

  window.confirmCancel = async function() {
    if (!reservationToCancel) return;

    try {
      const response = await fetch(`/api/dine-in/cancel/${reservationToCancel}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ consumer_id: consumerId })
      });

      const data = await response.json();

      if (data.success) {
        alert('✅ Reservation cancelled successfully!');
        closeCancelModal();
        await loadAllReservations(); // Reload reservations
      } else {
        alert('❌ ' + (data.message || 'Failed to cancel reservation'));
      }
    } catch (error) {
      console.error('Error cancelling reservation:', error);
      alert('❌ Failed to cancel reservation. Please try again.');
    }
  };

  // Book again function
  window.bookAgain = function(stakeholderId) {
    localStorage.setItem('selectedRestaurantId', stakeholderId);
    window.location.href = 'dine-in.html';
  };

  // Redirect to dashboard with dine-in filter
  window.redirectToDineIn = function() {
    // Simply redirect - the dashboard will handle the filter on load
    window.location.href = 'khadok.consumer.dashboard.html?filter=dine-in';
  };

  // Close modal on overlay click
  document.getElementById('cancel-modal').addEventListener('click', (e) => {
    if (e.target.id === 'cancel-modal') {
      closeCancelModal();
    }
  });
});
