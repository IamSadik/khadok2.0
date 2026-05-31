(function () {
    'use strict';

    const riderId = window.RiderShared?.getRiderId?.() || localStorage.getItem('rider_id');
    let socket = null;
    let activeChat = null;

    document.addEventListener('DOMContentLoaded', async () => {
        if (!riderId) return;
        initSocket();
        await loadThreads();

        const params = new URLSearchParams(window.location.search);
        const presetOrderId = params.get('orderId');
        if (presetOrderId) {
            const button = document.querySelector(`.chat-thread-btn[data-order-id="${presetOrderId}"]`);
            if (button) {
                button.click();
            }
        }
    });

    function initSocket() {
        if (typeof io !== 'function') return;
        socket = io();
        socket.on('connect', () => socket.emit('registerRider', riderId));
    }

    async function loadThreads() {
        const list = document.getElementById('chat-thread-list');
        try {
            const response = await fetch(`/api/rider/chat-threads/${riderId}`);
            const data = await response.json();
            const threads = data.threads || [];

            if (!threads.length) {
                list.innerHTML = '<p style="color:#64748b;">No active delivery chats right now.</p>';
                return;
            }

            list.innerHTML = threads.map((thread) => `
                <button class="chat-thread-btn" data-order-id="${thread.order_id}" data-consumer="${escapeHtml(thread.consumer_name || 'Customer')}" style="
                    width:100%; text-align:left; margin-bottom:10px; padding:14px 16px; border:1px solid #e2e8f0;
                    border-radius:12px; background:#fff; cursor:pointer;">
                    <strong>Order #${thread.order_id}</strong> · ${escapeHtml(thread.consumer_name || 'Customer')}<br>
                    <small style="color:#64748b;">${escapeHtml(thread.restaurant_name || 'Restaurant')} · ${escapeHtml(thread.delivery_status || '')}</small><br>
                    <small>${escapeHtml(thread.last_message || 'No messages yet')}</small>
                </button>
            `).join('');

            list.querySelectorAll('.chat-thread-btn').forEach((button) => {
                button.addEventListener('click', () => openThread(button.dataset.orderId, button.dataset.consumer));
            });
        } catch (error) {
            list.innerHTML = '<p style="color:#dc2626;">Failed to load chats.</p>';
        }
    }

    async function openThread(orderId, consumerName) {
        document.getElementById('selected-chat-title').textContent = `Order #${orderId} · ${consumerName}`;
        const panel = document.getElementById('chat-panel');
        panel.innerHTML = '<div id="order-chat-mount"></div>';

        if (socket) socket.emit('join-tracking', { orderId, riderId });

        activeChat = new OrderChat({
            orderId,
            senderType: 'rider',
            senderId: riderId,
            peerLabel: consumerName,
            container: '#order-chat-mount',
            socket,
        });
        await activeChat.init();
    }

    function escapeHtml(value) {
        return String(value)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }
})();
