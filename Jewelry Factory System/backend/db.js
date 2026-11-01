const path = require('path');
const sql = require('mssql');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const config = {
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  server: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT) || 1433,
  database: process.env.DB_NAME,
  requestTimeout: 300000, // 300s timeout for large datasets
  connectionTimeout: 15000,  // 15s connect timeout
  options: {
    encrypt: false,
    trustServerCertificate: true,
    enableArithAbort: true,
  },
  pool: {
    max: 20, // Support concurrent users
    min: 2, // Keep 2 connections warm
    idleTimeoutMillis: 60000, // 60s idle timeout
    acquireTimeoutMillis: 30000, // Wait up to 30s for a pooled connection
  },
};

let pool;

async function getPool() {
  try {
    if (!pool) {
      pool = await sql.connect(config);
      console.log('Connected to SQL Server:', process.env.DB_HOST);

      pool.on('error', err => {
        console.error('SQL Pool Error:', err);
        pool = null; // Reset pool so the next request reconnects.
      });
    }
    return pool;
  } catch (err) {
    console.error('Database Connection Failed:', err);
    pool = null;
    throw err;
  }
}
module.exports = { getPool, sql };
