const menuModel = require('../models/menuModel');

const addMenuItem = async (req, res) => {
  try {
    const { name, price, description, stakeholder_id } = req.body;
    let { cuisine } = req.body;
    const itemPic = req.file ? req.file.filename : null;

    // ⚠️ Handle stringified cuisine from FormData
    if (typeof cuisine === 'string') {
      cuisine = [cuisine];
    }

    // Basic field validation
    if (!name || !price || !description || !itemPic || !stakeholder_id || !cuisine || cuisine.length === 0) {
      console.log('Missing fields:', { name, price, description, itemPic, stakeholder_id, cuisine });
      return res.status(400).json({ message: 'Missing required fields' });
    }

    // Insert menu item
    const menuId = await menuModel.insertMenuItem({
      stakeholder_id,
      item_name: name,
      item_price: price,
      description,
      item_picture: itemPic,
    });

    // Insert related cuisine entries
    await menuModel.insertStakeholderCuisine(stakeholder_id, menuId, cuisine);

    return res.status(201).json({ message: 'Menu item added successfully' });

  } catch (error) {
    console.error('Add Menu Error:', error);
    return res.status(500).json({ message: 'Server error adding menu item' });
  }
};


// ✅ Get all menu items for a stakeholder
// controllers/menuController.js

const getMenuItemsByStakeholder = async (req, res) => {
  try {
    const { stakeholderId } = req.params;
    const rows = await menuModel.getMenuItemsByStakeholder(stakeholderId);

    // prefix item_picture so the front end can load it
    const menuItems = rows.map(item => ({
      ...item,
      item_picture: `/uploads/${item.item_picture}`
    }));

    return res.status(200).json({ menuItems });
  } catch (error) {
    console.error('Error fetching menu items:', error);
    return res.status(500).json({ message: 'Server error while fetching menu items' });
  }
};

// ✅ Get unique cuisine categories for a stakeholder
const getMenuCategoriesByStakeholder = async (req, res) => {
  try {
    const { stakeholderId } = req.params;
    const cuisines = await menuModel.getMenuCategoriesByStakeholder(stakeholderId);

    res.status(200).json({ cuisines });
  } catch (error) {
    console.error('Error fetching cuisine categories:', error);
    res.status(500).json({ message: 'Server error while fetching cuisine categories' });
  }
};

const getMenuCategories = async (req, res) => {
  const { stakeholderId } = req.params;
  try {
    // 1) fetch the list of cuisines
    const cuisines = await menuModel.getMenuCategories(stakeholderId);
    // 2) fetch the saved order (JSON string or null)
    const orderJson = await menuModel.getCategoryOrder(stakeholderId);

    // parse it if present
    let savedOrder = null;
    if (orderJson) {
      try { savedOrder = JSON.parse(orderJson); }
      catch(e) { console.error('Invalid saved order JSON:', e); }
    }

    return res.json({ cuisines, savedOrder });
  } catch (err) {
    console.error('Error in getMenuCategories:', err);
    return res.status(500).json({ message: 'Server error fetching categories' });
  }
};

const saveCategoryOrder = async (req, res) => {
  const { stakeholderId } = req.params;
  const { orderedCategories } = req.body;

  if (!Array.isArray(orderedCategories)) {
    return res.status(400).json({ message: 'orderedCategories must be an array' });
  }

  try {
    await menuModel.saveCategoryOrder(stakeholderId, orderedCategories);
    return res.json({ success: true });
  } catch (err) {
    console.error('Error in saveCategoryOrder:', err);
    return res.status(500).json({ message: 'Server error saving category order' });
  }
};

const deleteMenuItem = async (req, res) => {
  const menuId = req.params.menuID;

  try {
    const result = await menuModel.deleteMenuItemById(menuId);
    if (result.success) {
      return res.status(200).json({ message: "Menu item deleted successfully" });
    } else {
      return res.status(404).json({ error: "Item not found or already deleted" });
    }
  } catch (err) {
    console.error("Delete Error:", err);
    return res.status(500).json({ error: "Server error" });
  }
};



const getMenuItemById = (req, res) => {
  const menuId = req.params.id;
  menuModel.getMenuItemById(menuId, (err, menuItem) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ message: 'Server error fetching menu item' });
    }
    if (!menuItem) {
      return res.status(404).json({ message: 'Menu item not found' });
    }
    // now fetch its cuisines
    menuModel.fetchMenuCuisines(menuId, (err2, cuisineIds) => {
      if (err2) {
        console.error(err2);
        return res.status(500).json({ message: 'Server error fetching cuisines' });
      }
      // merge and return
      return res.json({
        ...menuItem,
        cuisines: cuisineIds
      });
    });
  });
};

// PUT /api/menu/edit-menu-item/:id
const editMenuItemById = (req, res) => {
  const menuId = req.params.id;

  // First, fetch the existing row
  menuModel.getMenuItemById(menuId, (err, existing) => {
    if (err) {
      console.error("DB error fetching existing item:", err);
      return res.status(500).json({ message: 'Server error' });
    }
    if (!existing) {
      return res.status(404).json({ message: 'Menu item not found' });
    }

    // Decide final values: if the client sent a new one, use it; otherwise keep old
    const name        = req.body.name?.trim()       || existing.item_name;
    const price       = (req.body.price   !== undefined)
                        ? parseFloat(req.body.price)
                        : existing.item_price;
    const description = req.body.description?.trim()|| existing.description;
    // multer put filename on req.file
    const itemPic     = req.file
                        ? req.file.filename
                        : existing.item_picture;

    // Build cuisine array (may be one or many)
    const cuisines = Array.isArray(req.body.cuisine)
                      ? req.body.cuisine
                      : req.body.cuisine
                        ? [req.body.cuisine]
                        : [];

    // DEBUG: log what we are about to send to UPDATE
    console.log("⏺️ Updating menu_id=", menuId,
                { name, price, description, itemPic, cuisines });

    // 1) update the main row
    menuModel.updateMenuItemById(
      menuId,
      { name, price, description, itemPic },
      err2 => {
        if (err2) {
          console.error("DB error updating menu:", err2);
          return res.status(500).json({ message: 'Server error updating menu' });
        }
        // 2) only replace cuisines if the client sent any
        if (cuisines.length) {
          // stakeholder_id comes from the form
          const stakeholderId = req.body.stakeholder_id;
          menuModel.replaceMenuCuisines(
            menuId,
            stakeholderId,
            cuisines,
            err3 => {
              if (err3) {
                console.error("DB error updating cuisines:", err3);
                return res.status(500).json({ message: 'Server error updating cuisines' });
              }
              return res.json({ message: 'Menu updated successfully' });
            }
          );
        } else {
          // nothing to do for cuisines
          return res.json({ message: 'Menu updated (no cuisine change)' });
        }
      }
    );
  });
};


module.exports = {
  addMenuItem,
  getMenuItemsByStakeholder,
  getMenuCategoriesByStakeholder,
  getMenuCategories,
  saveCategoryOrder,
  deleteMenuItem,
  editMenuItemById,
  getMenuItemById,

};

