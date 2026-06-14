const pool = require('../server/db_cpanel.js');

async function testQueries() {
  console.log("Starting query tests...");
  const queries = {
    appointments: `
      SELECT a.id, a.patient_id as "patientId", a.service, 
             a.appointment_date::TEXT as date, 
             a.appointment_time::TEXT as time,
             a.status, a.queue_number as "queueNumber", 
             a.notes, a.prescription, a.created_at as "createdAt",
             a.treatment_price as "treatmentPrice", a.payment_status as "paymentStatus",
             a.booking_source as "bookingSource",
             p.name as "patientName", p.phone as "patientPhone", p.age as "patientAge"
      FROM appointments a
      JOIN patients p ON a.patient_id = p.id
      ORDER BY a.appointment_date DESC, a.queue_number ASC
    `,
    patients: 'SELECT id, name, phone, age, registration_source as "registrationSource", created_at as "createdAt" FROM patients ORDER BY id DESC',
    prescriptions: 'SELECT id, disease, medicine, dose, duration, age, notes FROM prescription_templates ORDER BY id DESC',
    services: 'SELECT id, name, price FROM services ORDER BY id ASC',
    clinicInfo: 'SELECT name, working_hours as "workingHours", address, phone, doctor_name as "doctorName", specialty FROM clinic_info WHERE id = 1',
    users: 'SELECT id, username, role, full_name as "fullName" FROM users ORDER BY role DESC'
  };

  for (const [name, query] of Object.entries(queries)) {
    try {
      console.log(`Testing ${name}...`);
      const res = await pool.query(query);
      console.log(`[OK] ${name} returned ${res.rows.length} rows.`);
    } catch (err) {
      console.error(`[ERROR] ${name} failed:`, err.message);
    }
  }
  process.exit(0);
}

testQueries();
