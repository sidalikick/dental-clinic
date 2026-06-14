import pool from '../server/db.js';

const checkData = async () => {
  try {
    const apps = await pool.query('SELECT * FROM appointments');
    console.log('Appointments in DB:', apps.rows.length);
    console.log(apps.rows);
    
    const patients = await pool.query('SELECT * FROM patients');
    console.log('Patients in DB:', patients.rows.length);
    console.log(patients.rows);
    
    process.exit(0);
  } catch (err) {
    console.error('Error checking data:', err);
    process.exit(1);
  }
};

checkData();
