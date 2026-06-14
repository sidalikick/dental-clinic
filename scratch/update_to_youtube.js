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

pool.query("UPDATE clinic_settings SET value = 'https://www.youtube.com/watch?v=d8KiBtHkDA0' WHERE key = 'clinic_video_url'")
  .then(res => {
    console.log('Updated to YouTube');
    process.exit(0);
  })
  .catch(err => {
    console.error(err);
    process.exit(1);
  });
