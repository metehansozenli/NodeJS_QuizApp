const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');
const config = require('../config/config');
const cleanDatabase = require('./clean-database');

async function setupDatabase(shouldClean = false) {
  console.log('🗄️  Setting up database...');
  
  // Connect to the target database
  const targetPool = new Pool(config.database);

  try {
    // Test if we can connect to the database
    await targetPool.query('SELECT NOW()');
    console.log('📊 Connected to database successfully');

    // Clean database if requested
    if (shouldClean) {
      console.log('🧹 Cleaning existing database...');
      await targetPool.end();
      await cleanDatabase();
      // Reconnect after cleaning
      const newPool = new Pool(config.database);
      await setupSchema(newPool);
    } else {
      await setupSchema(targetPool);
    }

  } catch (error) {
    if (error.code === '3D000') {
      // Database doesn't exist, create it
      console.log(`📝 Database ${config.database.database} doesn't exist, creating...`);
      await createDatabase();
      // Retry setup
      const newPool = new Pool(config.database);
      await setupSchema(newPool);
    } else {
      console.error('❌ Database setup failed:', error.message);
      process.exit(1);
    }
  }
}

async function createDatabase() {
  const pool = new Pool({
    host: config.database.host,
    port: config.database.port,
    database: 'postgres', // Connect to default database first
    user: config.database.user,
    password: config.database.password,
    ssl: config.database.ssl
  });

  try {
    await pool.query(`CREATE DATABASE "${config.database.database}"`);
    console.log('✅ Database created successfully');
  } finally {
    await pool.end();
  }
}

async function setupSchema(pool) {
  try {
    // Read and execute schema
    const schemaPath = path.join(__dirname, '../config/db_schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf8');

    console.log('📋 Executing database schema...');
    await pool.query(schema);
    console.log('✅ Database schema executed successfully');

    // Test connection
    const testResult = await pool.query('SELECT COUNT(*) FROM users');
    console.log(`👥 Users table has ${testResult.rows[0].count} records`);

    await pool.end();
    console.log('🎉 Database setup completed successfully!');

  } catch (error) {
    await pool.end();
    throw error;
  }
}

// Run if this file is executed directly
if (require.main === module) {
  setupDatabase();
}

module.exports = setupDatabase; 