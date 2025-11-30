// Stakeholder Reservation Management JavaScript
let allReservations = [];
let filteredReservations = [];
let currentFilter = 'all';
let stakeholderId = null;
let pendingStatusUpdate = null;

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
    // Check authentication
    checkAuth();
    
    // Load stakeholder ID
    stakeholderId = localStorage.getItem('stakeholder_id');
    
    if (!stakeholderId) {
        alert('Please log in to continue');
        window.location.href = '../login.html';
        return;
    }
    
    // Load reservations
    loadReservations();
});

// Check authentication
function checkAuth() {
    const sessionId = localStorage.getItem('sessionId');
    if (!sessionId) {
        window.location.replace('../login.html');
    }
}

// Load all reservations for the restaurant
async function loadReservations() {
    const grid = document.getElementById('reservations-grid');
    
    // Show loading state
    grid.innerHTML = `
        <div class="loading-state">
            <i class="fas fa-spinner fa-spin"></i>
            <p>Loading reservations...</p>
        </div>
    `;
    
    try {
        const response = await fetch(`/api/dine-in/restaurant/${stakeholderId}`);
        const data = await response.json();
        
        if (data.success) {
            allReservations = data.reservations;
            filteredReservations = allReservations;
            
            // Update statistics
            updateStatistics();
            
            // Update tab counts
            updateTabCounts();
            
            // Render reservations
            renderReservations();
        } else {
            showError('Failed to load reservations');
        }
    } catch (error) {
        console.error('Error loading reservations:', error);
        showError('Error loading reservations. Please try again.');
    }
}

// Update statistics cards
function updateStatistics() {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    const stats = {
        pending: 0,
        approvedToday: 0,
        upcoming: 0,
        total: allReservations.length
    };
    
    allReservations.forEach(reservation => {
        if (reservation.status === 'pending') {
            stats.pending++;
        }
        
        if (reservation.status === 'approved') {
            const createdDate = new Date(reservation.created_at);
            if (createdDate >= today) {
                stats.approvedToday++;
            }
            
            const bookingTime = new Date(reservation.booking_time);
            if (bookingTime > now) {
                stats.upcoming++;
            }
        }
    });
    
    document.getElementById('pending-count').textContent = stats.pending;
    document.getElementById('approved-count').textContent = stats.approvedToday;
    document.getElementById('upcoming-count').textContent = stats.upcoming;
    document.getElementById('total-count').textContent = stats.total;
}

// Update tab counts
function updateTabCounts() {
    const counts = {
        all: allReservations.length,
        pending: 0,
        approved: 0,
        completed: 0,
        cancelled: 0
    };
    
    allReservations.forEach(reservation => {
        if (counts[reservation.status] !== undefined) {
            counts[reservation.status]++;
        }
    });
    
    document.getElementById('all-count').textContent = counts.all;
    document.getElementById('pending-tab-count').textContent = counts.pending;
    document.getElementById('approved-tab-count').textContent = counts.approved;
    document.getElementById('completed-tab-count').textContent = counts.completed;
    document.getElementById('cancelled-tab-count').textContent = counts.cancelled;
}

// Filter reservations by status
function filterReservations(status) {
    currentFilter = status;
    
    // Update active tab
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('active');
        if (btn.dataset.tab === status) {
            btn.classList.add('active');
        }
    });
    
    // Filter reservations
    if (status === 'all') {
        filteredReservations = allReservations;
    } else {
        filteredReservations = allReservations.filter(r => r.status === status);
    }
    
    // Apply current search if any
    const searchTerm = document.getElementById('search-input').value.toLowerCase();
    if (searchTerm) {
        filteredReservations = filteredReservations.filter(r => 
            r.consumer_name.toLowerCase().includes(searchTerm) ||
            r.consumer_email.toLowerCase().includes(searchTerm)
        );
    }
    
    renderReservations();
}

// Search reservations
function searchReservations() {
    const searchTerm = document.getElementById('search-input').value.toLowerCase();
    
    // Start with current filter
    if (currentFilter === 'all') {
        filteredReservations = allReservations;
    } else {
        filteredReservations = allReservations.filter(r => r.status === currentFilter);
    }
    
    // Apply search
    if (searchTerm) {
        filteredReservations = filteredReservations.filter(r => 
            r.consumer_name.toLowerCase().includes(searchTerm) ||
            r.consumer_email.toLowerCase().includes(searchTerm)
        );
    }
    
    renderReservations();
}

// Sort reservations
function sortReservations() {
    const sortBy = document.getElementById('sort-select').value;
    
    switch(sortBy) {
        case 'date-desc':
            filteredReservations.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
            break;
        case 'date-asc':
            filteredReservations.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
            break;
        case 'booking-time':
            filteredReservations.sort((a, b) => new Date(a.booking_time) - new Date(b.booking_time));
            break;
        case 'table-size':
            filteredReservations.sort((a, b) => a.table_size - b.table_size);
            break;
    }
    
    renderReservations();
}

// Render reservations
function renderReservations() {
    const grid = document.getElementById('reservations-grid');
    
    if (filteredReservations.length === 0) {
        grid.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-calendar-times"></i>
                <h3>No Reservations Found</h3>
                <p>There are no reservations matching your current filter.</p>
            </div>
        `;
        return;
    }
    
    grid.innerHTML = filteredReservations.map(reservation => createReservationCard(reservation)).join('');
}

// Create reservation card HTML
function createReservationCard(reservation) {
    const bookingDate = new Date(reservation.booking_time);
    const createdDate = new Date(reservation.created_at);
    
    const formattedBookingDate = bookingDate.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
    });
    
    const formattedBookingTime = bookingDate.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit'
    });
    
    const formattedCreatedDate = createdDate.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
    });
    
    // Determine which action buttons to show
    let actionButtons = '';
    if (reservation.status === 'pending') {
        actionButtons = `
            <button class="btn btn-approve" onclick="updateStatus(${reservation.dine_in_id}, 'approved')">
                <i class="fas fa-check"></i> Approve
            </button>
            <button class="btn btn-reject" onclick="updateStatus(${reservation.dine_in_id}, 'rejected')">
                <i class="fas fa-times"></i> Reject
            </button>
        `;
    } else if (reservation.status === 'approved') {
        actionButtons = `
            <button class="btn btn-complete" onclick="updateStatus(${reservation.dine_in_id}, 'completed')">
                <i class="fas fa-check-double"></i> Complete
            </button>
        `;
    }
    
    actionButtons += `
        <button class="btn btn-view-details" onclick="viewDetails(${reservation.dine_in_id})">
            <i class="fas fa-info-circle"></i> Details
        </button>
    `;
    
    return `
        <div class="reservation-card">
            <div class="card-header">
                <div class="reservation-id">ID: #${reservation.dine_in_id}</div>
                <div class="customer-info">
                    <h3><i class="fas fa-user"></i> ${reservation.consumer_name || 'Guest'}</h3>
                    <div class="customer-email">
                        <i class="fas fa-envelope"></i>
                        ${reservation.consumer_email || 'No email'}
                    </div>
                </div>
                <span class="status-badge status-${reservation.status}">${reservation.status}</span>
            </div>
            
            <div class="card-body">
                <div class="reservation-details">
                    <div class="detail-item">
                        <i class="fas fa-calendar"></i>
                        <div class="detail-content">
                            <div class="detail-label">Booking Date</div>
                            <div class="detail-value">${formattedBookingDate}</div>
                        </div>
                    </div>
                    
                    <div class="detail-item">
                        <i class="fas fa-clock"></i>
                        <div class="detail-content">
                            <div class="detail-label">Booking Time</div>
                            <div class="detail-value">${formattedBookingTime}</div>
                        </div>
                    </div>
                    
                    <div class="detail-item">
                        <i class="fas fa-chair"></i>
                        <div class="detail-content">
                            <div class="detail-label">Table Size</div>
                            <div class="detail-value">${reservation.table_size} Person</div>
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
                        <div class="detail-label">Special Request</div>
                        <div class="detail-value">${reservation.message}</div>
                    </div>
                ` : ''}
            </div>
            
            <div class="card-footer">
                ${actionButtons}
            </div>
        </div>
    `;
}

// View reservation details in modal
function viewDetails(reservationId) {
    const reservation = allReservations.find(r => r.dine_in_id === reservationId);
    
    if (!reservation) {
        alert('Reservation not found');
        return;
    }
    
    const bookingDate = new Date(reservation.booking_time);
    const createdDate = new Date(reservation.created_at);
    
    const modalBody = document.getElementById('modal-body');
    modalBody.innerHTML = `
        <div class="detail-grid">
            <div class="detail-box">
                <div class="label">Reservation ID</div>
                <div class="value">#${reservation.dine_in_id}</div>
            </div>
            
            <div class="detail-box">
                <div class="label">Status</div>
                <div class="value">
                    <span class="status-badge status-${reservation.status}">${reservation.status}</span>
                </div>
            </div>
            
            <div class="detail-box">
                <div class="label">Customer Name</div>
                <div class="value">${reservation.consumer_name || 'Guest'}</div>
            </div>
            
            <div class="detail-box">
                <div class="label">Customer Email</div>
                <div class="value">${reservation.consumer_email || 'No email'}</div>
            </div>
            
            <div class="detail-box">
                <div class="label">Booking Date</div>
                <div class="value">${bookingDate.toLocaleDateString('en-US', { 
                    weekday: 'long', 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric' 
                })}</div>
            </div>
            
            <div class="detail-box">
                <div class="label">Booking Time</div>
                <div class="value">${bookingDate.toLocaleTimeString('en-US', { 
                    hour: '2-digit', 
                    minute: '2-digit' 
                })}</div>
            </div>
            
            <div class="detail-box">
                <div class="label">Table Size</div>
                <div class="value">${reservation.table_size} Person</div>
            </div>
            
            <div class="detail-box">
                <div class="label">Number of Tables</div>
                <div class="value">${reservation.quantity} Table${reservation.quantity > 1 ? 's' : ''}</div>
            </div>
            
            <div class="detail-box">
                <div class="label">Created At</div>
                <div class="value">${createdDate.toLocaleDateString('en-US', { 
                    year: 'numeric', 
                    month: 'short', 
                    day: 'numeric' 
                })} ${createdDate.toLocaleTimeString('en-US', { 
                    hour: '2-digit', 
                    minute: '2-digit' 
                })}</div>
            </div>
            
            <div class="detail-box">
                <div class="label">Consumer ID</div>
                <div class="value">#${reservation.consumer_id}</div>
            </div>
            
            ${reservation.message ? `
                <div class="detail-box full-width">
                    <div class="label">Special Request / Message</div>
                    <div class="value">${reservation.message}</div>
                </div>
            ` : ''}
        </div>
        
        ${reservation.status === 'pending' ? `
            <div style="margin-top: 20px; display: flex; gap: 12px;">
                <button class="btn btn-approve" onclick="updateStatus(${reservation.dine_in_id}, 'approved'); closeDetailModal();" style="flex: 1;">
                    <i class="fas fa-check"></i> Approve Reservation
                </button>
                <button class="btn btn-reject" onclick="updateStatus(${reservation.dine_in_id}, 'rejected'); closeDetailModal();" style="flex: 1;">
                    <i class="fas fa-times"></i> Reject Reservation
                </button>
            </div>
        ` : ''}
        
        ${reservation.status === 'approved' ? `
            <div style="margin-top: 20px;">
                <button class="btn btn-complete" onclick="updateStatus(${reservation.dine_in_id}, 'completed'); closeDetailModal();" style="width: 100%;">
                    <i class="fas fa-check-double"></i> Mark as Completed
                </button>
            </div>
        ` : ''}
    `;
    
    document.getElementById('detail-modal').classList.add('active');
}

// Close detail modal
function closeDetailModal() {
    document.getElementById('detail-modal').classList.remove('active');
}

// Update reservation status
function updateStatus(reservationId, newStatus) {
    pendingStatusUpdate = { reservationId, newStatus };
    
    // Set confirmation message based on status
    let message = '';
    let note = '';
    
    switch(newStatus) {
        case 'approved':
            message = 'Are you sure you want to approve this reservation?';
            note = 'The customer will be notified and the table will be reserved.';
            break;
        case 'rejected':
            message = 'Are you sure you want to reject this reservation?';
            note = 'The customer will be notified and the table will be made available again.';
            break;
        case 'completed':
            message = 'Mark this reservation as completed?';
            note = 'This indicates the customer has dined at your restaurant.';
            break;
    }
    
    document.getElementById('status-message').textContent = message;
    document.getElementById('status-note').textContent = note;
    
    // Update confirm button color based on action
    const confirmBtn = document.getElementById('confirm-status-btn');
    confirmBtn.className = 'btn-confirm';
    if (newStatus === 'approved') {
        confirmBtn.style.background = '#27ae60';
        confirmBtn.style.borderColor = '#27ae60';
    } else if (newStatus === 'rejected') {
        confirmBtn.style.background = '#e74c3c';
        confirmBtn.style.borderColor = '#e74c3c';
    } else {
        confirmBtn.style.background = '#5dade2';
        confirmBtn.style.borderColor = '#5dade2';
    }
    
    document.getElementById('status-modal').classList.add('active');
}

// Confirm status update
async function confirmStatusUpdate() {
    if (!pendingStatusUpdate) return;
    
    const { reservationId, newStatus } = pendingStatusUpdate;
    
    try {
        const response = await fetch(`/api/dine-in/status/${reservationId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ status: newStatus })
        });
        
        const data = await response.json();
        
        if (data.success) {
            // Update local data
            const reservation = allReservations.find(r => r.dine_in_id === reservationId);
            if (reservation) {
                reservation.status = newStatus;
            }
            
            // Update UI
            updateStatistics();
            updateTabCounts();
            renderReservations();
            
            // Show success message
            showSuccess(`Reservation ${newStatus} successfully!`);
        } else {
            showError(data.message || 'Failed to update reservation status');
        }
    } catch (error) {
        console.error('Error updating status:', error);
        showError('Error updating status. Please try again.');
    }
    
    closeStatusModal();
    pendingStatusUpdate = null;
}

// Close status modal
function closeStatusModal() {
    document.getElementById('status-modal').classList.remove('active');
}

// Show success message
function showSuccess(message) {
    // You can implement a toast notification here
    alert(message);
}

// Show error message
function showError(message) {
    const grid = document.getElementById('reservations-grid');
    grid.innerHTML = `
        <div class="empty-state">
            <i class="fas fa-exclamation-triangle"></i>
            <h3>Error</h3>
            <p>${message}</p>
        </div>
    `;
}

// Close modals when clicking outside
window.addEventListener('click', (e) => {
    if (e.target.classList.contains('modal-overlay')) {
        closeDetailModal();
        closeStatusModal();
    }
});
