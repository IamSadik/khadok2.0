 // Switch between add/remove mode
 const modeSwitch = document.getElementById("modeSwitch");
 const executeBtn = document.getElementById("executeAction");
 const addRowBtn = document.getElementById("addRow");
 const removeRowBtn = document.getElementById("removeRow");
 const rowsContainer = document.getElementById("table-rows-container");

 modeSwitch.addEventListener("change", () => {
   if (modeSwitch.checked) {
     executeBtn.innerHTML = '<i class="fas fa-minus-circle"></i> Remove Table';
     executeBtn.classList.remove("add-mode");
     executeBtn.classList.add("remove-mode");
   } else {
     executeBtn.innerHTML = '<i class="fas fa-plus-circle"></i> Add Table';
     executeBtn.classList.remove("remove-mode");
     executeBtn.classList.add("add-mode");
   }
 });

 // Toggle table type selection
 document.querySelectorAll(".table-type").forEach(btn => {
   btn.addEventListener("click", () => {
     document.querySelectorAll(".table-type").forEach(b => b.classList.remove("active"));
     btn.classList.add("active");
   });
 });

 // Handle table type selection
 function handleTypeButtons(row) {
    const buttons = row.querySelectorAll(".table-type");
    buttons.forEach(btn => {
      btn.addEventListener("click", () => {
        buttons.forEach(b => b.classList.remove("active"));
        btn.classList.add("active");
      });
    });
  }
 // Initial setup
 handleTypeButtons(rowsContainer.querySelector(".table-row"));

 // Add new row
 addRowBtn.addEventListener("click", () => {
  const rows = rowsContainer.querySelectorAll(".table-row");

  if (rows.length >= 7) return; // Prevent more than 5 rows

  const firstRow = rows[0];
  const newRow = firstRow.cloneNode(true);

  newRow.querySelector(".table-count").value = "";
  newRow.querySelectorAll(".table-type").forEach(btn => btn.classList.remove("active"));
  rowsContainer.appendChild(newRow);

  handleTypeButtons(newRow);
  updateRemoveButton();
  updateAddButton(); // New function call
});

function updateAddButton() {
  const totalRows = rowsContainer.querySelectorAll(".table-row").length;
  addRowBtn.style.display = totalRows < 7 ? "inline-block" : "none";
}


 // Remove last row
 removeRowBtn.addEventListener("click", () => {
   const rows = rowsContainer.querySelectorAll(".table-row");
   if (rows.length > 1) {
     rows[rows.length - 1].remove();
   }
   updateRemoveButton();
 });

 // Show/hide Remove Last button
 function updateRemoveButton() {
  const totalRows = rowsContainer.querySelectorAll(".table-row").length;
  removeRowBtn.style.display = totalRows > 1 ? "inline-block" : "none";
  updateAddButton(); // Also update the Add button visibility
}


// Handle execute button click
// Add or Remove Tables to DB
executeBtn.addEventListener("click", () => {
  const rows = rowsContainer.querySelectorAll(".table-row");
  const tableData = [];

  let stakeholder_id = localStorage.getItem("stakeholder_id");

  if (!stakeholder_id) {
    alert("Stakeholder ID not found. Please login again.");
    return;
  }

  let hasError = false;

  rows.forEach((row, index) => {
    const selectedButton = row.querySelector(".table-type.active");
    const tableCount = row.querySelector(".table-count").value;

    if (!selectedButton || !tableCount || parseInt(tableCount) < 1) {
      alert(`Please select table type and enter a valid number in row ${index + 1}`);
      hasError = true;
      return;
    }

    tableData.push({
      table_type: selectedButton.getAttribute("data-type"),
      quantity: parseInt(tableCount)
    });
  });

  if (hasError) return;

  const payload = {
    stakeholder_id: stakeholder_id,
    tables: tableData
  };

  const isRemoveMode = modeSwitch.checked;
  const endpoint = isRemoveMode
    ? "/api/interior/remove-tables"
    : "/api/interior/add-tables";

  // Send to backend
  fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  })
    .then(res => res.json())
    .then(data => {
      console.log("Server Response:", data);
      if (data.success) {
        alert(`Tables successfully ${isRemoveMode ? "removed" : "added"}!`);

        // Optionally refresh preview or clear inputs here
        window.location.reload();
      } else {
        alert(`Error: ${data.message || "Something went wrong."}`);
        window.location.reload();
        
      }
    })
    .catch(err => {
      console.error("Request Error:", err);
      alert("Failed to connect to server.");
    });
});



//Fetch Tables for stakeholders
function fetchAndRenderTablePreview() {
  const stakeholder_id = localStorage.getItem("stakeholder_id");
  if (!stakeholder_id) {
    console.error("stakeholder_id not found in localStorage");
    return;
  }

  fetch(`/api/interior/get-tables?stakeholder_id=${stakeholder_id}`)
    .then(res => res.json())
    .then(data => {
      if (data.success) {
        const wrapper = document.getElementById("table-preview-wrapper");
        wrapper.innerHTML = "";

        const typeIconMap = {
          2: { icon: "../images/2PersonTable.png", label: "2 Person" },
          4: { icon: "../images/4PersonTable.png", label: "4 Person" },
          5: { icon: "../images/5PersonTable.png", label: "5 Person" },
          6: { icon: "../images/6PersonTable.png", label: "6 Person" },
          8: { icon: "../images/8PersonTable.png", label: "8 Person" },
          12: { icon: "../images/12PersonTable.png", label: "12 Person" },
          16: { icon: "../images/16PersonTable.png", label: "16 Person" }
        };

        // Create a lookup for received data
        const quantityMap = {};
        data.tables.forEach(t => {
          quantityMap[t.table_type] = t.quantity;
        });

        // Loop in sorted order
        Object.keys(typeIconMap).sort((a, b) => a - b).forEach(type => {
          const quantity = quantityMap[type];
          if (!quantity) return; // Skip if not present

          const { icon, label } = typeIconMap[type];

          const card = document.createElement("div");
          card.classList.add("preview-card");

          const topLabel = document.createElement("div");
          topLabel.className = "preview-top-label";
          topLabel.textContent = label;

          const img = document.createElement("img");
          img.src = icon;
          img.alt = `${label} Table`;

          const count = document.createElement("span");
          count.textContent = `${quantity}x`;

          card.appendChild(topLabel);
          card.appendChild(img);
          card.appendChild(count);
          wrapper.appendChild(card);
        });
      } else {
        console.error("Failed to fetch table preview:", data.message);
      }
    })
    .catch(err => {
      console.error("Error fetching table preview:", err);
    });
}


// Call after DOM load or after any table add/remove
document.addEventListener("DOMContentLoaded", () => {
  fetchAndRenderTablePreview();
});







//3D view section

// /public/stakeholder/js/interior.js
window.addEventListener("DOMContentLoaded", () => {
  const container = document.getElementById("threeDPreview");
  if (!container) return console.error("threeDPreview not found");

  // === Scene, camera, renderer ===
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0xf7f7f7);

  const camera = new THREE.PerspectiveCamera(
    60,
    container.clientWidth / container.clientHeight,
    0.1,
    2000
  );
  camera.position.set(150, 150, 150); // natural isometric top-right
  camera.lookAt(0, 0, 0);

  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(container.clientWidth, container.clientHeight);
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.shadowMap.enabled = true;
  container.appendChild(renderer.domElement);

  // === Lighting ===
  scene.add(new THREE.AmbientLight(0xffffff, 0.6));
  const dir = new THREE.DirectionalLight(0xffffff, 0.8);
  dir.position.set(200, 400, 200);
  dir.castShadow = true;
  scene.add(dir);

  // === Floor ===
  let floorMesh, gridHelper;
  const floorY = 5;
  let floorLength = 100;
  let floorWidth = 100;

  function createFloor(len, wid) {
    if (floorMesh) {
      scene.remove(floorMesh);
      floorMesh.geometry.dispose();
      floorMesh.material.dispose();
    }
    if (gridHelper) {
      scene.remove(gridHelper);
      gridHelper.geometry.dispose();
      gridHelper.material.dispose();
    }

    // Create floor plane with exact length x width dimensions
    const geo = new THREE.PlaneGeometry(len, wid);
    const mat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      opacity: 0.001,
      transparent: true,
      side: THREE.DoubleSide
    });
    floorMesh = new THREE.Mesh(geo, mat);
    floorMesh.rotation.x = -Math.PI / 2;
    floorMesh.position.y = floorY;
    floorMesh.receiveShadow = true;
    scene.add(floorMesh);

    // Create grid helper that matches floor dimensions
    // GridHelper creates a square grid, so we use the larger dimension
    const gridSize = Math.max(len, wid);
    const divisions = Math.floor(gridSize / 5);
    gridHelper = new THREE.GridHelper(gridSize, divisions);
    gridHelper.position.y = floorY + 0.001;
    
    // Scale the grid to match the actual floor dimensions (length x width)
    gridHelper.scale.set(len / gridSize, 1, wid / gridSize);
    
    scene.add(gridHelper);

    fitCamera(len, wid);
  }

  function fitCamera(len, wid) {
    const maxDim = Math.max(len, wid);
    const dist = maxDim * 1.2;
    camera.position.set(dist, dist * 0.9, dist);
    camera.lookAt(0, 0, 0);
  }

  createFloor(floorLength, floorWidth);

  // === Object creation ===
  const placed = [];

  function isOverlapping(x, z, sizeX, sizeZ) {
    // Iterate over all placed objects
    for (let obj of placed) {
        const pos = obj.position;
        let objSizeX = obj.userData.sizeX || (obj.geometry.parameters.width || 0);
        let objSizeZ = obj.userData.sizeZ || (obj.geometry.parameters.depth || 0);

        // For cylinder tables (circle), use radius as half size
        if (obj.userData.kind === "table" && obj.userData.type === "5") {
            objSizeX = objSizeZ = obj.geometry.parameters.radiusTop * 2;
        }
        if (obj.userData.kind === "pillar") {
            objSizeX = objSizeZ = obj.geometry.parameters.radiusTop * 2;
        }
        if (obj.userData.kind === "chair") {
            objSizeX = objSizeZ = 2; // chair dot size
        }

        // Axis-Aligned Bounding Box check
        if (Math.abs(pos.x - x) < (objSizeX/2 + sizeX/2) &&
            Math.abs(pos.z - z) < (objSizeZ/2 + sizeZ/2)) {
            return true; // overlapping
        }
    }
    return false; // no overlap
}



function createTable(type, x, z) {
  let geo, sizeX, sizeZ;
  if (type === "5") {
      geo = new THREE.CylinderGeometry(6, 6, 1.2, 75); // circle
      sizeX = sizeZ = 12;
  } else {
      let size = { "2": [10, 5], "4": [14, 7], "6": [18, 9], "8": [22, 11], "12": [26, 13], "16": [34, 17] };
      const [w, d] = size[type] || [6, 3];
      geo = new THREE.BoxGeometry(w, 1.2, d); // rectangle
      sizeX = w;
      sizeZ = d;
  }

  if (isOverlapping(x, z, sizeX, sizeZ)) {
      alert("Cannot place table here! Overlaps with existing component.");
      return;
  }

  const colors = {
      "2": 0x007bff,
      "4": 0x28a745,
      "5": 0x0dcaf0,
      "6": 0xff7f50,
      "8": 0xffc13c,
      "12": 0x6f42c1,
      "16": 0xc82333
  };
  const mat = new THREE.MeshStandardMaterial({ color: colors[type] || 0x222222 });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.set(x, floorY + 0.8, z);
  mesh.castShadow = true;
  mesh.userData = { kind: "table", type, sizeX, sizeZ };
  scene.add(mesh);
  placed.push(mesh);
}

function createPillar(x, z, h = 40) {
  const geo = new THREE.CylinderGeometry(2.5, 2.5, h, 30);
  const mat = new THREE.MeshStandardMaterial({ color: 0x888888 });
  const sizeX = sizeZ = 5;
  
  if (isOverlapping(x, z, sizeX, sizeZ)) {
      alert("Cannot place pillar here! Overlaps with existing component.");
      return;
  }

  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.set(x, floorY + h / 2, z);
  mesh.castShadow = true;
  mesh.userData = { kind: "pillar", height: h, sizeX, sizeZ };
  scene.add(mesh);
  placed.push(mesh);
}

function createChair(x, z) {
  const size = 2; // small dot
  if (isOverlapping(x, z, size, size)) {
      alert("Cannot place chair here! Overlaps with existing component.");
      return;
  }
  const geo = new THREE.CylinderGeometry(1, 1, 1, 20); // small dot
  const mat = new THREE.MeshStandardMaterial({ color: 0x444444 });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.set(x, floorY + 0.5, z);
  mesh.userData = { kind: "chair", sizeX: size, sizeZ: size };
  scene.add(mesh);
  placed.push(mesh);
}



  // === Raycasting for accurate placement ===
  const raycaster = new THREE.Raycaster();
  const mouse = new THREE.Vector2();
  let mode = null;
  let tableType = "4";
  let pillarHeight = 20;

  function onCanvasClick(e) {
    if (!mode) return;
    const rect = renderer.domElement.getBoundingClientRect();
    mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

    raycaster.setFromCamera(mouse, camera);
    
    // Raycast against all objects to get proper intersection
    const hits = raycaster.intersectObjects(scene.children, true);
    
    // Find the floor intersection
    for (let i = 0; i < hits.length; i++) {
      const hit = hits[i];
      // Check if we hit the floor mesh or grid helper
      if (hit.object === floorMesh || hit.object === gridHelper) {
        const worldPos = hit.point;
        
        if (mode === "table") {
          createTable(tableType, worldPos.x, worldPos.z);
      } else if (mode === "pillar") {
          createPillar(worldPos.x, worldPos.z, pillarHeight);
      } else if (mode === "chair") {
          createChair(worldPos.x, worldPos.z);
      }
      
        break;
      }
    }
  }
  let selectedObject = null;
let offset = new THREE.Vector3();
let isDraggingObject = false;

renderer.domElement.addEventListener("pointerdown", e => {
  const rect = renderer.domElement.getBoundingClientRect();
  mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
  mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

  raycaster.setFromCamera(mouse, camera);

  if (mode === "move") {
      const hits = raycaster.intersectObjects(placed, true);
      if (hits.length > 0) {
          // Start dragging object
          selectedObject = hits[0].object;
          const hitPoint = hits[0].point;
          offset.copy(hitPoint).sub(selectedObject.position);
          isDraggingObject = true;
          isDown = false; // disable rotation while dragging
      } else {
          // Clicked empty space → allow camera rotation
          selectedObject = null;
          isDraggingObject = false;
          isDown = true;
          lastX = e.clientX;
      }
  } else {
      // Normal modes (table, chair, pillar) → rotate camera
      selectedObject = null;
      isDraggingObject = false;
      isDown = true;
      lastX = e.clientX;
  }
});


renderer.domElement.addEventListener("pointermove", e => {
  const rect = renderer.domElement.getBoundingClientRect();
  mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
  mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

  // Move object
  if (isDraggingObject && selectedObject && mode === "move") {
      raycaster.setFromCamera(mouse, camera);
      const hits = raycaster.intersectObject(floorMesh);

      if (hits.length > 0) {
          let newPos = hits[0].point.clone().sub(offset);

          const halfX = (selectedObject.userData.sizeX || 1) / 2;
          const halfZ = (selectedObject.userData.sizeZ || 1) / 2;
          newPos.x = Math.max(-floorLength/2 + halfX, Math.min(floorLength/2 - halfX, newPos.x));
          newPos.z = Math.max(-floorWidth/2 + halfZ, Math.min(floorWidth/2 - halfZ, newPos.z));

          // Check overlap (ignore self)
          const overlap = placed.some(obj => {
              if (obj === selectedObject) return false;
              return isOverlapping(newPos.x, newPos.z, obj.userData.sizeX, obj.userData.sizeZ);
          });

          if (!overlap) {
              selectedObject.position.x = newPos.x;
              selectedObject.position.z = newPos.z;
          }
      }

      return; // do not rotate camera while dragging object
  }

  // Camera rotation
  if (isDown && !isDraggingObject) {
      const delta = (e.clientX - lastX) * 0.005;
      const radius = Math.sqrt(camera.position.x ** 2 + camera.position.z ** 2);
      const currentAngle = Math.atan2(camera.position.z, camera.position.x);
      const newAngle = currentAngle + delta;

      camera.position.x = radius * Math.cos(newAngle);
      camera.position.z = radius * Math.sin(newAngle);
      camera.lookAt(0, 0, 0);

      lastX = e.clientX;
  }
});

renderer.domElement.addEventListener("pointerup", e => {
  selectedObject = null;
  isDraggingObject = false;
  isDown = false;
});

  renderer.domElement.addEventListener("click", onCanvasClick);
  

  // === Mouse Zoom (Wheel) ===
  renderer.domElement.addEventListener("wheel", (e) => {
    e.preventDefault();
    
    const zoomSpeed = 0.1;
    const direction = e.deltaY > 0 ? 1 : -1;
    
    // Calculate zoom vector from camera to origin
    const zoomVector = new THREE.Vector3()
      .subVectors(camera.position, new THREE.Vector3(0, 0, 0))
      .normalize()
      .multiplyScalar(direction * zoomSpeed * camera.position.length());
    
    // Apply zoom
    camera.position.add(zoomVector);
    
    // Clamp camera distance to reasonable bounds
    const minDistance = 10;
    const maxDistance = 500;
    const currentDistance = camera.position.length();
    
    if (currentDistance < minDistance) {
      camera.position.normalize().multiplyScalar(minDistance);
    } else if (currentDistance > maxDistance) {
      camera.position.normalize().multiplyScalar(maxDistance);
    }
    
    camera.lookAt(0, 0, 0);
  }, { passive: false });

  // === Rotation (Y-axis) - Rotate camera instead of scene ===
  let isDown = false, lastX = 0;
  renderer.domElement.addEventListener("mousedown", e => {
    isDown = true;
    lastX = e.clientX;
  });
  window.addEventListener("mouseup", () => isDown = false);
  window.addEventListener("mousemove", e => {
    if (isDown && mode !== "move") {
      const delta = (e.clientX - lastX) * 0.005;
      
      // Rotate camera around the origin (FIXED: changed from - to +)
      const radius = Math.sqrt(camera.position.x ** 2 + camera.position.z ** 2);
      const currentAngle = Math.atan2(camera.position.z, camera.position.x);
      const newAngle = currentAngle + delta;
      
      camera.position.x = radius * Math.cos(newAngle);
      camera.position.z = radius * Math.sin(newAngle);
      camera.lookAt(0, 0, 0);
      
      lastX = e.clientX;
    }
  });

  // === Keyboard rotation ===
  window.addEventListener("keydown", e => {
    if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
      const delta = e.key === "ArrowLeft" ? -0.05 : 0.05;
      
      // Rotate camera around the origin (FIXED: changed from - to +)
      const radius = Math.sqrt(camera.position.x ** 2 + camera.position.z ** 2);
      const currentAngle = Math.atan2(camera.position.z, camera.position.x);
      const newAngle = currentAngle + delta;
      
      camera.position.x = radius * Math.cos(newAngle);
      camera.position.z = radius * Math.sin(newAngle);
      camera.lookAt(0, 0, 0);
    }
  });

  // === Resize ===
  window.addEventListener("resize", () => {
    const w = container.clientWidth, h = container.clientHeight;
    renderer.setSize(w, h);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  });

  // === Toolbar logic ===
  const qs = id => document.getElementById(id);
  const setMode = m => {
    // If clicked button is already active, deactivate mode
    if (mode === m) {
        mode = null;
        document.querySelectorAll(".designer-btn").forEach(b => b.classList.remove("active"));
        return;
    }

    // Otherwise, activate new mode
    mode = m;
    document.querySelectorAll(".designer-btn").forEach(b => b.classList.remove("active"));
    if (m === "table") qs("addTableBtn").classList.add("active");
    if (m === "pillar") qs("addPillarBtn").classList.add("active");
    if (m === "chair") qs("addChairBtn").classList.add("active"); // <-- add this line
    if (m === "move") qs("moveToolBtn").classList.add("active"); // <-- New
};


  qs("addTableBtn").onclick = () => setMode("table");
  qs("addPillarBtn").onclick = () => setMode("pillar");
  qs("addChairBtn").onclick = () => setMode("chair");
  qs("moveToolBtn").onclick = () => setMode("move");
  qs("tableSizeSelect").onchange = e => (tableType = e.target.value);
  qs("pillarHeightInput").onchange = e => {
    const v = parseFloat(e.target.value);
    if (!isNaN(v) && v > 0) pillarHeight = v;
  };
  qs("applyFloorSizeBtn").onclick = () => {
    const len = parseFloat(qs("floorLenInput").value);
    const wid = parseFloat(qs("floorWidInput").value);
    
    // Update only if values are valid, otherwise keep current
    if (!isNaN(len) && len > 0) {
      floorLength = Math.max(10, Math.min(2000, len));
    }
    if (!isNaN(wid) && wid > 0) {
      floorWidth = Math.max(10, Math.min(2000, wid));
    }
    
    createFloor(floorLength, floorWidth);
  };
  qs("undoBtn").onclick = () => {
    const last = placed.pop();
    if (last) {
      scene.remove(last);
      last.geometry.dispose();
      last.material.dispose();
    }
  };
  qs("clearBtn").onclick = () => {
    while (placed.length) {
      const o = placed.pop();
      scene.remove(o);
      o.geometry.dispose();
      o.material.dispose();
    }
  };
  qs("autoRotateToggle").onchange = e => autoRotate = e.target.checked;
  
  // === Auto rotate toggle ===
  let autoRotate = false;

  // === Render loop ===
  function animate() {
    requestAnimationFrame(animate);
    if (autoRotate ) {
      const radius = Math.sqrt(camera.position.x ** 2 + camera.position.z ** 2);
      const currentAngle = Math.atan2(camera.position.z, camera.position.x);
      const newAngle = currentAngle + 0.002;
      
      camera.position.x = radius * Math.cos(newAngle);
      camera.position.z = radius * Math.sin(newAngle);
      camera.lookAt(0, 0, 0);
    }
    renderer.render(scene, camera);
  }
  animate();

  // === Export JSON for saving ===
  window.__getInteriorLayoutJSON = () => ({
    floor: { length: floorLength, width: floorWidth, y: floorY },
    objects: placed.map(o => ({
      kind: o.userData.kind,
      tableType: o.userData.type || null,
      height: o.userData.height || null,
      x: o.position.x,
      y: o.position.y,
      z: o.position.z
    })),
    created_at: new Date().toISOString()
  });
});