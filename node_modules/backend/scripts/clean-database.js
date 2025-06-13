const { Pool } = require('pg');
const config = require('../config/config');

async function cleanDatabase() {
  console.log('🧹 Cleaning database...');
  
  const pool = new Pool(config.database);

  try {
    // Drop all tables
    console.log('🗑️  Dropping all tables...');
    
    const dropQueries = [
      'DROP TABLE IF EXISTS quiz_history CASCADE;',
      'DROP TABLE IF EXISTS answers CASCADE;',
      'DROP TABLE IF EXISTS options CASCADE;',
      'DROP TABLE IF EXISTS questions CASCADE;',
      'DROP TABLE IF EXISTS participants CASCADE;',
      'DROP TABLE IF EXISTS live_sessions CASCADE;',
      'DROP TABLE IF EXISTS quizzes CASCADE;',
      'DROP TABLE IF EXISTS users CASCADE;'
    ];

    for (const query of dropQueries) {
      await pool.query(query);
      console.log(`✅ ${query}`);
    }

    console.log('🎉 Database cleaned successfully!');
    
  } catch (error) {
    console.error('❌ Error cleaning database:', error.message);
    throw error;
  } finally {
    await pool.end();
  }
}

// Run if this file is executed directly
if (require.main === module) {
  cleanDatabase().catch(error => {
    console.error('Failed to clean database:', error);
    process.exit(1);
  });
}

module.exports = cleanDatabase; 