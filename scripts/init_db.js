const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

async function initialize() {
  console.log('--- Starting Database Initialization ---');
  
  // Connection without database name to create the database first
  const initialPool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
  });

  try {
    // 1. Create Database if not exists
    console.log(`Checking if database "${process.env.DB_NAME}" exists...`);
    const dbCheck = await initialPool.query("SELECT 1 FROM pg_database WHERE datname = $1", [process.env.DB_NAME]);
    
    if (dbCheck.rows.length === 0) {
      console.log(`Creating database "${process.env.DB_NAME}"...`);
      await initialPool.query(`CREATE DATABASE ${process.env.DB_NAME}`);
      console.log('Database created successfully.');
    } else {
      console.log('Database already exists.');
    }
    await initialPool.end();

    // 2. Connect to the new database to create tables
    const pool = new Pool({
      user: process.env.DB_USER,
      host: process.env.DB_HOST,
      database: process.env.DB_NAME,
      password: process.env.DB_PASSWORD,
      port: process.env.DB_PORT,
    });

    console.log('Running schema.sql...');
    const schemaPath = path.join(__dirname, '../database/schema.sql');
    const schemaSql = fs.readFileSync(schemaPath, 'utf8');
    
    await pool.query(schemaSql);
    console.log('Tables and schema initialized successfully.');
    
    await pool.end();
    console.log('--- Initialization Finished Successfully ---');
    process.exit(0);
  } catch (err) {
    console.error('Error during initialization:', err.message);
    process.exit(1);
  }
}

initialize();
