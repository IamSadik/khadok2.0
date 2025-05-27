// Wait for the DOM to be fully loaded
document.addEventListener("DOMContentLoaded", function () {

    // Consumer Signup Form
    const consumerForm = document.getElementById("consumer-signup-form");
    if (consumerForm) {
        consumerForm.addEventListener("submit", function (e) {
            e.preventDefault();

            const name = document.getElementById("name").value;
            const email = document.getElementById("email").value;
            const password = document.getElementById("password").value;

            const formData = {
                name: name,
                email: email,
                password: password
            };

            fetch('/api/signup/consumer', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(formData),
            })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    alert('Consumer Signup Successful');
                    // Redirect to home page or login page
                    window.location.href = 'login.html';
                } else {
                    alert('Error: ' + data.message);
                }
            })
            .catch(error => console.error('Error:', error));
        });
    }

    // Rider Signup Form
    const riderForm = document.getElementById("rider-signup-form");
    const riderSubmitButton = document.getElementById("rider-submit-btn");
    if (riderForm && riderSubmitButton) {
        riderSubmitButton.addEventListener("click", function (e) {
            e.preventDefault();

            const name = document.getElementById("rider-name").value;
            const email = document.getElementById("rider-email").value;
            const password = document.getElementById("rider-password").value;

            const formData = {
                name: name,
                email: email,
                password: password
            };

            fetch('/api/signup/rider', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(formData),
            })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    alert('Rider Signup Successful');
                    // Redirect to login or rider dashboard
                    window.location.href = 'login.html';
                } else {
                    alert('Error: ' + data.message);
                }
            })
            .catch(error => console.error('Error:', error));
        });
    }

    // Stakeholder Signup Form
    const stakeholderForm = document.getElementById("stakeholder-signup-form");
    if (stakeholderForm) {
        stakeholderForm.addEventListener("submit", function (e) {
            e.preventDefault();

            const name = document.getElementById("stakeholder-name").value;
            const email = document.getElementById("stakeholder-email").value;
            const password = document.getElementById("stakeholder-password").value;
            const restaurantName = document.getElementById("restaurant-name").value;

            const formData = {
                name: name,
                email: email,
                password: password,
                restaurant_name: restaurantName
            };

            fetch('/api/signup/stakeholder', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(formData),
            })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    alert('Stakeholder Signup Successful');
                    // Redirect to login or dashboard
                    window.location.href = 'login.html';
                } else {
                    alert('Error: ' + data.message);
                }
            })
            .catch(error => console.error('Error:', error));
        });
    }

});


const menuToggle = document.getElementById('menu-toggle');
const navMenu = document.getElementById('main-nav');

menuToggle.addEventListener('click', () => {
  navMenu.classList.toggle('show');
});
