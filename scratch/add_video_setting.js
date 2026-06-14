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

const addVideoSetting = async () => {
  try {
    await pool.query("INSERT INTO clinic_settings (key, value) VALUES ('clinic_video_url', 'https://assets.mixkit.co/videos/preview/mixkit-dentist-checking-a-patients-teeth-41561-large.mp4') ON CONFLICT (key) DO NOTHING");
    console.log('Video setting added successfully!');
    process.exit(0);
  } catch (err) {
    console.error('Error adding video setting:', err);
    process.exit(1);
  }
};

addVideoSetting();
