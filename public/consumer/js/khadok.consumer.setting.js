// Form submission handlers with simple alerts
const populateProfile = (profile) => {
    const username = document.getElementById('username');
    const email = document.getElementById('email');
    const phone = document.getElementById('phone');
    const addressLine = document.getElementById('addressLine');
    const city = document.getElementById('city');

    if (!profile) return;
    username.value = profile.name || '';
    email.value = profile.email || '';
    phone.value = profile.number || '';

    const address = profile.address || '';
    if (!address) {
        addressLine.value = '';
        city.value = '';
        return;
    }

    const parts = address.split(',').map((part) => part.trim()).filter(Boolean);
    if (parts.length > 1) {
        city.value = parts.pop();
        addressLine.value = parts.join(', ');
    } else {
        addressLine.value = address;
        city.value = '';
    }
};

const loadProfile = async () => {
    try {
        const res = await fetch('/api/consumer/profile', { credentials: 'include' });
        if (res.status === 401) {
            window.location.replace('../login.html');
            return;
        }
        const data = await res.json();
        populateProfile(data.profile);
    } catch (error) {
        console.error('Failed to load profile:', error);
    }
};

document.getElementById('profileForm').addEventListener('submit', async function(e) {
    e.preventDefault();
    const username = document.getElementById('username').value.trim();
    const phone = document.getElementById('phone').value.trim();
    const addressLine = document.getElementById('addressLine').value.trim();
    const city = document.getElementById('city').value.trim();

    let address = addressLine;
    if (city) {
        address = addressLine ? `${addressLine}, ${city}` : city;
    }

    const formData = new FormData();
    formData.append('name', username);
    if (phone) formData.append('number', phone);
    if (address) formData.append('address', address);

    try {
        const res = await fetch('/api/consumer/profile', {
            method: 'POST',
            body: formData,
            credentials: 'include'
        });
        const data = await res.json();
        if (!res.ok) {
            alert(data.error || 'Failed to update profile.');
            return;
        }
        alert('Profile changes saved!');
    } catch (error) {
        console.error('Profile update failed:', error);
        alert('Something went wrong.');
    }
});

document.getElementById('passwordForm').addEventListener('submit', function(e) {
    e.preventDefault();
    // Validate new passwords match
    const newPassword = document.getElementById('newPassword').value;
    const confirmPassword = document.getElementById('confirmPassword').value;
    
    if (newPassword !== confirmPassword) {
        alert('Passwords do not match!');
    } else {
        alert('Password changed successfully!');
    }
});

document.getElementById('privacyForm').addEventListener('submit', function(e) {
    e.preventDefault();
    alert('Privacy settings updated!');
});


(function checkAuthOnLoad() {
    const sessionId = localStorage.getItem("sessionId");

    if (!sessionId) {
      // Prevent access if not logged in
      window.location.replace("../login.html");
    }
  })();

loadProfile();
