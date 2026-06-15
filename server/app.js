const express = require('express');
const cors = require('cors');
const pool = require('./db_cpanel.js');
require('dotenv').config();
const path = require('path');
const fs = require('fs');
const os = require('os');

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 5000;

// Helper: get today's date in local timezone (avoids UTC vs local mismatch)
const getLocalDate = () => {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

// Request logging middleware
app.use((req, res, next) => {
  if (req.method === 'POST' || req.method === 'PUT') {
    const logEntry = `[${new Date().toISOString()}] ${req.method} ${req.url} - Body: ${JSON.stringify(req.body)}\n`;
    try {
      fs.appendFileSync(path.join(__dirname, 'requests.log'), logEntry);
    } catch (e) { /* ignore log errors */ }
  }
  next();
});

// Initialize Database Tables if missing
async function initTables() {
  try {
    // 1. Create Core Tables
    await pool.query(`
      CREATE TABLE IF NOT EXISTS patients (
          id SERIAL PRIMARY KEY,
          name VARCHAR(255) NOT NULL,
          phone VARCHAR(20) NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(name, phone)
      );
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS appointments (
          id VARCHAR(20) PRIMARY KEY,
          patient_id INTEGER NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
          service VARCHAR(100) NOT NULL,
          appointment_date DATE NOT NULL,
          appointment_time TIME NOT NULL,
          status VARCHAR(50) DEFAULT 'قيد الانتظار', 
          queue_number INTEGER,
          notes TEXT,
          prescription TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

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

    // Seed default users if empty
    const checkUsers = await pool.query('SELECT COUNT(*) FROM users');
    if (parseInt(checkUsers.rows[0].count) === 0) {
      await pool.query(`
        INSERT INTO users (username, password, role, full_name) VALUES 
        ('doctor', '1234', 'doctor', 'مدير العيادة'),
        ('reception', '1234', 'reception', 'موظف الاستقبال')
        ON CONFLICT (username) DO NOTHING
      `);
      console.log('Seeded default users.');
    }

    await pool.query(`
      CREATE TABLE IF NOT EXISTS prescription_templates (
          id SERIAL PRIMARY KEY,
          disease VARCHAR(255) NOT NULL,
          medicine VARCHAR(255) NOT NULL,
          dose VARCHAR(255),
          duration VARCHAR(50),
          age VARCHAR(50),
          notes TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    
    await pool.query(`
      CREATE TABLE IF NOT EXISTS clinic_info (
          id SERIAL PRIMARY KEY,
          name VARCHAR(255) DEFAULT 'عيادة الأسنان',
          working_hours VARCHAR(255) DEFAULT '09:00 - 17:00',
          address VARCHAR(255) DEFAULT 'الجزائر',
          maps_link TEXT DEFAULT '',
          phone VARCHAR(50) DEFAULT '',
          logo_url TEXT DEFAULT '',
          facebook TEXT DEFAULT '',
          instagram TEXT DEFAULT '',
          doctor_name VARCHAR(255) DEFAULT '',
          specialty VARCHAR(255) DEFAULT ''
      );
    `);
    
    // Migrations to ensure columns exist in existing DB
    await pool.query('ALTER TABLE clinic_info ADD COLUMN IF NOT EXISTS doctor_name VARCHAR(255) DEFAULT \'\'');
    await pool.query('ALTER TABLE clinic_info ADD COLUMN IF NOT EXISTS specialty VARCHAR(255) DEFAULT \'\'');
    await pool.query('ALTER TABLE clinic_info ADD COLUMN IF NOT EXISTS phone VARCHAR(50) DEFAULT \'\'');
    await pool.query('ALTER TABLE clinic_info ADD COLUMN IF NOT EXISTS logo_url TEXT DEFAULT \'\'');
    await pool.query('ALTER TABLE clinic_info ADD COLUMN IF NOT EXISTS facebook TEXT DEFAULT \'\'');
    await pool.query('ALTER TABLE clinic_info ADD COLUMN IF NOT EXISTS instagram TEXT DEFAULT \'\'');
    await pool.query('ALTER TABLE clinic_info ADD COLUMN IF NOT EXISTS maps_link TEXT DEFAULT \'\'');
    await pool.query('ALTER TABLE patients ADD COLUMN IF NOT EXISTS age VARCHAR(50) DEFAULT \'\'');
    await pool.query('ALTER TABLE appointments ADD COLUMN IF NOT EXISTS treatment_price NUMERIC DEFAULT 0');
    await pool.query('ALTER TABLE appointments ADD COLUMN IF NOT EXISTS payment_status VARCHAR(50) DEFAULT \'غير مدفوع\'');
    await pool.query('ALTER TABLE appointments ADD COLUMN IF NOT EXISTS booking_source VARCHAR(50) DEFAULT \'reception\'');
    await pool.query('ALTER TABLE patients ADD COLUMN IF NOT EXISTS registration_source VARCHAR(50) DEFAULT \'reception\'');
    
    // Create services table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS services (
          id SERIAL PRIMARY KEY,
          name VARCHAR(255) NOT NULL UNIQUE,
          price NUMERIC DEFAULT 0
      );
    `);
    
    // Seed default services if empty
    const checkServices = await pool.query('SELECT COUNT(*) FROM services');
    if (parseInt(checkServices.rows[0].count) === 0) {
      const defaultServices = [
        ['كشف عام', 2000], ['تنظيف أسنان', 3000], ['تقويم أسنان', 150000],
        ['زراعة أسنان', 80000], ['تجميل وابتسامة', 50000]
      ];
      for (const [name, price] of defaultServices) {
        await pool.query('INSERT INTO services (name, price) VALUES ($1, $2) ON CONFLICT (name) DO NOTHING', [name, price]);
      }
      console.log('Seeded default services.');
    }
    
    // Ensure max_appointments setting exists
    const checkMax = await pool.query("SELECT value FROM clinic_settings WHERE key = 'max_appointments'");
    if (checkMax.rows.length === 0) {
      await pool.query("INSERT INTO clinic_settings (key, value) VALUES ('max_appointments', '20')");
    }

    // Auto-recover any appointments where status became NULL/corrupted
    await pool.query("UPDATE appointments SET status = 'منجز' WHERE status IS NULL");

    // Seed default clinic info if empty
    const checkClinic = await pool.query('SELECT id FROM clinic_info WHERE id = 1');
    if (checkClinic.rows.length === 0) {
      await pool.query(`
        INSERT INTO clinic_info (id, name, working_hours, address) 
        VALUES (1, 'عيادة الأسنان', '09:00 - 17:00', 'الجزائر')
      `);
    }

    // Seed default prescription templates if empty
    const checkTemplates = await pool.query('SELECT COUNT(*) FROM prescription_templates');
    if (parseInt(checkTemplates.rows[0].count) === 0) {
      const defaultTemplates = [
        ['التهاب اللثة', 'Amoxicilline 500mg', '1 حبة 3 مرات يومياً', '7', '18-30', 'يؤخذ بعد الأكل'],
        ['خراج الأسنان', 'Augmentin 625mg', '1 حبة مرتين يومياً', '7', '18-30', 'يؤخذ كل 12 ساعة'],
        ['تسوس الأسنان', 'Paracetamol 1g', '1 حبة عند الألم', '3', '18-30', 'الحد الأقصى 3 حبات يومياً'],
        ['ألم ما بعد الخلع', 'Ibuprofen 400mg', '1 حبة عند الألم', '5', '18-30', 'يؤخذ بعد الأكل مباشرة عند الحاجة'],
        ['التهاب الحويصلة الجافة', 'Metronidazole 500mg', '1 حبة 3 مرات يومياً', '5', '18-30', 'تجنب المشروبات الغازية'],
        ['حساسية الأسنان', 'Chlorhexidine bain de bouche', 'مضمضة مرتين يومياً', '10', '18-30', 'بعد تنظيف الأسنان']
      ];
      for (const t of defaultTemplates) {
        await pool.query(
          'INSERT INTO prescription_templates (disease, medicine, dose, duration, age, notes) VALUES ($1, $2, $3, $4, $5, $6)',
          t
        );
      }
      console.log('Seeded default prescription templates.');
    }
  } catch (err) {
    console.error('Error initializing tables:', err.message);
  }
}
initTables();


// Get all appointments (Archive)
app.get('/api/appointments', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT a.id, a.patient_id as "patientId", a.service, 
             a.appointment_date::TEXT as date, 
             a.appointment_time::TEXT as time,
             a.status, a.queue_number as "queueNumber", 
             a.notes, a.prescription, a.created_at as "createdAt",
             a.treatment_price as "treatmentPrice", a.payment_status as "paymentStatus",
             a.booking_source as "bookingSource",
             p.name as "patientName", p.phone, p.age as "patientAge" 
      FROM appointments a 
      JOIN patients p ON a.patient_id = p.id 
      ORDER BY a.appointment_date DESC, a.created_at DESC
    `);
    res.json(result.rows);
  } catch (err) {
    console.error(err.message);
    res.status(500).send({ error: err.message });
  }
});

// Get today's appointments only
app.get('/api/appointments/today', async (req, res) => {
  try {
    const today = getLocalDate();
    const result = await pool.query(`
      SELECT a.id, a.patient_id as "patientId", a.service, 
             a.appointment_date::TEXT as date, 
             a.appointment_time::TEXT as time,
             a.status, a.queue_number as "queueNumber", 
             a.notes, a.prescription, a.created_at as "createdAt",
             a.treatment_price as "treatmentPrice", a.payment_status as "paymentStatus",
             a.booking_source as "bookingSource",
             p.name as "patientName", p.phone, p.age as "patientAge",
             (SELECT queue_number FROM appointments 
              WHERE appointment_date = a.appointment_date 
              AND status = 'جاري الكشف' LIMIT 1) as "currentActiveNumber",
             (SELECT COUNT(*) FROM appointments 
              WHERE appointment_date = a.appointment_date 
              AND queue_number < a.queue_number 
              AND status NOT IN ('منجز', 'ملغى')) as "waitingCount"
      FROM appointments a 
      JOIN patients p ON a.patient_id = p.id 
      WHERE a.appointment_date = $1
      ORDER BY a.queue_number ASC
    `, [today]);
    res.json(result.rows);
  } catch (err) {
    console.error(err.message);
    res.status(500).send({ error: err.message });
  }
});

// Get single appointment by ID
app.get('/api/appointments/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query(`
      SELECT a.id, a.patient_id as "patientId", a.service, 
             a.appointment_date::TEXT as date, 
             a.appointment_time::TEXT as time,
             a.status, a.queue_number as "queueNumber", 
             a.notes, a.prescription, a.created_at as "createdAt",
             a.treatment_price as "treatmentPrice", a.payment_status as "paymentStatus",
             a.booking_source as "bookingSource",
             p.name as "patientName", p.phone, p.age as "patientAge",
             (SELECT queue_number FROM appointments 
              WHERE appointment_date = a.appointment_date 
              AND status = 'جاري الكشف' LIMIT 1) as "currentActiveNumber",
             (SELECT COUNT(*) FROM appointments 
              WHERE appointment_date = a.appointment_date 
              AND queue_number < a.queue_number 
              AND status NOT IN ('منجز', 'ملغى')) as "waitingCount"
      FROM appointments a 
      JOIN patients p ON a.patient_id = p.id 
      WHERE a.id = $1
    `, [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Appointment not found' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err.message);
    res.status(500).send({ error: err.message });
  }
});

// Search appointments by name and phone
app.get('/api/appointments/search/patient', async (req, res) => {
  const { name, phone } = req.query;
  try {
    const result = await pool.query(`
      SELECT a.id, a.patient_id as "patientId", a.service, 
             a.appointment_date::TEXT as date, 
             a.appointment_time::TEXT as time,
             a.status, a.queue_number as "queueNumber", 
             a.notes, a.prescription, a.created_at as "createdAt",
             a.treatment_price as "treatmentPrice", a.payment_status as "paymentStatus",
             a.booking_source as "bookingSource",
             p.name as "patientName", p.phone, p.age as "patientAge",
             (SELECT queue_number FROM appointments 
              WHERE appointment_date = a.appointment_date 
              AND status = 'جاري الكشف' LIMIT 1) as "currentActiveNumber",
             (SELECT COUNT(*) FROM appointments 
              WHERE appointment_date = a.appointment_date 
              AND queue_number < a.queue_number 
              AND status NOT IN ('منجز', 'ملغى')) as "waitingCount"
      FROM appointments a 
      JOIN patients p ON a.patient_id = p.id 
      WHERE p.name ILIKE $1 AND p.phone = $2
      ORDER BY a.created_at DESC
    `, [`%${name}%`, phone]);
    
    res.json(result.rows);
  } catch (err) {
    console.error(err.message);
    res.status(500).send({ error: err.message });
  }
});

// Add new appointment
app.post('/api/appointments', async (req, res) => {
  const { patientName, phone, service, date, time, bookingSource, source } = req.body;
  const finalSource = bookingSource || source || 'reception';
  try {
    // Check daily limit
    const limitRes = await pool.query("SELECT value FROM clinic_settings WHERE key = 'max_appointments'");
    const maxAppointments = parseInt(limitRes.rows[0]?.value || '20');

    const countRes = await pool.query(
      'SELECT COUNT(*) FROM appointments WHERE appointment_date = $1',
      [date]
    );
    const currentCount = parseInt(countRes.rows[0].count);

    if (currentCount >= maxAppointments) {
      return res.status(400).json({ 
        message: 'نعتذر، تم الوصول للحد الأقصى من المواعيد لهذا اليوم. يرجى اختيار تاريخ آخر.',
        limitReached: true 
      });
    }

    let patientRes = await pool.query('SELECT id FROM patients WHERE phone = $1', [phone]);
    let patientId;
    
    if (patientRes.rows.length === 0) {
      const newPatient = await pool.query(
        'INSERT INTO patients (name, phone, registration_source) VALUES ($1, $2, $3) RETURNING id',
        [patientName, phone, finalSource]
      );
      patientId = newPatient.rows[0].id;
    } else {
      patientId = patientRes.rows[0].id;
    }

    const queueNumber = currentCount + 1;

    // Reception = confirmed directly, Online = pending review
    const initialStatus = finalSource === 'online' ? 'قيد المراجعة' : 'مؤكد';

    const refId = `REF-${Math.floor(10000 + Math.random() * 90000)}`;
    const newApp = await pool.query(
      `INSERT INTO appointments (id, patient_id, service, appointment_date, appointment_time, queue_number, status, booking_source) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
      [refId, patientId, service, date, time, queueNumber, initialStatus, finalSource]
    );

    res.json({ 
      ...newApp.rows[0], 
      bookingSource: newApp.rows[0].booking_source,
      date, 
      time, 
      queueNumber, 
      patientName, 
      phone,
      createdAt: newApp.rows[0].created_at
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).send({ error: err.message });
  }
});

// Update Status
app.put('/api/appointments/:id/status', async (req, res) => {
  const { id } = req.params;
  const { status, paymentStatus } = req.body;
  try {
    let result;
    const hasStatus = status !== undefined && status !== null;
    const hasPayment = paymentStatus !== undefined && paymentStatus !== null;

    if (hasStatus && hasPayment) {
      result = await pool.query(
        'UPDATE appointments SET status = $1, payment_status = $2 WHERE id = $3 RETURNING *',
        [status, paymentStatus, id]
      );
    } else if (hasPayment) {
      result = await pool.query(
        'UPDATE appointments SET payment_status = $1 WHERE id = $2 RETURNING *',
        [paymentStatus, id]
      );
    } else if (hasStatus) {
      result = await pool.query(
        'UPDATE appointments SET status = $1 WHERE id = $2 RETURNING *',
        [status, id]
      );
    } else {
      result = await pool.query('SELECT * FROM appointments WHERE id = $1', [id]);
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err.message);
    res.status(500).send({ error: err.message });
  }
});

app.put('/api/appointments/:id/clinical', async (req, res) => {
  const { id } = req.params;
  const { notes, prescription, status, patientName, patientAge, treatmentPrice, paymentStatus } = req.body;
  try {
    const result = await pool.query(
      'UPDATE appointments SET notes = $1, prescription = $2, status = COALESCE($3, status), treatment_price = COALESCE($4, treatment_price), payment_status = COALESCE($5, payment_status) WHERE id = $6 RETURNING *',
      [notes, prescription, status, treatmentPrice !== undefined ? treatmentPrice : null, paymentStatus !== undefined ? paymentStatus : null, id]
    );
    
    // Update patient name and age if provided
    if (patientName !== undefined || patientAge !== undefined) {
      const appCheck = await pool.query('SELECT patient_id FROM appointments WHERE id = $1', [id]);
      if (appCheck.rows.length > 0) {
        const patientId = appCheck.rows[0].patient_id;
        if (patientName !== undefined && patientAge !== undefined) {
          await pool.query('UPDATE patients SET name = $1, age = $2 WHERE id = $3', [patientName, patientAge, patientId]);
        } else if (patientName !== undefined) {
          await pool.query('UPDATE patients SET name = $1 WHERE id = $2', [patientName, patientId]);
        } else if (patientAge !== undefined) {
          await pool.query('UPDATE patients SET age = $1 WHERE id = $2', [patientAge, patientId]);
        }
      }
    }
    
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err.message);
    res.status(500).send({ error: err.message });
  }
});

// Call Next Patient
app.post('/api/appointments/call-next', async (req, res) => {
  try {
    const today = getLocalDate();
    
    await pool.query(
      "UPDATE appointments SET status = 'منجز' WHERE status = 'جاري الكشف' AND appointment_date = $1",
      [today]
    );

    // Only call patients who have been CONFIRMED (مؤكد)
    const nextRes = await pool.query(
      `SELECT id FROM appointments 
       WHERE appointment_date = $1 AND status = 'مؤكد'
       ORDER BY queue_number ASC LIMIT 1`,
      [today]
    );

    if (nextRes.rows.length > 0) {
      const nextId = nextRes.rows[0].id;
      const updated = await pool.query(
        "UPDATE appointments SET status = 'جاري الكشف' WHERE id = $1 RETURNING *",
        [nextId]
      );
      res.json(updated.rows[0]);
    } else {
      res.status(404).json({ message: 'No waiting patients' });
    }
  } catch (err) {
    console.error(err.message);
    res.status(500).send({ error: err.message });
  }
});

// --- AUTHENTICATION & SETTINGS ---
app.post('/api/auth/login', async (req, res) => {
  const { username, password } = req.body;
  try {
    const result = await pool.query(
      'SELECT id, username, role, full_name as "fullName" FROM users WHERE username = $1 AND password = $2',
      [username, password]
    );
    if (result.rows.length === 0) return res.status(401).json({ message: 'اسم المستخدم أو كلمة المرور غير صحيحة' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err.message);
    res.status(500).send({ error: err.message });
  }
});

app.get('/api/settings/users', async (req, res) => {
  try {
    const result = await pool.query('SELECT id, username, role, full_name as "fullName" FROM users ORDER BY role DESC');
    res.json(result.rows);
  } catch (err) {
    console.error(err.message);
    res.status(500).send({ error: err.message });
  }
});

app.post('/api/settings/users', async (req, res) => {
  const { username, password, role, fullName } = req.body;
  try {
    const result = await pool.query(
      'INSERT INTO users (username, password, role, full_name) VALUES ($1, $2, $3, $4) RETURNING id, username, role, full_name as "fullName"',
      [username, password, role, fullName]
    );
    res.json(result.rows[0]);
  } catch (err) {
    if (err.code === '23505') return res.status(400).json({ message: 'اسم المستخدم موجود بالفعل' });
    res.status(500).send({ error: err.message });
  }
});

app.put('/api/settings/change-password', async (req, res) => {
  const { username, currentPassword, newPassword } = req.body;
  try {
    const verify = await pool.query('SELECT id FROM users WHERE username = $1 AND password = $2', [username, currentPassword]);
    if (verify.rows.length === 0) return res.status(401).json({ message: 'كلمة المرور الحالية غير صحيحة' });
    
    await pool.query('UPDATE users SET password = $1 WHERE username = $2', [newPassword, username]);
    res.json({ message: 'تم تغيير كلمة المرور بنجاح' });
  } catch (err) {
    res.status(500).send({ error: err.message });
  }
});

app.get('/api/settings/ticker', async (req, res) => {
  try {
    const result = await pool.query("SELECT value FROM clinic_settings WHERE key = 'news_ticker'");
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).send({ error: err.message });
  }
});

app.put('/api/settings/ticker', async (req, res) => {
  const { value } = req.body;
  try {
    await pool.query("UPDATE clinic_settings SET value = $1 WHERE key = 'news_ticker'", [value]);
    res.json({ message: 'تم تحديث شريط الأخبار بنجاح' });
  } catch (err) {
    res.status(500).send({ error: err.message });
  }
});

app.put('/api/settings/video', async (req, res) => {
  const { value } = req.body;
  try {
    await pool.query("UPDATE clinic_settings SET value = $1 WHERE key = 'clinic_video_url'", [value]);
    res.json({ message: 'تم تحديث رابط الفيديو بنجاح' });
  } catch (err) {
    res.status(500).send({ error: err.message });
  }
});

app.get('/api/settings/video', async (req, res) => {
  try {
    const result = await pool.query("SELECT value FROM clinic_settings WHERE key = 'clinic_video_url'");
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).send({ error: err.message });
  }
});


// --- NEW PRESCRIPTION DATABASE ENDPOINTS ---
app.get('/api/prescriptions', async (req, res) => {
  try {
    const result = await pool.query('SELECT id, disease, medicine, dose, duration, age, notes FROM prescription_templates ORDER BY id DESC');
    res.json(result.rows);
  } catch (err) {
    res.status(500).send({ error: err.message });
  }
});

app.post('/api/prescriptions', async (req, res) => {
  const { disease, medicine, dose, duration, age, notes } = req.body;
  try {
    const result = await pool.query(
      'INSERT INTO prescription_templates (disease, medicine, dose, duration, age, notes) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
      [disease, medicine, dose, duration, age, notes]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).send({ error: err.message });
  }
});

app.put('/api/prescriptions/:id', async (req, res) => {
  const { id } = req.params;
  const { disease, medicine, dose, duration, age, notes } = req.body;
  try {
    const result = await pool.query(
      'UPDATE prescription_templates SET disease = $1, medicine = $2, dose = $3, duration = $4, age = $5, notes = $6 WHERE id = $7 RETURNING *',
      [disease, medicine, dose, duration, age, notes, id]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).send({ error: err.message });
  }
});

app.delete('/api/prescriptions/:id', async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query('DELETE FROM prescription_templates WHERE id = $1', [id]);
    res.json({ message: 'Prescription template deleted successfully' });
  } catch (err) {
    res.status(500).send({ error: err.message });
  }
});

app.post('/api/prescriptions/import', async (req, res) => {
  const { data } = req.body; // Array of templates
  if (!Array.isArray(data)) return res.status(400).json({ error: 'Data must be an array' });
  try {
    const inserted = [];
    for (const r of data) {
      const result = await pool.query(
        'INSERT INTO prescription_templates (disease, medicine, dose, duration, age, notes) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
        [
          r.disease || r.مرض || '',
          r.medicine || r.دواء || '',
          r.dose || r.جرعة || '',
          r.duration || r.مدة || '',
          r.age || r.عمر || '',
          r.notes || r.ملاحظات || ''
        ]
      );
      inserted.push(result.rows[0]);
    }
    res.json({ success: true, count: inserted.length, data: inserted });
  } catch (err) {
    res.status(500).send({ error: err.message });
  }
});

// --- CLINIC INFO BRANDING ENDPOINTS ---
app.get('/api/settings/clinic-info', async (req, res) => {
  try {
    const result = await pool.query('SELECT name, working_hours as "workingHours", address, maps_link as "mapsLink", phone, logo_url as "logoUrl", facebook, instagram, doctor_name as "doctorName", specialty FROM clinic_info WHERE id = 1');
    if (result.rows.length === 0) {
      res.json({ name: 'Cabinet Dentaire Dr. BOUYOUCEF SOFIANE', workingHours: '09:00 - 17:00', address: "Cité Frères Mernache (Tala larbaa) Tizi N'bechar / Sétif", mapsLink: '', phone: '0661 22 16 17', logoUrl: '', facebook: '', instagram: '', doctorName: 'Dr. BOUYOUCEF SOFIANE', specialty: 'Chirurgie Dentaire' });
    } else {
      res.json(result.rows[0]);
    }
  } catch (err) {
    res.status(500).send({ error: err.message });
  }
});

app.put('/api/settings/clinic-info', async (req, res) => {
  const { name, workingHours, address, mapsLink, phone, logoUrl, facebook, instagram, doctorName, specialty } = req.body;
  try {
    const check = await pool.query('SELECT id FROM clinic_info WHERE id = 1');
    if (check.rows.length === 0) {
      await pool.query(
        'INSERT INTO clinic_info (id, name, working_hours, address, maps_link, phone, logo_url, facebook, instagram, doctor_name, specialty) VALUES (1, $1, $2, $3, $4, $5, $6, $7, $8, $9, $10)',
        [name, workingHours, address, mapsLink, phone, logoUrl, facebook, instagram, doctorName, specialty]
      );
    } else {
      await pool.query(
        'UPDATE clinic_info SET name = $1, working_hours = $2, address = $3, maps_link = $4, phone = $5, logo_url = $6, facebook = $7, instagram = $8, doctor_name = $9, specialty = $10 WHERE id = 1',
        [name, workingHours, address, mapsLink, phone, logoUrl, facebook, instagram, doctorName, specialty]
      );
    }
    res.json({ message: 'تم تحديث بيانات العيادة بنجاح' });
  } catch (err) {
    res.status(500).send({ error: err.message });
  }
});

// Update Payment Status (separate endpoint)
app.put('/api/appointments/:id/payment', async (req, res) => {
  const { id } = req.params;
  const { paymentStatus } = req.body;
  try {
    const result = await pool.query(
      'UPDATE appointments SET payment_status = $1 WHERE id = $2 RETURNING *',
      [paymentStatus, id]
    );
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err.message);
    res.status(500).send({ error: err.message });
  }
});

// Get Server Local IP and Port
app.get('/api/settings/ip', (req, res) => {
  try {
    const interfaces = os.networkInterfaces();
    let localIp = 'localhost';
    
    for (const name of Object.keys(interfaces)) {
      for (const iface of interfaces[name]) {
        // Skip internal loopback and non-IPv4 addresses
        if (iface.family === 'IPv4' && !iface.internal) {
          localIp = iface.address;
          break;
        }
      }
      if (localIp !== 'localhost') break;
    }
    
    res.json({ ip: localIp, port: PORT });
  } catch (err) {
    res.status(500).send({ error: err.message });
  }
});

// Max Appointments Settings
app.get('/api/settings/max-appointments', async (req, res) => {
  try {
    const result = await pool.query("SELECT value FROM clinic_settings WHERE key = 'max_appointments'");
    res.json(result.rows[0] || { value: '20' });
  } catch (err) {
    res.status(500).send({ error: err.message });
  }
});

app.put('/api/settings/max-appointments', async (req, res) => {
  const { value } = req.body;
  try {
    await pool.query("UPDATE clinic_settings SET value = $1 WHERE key = 'max_appointments'", [value]);
    res.json({ message: 'تم تحديث حد المواعيد اليومي بنجاح' });
  } catch (err) {
    res.status(500).send({ error: err.message });
  }
});

// Patients list endpoint
app.get('/api/patients', async (req, res) => {
  try {
    const result = await pool.query('SELECT id, name, phone, age, registration_source as "registrationSource", created_at as "createdAt" FROM patients ORDER BY id DESC');
    res.json(result.rows);
  } catch (err) {
    console.error(err.message);
    res.status(500).send({ error: err.message });
  }
});

// Services list alias for analytics
app.get('/api/services', async (req, res) => {
  try {
    const result = await pool.query('SELECT id, name, price, price as default_price FROM services ORDER BY id ASC');
    res.json(result.rows);
  } catch (err) {
    console.error(err.message);
    res.status(500).send({ error: err.message });
  }
});

// Services CRUD
app.get('/api/settings/services', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM services ORDER BY id ASC');
    res.json(result.rows);
  } catch (err) {
    res.status(500).send({ error: err.message });
  }
});

app.post('/api/settings/services', async (req, res) => {
  const { name, price } = req.body;
  try {
    const result = await pool.query(
      'INSERT INTO services (name, price) VALUES ($1, $2) RETURNING *',
      [name, price]
    );
    res.json(result.rows[0]);
  } catch (err) {
    if (err.code === '23505') return res.status(400).json({ message: 'الخدمة موجودة بالفعل' });
    res.status(500).send({ error: err.message });
  }
});

app.put('/api/settings/services/:id', async (req, res) => {
  const { id } = req.params;
  const { name, price } = req.body;
  try {
    const result = await pool.query(
      'UPDATE services SET name = $1, price = $2 WHERE id = $3 RETURNING *',
      [name, price, id]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).send({ error: err.message });
  }
});

app.delete('/api/settings/services/:id', async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query('DELETE FROM services WHERE id = $1', [id]);
    res.json({ message: 'تم حذف الخدمة بنجاح' });
  } catch (err) {
    res.status(500).send({ error: err.message });
  }
});

// Backup All Clinic Data
app.get('/api/settings/backup', async (req, res) => {
  try {
    const appointments = await pool.query(`
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
    `);

    const patients = await pool.query('SELECT id, name, phone, age, registration_source as "registrationSource", created_at as "createdAt" FROM patients ORDER BY id DESC');
    const prescriptions = await pool.query('SELECT id, disease, medicine, dose, duration, age, notes FROM prescription_templates ORDER BY id DESC');
    const services = await pool.query('SELECT id, name, price FROM services ORDER BY id ASC');
    const clinicInfo = await pool.query('SELECT name, working_hours as "workingHours", address, phone, doctor_name as "doctorName", specialty FROM clinic_info WHERE id = 1');
    const users = await pool.query('SELECT id, username, role, full_name as "fullName" FROM users ORDER BY role DESC');

    res.json({
      appointments: appointments.rows,
      patients: patients.rows,
      prescriptions: prescriptions.rows,
      services: services.rows,
      clinicInfo: clinicInfo.rows[0] || {},
      users: users.rows
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).send({ error: err.message });
  }
});


// Serve React App in Production
const DIST_DIR = path.join(__dirname, '../dist');

// Explicitly handle JS/CSS assets with correct MIME types
app.get('/assets/:filename', (req, res) => {
  const filePath = path.join(DIST_DIR, 'assets', req.params.filename);
  if (fs.existsSync(filePath)) {
    res.sendFile(filePath);
  } else {
    res.status(404).send('Asset not found');
  }
});

app.use(express.static(DIST_DIR));

app.use((req, res) => {
  if (req.path.includes('.') || req.path.startsWith('/api')) {
    return res.status(404).send('Not found');
  }
  const indexPath = path.join(DIST_DIR, 'index.html');
  if (fs.existsSync(indexPath)) {
    res.sendFile(indexPath);
  } else {
    res.status(200).send('<h1>Server is running successfully!</h1><p>React app (dist) missing.</p>');
  }
});

app.listen(PORT, '0.0.0.0', () => console.log(`Server running on port ${PORT} (Network accessible)`));
