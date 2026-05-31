(function () {
    'use strict';

    function getRiderId() {
        return sessionStorage.getItem('rider_id') || localStorage.getItem('rider_id');
    }

    function setAvatar(element, name, picture) {
        if (!element) return;

        if (picture) {
            element.innerHTML = `<img src="/uploads/${picture}" alt="${name || 'Rider'}" onerror="this.remove(); window.RiderShared.renderInitials(this.parentElement, '${(name || 'R').replace(/'/g, '')}')">`;
            return;
        }

        renderInitials(element, name || 'Rider');
    }

    function renderInitials(element, name) {
        const initials = String(name)
            .trim()
            .split(/\s+/)
            .slice(0, 2)
            .map((part) => part[0]?.toUpperCase() || '')
            .join('') || 'R';

        element.innerHTML = `<span class="avatar-initials">${initials}</span>`;
        element.classList.add('avatar-fallback');
    }

    function markActiveNav() {
        const page = document.body.dataset.page;
        document.querySelectorAll('.navigation a[data-nav]').forEach((link) => {
            link.classList.toggle('active', link.dataset.nav === page);
        });
    }

    function setupSignOut() {
        const signOutBtn = document.getElementById('signOutBtn');
        if (!signOutBtn) return;

        signOutBtn.addEventListener('click', async (event) => {
            event.preventDefault();
            const sessionId = localStorage.getItem('sessionId');
            try {
                if (sessionId) {
                    await fetch('/api/auth/logout', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ sessionId }),
                        credentials: 'include',
                    });
                }
            } catch (error) {
                console.warn('Logout warning:', error);
            } finally {
                localStorage.removeItem('sessionId');
                localStorage.removeItem('rider_id');
                sessionStorage.clear();
                window.location.href = '../rider_login.html';
            }
        });
    }

    async function loadRiderHeader() {
        const riderId = getRiderId();
        if (!riderId) {
            window.location.href = '../rider_login.html';
            return null;
        }

        const nameEl = document.getElementById('riderDisplayName');
        const avatarEl = document.getElementById('riderAvatar');

        try {
            const response = await fetch(`/api/rider/profile/${riderId}`);
            const data = await response.json();
            if (data.success && data.rider) {
                if (nameEl) nameEl.textContent = data.rider.name || 'Rider';
                setAvatar(avatarEl, data.rider.name, data.rider.picture);
                return data.rider;
            }
        } catch (error) {
            console.error('Failed to load rider header:', error);
        }

        if (nameEl) nameEl.textContent = 'Rider';
        renderInitials(avatarEl, 'Rider');
        return null;
    }

    document.addEventListener('DOMContentLoaded', () => {
        markActiveNav();
        setupSignOut();
        loadRiderHeader();
    });

    window.RiderShared = {
        getRiderId,
        setAvatar,
        renderInitials,
        loadRiderHeader,
    };
})();
