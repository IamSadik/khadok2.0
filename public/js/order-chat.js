(function (global) {
    'use strict';

    function escapeHtml(value) {
        return String(value)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    function formatTime(value) {
        const date = new Date(value);
        if (Number.isNaN(date.getTime())) return '';
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }

    class OrderChat {
        constructor(options) {
            this.orderId = options.orderId;
            this.senderType = options.senderType;
            this.senderId = options.senderId;
            this.peerLabel = options.peerLabel || 'Chat';
            this.container = typeof options.container === 'string'
                ? document.querySelector(options.container)
                : options.container;
            this.socket = options.socket || null;
            this.canSend = false;
            this.messagesEl = null;
            this.formEl = null;
            this.inputEl = null;
        }

        renderShell() {
            if (!this.container) return;
            this.container.innerHTML = `
                <div class="order-chat-panel">
                    <div class="order-chat-header">
                        <i class="fas fa-comments"></i>
                        <span>Chat with ${escapeHtml(this.peerLabel)}</span>
                    </div>
                    <div class="order-chat-messages" id="order-chat-messages-${this.orderId}"></div>
                    <form class="order-chat-form" id="order-chat-form-${this.orderId}">
                        <input type="text" id="order-chat-input-${this.orderId}" maxlength="1000" placeholder="Type a message..." autocomplete="off" />
                        <button type="submit">Send</button>
                    </form>
                </div>
            `;
            this.messagesEl = this.container.querySelector(`#order-chat-messages-${this.orderId}`);
            this.formEl = this.container.querySelector(`#order-chat-form-${this.orderId}`);
            this.inputEl = this.container.querySelector(`#order-chat-input-${this.orderId}`);
            this.formEl.addEventListener('submit', (event) => this.handleSubmit(event));
        }

        async init() {
            this.renderShell();
            await this.loadHistory();
            this.bindSocket();
        }

        queryParams() {
            if (this.senderType === 'consumer') {
                return `consumer_id=${encodeURIComponent(this.senderId)}`;
            }
            return `rider_id=${encodeURIComponent(this.senderId)}`;
        }

        async loadHistory() {
            try {
                const response = await fetch(`/api/orders/${this.orderId}/messages?${this.queryParams()}`);
                const data = await response.json();
                if (!response.ok || !data.success) {
                    throw new Error(data.message || 'Failed to load chat');
                }
                this.canSend = !!data.can_send;
                this.renderMessages(data.messages || []);
                this.updateComposer();
            } catch (error) {
                this.messagesEl.innerHTML = `<div class="order-chat-empty">${escapeHtml(error.message)}</div>`;
                this.setComposerDisabled(true);
            }
        }

        bindSocket() {
            if (!this.socket) return;
            this.socket.off('chat-message');
            this.socket.on('chat-message', (message) => {
                if (Number(message.order_id) !== Number(this.orderId)) return;
                this.appendMessage(message, true);
            });
        }

        renderMessages(messages) {
            this.messagesEl.innerHTML = '';
            if (!messages.length) {
                this.messagesEl.innerHTML = '<div class="order-chat-empty">No messages yet. Say hello!</div>';
                return;
            }
            messages.forEach((message) => this.appendMessage(message, false));
            this.scrollToBottom();
        }

        appendMessage(message, scroll) {
            const empty = this.messagesEl.querySelector('.order-chat-empty');
            if (empty) empty.remove();

            const isMine =
                message.sender_type === this.senderType &&
                Number(message.sender_id) === Number(this.senderId);

            const bubble = document.createElement('div');
            bubble.className = `order-chat-bubble ${isMine ? 'mine' : 'theirs'}`;
            bubble.innerHTML = `
                ${escapeHtml(message.body)}
                <span class="order-chat-meta">${formatTime(message.created_at)}</span>
            `;
            this.messagesEl.appendChild(bubble);
            if (scroll) this.scrollToBottom();
        }

        scrollToBottom() {
            this.messagesEl.scrollTop = this.messagesEl.scrollHeight;
        }

        updateComposer() {
            if (this.canSend) {
                this.setComposerDisabled(false);
                return;
            }
            this.setComposerDisabled(true);
            const note = document.createElement('div');
            note.className = 'order-chat-closed';
            note.textContent = 'Chat is closed for this delivery.';
            this.formEl.replaceWith(note);
        }

        setComposerDisabled(disabled) {
            if (this.inputEl) this.inputEl.disabled = disabled;
            if (this.formEl) {
                const button = this.formEl.querySelector('button');
                if (button) button.disabled = disabled;
            }
        }

        async handleSubmit(event) {
            event.preventDefault();
            if (!this.canSend || !this.inputEl) return;

            const body = this.inputEl.value.trim();
            if (!body) return;

            this.inputEl.disabled = true;

            try {
                if (this.socket && this.socket.connected) {
                    await new Promise((resolve, reject) => {
                        this.socket.emit('chat-message', {
                            orderId: this.orderId,
                            senderType: this.senderType,
                            senderId: this.senderId,
                            body,
                        }, (result) => {
                            if (result?.success) resolve(result);
                            else reject(new Error(result?.error || 'Failed to send'));
                        });
                    });
                } else {
                    const response = await fetch(`/api/orders/${this.orderId}/messages`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            body,
                            consumer_id: this.senderType === 'consumer' ? this.senderId : undefined,
                            rider_id: this.senderType === 'rider' ? this.senderId : undefined,
                        }),
                    });
                    const data = await response.json();
                    if (!response.ok || !data.success) {
                        throw new Error(data.message || 'Failed to send message');
                    }
                    this.appendMessage(data.message, true);
                }

                this.inputEl.value = '';
            } catch (error) {
                alert(error.message || 'Could not send message');
            } finally {
                if (this.canSend) this.inputEl.disabled = false;
                this.inputEl.focus();
            }
        }
    }

    global.OrderChat = OrderChat;
})(window);
