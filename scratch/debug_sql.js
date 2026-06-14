import pool from '../server/db.js';
import dotenv from 'dotenv';
dotenv.config();

async function check() {
    try {
        const id = 'REF-87184';
        const result = await pool.query(`
          SELECT a.id, a.appointment_date::TEXT as date, a.status, a.queue_number as "queueNumber",
                 (SELECT queue_number FROM appointments 
                  WHERE appointment_date = a.appointment_date 
                  AND status = 'جاري الكشف' LIMIT 1) as "currentActiveNumber"
          FROM appointments a 
          WHERE a.id = $1
        `, [id]);
        console.log(result.rows);
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

check();
