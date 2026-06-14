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

pool.query("SELECT value FROM clinic_settings WHERE key = 'clinic_video_url'")
  .then(res => {
    console.log('Video URL in DB:', res.rows[0]?.value);
    process.exit(0);
  })
  .catch(err => {
    console.error(err);
    process.exit(1);
  });
