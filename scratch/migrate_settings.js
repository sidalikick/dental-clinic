import pkg from 'pg';
const { Pool } = pkg;
import dotenv from 'dotenv';

dotenv.config();

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
});

const migrate = async () => {
  try {
    console.log('Migrating database...');
    
    // Create tables
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
          id SERIAL PRIMARY KEY,
          username VARCHAR(50) UNIQUE NOT NULL,
          password VARCHAR(255) NOT NULL,
          role VARCHAR(20) NOT NULL,
          full_name VARCHAR(100),
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    
    await pool.query(`
      CREATE TABLE IF NOT EXISTS clinic_settings (
          key VARCHAR(50) PRIMARY KEY,
          value TEXT NOT NULL
      );
    `);
    
    // Seed data
    await pool.query(`
      INSERT INTO users (username, password, role, full_name) 
      VALUES ('doctor', '1234', 'doctor', 'مدير العيادة') 
      ON CONFLICT (username) DO NOTHING;
    `);

    await pool.query(`
      INSERT INTO users (username, password, role, full_name) 
      VALUES ('reception', '1234', 'reception', 'موظف الاستقبال') 
      ON CONFLICT (username) DO NOTHING;
    `);
    
    await pool.query(`
      INSERT INTO clinic_settings (key, value) 
      VALUES ('news_ticker', 'أهلاً بكم في عيادة ابتسامتك - نتمنى لكم دوام الصحة والعافية') 
      ON CONFLICT (key) DO NOTHING;
    `);
    
    console.log('Migration completed successfully!');
    process.exit(0);
  } catch (err) {
    console.error('Migration failed:', err);
    process.exit(1);
  }
};

migrate();
