async function logout() {
    const sessionId = localStorage.getItem("sessionId");
  
    if (!sessionId) {
      alert("No session found.");
      return;
    }
  
    try {
      const res = await fetch("/api/auth/logout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId }),
        credentials: "include", // Include the session cookie in the request
      });
  
      const data = await res.json();
  
      if (res.ok) {
        localStorage.removeItem("sessionId");   // Remove session ID
        localStorage.removeItem("consumer_id"); // Remove consumer ID
        alert(data.message); // Show success message
        window.location.href = '../login.html';
      } else {
        alert(data.message || "Logout failed.");
        window.location.href = '../login.html'; // Redirect to login page on error
      }
    } catch (err) {
      console.error("Logout error:", err);
      alert("Something went wrong.");
      window.location.href = '../login.html'; // Redirect to login page on error
    }
  }
  

document.addEventListener("DOMContentLoaded", async () => {
    const restaurantsContainer = document.getElementById("restaurants-container");

    const fetchRestaurants = async (sortBy = "relevance") => {
        try {
            const response = await fetch(`/api/restaurants?sortBy=${sortBy}`);
            const data = await response.json();

            if (data.success && data.data.length > 0) {
                restaurantsContainer.innerHTML = "";
                data.data.forEach((restaurant) => {
                    console.log("Restaurant Data:", restaurant); // Debugging

                    const card = document.createElement("div");
                    card.classList.add("restaurant-card");
                    card.setAttribute("data-id", restaurant.stakeholder_id); // Add stakeholder ID
                    card.setAttribute("data-name", restaurant.restaurant_name); // Add restaurant name

                    const name = document.createElement("h3");
                    name.textContent = restaurant.restaurant_name;

                    const ratings = document.createElement("p");
                    ratings.textContent = restaurant.ratings
                        ? `Ratings: ${restaurant.ratings}`
                        : "No ratings yet";

                    card.appendChild(name);
                    card.appendChild(ratings);
                    restaurantsContainer.appendChild(card);

                    // Add click event listener to the card
                    card.addEventListener("click", () => {
                        const restaurantId = card.getAttribute("data-id");
                        const restaurantName = card.getAttribute("data-name");

                        console.log("Restaurant Clicked ID:", restaurantId); // Debugging
                        console.log("Restaurant Clicked Name:", restaurantName); // Debugging

                        // Save to localStorage
                        localStorage.setItem("selectedRestaurantId", restaurantId);
                        localStorage.setItem("selectedRestaurantName", restaurantName);

                        // Navigate to the menu page
                        window.location.href = "menu.html";
                    });
                });
            } else {
                restaurantsContainer.innerHTML = "<p>No restaurants available.</p>";
            }
        } catch (error) {
            console.error("Error fetching restaurants:", error);
            restaurantsContainer.innerHTML =
                "<p>Error loading restaurants. Please try again later.</p>";
        }
    };

    // Fetch restaurants on initial load
    fetchRestaurants();

    // Add sorting functionality
    const radioButtons = document.querySelectorAll('input[name="sort-option"]');
    radioButtons.forEach((radio) => {
        radio.addEventListener("change", (event) => {
            const sortBy = event.target.value;
            fetchRestaurants(sortBy);
        });
    });
});



document.querySelectorAll(".restaurant-card").forEach((card) => {
    card.addEventListener("click", () => {
        const restaurantId = card.getAttribute("data-id");
        const restaurantName = card.getAttribute("data-name");

        // Save to localStorage
        localStorage.setItem("selectedRestaurantId", restaurantId);
        localStorage.setItem("selectedRestaurantName", restaurantName);

        // Navigate to the menu page
        window.location.href = "menu.html";
    });
});


document.addEventListener("DOMContentLoaded", async () => {
    const dineInContainer = document.getElementById("dinein-restaurants-container");

    const fetchDineInRestaurants = async (sortBy = "relevance") => {
        try {
            const response = await fetch(`/api/restaurants?sortBy=${sortBy}`);
            const data = await response.json();

            if (data.success && data.data.length > 0) {
                dineInContainer.innerHTML = "";
                data.data.forEach((restaurant) => {
                    console.log("Dine In Restaurant Data:", restaurant); // Debugging

                    const card = document.createElement("div");
                    card.classList.add("restaurant-card");
                    card.setAttribute("data-id", restaurant.stakeholder_id);
                    card.setAttribute("data-name", restaurant.restaurant_name);

                    const name = document.createElement("h3");
                    name.textContent = restaurant.restaurant_name;

                    const ratings = document.createElement("p");
                    ratings.textContent = restaurant.ratings
                        ? `Ratings: ${restaurant.ratings}`
                        : "No ratings yet";

                    card.appendChild(name);
                    card.appendChild(ratings);
                    dineInContainer.appendChild(card);

                    // Add click event listener to the card
                    card.addEventListener("click", () => {
                        const restaurantId = card.getAttribute("data-id");
                        const restaurantName = card.getAttribute("data-name");

                        console.log("Dine In Restaurant Clicked ID:", restaurantId);
                        console.log("Dine In Restaurant Clicked Name:", restaurantName);

                        // Save to localStorage
                        localStorage.setItem("selectedDineInRestaurantId", restaurantId);
                        localStorage.setItem("selectedDineInRestaurantName", restaurantName);

                        // Navigate to the dine-in page
                        window.location.href = "dine_in.html";
                    });
                });
            } else {
                dineInContainer.innerHTML = "<p>No restaurants available for dine-in.</p>";
            }
        } catch (error) {
            console.error("Error fetching dine-in restaurants:", error);
            dineInContainer.innerHTML =
                "<p>Error loading dine-in restaurants. Please try again later.</p>";
        }
    };

    // Fetch dine-in restaurants on initial load
    fetchDineInRestaurants();

    // Add sorting functionality for dine-in
    const dineInRadioButtons = document.querySelectorAll('input[name="dinein-sort-option"]');
    dineInRadioButtons.forEach((radio) => {
        radio.addEventListener("change", (event) => {
            const sortBy = event.target.value;
            fetchDineInRestaurants(sortBy);
        });
    });
});

(function checkAuthOnLoad() {
    const sessionId = localStorage.getItem("sessionId");

    if (!sessionId) {
      // Prevent access if not logged in
      window.location.replace("../login.html");
    }
  })();
