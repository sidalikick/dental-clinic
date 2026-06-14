const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

async function autoSetup() {
  console.log('--- [AUTO-SETUP] Starting Configuration ---');
  
  // 1. Initial connection to PostgreSQL (without DB name)
  const initialPool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
  });

  try {
    const dbName = process.env.DB_NAME || 'dental_clinic';
    console.log(`Checking database "${dbName}"...`);
    const dbCheck = await initialPool.query("SELECT 1 FROM pg_database WHERE datname = $1", [dbName]);
    
    if (dbCheck.rows.length === 0) {
      console.log(`Creating database "${dbName}"...`);
      await initialPool.query(`CREATE DATABASE ${dbName}`);
    }
    await initialPool.end();

    // 2. Connect to the target database
    const pool = new Pool({
      user: process.env.DB_USER,
      host: process.env.DB_HOST,
      database: dbName,
      password: process.env.DB_PASSWORD,
      port: process.env.DB_PORT,
    });

    console.log('Building tables (schema.sql)...');
    const schemaSql = fs.readFileSync(path.join(__dirname, '../database/schema.sql'), 'utf8');
    await pool.query(schemaSql);

    console.log('Generating authorized local license key...');
    const { machineIdSync } = require('node-machine-id');
    const crypto = require('crypto');
    const SECRET_KEY = "BM_SOFT_CLINIC_SECURE_KEY_2026";
    let currentMachineId = '';
    try {
        currentMachineId = machineIdSync({original: true});
    } catch (e) {
        currentMachineId = 'UNKNOWN-MACHINE';
    }
    const hash = crypto.createHmac('sha256', SECRET_KEY).update(currentMachineId).digest('hex').toUpperCase();
    const expectedKey = hash.match(/.{1,4}/g).slice(0, 4).join('-');
    console.log(`Generated Serial Key: ${expectedKey}`);

    console.log('Initializing system settings with auto-activation...');
    await pool.query(`
      INSERT INTO clinic_settings (key, value) VALUES 
      ('license_key', $1), 
      ('news_ticker', 'أهلاً بكم في عيادة الأسنان - نتمنى لكم دوام الصحة والعافية'), 
      ('max_appointments', '20')
      ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value
    `, [expectedKey]);

    await pool.query(`
      INSERT INTO clinic_info (id, name, working_hours, address) 
      VALUES (1, 'عيادة الأسنان', '09:00 - 17:00', 'الجزائر')
      ON CONFLICT (id) DO NOTHING
    `);

    console.log('Creating default users...');
    await pool.query(`
      INSERT INTO users (username, password, role, full_name) VALUES 
      ('doctor', '1234', 'doctor', 'مدير العيادة'), 
      ('reception', '1234', 'reception', 'موظف الاستقبال')
      ON CONFLICT (username) DO NOTHING
    `);

    console.log('Adding default services...');
    const services = [
      ['تنظيف أسنان', 3000],
      ['حشوات تجميلية', 5000],
      ['علاج عصب', 8000],
      ['تقويم أسنان', 150000],
      ['تبييض أسنان', 12000]
    ];
    for (const [name, price] of services) {
      await pool.query('INSERT INTO services (name, price) VALUES ($1, $2) ON CONFLICT (name) DO NOTHING', [name, price]);
    }

    console.log('--- [AUTO-SETUP] Finished Successfully ---');
    await pool.end();
    process.exit(0);
  } catch (err) {
    console.error('--- [AUTO-SETUP] Error:', err.message);
    process.exit(1);
  }
}

autoSetup();
