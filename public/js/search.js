function goToRestaurantPreview(stakeholderId) {
  if (!stakeholderId) return;
  window.location.href = `/restaurant-menu.html?restaurant_id=${encodeURIComponent(stakeholderId)}`;
}

async function fetchSuggestions() {
  const searchQuery = document.getElementById('search-input').value.trim();
  const suggestionsBox = document.getElementById('suggestions');

  if (!searchQuery) {
    suggestionsBox.innerHTML = '';
    return;
  }

  try {
    const response = await fetch(`/api/search-restaurants?query=${encodeURIComponent(searchQuery)}`);
    if (!response.ok) {
      console.error('Search failed:', response.status);
      return;
    }
    const suggestions = await response.json();

    if (!Array.isArray(suggestions) || suggestions.length === 0) {
      suggestionsBox.innerHTML = '<div class="suggestion-item">No restaurants found</div>';
      return;
    }

    suggestionsBox.innerHTML = suggestions
      .map(
        (restaurant) => `
        <div class="suggestion-item" data-id="${restaurant.stakeholder_id}">
          <strong>${restaurant.restaurant_name}</strong>
          ${restaurant.ratings != null ? `<span> · ★ ${Number(restaurant.ratings).toFixed(1)}</span>` : ''}
        </div>`
      )
      .join('');

    suggestionsBox.querySelectorAll('.suggestion-item[data-id]').forEach((item) => {
      item.addEventListener('click', () => {
        goToRestaurantPreview(item.dataset.id);
      });
    });
  } catch (error) {
    console.error('Error fetching suggestions:', error);
  }
}

function searchRestaurants() {
  const searchQuery = document.getElementById('search-input').value.trim();
  if (!searchQuery) return false;

  fetch(`/api/search-restaurants?query=${encodeURIComponent(searchQuery)}`)
    .then((res) => res.json())
    .then((results) => {
      if (Array.isArray(results) && results.length === 1) {
        goToRestaurantPreview(results[0].stakeholder_id);
      } else if (Array.isArray(results) && results.length > 1) {
        const suggestionsBox = document.getElementById('suggestions');
        suggestionsBox.innerHTML = results
          .map(
            (r) =>
              `<div class="suggestion-item" data-id="${r.stakeholder_id}"><strong>${r.restaurant_name}</strong></div>`
          )
          .join('');
        suggestionsBox.querySelectorAll('.suggestion-item[data-id]').forEach((item) => {
          item.addEventListener('click', () => goToRestaurantPreview(item.dataset.id));
        });
      } else {
        alert('No restaurants found for your search.');
      }
    })
    .catch((err) => console.error(err));

  return false;
}
