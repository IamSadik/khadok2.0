(function () {
    'use strict';

    const riderId = window.RiderShared?.getRiderId?.() || localStorage.getItem('rider_id');

    document.addEventListener('DOMContentLoaded', async () => {
        if (!riderId) return;
        await loadProfile();

        document.getElementById('settings-form').addEventListener('submit', saveProfile);
    });

    async function loadProfile() {
        try {
            const response = await fetch(`/api/rider/profile/${riderId}`);
            const data = await response.json();
            if (!data.success || !data.rider) return;

            const rider = data.rider;
            document.getElementById('settings-name').value = rider.name || '';
            document.getElementById('settings-email').value = rider.email || '';
            document.getElementById('settings-number').value = rider.number || '';
            document.getElementById('settings-address').value = rider.address || '';
            document.getElementById('settings-vehicle-type').value = rider.vehicle_type || 'motorcycle';
            document.getElementById('settings-vehicle-number').value = rider.vehicle_number || '';
            document.getElementById('settings-start').value = (rider.starts_at || '').slice(0, 5);
            document.getElementById('settings-end').value = (rider.ends_at || '').slice(0, 5);
        } catch (error) {
            console.error('Failed to load rider settings:', error);
        }
    }

    async function saveProfile(event) {
        event.preventDefault();

        const payload = {
            name: document.getElementById('settings-name').value.trim(),
            number: document.getElementById('settings-number').value.trim(),
            address: document.getElementById('settings-address').value.trim(),
            vehicle_type: document.getElementById('settings-vehicle-type').value,
            vehicle_number: document.getElementById('settings-vehicle-number').value.trim(),
            starts_at: document.getElementById('settings-start').value,
            ends_at: document.getElementById('settings-end').value,
        };

        try {
            const response = await fetch(`/api/rider/profile/${riderId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });
            const data = await response.json();
            if (!response.ok || !data.success) {
                throw new Error(data.message || 'Failed to save settings');
            }
            alert('Settings saved successfully.');
        } catch (error) {
            alert(error.message || 'Could not save settings.');
        }
    }
})();
