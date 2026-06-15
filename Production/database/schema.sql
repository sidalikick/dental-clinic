-- --------------------------------------------------------
-- Database Schema for Dental Clinic Management System
-- --------------------------------------------------------

-- 1. Patients Table: Stores persistent patient information
CREATE TABLE IF NOT EXISTS patients (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    phone VARCHAR(20) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(name, phone)
);

-- 2. Appointments Table: Stores each visit/booking
CREATE TABLE IF NOT EXISTS appointments (
    id VARCHAR(20) PRIMARY KEY,        -- e.g., REF-12345
    patient_id INTEGER NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    service VARCHAR(100) NOT NULL,     -- Type of treatment
    appointment_date DATE NOT NULL,    -- Date of booking
    appointment_time TIME NOT NULL,    -- Time of booking
    status VARCHAR(50) DEFAULT 'قيد الانتظار', 
    queue_number INTEGER,              -- Daily queue sequence
    notes TEXT,                        -- Medical/Clinical notes from doctor
    prescription TEXT,                 -- Prescribed medicine (Rx)
    treatment_price NUMERIC(10, 2) DEFAULT 0, -- Price of the treatment
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3. Users Table: Authentication and Staff Management
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL,         -- 'doctor' or 'reception'
    full_name VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 4. Clinic Settings Table: Global configurations
CREATE TABLE IF NOT EXISTS clinic_settings (
    key VARCHAR(50) PRIMARY KEY,
    value TEXT NOT NULL
);

-- 5. Clinic Information Table: Public details
CREATE TABLE IF NOT EXISTS clinic_info (
    id INTEGER PRIMARY KEY DEFAULT 1,
    name VARCHAR(255),
    logo_url TEXT,
    working_hours TEXT,
    address TEXT,
    google_maps_link TEXT,
    facebook_link TEXT,
    instagram_link TEXT,
    phone VARCHAR(50) DEFAULT '',
    maps_link TEXT DEFAULT '',
    facebook TEXT DEFAULT '',
    instagram TEXT DEFAULT '',
    doctor_name VARCHAR(255) DEFAULT '',
    specialty VARCHAR(255) DEFAULT '',
    CONSTRAINT one_row_only CHECK (id = 1)
);

-- 6. Indexes for Performance
CREATE INDEX IF NOT EXISTS idx_appointment_date ON appointments(appointment_date);
CREATE INDEX IF NOT EXISTS idx_patient_phone ON patients(phone);

-- 7. Initial Data (Optional - usually done via setup script)
-- INSERT INTO users (username, password, role, full_name) VALUES ('doctor', '1234', 'doctor', 'مدير العيادة') ON CONFLICT DO NOTHING;
-- INSERT INTO clinic_settings (key, value) VALUES ('news_ticker', 'أهلاً بكم في عيادة ابتسامتك - نتمنى لكم دوام الصحة والعافية') ON CONFLICT DO NOTHING;
-- INSERT INTO clinic_info (id, name, working_hours, address) VALUES (1, 'عيادة الأسنان', '09:00 - 18:00', 'الجزائر') ON CONFLICT DO NOTHING;
