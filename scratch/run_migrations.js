const pool = require('../server/db_cpanel.js');

async function migrate() {
  console.log("Running manual migrations on clinic_info...");
  try {
    await pool.query('ALTER TABLE clinic_info ADD COLUMN IF NOT EXISTS doctor_name VARCHAR(255) DEFAULT \'\'');
    await pool.query('ALTER TABLE clinic_info ADD COLUMN IF NOT EXISTS specialty VARCHAR(255) DEFAULT \'\'');
    await pool.query('ALTER TABLE clinic_info ADD COLUMN IF NOT EXISTS phone VARCHAR(50) DEFAULT \'\'');
    await pool.query('ALTER TABLE clinic_info ADD COLUMN IF NOT EXISTS logo_url TEXT DEFAULT \'\'');
    await pool.query('ALTER TABLE clinic_info ADD COLUMN IF NOT EXISTS facebook TEXT DEFAULT \'\'');
    await pool.query('ALTER TABLE clinic_info ADD COLUMN IF NOT EXISTS instagram TEXT DEFAULT \'\'');
    await pool.query('ALTER TABLE clinic_info ADD COLUMN IF NOT EXISTS maps_link TEXT DEFAULT \'\'');
    console.log("clinic_info migrations completed successfully.");
  } catch (err) {
    console.error("Migration failed:", err.message);
  }
  process.exit(0);
}

migrate();
