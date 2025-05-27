const db = require('../config/configdb');

const insertMenuItem = async (data) => {
  const { stakeholder_id, item_name, item_price, description, item_picture } = data;

  return new Promise((resolve, reject) => {
    db.query(
      `INSERT INTO menu (stakeholder_id, item_name, item_price, description, item_picture)
       VALUES (?, ?, ?, ?, ?)`,
      [stakeholder_id, item_name, item_price, description, item_picture],
      (err, result) => {
        if (err) return reject(err);
        resolve(result.insertId); // menu_id
      }
    );
  });
};

const insertStakeholderCuisine = async (stakeholderId, menuId, cuisineIds) => {
  const values = cuisineIds.map(cuisineId => [stakeholderId, cuisineId, menuId]);

  return new Promise((resolve, reject) => {
    db.query(
      `INSERT INTO stakeholder_cuisine (stakeholder_id, cuisine_id, menu_id)
       VALUES ?`,
      [values],
      (err, result) => {
        if (err) return reject(err);
        resolve(result);
      }
    );
  });
};



const getMenuItemsByStakeholder = (stakeholderId) => {
  return new Promise((resolve, reject) => {
    const sql = `
      SELECT
        m.menu_id,
        m.item_name,
        m.item_price,
        m.description,
        m.item_picture,
        -- grab the first cuisine for filtering
        SUBSTRING_INDEX(GROUP_CONCAT(c.name), ',', 1) AS cuisine_name
      FROM menu m
      JOIN stakeholder_cuisine sc ON sc.menu_id = m.menu_id
      JOIN cuisine c              ON c.id         = sc.cuisine_id
      WHERE m.stakeholder_id = ?
      GROUP BY m.menu_id
      ORDER BY m.menu_id;
    `;
    db.query(sql, [stakeholderId], (err, results) => {
      if (err) return reject(err);
      resolve(results);
    });
  });
};


// ✅ Get all unique cuisine categories (names) for a stakeholder
const getMenuCategoriesByStakeholder = (stakeholderId) => {
  return new Promise((resolve, reject) => {
    const query = `
      SELECT DISTINCT c.id AS cuisine_id, c.name AS cuisine_name
      FROM stakeholder_cuisine sc
      JOIN cuisine c ON sc.cuisine_id = c.id
      WHERE sc.stakeholder_id = ?
    `;

    db.query(query, [stakeholderId], (err, results) => {
      if (err) {
        console.error('Error fetching cuisines:', err);
        return reject(err);
      }
      resolve(results);
    });
  });
};


// 1) Fetch all cuisine names for a stakeholder
const getMenuCategories = (stakeholderId) => {
  return new Promise((resolve, reject) => {
    const sql = `
      SELECT DISTINCT c.name AS cuisine_name
      FROM cuisine c
      JOIN stakeholder_cuisine sc ON sc.cuisine_id = c.id
      JOIN menu m               ON m.menu_id     = sc.menu_id
      WHERE m.stakeholder_id = ?
      ORDER BY c.name
    `;
    db.query(sql, [stakeholderId], (err, results) => {
      if (err) return reject(err);
      // results is an array of { cuisine_name }
      resolve(results);
    });
  });
};

// 2) Fetch the saved order JSON string (or null)
const getCategoryOrder = (stakeholderId) => {
  return new Promise((resolve, reject) => {
    const sql = `
      SELECT category_order
      FROM stakeholder
      WHERE stakeholder_id = ?
    `;
    db.query(sql, [stakeholderId], (err, results) => {
      if (err) return reject(err);
      // if no row, results[0] is undefined
      resolve(results[0]?.category_order ?? null);
    });
  });
};

// 3) Save the new order back into stakeholder.category_order
const saveCategoryOrder = (stakeholderId, orderedCategories) => {
  return new Promise((resolve, reject) => {
    const sql = `
      UPDATE stakeholder
      SET category_order = ?
      WHERE stakeholder_id = ?
    `;
    db.query(sql, [JSON.stringify(orderedCategories), stakeholderId], (err, result) => {
      if (err) return reject(err);
      resolve(result);
    });
  });
};


const deleteMenuItemById = (menuId) => {
  return new Promise((resolve, reject) => {
    // Step 1: Delete from stakeholder_cuisine
    db.query("DELETE FROM stakeholder_cuisine WHERE menu_id = ?", [menuId], (err1, result1) => {
      if (err1) return reject(err1);

      // Step 2: Delete from menu table
      db.query("DELETE FROM menu WHERE menu_id = ?", [menuId], (err2, result2) => {
        if (err2) return reject(err2);

        resolve({ success: result2.affectedRows > 0 });
      });
    });
  });
};




// Fetch one menu item by ID
const getMenuItemById = (menuId, callback) => {
  const sql = `
    SELECT menu_id, item_name, item_price, description, item_picture
    FROM menu
    WHERE menu_id = ?
  `;
  db.query(sql, [menuId], (err, results) => {
    if (err) return callback(err);
    if (results.length === 0) return callback(null, null);
    callback(null, results[0]);
  });
};

// Fetch all cuisine_ids for a given menu item
const fetchMenuCuisines = (menuId, callback) => {
  const sql = `
    SELECT cuisine_id
    FROM stakeholder_cuisine
    WHERE menu_id = ?
  `;
  db.query(sql, [menuId], (err, rows) => {
    if (err) return callback(err);
    callback(null, rows.map(r => r.cuisine_id));
  });
};

// Update the menu row (name, price, description, optionally picture)
const updateMenuItemById = (menuId, { name, price, description, itemPic }, callback) => {
  const fields = [ name, price, description ];
  let sql = `
    UPDATE menu
    SET item_name = ?, item_price = ?, description = ?
  `;
  if (itemPic) {
    sql += `, item_picture = ?`;
    fields.push(itemPic);
  }
  sql += ` WHERE menu_id = ?`;
  fields.push(menuId);

  db.query(sql, fields, (err, result) => {
    if (err) return callback(err);
    callback(null);
  });
};

// Replace cuisines: delete existing for that menu, then insert new ones
const replaceMenuCuisines = (menuId, stakeholderId, cuisineIds, callback) => {
  // 1) delete old
  db.query(
    `DELETE FROM stakeholder_cuisine WHERE menu_id = ?`,
    [menuId],
    err => {
      if (err) return callback(err);

      // 2) bulk insert new
      if (!Array.isArray(cuisineIds) || cuisineIds.length === 0) {
        return callback(null);
      }
      const values = cuisineIds.map(c => [ menuId, stakeholderId, c ]);
      db.query(
        `INSERT INTO stakeholder_cuisine (menu_id, stakeholder_id, cuisine_id)
         VALUES ?`,
        [values],
        err2 => {
          if (err2) return callback(err2);
          callback(null);
        }
      );
    }
  );
};

module.exports = {
  insertMenuItem,
  insertStakeholderCuisine,
  getMenuItemsByStakeholder,
  getMenuCategories,
  getMenuCategoriesByStakeholder,
  getCategoryOrder,
  saveCategoryOrder,
  deleteMenuItemById,
  fetchMenuCuisines,
  updateMenuItemById,
  replaceMenuCuisines,
  getMenuItemById,


};
