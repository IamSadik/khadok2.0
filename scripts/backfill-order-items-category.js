/*
  One-off helper to backfill order_items.category for existing rows.

  Why:
    Some historic order_items rows have category NULL/empty.
    New orders are fixed server-side, but old data can be repaired with this script.

  Usage:
    node scripts/backfill-order-items-category.js
    node scripts/backfill-order-items-category.js --dry-run
*/

const db = require('../config/configdb');

async function main() {
  const args = new Set(process.argv.slice(2));
  const dryRun = args.has('--dry-run');

  const menuCategoryCte = `
    WITH menu_category AS (
      SELECT
        m.menu_id,
        COALESCE(NULLIF(TRIM(m.category), ''), MIN(c.name)) AS category
      FROM menu m
      LEFT JOIN stakeholder_cuisine sc ON sc.menu_id = m.menu_id
      LEFT JOIN cuisine c ON c.id = sc.cuisine_id
      GROUP BY m.menu_id, m.category
    )
  `;

  if (dryRun) {
    const { rows } = await db.query(
      `${menuCategoryCte}
       SELECT COUNT(*)::int AS would_update
       FROM order_items oi
       JOIN menu_category mc ON mc.menu_id = oi.menu_id
       WHERE (oi.category IS NULL OR TRIM(oi.category) = '')
         AND mc.category IS NOT NULL
         AND TRIM(mc.category) <> ''`
    );

    console.log(`Would update ${rows[0]?.would_update ?? 0} order_items rows.`);
    return;
  }

  const result = await db.query(
    `${menuCategoryCte}
     UPDATE order_items oi
     SET category = mc.category
     FROM menu_category mc
     WHERE oi.menu_id = mc.menu_id
       AND (oi.category IS NULL OR TRIM(oi.category) = '')
       AND mc.category IS NOT NULL
       AND TRIM(mc.category) <> ''`
  );

  console.log(`Updated ${result.rowCount} order_items rows.`);
}

main()
  .catch((err) => {
    console.error('Backfill failed:', err);
    process.exitCode = 1;
  })
  .finally(() => db.end());
