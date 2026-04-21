const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: false
});

pool.on('connect', () => {
  console.log('✅ PostgreSQL connected successfully');
});

module.exports = pool;