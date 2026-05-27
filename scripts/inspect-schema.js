/*
  One-off helper to inspect the live PostgreSQL schema.
  Usage: node scripts/inspect-schema.js [tableName]
*/

const db = require("../config/configdb");

async function main() {
  const tableName = process.argv[2] || "cart";

  const sql = `
    select column_name, data_type, is_nullable
    from information_schema.columns
    where table_schema = 'public'
      and table_name = $1
    order by ordinal_position;
  `;

  const { rows } = await db.query(sql, [tableName]);
  if (!rows.length) {
    console.log(`No columns found for table '${tableName}'.`);
    return;
  }

  console.table(rows);
}

main()
  .catch((err) => {
    console.error("Schema inspection failed:", err);
    process.exitCode = 1;
  })
  .finally(() => db.end());
