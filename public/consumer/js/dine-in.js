document.addEventListener("DOMContentLoaded", () => {
  const restaurantNameEl = document.getElementById("restaurant-name");
  const restaurantBreadcrumb = document.getElementById("restaurant-breadcrumb");
  const restaurantNameDetail = document.getElementById("restaurant-name-detail");
  const restaurantPicture = document.getElementById("restaurant-picture");
  const restaurantAddress = document.getElementById("restaurant-address");
  const restaurantHours = document.getElementById("restaurant-hours");
  const restaurantRating = document.getElementById("restaurant-rating");
  const restaurantPhone = document.getElementById("restaurant-phone");
  const reservationForm = document.getElementById("reservation-form");

  let stakeholderId = localStorage.getItem('selectedRestaurantId');
  let restaurantData = null;
  let availableTables = {}; // Store available tables data

  if (!stakeholderId) {
    alert("No restaurant selected");
    window.location.href = "khadok.consumer.dashboard.html";
    return;
  }

  // Initialize
  init();

  async function init() {
    await fetchRestaurantInfo();
    setupReservationForm();
    setMinimumDate();
    
    // Load view-only 3D features
    await load3DLayout();
    await loadTableAvailability();
    await load360View();
  }

  // Fetch restaurant info
  async function fetchRestaurantInfo() {
    try {
      const res = await fetch(`/api/restaurant/${stakeholderId}`);
      const data = await res.json();
      
      if (data) {
        restaurantData = data;
        displayRestaurantInfo(data);
      }
    } catch (error) {
      console.error("Failed to fetch restaurant info:", error);
      alert("Could not load restaurant information");
    }
  }

  // Display restaurant information
  function displayRestaurantInfo(restaurant) {
    const name = restaurant.restaurant_name || "Restaurant";
    
    restaurantNameEl.textContent = name;
    restaurantBreadcrumb.textContent = name;
    restaurantNameDetail.textContent = name;

    // Set restaurant picture
    if (restaurant.picture) {
      restaurantPicture.src = `/uploads/${restaurant.picture}`;
    }

    // Set address
    if (restaurant.address) {
      restaurantAddress.querySelector('span').textContent = restaurant.address;
    }

    // Set hours
    if (restaurant.opens_at && restaurant.closes_at) {
      const opensAt = convertTo12Hour(restaurant.opens_at);
      const closesAt = convertTo12Hour(restaurant.closes_at);
      restaurantHours.querySelector('span').textContent = `${opensAt} - ${closesAt}`;
    } else {
      restaurantHours.querySelector('span').textContent = 'Hours not available';
    }

    // Set rating
    if (restaurant.ratings) {
      restaurantRating.querySelector('span').textContent = `${restaurant.ratings} / 5.0`;
    } else {
      restaurantRating.querySelector('span').textContent = 'No ratings yet';
    }

    // Set phone
    if (restaurant.phone_number) {
      restaurantPhone.querySelector('span').textContent = restaurant.phone_number;
    } else {
      restaurantPhone.querySelector('span').textContent = 'Contact not available';
    }
  }

  // Convert 24hr to 12hr format
  function convertTo12Hour(time24) {
    if (!time24) return '';
    const [hours, minutes] = time24.split(':').map(Number);
    const period = hours >= 12 ? 'PM' : 'AM';
    const hours12 = hours % 12 || 12;
    return `${hours12}:${minutes.toString().padStart(2, '0')} ${period}`;
  }

  // Set minimum date to today
  function setMinimumDate() {
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('reservation-date').setAttribute('min', today);
  }

  // Setup reservation form
  function setupReservationForm() {
    const tableSizeSelect = document.getElementById('table-size');
    const tableQuantityInput = document.getElementById('table-quantity');
    const specialMessage = document.getElementById('special-message');
    const charCount = document.getElementById('char-count');
    const availabilityHint = document.getElementById('table-availability-hint');
    const availabilityText = document.getElementById('availability-text');
    const bookingSummary = document.getElementById('booking-summary');
    const reservationDate = document.getElementById('reservation-date');
    const reservationTime = document.getElementById('reservation-time');

    // Character counter for special message
    if (specialMessage && charCount) {
      specialMessage.addEventListener('input', () => {
        charCount.textContent = specialMessage.value.length;
      });
    }

    // Show availability when table size is selected
    tableSizeSelect.addEventListener('change', () => {
      const selectedSize = tableSizeSelect.value;
      
      if (selectedSize && availableTables[selectedSize]) {
        const available = availableTables[selectedSize];
        availabilityHint.style.display = 'block';
        
        if (available > 0) {
          availabilityText.textContent = `${available} table(s) available`;
          availabilityText.style.color = '#28a745';
          tableQuantityInput.max = available;
          tableQuantityInput.disabled = false;
        } else {
          availabilityText.textContent = 'No tables available for this type';
          availabilityText.style.color = '#dc3545';
          tableQuantityInput.disabled = true;
          tableQuantityInput.value = 0;
        }
      } else {
        availabilityHint.style.display = 'none';
        tableQuantityInput.max = 1;
        tableQuantityInput.disabled = false;
      }
      
      updateBookingSummary();
    });

    // Update summary when quantity changes
    tableQuantityInput.addEventListener('input', () => {
      updateBookingSummary();
    });

    // Update summary when date/time changes
    reservationDate.addEventListener('change', () => {
      updateBookingSummary();
    });

    reservationTime.addEventListener('change', () => {
      updateBookingSummary();
    });

    // Update booking summary
    function updateBookingSummary() {
      const tableSize = tableSizeSelect.value;
      const quantity = tableQuantityInput.value;
      const date = reservationDate.value;
      const time = reservationTime.value;

      if (tableSize && quantity && date && time) {
        bookingSummary.style.display = 'block';
        document.getElementById('summary-table-type').textContent = `${tableSize}-Person Table`;
        document.getElementById('summary-quantity').textContent = quantity;
        
        const dateObj = new Date(date + 'T' + time);
        const formattedDate = dateObj.toLocaleDateString('en-US', { 
          weekday: 'short', 
          year: 'numeric', 
          month: 'short', 
          day: 'numeric' 
        });
        const formattedTime = dateObj.toLocaleTimeString('en-US', { 
          hour: '2-digit', 
          minute: '2-digit' 
        });
        document.getElementById('summary-datetime').textContent = `${formattedDate} at ${formattedTime}`;
      } else {
        bookingSummary.style.display = 'none';
      }
    }

    reservationForm.addEventListener('submit', async (e) => {
      e.preventDefault();

      const consumerId = localStorage.getItem('consumer_id');
      if (!consumerId) {
        alert('Please log in to make a reservation');
        window.location.href = '../login.html';
        return;
      }

      // Get form values
      const tableSize = tableSizeSelect.value;
      const quantity = parseInt(tableQuantityInput.value);
      const date = reservationDate.value;
      const time = reservationTime.value;
      const message = specialMessage.value.trim();

      // Validate availability
      if (!availableTables[tableSize] || availableTables[tableSize] < quantity) {
        alert(`Sorry, only ${availableTables[tableSize] || 0} table(s) of this type are available.`);
        return;
      }

      // Validate date is not in the past
      const selectedDateTime = new Date(`${date}T${time}`);
      const now = new Date();
      if (selectedDateTime < now) {
        alert('Please select a future date and time');
        return;
      }

      // Validate restaurant hours
      if (restaurantData && restaurantData.opens_at && restaurantData.closes_at) {
        const selectedTime = time;
        const opensAt = restaurantData.opens_at;
        const closesAt = restaurantData.closes_at;

        if (selectedTime < opensAt || selectedTime > closesAt) {
          alert(`Please select a time between ${convertTo12Hour(opensAt)} and ${convertTo12Hour(closesAt)}`);
          return;
        }
      }

      // Create booking datetime (combine date and time)
      const bookingTime = `${date} ${time}:00`;

      // Create reservation object
      const reservationData = {
        consumer_id: parseInt(consumerId),
        stakeholder_id: parseInt(stakeholderId),
        table_size: parseInt(tableSize),
        quantity: quantity,
        booking_time: bookingTime,
        message: message || null
      };

      try {
        const response = await fetch('/api/dine-in/reserve', {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json' 
          },
          body: JSON.stringify(reservationData)
        });

        const data = await response.json();

        if (response.ok && data.success) {
          alert(`✅ Reservation Request Submitted!
          
Restaurant: ${restaurantData?.restaurant_name || 'Restaurant'}
Date: ${new Date(date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
Time: ${convertTo12Hour(time)}
Table: ${tableSize}-Person (${quantity} table${quantity > 1 ? 's' : ''})

The restaurant will review your request and contact you shortly.`);

          // Reset form
          reservationForm.reset();
          bookingSummary.style.display = 'none';
          availabilityHint.style.display = 'none';
          
          // Reload table availability
          await loadTableAvailability();
          
          // Redirect to dashboard
          setTimeout(() => {
            window.location.href = 'khadok.consumer.dashboard.html';
          }, 2000);

        } else {
          alert(data.message || 'Failed to submit reservation. Please try again.');
        }

      } catch (error) {
        console.error('Reservation error:', error);
        alert('Failed to submit reservation. Please check your connection and try again.');
      }
    });
  }

  // ============================================================================
  // VIEW-ONLY 3D LAYOUT (No Editing Tools)
  // ============================================================================
  async function load3DLayout() {
    try {
      // Get stakeholder ID from the selectedRestaurantId in localStorage
      const restaurantStakeholderId = localStorage.getItem('selectedRestaurantId');
      
      if (!restaurantStakeholderId) {
        console.warn('No selectedRestaurantId found in localStorage');
        showPlaceholder3D();
        return;
      }

      const response = await fetch(`/api/interior/${encodeURIComponent(restaurantStakeholderId)}`);
      
      if (!response.ok) {
        console.warn('Failed to fetch interior layout:', response.status);
        showPlaceholder3D();
        return;
      }

      const data = await response.json();
      
      if (data.success && data.data) {
        initialize3DView(data.data);
      } else {
        showPlaceholder3D();
      }
    } catch (error) {
      console.error('Error loading 3D layout:', error);
      showPlaceholder3D();
    }
  }

  // Initialize view-only 3D scene with auto-rotation
  function initialize3DView(layoutData) {
    const container = document.getElementById('threeDPreview');
    if (!container) return;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xf5f5f5);
    
    const camera = new THREE.PerspectiveCamera(
      75, 
      container.offsetWidth / container.offsetHeight, 
      0.1, 
      1000
    );
    
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(container.offsetWidth, container.offsetHeight);
    container.innerHTML = ''; // This clears the container
    container.appendChild(renderer.domElement);
    
    // Add the legend AFTER the renderer is appended
    const legend = document.createElement('div');
    legend.style.cssText = 'position: absolute; top: 12px; left: 12px; z-index: 20; background: rgba(255, 255, 255, 0.95); padding: 10px; border-radius: 8px; font-family: "Poppins", sans-serif; font-size: 11px; box-shadow: 0 2px 8px rgba(0,0,0,0.2); backdrop-filter: blur(4px);';
    legend.innerHTML = `
      <div style="font-weight: 600; margin-bottom: 8px; color: #333; font-size: 12px;">Table Legend</div>
      <div style="display: flex; flex-direction: column; gap: 4px;">
        <div style="display: flex; align-items: center; gap: 6px;">
          <div style="width: 16px; height: 16px; background: #007bff; border-radius: 3px;"></div>
          <span style="color: #555;">2-Person</span>
        </div>
        <div style="display: flex; align-items: center; gap: 6px;">
          <div style="width: 16px; height: 16px; background: #28a745; border-radius: 3px;"></div>
          <span style="color: #555;">4-Person</span>
        </div>
        <div style="display: flex; align-items: center; gap: 6px;">
          <div style="width: 16px; height: 16px; background: #0dcaf0; border-radius: 3px;"></div>
          <span style="color: #555;">5-Person</span>
        </div>
        <div style="display: flex; align-items: center; gap: 6px;">
          <div style="width: 16px; height: 16px; background: #ff7f50; border-radius: 3px;"></div>
          <span style="color: #555;">6-Person</span>
        </div>
        <div style="display: flex; align-items: center; gap: 6px;">
          <div style="width: 16px; height: 16px; background: #ffc13c; border-radius: 3px;"></div>
          <span style="color: #555;">8-Person</span>
        </div>
        <div style="display: flex; align-items: center; gap: 6px;">
          <div style="width: 16px; height: 16px; background: #6f42c1; border-radius: 3px;"></div>
          <span style="color: #555;">12-Person</span>
        </div>
        <div style="display: flex; align-items: center; gap: 6px;">
          <div style="width: 16px; height: 16px; background: #c82333; border-radius: 3px;"></div>
          <span style="color: #555;">16-Person</span>
        </div>
      </div>
    `;
    container.appendChild(legend);
    
    // Add lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);
    
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(10, 20, 10);
    scene.add(directionalLight);
    
    // Parse and render layout data
    let layout = null;
    if (layoutData.layout) {
      try {
        layout = typeof layoutData.layout === 'string' 
          ? JSON.parse(layoutData.layout) 
          : layoutData.layout;
      } catch (e) {
        console.error('Error parsing layout:', e);
      }
    }

    const floorLength = layoutData.floor_length || 100;
    const floorWidth = layoutData.floor_width || 100;
    
    // Create floor
    createFloor(scene, floorLength, floorWidth);
    
    // Render objects from layout
    if (layout && Array.isArray(layout.objects)) {
      layout.objects.forEach(obj => {
        if (obj.kind === 'table') {
          createTableObject(scene, obj);
        } else if (obj.kind === 'pillar') {
          createPillarObject(scene, obj);
        } else if (obj.kind === 'chair') {
          createChairObject(scene, obj);
        }
      });
    }
    
    // Set camera position
    const maxDim = Math.max(floorLength, floorWidth);
    const dist = maxDim * 1.2;
    camera.position.set(dist, dist * 0.9, dist);
    camera.lookAt(0, 0, 0);
    
    // === Interactive Controls ===
    let autoRotate = true;
    const rotationSpeed = 0.0002;
    let isDragging = false;
    let lastMouseX = 0;
    let lastMouseY = 0;
    
    // Mouse down event
    renderer.domElement.addEventListener('mousedown', (e) => {
      isDragging = true;
      autoRotate = false; // Stop auto-rotation when user interacts
      lastMouseX = e.clientX;
      lastMouseY = e.clientY;
      renderer.domElement.style.cursor = 'grabbing';
    });
    
    // Mouse move event - Manual rotation (Y-axis horizontal rotation)
    renderer.domElement.addEventListener('mousemove', (e) => {
      if (!isDragging) return;
      
      const deltaX = (e.clientX - lastMouseX) * 0.005;
      const deltaY = (e.clientY - lastMouseY) * 0.005;
      
      // Horizontal rotation (around Y-axis)
      const radius = Math.sqrt(camera.position.x ** 2 + camera.position.z ** 2);
      const currentAngle = Math.atan2(camera.position.z, camera.position.x);
      const newAngle = currentAngle + deltaX;
      
      camera.position.x = radius * Math.cos(newAngle);
      camera.position.z = radius * Math.sin(newAngle);
      
      // Vertical movement (camera height adjustment)
      camera.position.y = Math.max(10, Math.min(dist * 1.5, camera.position.y - deltaY * 50));
      
      camera.lookAt(0, 0, 0);
      
      lastMouseX = e.clientX;
      lastMouseY = e.clientY;
    });
    
    // Mouse up event
    window.addEventListener('mouseup', () => {
      if (isDragging) {
        isDragging = false;
        renderer.domElement.style.cursor = 'grab';
      }
    });
    
    // Set initial cursor
    renderer.domElement.style.cursor = 'grab';
    
    // Mouse wheel event - Zoom in/out
    renderer.domElement.addEventListener('wheel', (e) => {
      e.preventDefault();
      
      autoRotate = false; // Stop auto-rotation when user interacts
      
      const zoomSpeed = 0.1;
      const direction = e.deltaY > 0 ? 1 : -1;
      
      const zoomVector = new THREE.Vector3()
        .subVectors(camera.position, new THREE.Vector3(0, 0, 0))
        .normalize()
        .multiplyScalar(direction * zoomSpeed * camera.position.length());
      
      camera.position.add(zoomVector);
      
      // Constrain zoom limits
      const minDistance = Math.max(20, maxDim * 0.3);
      const maxDistance = maxDim * 3;
      const currentDistance = camera.position.length();
      
      if (currentDistance < minDistance) {
        camera.position.normalize().multiplyScalar(minDistance);
      } else if (currentDistance > maxDistance) {
        camera.position.normalize().multiplyScalar(maxDistance);
      }
      
      camera.lookAt(0, 0, 0);
    }, { passive: false });
    
    // Touch support for mobile devices
    let touchStartX = 0;
    let touchStartY = 0;
    let isTouching = false;
    
    renderer.domElement.addEventListener('touchstart', (e) => {
      if (e.touches.length === 1) {
        isTouching = true;
        autoRotate = false;
        touchStartX = e.touches[0].clientX;
        touchStartY = e.touches[0].clientY;
      }
    });
    
    renderer.domElement.addEventListener('touchmove', (e) => {
      if (!isTouching || e.touches.length !== 1) return;
      e.preventDefault();
      
      const touchX = e.touches[0].clientX;
      const touchY = e.touches[0].clientY;
      const deltaX = (touchX - touchStartX) * 0.005;
      const deltaY = (touchY - touchStartY) * 0.005;
      
      // Horizontal rotation
      const radius = Math.sqrt(camera.position.x ** 2 + camera.position.z ** 2);
      const currentAngle = Math.atan2(camera.position.z, camera.position.x);
      const newAngle = currentAngle + deltaX;
      
      camera.position.x = radius * Math.cos(newAngle);
      camera.position.z = radius * Math.sin(newAngle);
      
      // Vertical movement
      camera.position.y = Math.max(10, Math.min(dist * 1.5, camera.position.y - deltaY * 50));
      
      camera.lookAt(0, 0, 0);
      
      touchStartX = touchX;
      touchStartY = touchY;
    }, { passive: false });
    
    renderer.domElement.addEventListener('touchend', () => {
      isTouching = false;
    });
    
    // Pinch-to-zoom for mobile
    let lastTouchDistance = 0;
    
    renderer.domElement.addEventListener('touchstart', (e) => {
      if (e.touches.length === 2) {
        const dx = e.touches[0].clientX - e.touches[1].clientX;
        const dy = e.touches[0].clientY - e.touches[1].clientY;
        lastTouchDistance = Math.sqrt(dx * dx + dy * dy);
        autoRotate = false;
      }
    });
    
    renderer.domElement.addEventListener('touchmove', (e) => {
      if (e.touches.length === 2) {
        e.preventDefault();
        
        const dx = e.touches[0].clientX - e.touches[1].clientX;
        const dy = e.touches[0].clientY - e.touches[1].clientY;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        const delta = distance - lastTouchDistance;
        const zoomFactor = delta * 0.01;
        
        const zoomVector = new THREE.Vector3()
          .subVectors(camera.position, new THREE.Vector3(0, 0, 0))
          .normalize()
          .multiplyScalar(-zoomFactor * camera.position.length());
        
        camera.position.add(zoomVector);
        
        // Constrain zoom
        const minDistance = Math.max(20, maxDim * 0.3);
        const maxDistance = maxDim * 3;
        const currentDistance = camera.position.length();
        
        if (currentDistance < minDistance) {
          camera.position.normalize().multiplyScalar(minDistance);
        } else if (currentDistance > maxDistance) {
          camera.position.normalize().multiplyScalar(maxDistance);
        }
        
        camera.lookAt(0, 0, 0);
        lastTouchDistance = distance;
      }
    }, { passive: false });
    
    // Auto-rotate animation (only when not interacting)
    function animate() {
      requestAnimationFrame(animate);
      
      if (autoRotate && !isDragging && !isTouching) {
        const time = Date.now();
        camera.position.x = Math.sin(time * rotationSpeed) * dist;
        camera.position.z = Math.cos(time * rotationSpeed) * dist;
        camera.lookAt(0, 0, 0);
      }
      
      renderer.render(scene, camera);
    }
    animate();

    // Handle window resize
    window.addEventListener('resize', () => {
      if (container.offsetWidth > 0) {
        camera.aspect = container.offsetWidth / container.offsetHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(container.offsetWidth, container.offsetHeight);
      }
    });
  }

  // Create floor with grid
  function createFloor(scene, length, width) {
    const floorY = 5;
    
    // Create floor plane
    const floorGeometry = new THREE.PlaneGeometry(length, width);
    const floorMaterial = new THREE.MeshStandardMaterial({ 
      color: 0xffffff,
      opacity: 0.001,
      transparent: true,
      side: THREE.DoubleSide
    });
    const floor = new THREE.Mesh(floorGeometry, floorMaterial);
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = floorY;
    floor.receiveShadow = true;
    scene.add(floor);
    
    // Add grid helper
    const gridSize = Math.max(length, width);
    const divisions = Math.floor(gridSize / 5);
    const gridHelper = new THREE.GridHelper(gridSize, divisions);
    gridHelper.position.y = floorY + 0.001;
    gridHelper.scale.set(length / gridSize, 1, width / gridSize);
    scene.add(gridHelper);
  }

  // Create table object from saved data
  function createTableObject(scene, objData) {
    const type = String(objData.tableType || objData.type || '4');
    const x = objData.x || 0;
    const z = objData.z || 0;
    const floorY = objData.y || 5;
    
    let geometry, sizeX, sizeZ;
    
    if (type === '5') {
      geometry = new THREE.CylinderGeometry(6, 6, 1.2, 75);
      sizeX = sizeZ = 12;
    } else {
      const sizes = {
        '2': [10, 5],
        '4': [14, 7],
        '6': [18, 9],
        '8': [22, 11],
        '12': [26, 13],
        '16': [34, 17]
      };
      const [w, d] = sizes[type] || [6, 3];
      geometry = new THREE.BoxGeometry(w, 1.2, d);
      sizeX = w;
      sizeZ = d;
    }
    
    const colors = {
      '2': 0x007bff,
      '4': 0x28a745,
      '5': 0x0dcaf0,
      '6': 0xff7f50,
      '8': 0xffc13c,
      '12': 0x6f42c1,
      '16': 0xc82333
    };
    
    const material = new THREE.MeshStandardMaterial({ color: colors[type] || 0x222222 });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(x, floorY + 0.8, z);
    mesh.castShadow = true;
    scene.add(mesh);
  }

  // Create pillar object from saved data
  function createPillarObject(scene, objData) {
    const x = objData.x || 0;
    const z = objData.z || 0;
    const height = objData.height || 20;
    const floorY = 5;
    
    const geometry = new THREE.CylinderGeometry(2.5, 2.5, height, 30);
    const material = new THREE.MeshStandardMaterial({ color: 0x888888 });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(x, floorY + height / 2, z);
    mesh.castShadow = true;
    scene.add(mesh);
  }

  // Create chair object from saved data
  function createChairObject(scene, objData) {
    const x = objData.x || 0;
    const z = objData.z || 0;
    const floorY = 5;
    
    const geometry = new THREE.CylinderGeometry(1, 1, 1, 20);
    const material = new THREE.MeshStandardMaterial({ color: 0x444444 });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(x, floorY + 0.5, z);
    scene.add(mesh);
  }

  // Show placeholder when no 3D data available
  function showPlaceholder3D() {
    const container = document.getElementById('threeDPreview');
    if (container) {
      container.innerHTML = `
        <div style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); text-align: center; color: #888;">
          <i class="fas fa-cube" style="font-size: 48px; margin-bottom: 10px;"></i>
          <p>No 3D layout available for this restaurant</p>
        </div>
      `;
    }
  }

  // ============================================================================
  // VIEW-ONLY TABLE AVAILABILITY (No Add/Remove Controls)
  // ============================================================================
  async function loadTableAvailability() {
    try {
      const response = await fetch(`/api/interior/get-tables?stakeholder_id=${stakeholderId}`);
      const data = await response.json();
      
      if (data.success && data.tables) {
        updateTableCounts(data.tables);
      } else {
        showNoTablesAvailable();
      }
    } catch (error) {
      console.error('Error loading table availability:', error);
      showNoTablesAvailable();
    }
  }

  // Update table count display (view-only)
  function updateTableCounts(tables) {
    let total = 0;
    const counts = { 2: 0, 4: 0, 5: 0, 6: 0, 8: 0, 12: 0, 16: 0 };
    
    tables.forEach(table => {
      const capacity = parseInt(table.table_type);
      const quantity = parseInt(table.bookable) || 0;
      counts[capacity] = quantity;
      total += quantity;
    });
    
    // Store available tables for validation
    availableTables = counts;
    
    // Update total count
    const totalEl = document.getElementById('totalTablesCount');
    if (totalEl) {
      totalEl.textContent = total;
    }
    
    // Update individual counts
    Object.keys(counts).forEach(capacity => {
      const countEl = document.getElementById(`table-${capacity}-count`);
      if (countEl) {
        countEl.textContent = counts[capacity];
      }
    });
  }

  // Show message when no tables are available
  function showNoTablesAvailable() {
    const totalEl = document.getElementById('totalTablesCount');
    if (totalEl) {
      totalEl.textContent = '0';
    }
    
    // Set all counts to 0
    [2, 4, 5, 6, 8, 12, 16].forEach(capacity => {
      const countEl = document.getElementById(`table-${capacity}-count`);
      if (countEl) {
        countEl.textContent = '0';
      }
    });
  }

  // ============================================================================
  // VIEW-ONLY 360° VIEW (No Upload/Delete Controls)
  // ============================================================================
  async function load360View() {
    try {
      const response = await fetch(`/api/interior/get-interior-image?stakeholder_id=${stakeholderId}`);
      const data = await response.json();
      
      if (data.success && data.imageUrl) {
        initialize360View(data.imageUrl);
      } else {
        show360Placeholder();
      }
    } catch (error) {
      console.error('Error loading 360 view:', error);
      show360Placeholder();
    }
  }

  // Initialize 360° panoramic view
  function initialize360View(imageUrl) {
    const container = document.getElementById('panolens-container');
    if (!container) return;
    
    try {
      const panorama = new PANOLENS.ImagePanorama(imageUrl);
      const viewer = new PANOLENS.Viewer({ 
        container: container,
        autoRotate: true,
        autoRotateSpeed: 0.3,
        controlBar: true
      });
      viewer.add(panorama);
    } catch (error) {
      console.error('Error initializing 360 view:', error);
      show360Placeholder();
    }
  }

  // Show placeholder when no 360 image available
  function show360Placeholder() {
    const container = document.getElementById('panolens-container');
    if (container) {
      container.innerHTML = `
        <div style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); text-align: center; color: #fff;">
          <i class="fas fa-street-view" style="font-size: 48px; margin-bottom: 10px;"></i>
          <p>No 360° view available for this restaurant</p>
        </div>
      `;
    }
  }

  // ============================================================================
  // VIEW MENU MODAL
  // ============================================================================
  const viewMenuBtn = document.getElementById('viewMenuBtn');
  const menuModal = document.getElementById('menuModal');
  const closeMenuModal = document.getElementById('closeMenuModal');
  const menuSearchInput = document.getElementById('menuSearchInput');
  const menuSortSelect = document.getElementById('menuSortSelect');
  const menuCategoryTabs = document.getElementById('menuCategoryTabs');
  const menuSectionsContainer = document.getElementById('menuSectionsContainer');

  let allMenuItems = [];
  let menuCategories = [];

  // Open menu modal
  viewMenuBtn.addEventListener('click', async () => {
    menuModal.style.display = 'flex';
    document.body.style.overflow = 'hidden'; // Prevent background scroll
    document.getElementById('modal-restaurant-name').textContent = `${restaurantData?.restaurant_name || 'Restaurant'} Menu`;
    await loadRestaurantMenu();
  });

  // Close menu modal
  closeMenuModal.addEventListener('click', () => {
    menuModal.style.display = 'none';
    document.body.style.overflow = ''; // Restore scroll
  });

  // Close modal when clicking outside
  menuModal.addEventListener('click', (e) => {
    if (e.target === menuModal) {
      menuModal.style.display = 'none';
      document.body.style.overflow = ''; // Restore scroll
    }
  });

  // Load restaurant menu
  async function loadRestaurantMenu() {
    try {
      // Fetch menu categories
      const categoriesRes = await fetch(`/api/menu/get-menu-categories/${stakeholderId}`);
      const categoriesData = await categoriesRes.json();
      
      // Fetch menu items
      const itemsRes = await fetch(`/api/menu/get-menu-items/${stakeholderId}`);
      const itemsData = await itemsRes.json();

      if (categoriesData.cuisines && Array.isArray(categoriesData.cuisines)) {
        menuCategories = categoriesData.cuisines.map(c => c.cuisine_name);
        
        // Apply saved order if exists
        if (Array.isArray(categoriesData.savedOrder)) {
          const ordered = categoriesData.savedOrder.filter(n => menuCategories.includes(n));
          const leftovers = menuCategories.filter(n => !ordered.includes(n));
          menuCategories = [...ordered, ...leftovers];
        }
      }

      allMenuItems = Array.isArray(itemsData.menuItems) ? itemsData.menuItems : [];

      if (menuCategories.length === 0 || allMenuItems.length === 0) {
        showNoMenuMessage();
      } else {
        renderMenuTabs();
        renderMenuSections();
      }
    } catch (error) {
      console.error('Error loading menu:', error);
      showNoMenuMessage();
    }
  }

  // Show no menu message
  function showNoMenuMessage() {
    menuCategoryTabs.innerHTML = '';
    menuSectionsContainer.innerHTML = `
      <div class="no-menu-message">
        <i class="fas fa-utensils"></i>
        <h3>No Menu Available</h3>
        <p>This restaurant hasn't added their menu yet.</p>
      </div>
    `;
  }

  // Render menu tabs
  function renderMenuTabs() {
    menuCategoryTabs.innerHTML = '';
    menuCategories.forEach((category, index) => {
      const btn = document.createElement('button');
      btn.className = `menu-tab-btn ${index === 0 ? 'active' : ''}`;
      btn.textContent = category;
      btn.addEventListener('click', () => {
        document.querySelectorAll('.menu-tab-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        
        // Scroll within the modal container, not the page
        const section = document.getElementById(`menu-section-${category.toLowerCase()}`);
        if (section) {
          const container = document.getElementById('menuSectionsContainer');
          if (container) {
            // Calculate position relative to container
            const sectionTop = section.offsetTop - container.offsetTop;
            container.scrollTo({ 
              top: sectionTop, 
              behavior: 'smooth' 
            });
          }
        }
      });
      menuCategoryTabs.appendChild(btn);
    });
  }

  // Render menu sections
  function renderMenuSections() {
    menuSectionsContainer.innerHTML = '';
    
    menuCategories.forEach(category => {
      const section = document.createElement('div');
      section.className = 'menu-section';
      section.id = `menu-section-${category.toLowerCase()}`;
      
      const heading = document.createElement('h3');
      heading.textContent = category;
      section.appendChild(heading);
      
      const grid = document.createElement('div');
      grid.className = 'menu-items-grid';
      
      updateMenuSection(category, grid);
      
      section.appendChild(grid);
      menuSectionsContainer.appendChild(section);
    });

    // Setup search and sort
    setupMenuSearch();
    menuSortSelect.addEventListener('change', filterAndSortMenu);
  }

  // Setup live search functionality
  function setupMenuSearch() {
    const searchResultsContainer = document.getElementById('menuSearchResults');
    
    menuSearchInput.addEventListener('input', () => {
      const keyword = menuSearchInput.value.trim().toLowerCase();
      
      if (!keyword) {
        searchResultsContainer.style.display = 'none';
        return;
      }

      // Find matches by name or description
      const matches = allMenuItems.filter(item =>
        item.item_name.toLowerCase().includes(keyword) ||
        item.description.toLowerCase().includes(keyword)
      );

      if (!matches.length) {
        searchResultsContainer.innerHTML = `
          <div class="search-result-item">No results for "${keyword}"</div>`;
      } else {
        searchResultsContainer.innerHTML = matches.map(item => `
          <div class="search-result-item" data-id="${item.menu_id}">
            <span class="item-name">${item.item_name}</span>
            <span class="category-label">${item.cuisine_name}</span>
          </div>
        `).join('');
      }

      searchResultsContainer.style.display = 'block';

      // Attach click handlers to search results
      searchResultsContainer.querySelectorAll('.search-result-item[data-id]')
        .forEach(el => {
          el.addEventListener('click', () => {
            const id = el.dataset.id;
            
            // Find the menu card in the modal
            const card = document.querySelector(`#menuSectionsContainer .menu-item-card[data-id="${id}"]`);
            if (card) {
              // Scroll to the section first
              const section = card.closest('.menu-section');
              if (section) {
                menuSectionsContainer.scrollTo({
                  top: section.offsetTop - menuSectionsContainer.offsetTop,
                  behavior: 'smooth'
                });
              }
              
              // Then scroll to the specific card
              setTimeout(() => {
                const cardTop = card.offsetTop - menuSectionsContainer.offsetTop - 100;
                menuSectionsContainer.scrollTo({
                  top: cardTop,
                  behavior: 'smooth'
                });
                
                // Flash highlight the card
                card.classList.add('flash-highlight');
                setTimeout(() => card.classList.remove('flash-highlight'), 5000);
              }, 300);

              // Update active tab
              const categoryName = card.closest('.menu-section').id.replace('menu-section-', '');
              document.querySelectorAll('.menu-tab-btn').forEach(btn => {
                if (btn.textContent.toLowerCase() === categoryName) {
                  document.querySelectorAll('.menu-tab-btn').forEach(b => b.classList.remove('active'));
                  btn.classList.add('active');
                }
              });
            }

            // Clear search
            menuSearchInput.value = '';
            searchResultsContainer.style.display = 'none';
          });
        });
    });

    // Close search results when clicking outside
    document.addEventListener('click', (e) => {
      if (!menuSearchInput.contains(e.target) && !searchResultsContainer.contains(e.target)) {
        searchResultsContainer.style.display = 'none';
      }
    });
  }

  // Update menu section with items
  function updateMenuSection(category, grid) {
    let items = allMenuItems.filter(item => 
      item.cuisine_name.toLowerCase() === category.toLowerCase()
    );

    // Apply sorting
    const sortValue = menuSortSelect.value;
    if (sortValue === 'priceLow') {
      items.sort((a, b) => a.item_price - b.item_price);
    } else if (sortValue === 'priceHigh') {
      items.sort((a, b) => b.item_price - a.item_price);
    } else if (sortValue === 'alphaAZ') {
      items.sort((a, b) => a.item_name.localeCompare(b.item_name));
    } else if (sortValue === 'alphaZA') {
      items.sort((a, b) => b.item_name.localeCompare(a.item_name));
    }

    // Apply search filter
    const searchTerm = menuSearchInput.value.trim().toLowerCase();
    if (searchTerm) {
      items = items.filter(item =>
        item.item_name.toLowerCase().includes(searchTerm) ||
        item.description.toLowerCase().includes(searchTerm)
      );
    }

    grid.innerHTML = '';

    if (items.length === 0) {
      grid.innerHTML = '<p style="grid-column: 1/-1; text-align: center; color: #999;">No items found</p>';
      return;
    }

    items.forEach(item => {
      const card = document.createElement('div');
      card.className = 'menu-item-card';
      card.dataset.id = item.menu_id; // Add data-id for search functionality
      card.innerHTML = `
        <img src="${item.item_picture}" alt="${item.item_name}" class="menu-item-image" />
        <div class="menu-item-info">
          <div class="menu-item-name">${item.item_name}</div>
          <div class="menu-item-desc">${item.description || 'No description available'}</div>
          <div class="menu-item-price">Tk ${item.item_price}</div>
        </div>
      `;
      grid.appendChild(card);
    });
  }

  // Filter and sort menu
  function filterAndSortMenu() {
    menuCategories.forEach(category => {
      const grid = document.querySelector(`#menu-section-${category.toLowerCase()} .menu-items-grid`);
      if (grid) {
        updateMenuSection(category, grid);
      }
    });
  }
});