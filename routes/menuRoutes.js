// routes/menuRoutes.js or routes/utilityRoutes.js
const express = require('express');
const router = express.Router();
const db = require('../config/configdb');
const menuController = require('../controllers/menuController');
const upload = require('../middlewares/multerUpload'); // multer for image

router.post('/add-menu-item', upload.single('itemPic'), menuController.addMenuItem);

// GET /api/cuisines
router.get('/cuisines', (req, res) => {
    db.query('SELECT id, name FROM cuisine', (err, results) => {
      if (err) {
        console.error('DB Error:', err);
        return res.status(500).json({ message: 'Failed to fetch cuisines' });
      }
  
      res.json({ cuisines: results });
    });
  });



  // ✅ Get all menu items of a stakeholder
router.get('/get-menu-items/:stakeholderId', menuController.getMenuItemsByStakeholder);

// GET with savedOrder
router.get(
  '/get-menu-categories/:stakeholderId',
  menuController.getMenuCategories
);

// POST save order
router.post(
  '/save-category-order/:stakeholderId',
  express.json(),
  menuController.saveCategoryOrder
);


router.delete("/delete-menu-item/:menuID", menuController.deleteMenuItem);



// 🔥 NEW: fetch a single item for editing
router.get('/item/:id', menuController.getMenuItemById);

// 🔥 NEW: update an item
router.put(
  '/edit-menu-item/:id',
  upload.single('itemPic'),
  menuController.editMenuItemById
);

module.exports = router;
