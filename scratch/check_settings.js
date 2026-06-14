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

pool.query("SELECT * FROM clinic_settings")
  .then(res => {
    console.log(res.rows);
    process.exit(0);
  })
  .catch(err => {
    console.error(err);
    process.exit(1);
  });
