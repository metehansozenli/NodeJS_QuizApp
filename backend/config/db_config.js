require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const { Pool } = require('pg');
const config = require('./config');

// Database connection pool
const pool = new Pool({
  host: config.database.host,
  port: config.database.port,
  database: config.database.database,
  user: config.database.user,
  password: config.database.password,
  ssl: config.database.ssl,
  max: 10, // Maximum number of clients in the pool - reduced for stability
  idleTimeoutMillis: 30000, // How long a client is allowed to remain idle
  connectionTimeoutMillis: 5000, // How long to wait when trying to connect - increased
  acquireTimeoutMillis: 60000, // Maximum time to wait for a connection
  createTimeoutMillis: 30000, // Maximum time to wait for creating a connection
});

// Test database connection
pool.on('connect', (client) => {
  console.log('Connected to PostgreSQL database');
});

pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err);
  // Don't exit process, just log the error
});

pool.on('remove', (client) => {
  console.log('Client removed from pool');
});

// Query helper function
const query = async (text, params) => {
  const start = Date.now();
  try {
    const res = await pool.query(text, params);
    const duration = Date.now() - start;
    // console.log('Executed query', { text: text.substring(0, 50) + '...', duration, rows: res.rowCount });
    return res;
  } catch (error) {
    console.error('Database query error:', { text, error: error.message, params });
    throw error;
  }
};

// Get client for transactions
const getClient = async () => {
  return await pool.connect();
};

// Connection test function
const testConnection = async () => {
  try {
    const client = await getClient();
    const result = await client.query('SELECT NOW()');
    client.release();
    console.log('Database connection test successful:', result.rows[0]);
    return true;
  } catch (error) {
    console.error('Database connection test failed:', error.message);
    return false;
  }
};

// Graceful shutdown
const gracefulShutdown = async () => {
  try {
    await pool.end();
    console.log('Database pool has ended');
  } catch (error) {
    console.error('Error during database pool shutdown:', error);
  }
};

// Handle process termination
process.on('SIGINT', gracefulShutdown);
process.on('SIGTERM', gracefulShutdown);

module.exports = {
  query,
  getClient,
  testConnection,
  pool,
  gracefulShutdown
};
