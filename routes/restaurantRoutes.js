// routes/consumerRoutes.js
const express = require("express");
const router = express.Router();
const restaurantController = require("../controllers/restaurantController");

// Get nearby restaurants by user's current location
router.get("/nearby", restaurantController.getNearbyRestaurants);


/*## How to Use:

### **1. Get restaurants with straight-line distance (Fast):**
```
http://localhost:3000/api/restaurant/nearby?lat=23.7470&lng=90.3760&radius=10
```

### **2. Get restaurants with road distance (More accurate, slower):**
```
http://localhost:3000/api/restaurant/nearby?lat=23.7470&lng=90.3760&radius=10&useRoadDistance=true
```

### **3. Get single restaurant by ID:**
```
http://localhost:3000/api/restaurant/123
```
*/



// Get single restaurant by stakeholder_id
router.get("/:stakeholder_id", restaurantController.getRestaurantById);


module.exports = router;
