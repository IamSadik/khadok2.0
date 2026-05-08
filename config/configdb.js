// config/configdb.js
// PostgreSQL pool using node-postgres (pg)
const { Pool } = require('pg');
require('dotenv').config();

const sslConfig = process.env.NODE_ENV === 'production'
  ? { rejectUnauthorized: false }
  : false;

const normalizeUrl = (value) => {
  if (!value) return null;
  const trimmed = String(value).trim().replace(/^['"]|['"]$/g, '');
  if (!/^postgres(?:ql)?:\/\//i.test(trimmed)) return null;
  return trimmed;
};

const buildPoolConfig = () => {
  const dbHost = process.env.DB_HOST && process.env.DB_HOST.trim();
  const dbUser = process.env.DB_USER && process.env.DB_USER.trim();
  const dbPassword = process.env.DB_PASSWORD ?? undefined;
  const dbName = process.env.DB_NAME && process.env.DB_NAME.trim();
  const dbPort = process.env.DB_PORT ? Number.parseInt(process.env.DB_PORT, 10) : 5432;

  if (dbHost && dbUser && dbName) {
    return {
      host: dbHost,
      user: dbUser,
      password: dbPassword,
      database: dbName,
      port: Number.isFinite(dbPort) ? dbPort : 5432,
      ssl: sslConfig,
      max: 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    };
  }

  const connectionString = normalizeUrl(process.env.DB_POOLER_URL || process.env.DATABASE_URL);
  if (connectionString) {
    return {
      connectionString,
      ssl: sslConfig,
      max: 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    };
  }

  throw new Error('Missing valid PostgreSQL connection settings. Set DATABASE_URL or DB_POOLER_URL in .env.');
};

const pool = new Pool(buildPoolConfig());

pool.on('error', (err) => {
  console.error('Unexpected PostgreSQL pool error:', err);
});

module.exports = pool;