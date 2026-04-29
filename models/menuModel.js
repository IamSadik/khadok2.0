// models/menuModel.js
const pool = require('../config/configdb');

const insertMenuItem = async ({ stakeholder_id, item_name, item_price, description, item_picture, cuisine_id }) => {
  // Fetch category name from cuisine table
  const { rows: cRows } = await pool.query('SELECT name FROM cuisine WHERE id = $1', [cuisine_id]);
  const category = cRows.length > 0 ? cRows[0].name : null;

  const { rows } = await pool.query(
    `INSERT INTO menu (stakeholder_id, item_name, category, item_price, description, item_picture)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING menu_id`,
    [stakeholder_id, item_name, category, item_price, description, item_picture]
  );
  return rows[0].menu_id;
};

const insertStakeholderCuisine = async (stakeholderId, menuId, cuisineIds) => {
  if (!cuisineIds || cuisineIds.length === 0) return;
  const placeholders = cuisineIds.map((_, i) => `($1, $${i + 2}, $${cuisineIds.length + 2 + i})`);
  // Build a cleaner bulk insert
  const values = [];
  const params = [stakeholderId];
  cuisineIds.forEach((cid, i) => {
    params.push(cid);
  });
  params.push(menuId);

  // Rebuild with correct parameter indices
  const tuples = cuisineIds.map((_, i) => `($1, $${i + 2}, $${cuisineIds.length + 2})`).join(', ');
  const finalParams = [stakeholderId, ...cuisineIds, menuId];

  await pool.query(
    `INSERT INTO stakeholder_cuisine (stakeholder_id, cuisine_id, menu_id) VALUES ${tuples}`,
    finalParams
  );
};

const getMenuItemsByStakeholder = async (stakeholderId) => {
  const { rows } = await pool.query(
    `SELECT m.menu_id, m.item_name, m.item_price, m.description, m.item_picture,
            (array_agg(c.name))[1] AS cuisine_name
     FROM menu m
     JOIN stakeholder_cuisine sc ON sc.menu_id = m.menu_id
     JOIN cuisine c ON c.id = sc.cuisine_id
     WHERE m.stakeholder_id = $1
     GROUP BY m.menu_id
     ORDER BY m.menu_id`,
    [stakeholderId]
  );
  return rows;
};

const getMenuCategoriesByStakeholder = async (stakeholderId) => {
  const { rows } = await pool.query(
    `SELECT DISTINCT c.id AS cuisine_id, c.name AS cuisine_name
     FROM stakeholder_cuisine sc
     JOIN cuisine c ON sc.cuisine_id = c.id
     WHERE sc.stakeholder_id = $1`,
    [stakeholderId]
  );
  return rows;
};

const getMenuCategories = async (stakeholderId) => {
  const { rows } = await pool.query(
    `SELECT DISTINCT c.name AS cuisine_name
     FROM cuisine c
     JOIN stakeholder_cuisine sc ON sc.cuisine_id = c.id
     JOIN menu m ON m.menu_id = sc.menu_id
     WHERE m.stakeholder_id = $1
     ORDER BY c.name`,
    [stakeholderId]
  );
  return rows;
};

const getCategoryOrder = async (stakeholderId) => {
  const { rows } = await pool.query(
    'SELECT category_order FROM stakeholder WHERE stakeholder_id = $1',
    [stakeholderId]
  );
  return rows[0]?.category_order ?? null;
};

const saveCategoryOrder = async (stakeholderId, orderedCategories) => {
  const { rows } = await pool.query(
    'UPDATE stakeholder SET category_order = $1 WHERE stakeholder_id = $2',
    [JSON.stringify(orderedCategories), stakeholderId]
  );
  return rows;
};

const deleteMenuItemById = async (menuId) => {
  await pool.query('DELETE FROM stakeholder_cuisine WHERE menu_id = $1', [menuId]);
  const { rowCount } = await pool.query('DELETE FROM menu WHERE menu_id = $1', [menuId]);
  return { success: rowCount > 0 };
};

const getMenuItemById = (menuId, callback) => {
  pool.query(
    'SELECT menu_id, item_name, item_price, description, item_picture FROM menu WHERE menu_id = $1',
    [menuId]
  )
    .then(({ rows }) => callback(null, rows[0] || null))
    .catch((err) => callback(err));
};

const fetchMenuCuisines = (menuId, callback) => {
  pool.query('SELECT cuisine_id FROM stakeholder_cuisine WHERE menu_id = $1', [menuId])
    .then(({ rows }) => callback(null, rows.map((r) => r.cuisine_id)))
    .catch((err) => callback(err));
};

const updateMenuItemById = (menuId, { name, price, description, itemPic, category }, callback) => {
  const fields = ['item_name = $1', 'item_price = $2', 'description = $3'];
  const params = [name, price, description];

  if (category) {
    fields.push(`category = $${params.length + 1}`);
    params.push(category);
  }
  if (itemPic) {
    fields.push(`item_picture = $${params.length + 1}`);
    params.push(itemPic);
  }
  params.push(menuId);

  pool.query(
    `UPDATE menu SET ${fields.join(', ')} WHERE menu_id = $${params.length}`,
    params
  )
    .then(() => callback(null))
    .catch((err) => callback(err));
};

const replaceMenuCuisines = (menuId, stakeholderId, cuisineIds, callback) => {
  pool.query('DELETE FROM stakeholder_cuisine WHERE menu_id = $1', [menuId])
    .then(() => {
      if (!Array.isArray(cuisineIds) || cuisineIds.length === 0) return callback(null);
      const tuples = cuisineIds.map((_, i) => `($1, $${i + 2}, $${cuisineIds.length + 2})`).join(', ');
      const params = [menuId, ...cuisineIds, stakeholderId];
      return pool.query(
        `INSERT INTO stakeholder_cuisine (menu_id, cuisine_id, stakeholder_id) VALUES ${tuples}`,
        params
      );
    })
    .then(() => callback(null))
    .catch((err) => callback(err));
};

module.exports = {
  insertMenuItem,
  insertStakeholderCuisine,
  getMenuItemsByStakeholder,
  getMenuCategoriesByStakeholder,
  getMenuCategories,
  getCategoryOrder,
  saveCategoryOrder,
  deleteMenuItemById,
  getMenuItemById,
  fetchMenuCuisines,
  updateMenuItemById,
  replaceMenuCuisines,
};