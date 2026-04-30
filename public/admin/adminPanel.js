const apiBase = '/api/admin';

const fetchJSON = async (path, options = {}) => {
    const res = await fetch(path, {
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        ...options,
    });

    if (!res.ok) {
        const payload = await res.json().catch(() => ({}));
        const message = payload.error || `Request failed (${res.status})`;
        throw new Error(message);
    }

    return res.json();
};

const formatDate = (value) => {
    if (!value) return '--';
    const date = new Date(value);
    return date.toLocaleString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    });
};

const formatCurrency = (value) => {
    const amount = Number(value || 0);
    return `BDT ${amount.toFixed(2)}`;
};

const setText = (id, value) => {
    const el = document.getElementById(id);
    if (el) el.textContent = value;
};

const escapeHtml = (value) => {
    return String(value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
};

const renderEmptyRow = (tbody, colCount, message) => {
    tbody.innerHTML = `<tr><td colspan="${colCount}">${message}</td></tr>`;
};

const loadDashboard = async () => {
    const { summary, recentOrders } = await fetchJSON(`${apiBase}/overview`);

    setText('countConsumers', summary.consumers);
    setText('countStakeholders', summary.stakeholders);
    setText('countRiders', summary.riders);
    setText('countOrders', summary.orders);
    setText('countPayments', summary.payments);
    setText('countReservations', summary.reservations);
    setText('countTickets', summary.tickets);

    const tbody = document.getElementById('recent-orders-body');
    if (!tbody) return;

    if (!recentOrders || recentOrders.length === 0) {
        renderEmptyRow(tbody, 7, 'No recent orders');
        return;
    }

    tbody.innerHTML = recentOrders.map((order) => `
        <tr>
            <td>${order.id}</td>
            <td>${escapeHtml(order.consumer_name || '--')}</td>
            <td>${escapeHtml(order.restaurant_name || '--')}</td>
            <td>${escapeHtml(order.order_status || '--')}</td>
            <td>${escapeHtml(order.delivery_status || '--')}</td>
            <td>${escapeHtml(order.payment_status || '--')}</td>
            <td>${formatCurrency(order.total_amount)}</td>
        </tr>
    `).join('');
};

const loadConsumers = async () => {
    const { consumers } = await fetchJSON(`${apiBase}/consumers`);
    const tbody = document.getElementById('consumers-table');
    if (!tbody) return;

    if (!consumers || consumers.length === 0) {
        renderEmptyRow(tbody, 6, 'No consumers found');
        return;
    }

    tbody.innerHTML = consumers.map((consumer) => `
        <tr>
            <td>${consumer.consumer_id}</td>
            <td>${escapeHtml(consumer.name || '--')}</td>
            <td>${escapeHtml(consumer.email || '--')}</td>
            <td>${escapeHtml(consumer.number || '--')}</td>
            <td>${escapeHtml(consumer.address || '--')}</td>
            <td>${formatDate(consumer.created_at)}</td>
        </tr>
    `).join('');
};

const loadStakeholders = async () => {
    const { stakeholders } = await fetchJSON(`${apiBase}/stakeholders`);
    const tbody = document.getElementById('stakeholders-table');
    if (!tbody) return;

    if (!stakeholders || stakeholders.length === 0) {
        renderEmptyRow(tbody, 7, 'No stakeholders found');
        return;
    }

    tbody.innerHTML = stakeholders.map((stakeholder) => `
        <tr>
            <td>${stakeholder.stakeholder_id}</td>
            <td>${escapeHtml(stakeholder.name || '--')}</td>
            <td>${escapeHtml(stakeholder.email || '--')}</td>
            <td>${escapeHtml(stakeholder.restaurant_name || '--')}</td>
            <td>${escapeHtml(stakeholder.address || '--')}</td>
            <td>${stakeholder.ratings ?? '--'}</td>
            <td>${formatDate(stakeholder.created_at)}</td>
        </tr>
    `).join('');
};

const loadRiders = async () => {
    const { riders } = await fetchJSON(`${apiBase}/riders`);
    const tbody = document.getElementById('riders-table');
    if (!tbody) return;

    if (!riders || riders.length === 0) {
        renderEmptyRow(tbody, 8, 'No riders found');
        return;
    }

    tbody.innerHTML = riders.map((rider) => `
        <tr>
            <td>${rider.rider_id}</td>
            <td>${escapeHtml(rider.name || '--')}</td>
            <td>${escapeHtml(rider.email || '--')}</td>
            <td>${escapeHtml(rider.number || '--')}</td>
            <td>${escapeHtml(rider.vehicle_type || '--')}</td>
            <td>${escapeHtml(rider.status || '--')}</td>
            <td>${rider.is_active ? 'Active' : 'Inactive'} / ${rider.is_verified ? 'Verified' : 'Unverified'}</td>
            <td>
                <button class="primary action-btn" data-action="edit-rider" data-id="${rider.rider_id}">Update</button>
            </td>
        </tr>
    `).join('');
};

const loadOrders = async () => {
    const { orders } = await fetchJSON(`${apiBase}/orders`);
    const tbody = document.getElementById('orders-table');
    if (!tbody) return;

    if (!orders || orders.length === 0) {
        renderEmptyRow(tbody, 9, 'No orders found');
        return;
    }

    tbody.innerHTML = orders.map((order) => `
        <tr>
            <td>${order.id}</td>
            <td>${escapeHtml(order.consumer_name || '--')}</td>
            <td>${escapeHtml(order.restaurant_name || '--')}</td>
            <td>${escapeHtml(order.order_type || '--')}</td>
            <td>${escapeHtml(order.order_status || '--')}</td>
            <td>${escapeHtml(order.delivery_status || '--')}</td>
            <td>${escapeHtml(order.payment_status || '--')}</td>
            <td>${formatCurrency(order.total_amount)}</td>
            <td>
                <button class="primary action-btn" data-action="edit-order" data-id="${order.id}" data-order-status="${order.order_status}" data-delivery-status="${order.delivery_status}" data-rider-id="${order.rider_id || ''}">Update</button>
            </td>
        </tr>
    `).join('');
};

const loadPayments = async () => {
    const { payments } = await fetchJSON(`${apiBase}/payments`);
    const tbody = document.getElementById('payments-table');
    if (!tbody) return;

    if (!payments || payments.length === 0) {
        renderEmptyRow(tbody, 8, 'No payments found');
        return;
    }

    tbody.innerHTML = payments.map((payment) => `
        <tr>
            <td>${payment.id}</td>
            <td>${payment.order_id || '--'}</td>
            <td>${escapeHtml(payment.consumer_name || '--')}</td>
            <td>${escapeHtml(payment.restaurant_name || '--')}</td>
            <td>${escapeHtml(payment.payment_method || '--')}</td>
            <td>${escapeHtml(payment.payment_status || '--')}</td>
            <td>${formatCurrency(payment.amount)}</td>
            <td>
                <button class="primary action-btn" data-action="edit-payment" data-id="${payment.id}" data-status="${payment.payment_status}">Update</button>
            </td>
        </tr>
    `).join('');
};

const loadReservations = async () => {
    const { reservations } = await fetchJSON(`${apiBase}/reservations`);
    const tbody = document.getElementById('reservations-table');
    if (!tbody) return;

    if (!reservations || reservations.length === 0) {
        renderEmptyRow(tbody, 8, 'No reservations found');
        return;
    }

    tbody.innerHTML = reservations.map((reservation) => `
        <tr>
            <td>${reservation.dine_in_id}</td>
            <td>${escapeHtml(reservation.consumer_name || '--')}</td>
            <td>${escapeHtml(reservation.restaurant_name || '--')}</td>
            <td>${escapeHtml(reservation.status || '--')}</td>
            <td>${reservation.table_size}</td>
            <td>${reservation.quantity}</td>
            <td>${formatDate(reservation.booking_time)}</td>
            <td>
                <button class="primary action-btn" data-action="edit-reservation" data-id="${reservation.dine_in_id}" data-status="${reservation.status}">Update</button>
            </td>
        </tr>
    `).join('');
};

const loadMenus = async () => {
    const { menus } = await fetchJSON(`${apiBase}/menus`);
    const tbody = document.getElementById('menus-table');
    if (!tbody) return;

    if (!menus || menus.length === 0) {
        renderEmptyRow(tbody, 6, 'No menu items found');
        return;
    }

    tbody.innerHTML = menus.map((menu) => `
        <tr>
            <td>${menu.menu_id}</td>
            <td>${escapeHtml(menu.item_name || '--')}</td>
            <td>${escapeHtml(menu.category || '--')}</td>
            <td>${escapeHtml(menu.restaurant_name || '--')}</td>
            <td>${formatCurrency(menu.item_price)}</td>
            <td>${menu.rating ?? '--'}</td>
        </tr>
    `).join('');
};

const loadTickets = async () => {
    const { tickets } = await fetchJSON(`${apiBase}/tickets`);
    const tbody = document.getElementById('tickets-table');
    if (!tbody) return;

    if (!tickets || tickets.length === 0) {
        renderEmptyRow(tbody, 7, 'No tickets found');
        return;
    }

    tbody.innerHTML = tickets.map((ticket) => `
        <tr>
            <td>${ticket.id}</td>
            <td>${escapeHtml(ticket.type || '--')}</td>
            <td>${ticket.order_id || '--'}</td>
            <td>${escapeHtml(ticket.consumer_name || '--')}</td>
            <td>${escapeHtml(ticket.issue_type || '--')}</td>
            <td>${escapeHtml(ticket.resolution_status || '--')}</td>
            <td>
                ${ticket.type === 'delivery_issue'
                    ? `<button class="primary action-btn" data-action="edit-ticket" data-id="${ticket.id}" data-status="${ticket.resolution_status}">Update</button>`
                    : '--'}
            </td>
        </tr>
    `).join('');
};

const openPrompt = (title, options, current) => {
    const choice = window.prompt(`${title}\n${options.join(', ')}`, current || options[0]);
    if (!choice || !options.includes(choice)) return null;
    return choice;
};

const handleAction = async (event) => {
    const button = event.target.closest('.action-btn');
    if (!button) return;

    const action = button.dataset.action;
    try {
        if (action === 'edit-order') {
            const orderId = button.dataset.id;
            const orderStatus = openPrompt('Order status', ['pending', 'confirmed', 'preparing', 'ready', 'completed', 'cancelled'], button.dataset.orderStatus);
            if (orderStatus) {
                await fetchJSON(`${apiBase}/orders/${orderId}/status`, {
                    method: 'PATCH',
                    body: JSON.stringify({ order_status: orderStatus })
                });
            }

            const deliveryStatus = openPrompt('Delivery status', ['pending_rider', 'assigned', 'picked_up', 'out_for_delivery', 'arrived', 'delivered'], button.dataset.deliveryStatus);
            if (deliveryStatus) {
                await fetchJSON(`${apiBase}/orders/${orderId}/delivery-status`, {
                    method: 'PATCH',
                    body: JSON.stringify({ delivery_status: deliveryStatus })
                });
            }

            const riderId = window.prompt('Assign rider ID (optional)', button.dataset.riderId || '');
            if (riderId) {
                await fetchJSON(`${apiBase}/orders/${orderId}/rider`, {
                    method: 'PATCH',
                    body: JSON.stringify({ rider_id: Number(riderId) })
                });
            }

            await loadOrders();
        }

        if (action === 'edit-payment') {
            const paymentId = button.dataset.id;
            const status = openPrompt('Payment status', ['pending', 'completed', 'failed', 'refunded', 'cancelled'], button.dataset.status);
            if (status) {
                await fetchJSON(`${apiBase}/payments/${paymentId}/status`, {
                    method: 'PATCH',
                    body: JSON.stringify({ payment_status: status })
                });
                await loadPayments();
            }
        }

        if (action === 'edit-reservation') {
            const reservationId = button.dataset.id;
            const status = openPrompt('Reservation status', ['pending', 'approved', 'rejected', 'completed'], button.dataset.status);
            if (status) {
                await fetchJSON(`${apiBase}/reservations/${reservationId}/status`, {
                    method: 'PATCH',
                    body: JSON.stringify({ status })
                });
                await loadReservations();
            }
        }

        if (action === 'edit-ticket') {
            const ticketId = button.dataset.id;
            const status = openPrompt('Ticket status', ['reported', 'investigating', 'resolved', 'unresolved'], button.dataset.status);
            if (status) {
                await fetchJSON(`${apiBase}/tickets/delivery/${ticketId}/status`, {
                    method: 'PATCH',
                    body: JSON.stringify({ resolution_status: status })
                });
                await loadTickets();
            }
        }

        if (action === 'edit-rider') {
            const riderId = button.dataset.id;
            const status = window.prompt('Rider status (offline, available, busy, on_break)', 'available');
            const isActive = window.confirm('Set rider as active?');
            const isVerified = window.confirm('Set rider as verified?');

            await fetchJSON(`${apiBase}/riders/${riderId}`, {
                method: 'PATCH',
                body: JSON.stringify({
                    status,
                    is_active: isActive,
                    is_verified: isVerified,
                })
            });
            await loadRiders();
        }
    } catch (error) {
        alert(error.message);
    }
};

const initPage = () => {
    const page = document.body.dataset.page;

    if (page === 'dashboard') loadDashboard();
    if (page === 'consumers') loadConsumers();
    if (page === 'stakeholders') loadStakeholders();
    if (page === 'riders') loadRiders();
    if (page === 'orders') loadOrders();
    if (page === 'payments') loadPayments();
    if (page === 'reservations') loadReservations();
    if (page === 'menus') loadMenus();
    if (page === 'tickets') loadTickets();

    document.addEventListener('click', handleAction);
};

document.addEventListener('DOMContentLoaded', initPage);
