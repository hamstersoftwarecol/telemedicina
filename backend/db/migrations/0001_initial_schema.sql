-- Migration: 0001_initial_schema.sql
-- Telemedicina App - Initial Database Schema

PRAGMA foreign_keys = ON;

-- ============================================================
-- ROLES & PERMISSIONS
-- ============================================================

CREATE TABLE IF NOT EXISTS roles (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  description TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS permissions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  resource TEXT NOT NULL,
  action TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS role_permissions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  role_id INTEGER NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  permission_id INTEGER NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
  UNIQUE(role_id, permission_id)
);

-- ============================================================
-- USERS & SESSIONS
-- ============================================================

CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  phone TEXT,
  avatar_url TEXT,
  role_id INTEGER NOT NULL REFERENCES roles(id),
  is_active INTEGER NOT NULL DEFAULT 1,
  is_verified INTEGER NOT NULL DEFAULT 0,
  last_login_at DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS refresh_tokens (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE,
  expires_at DATETIME NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  revoked_at DATETIME
);

-- ============================================================
-- SPECIALTIES
-- ============================================================

CREATE TABLE IF NOT EXISTS specialties (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  icon TEXT,
  color TEXT DEFAULT '#3B82F6',
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- DOCTORS
-- ============================================================

CREATE TABLE IF NOT EXISTS doctors (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  specialty_id INTEGER NOT NULL REFERENCES specialties(id),
  license_number TEXT NOT NULL UNIQUE,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  avatar_url TEXT,
  office_number TEXT,
  consultation_fee REAL DEFAULT 0,
  bio TEXT,
  education TEXT,
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS doctor_schedules (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  doctor_id INTEGER NOT NULL REFERENCES doctors(id) ON DELETE CASCADE,
  day_of_week INTEGER NOT NULL, -- 0=Sun, 1=Mon, ... 6=Sat
  start_time TEXT NOT NULL, -- HH:MM
  end_time TEXT NOT NULL, -- HH:MM
  slot_duration_minutes INTEGER NOT NULL DEFAULT 30,
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- PATIENTS
-- ============================================================

CREATE TABLE IF NOT EXISTS patients (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  document_type TEXT NOT NULL DEFAULT 'DNI', -- DNI, PASSPORT, etc
  document_number TEXT NOT NULL UNIQUE,
  date_of_birth DATE NOT NULL,
  gender TEXT NOT NULL, -- M, F, O
  email TEXT,
  phone TEXT,
  address TEXT,
  city TEXT,
  state TEXT,
  country TEXT DEFAULT 'Colombia',
  insurance_provider TEXT,
  insurance_number TEXT,
  blood_type TEXT, -- A+, A-, B+, B-, AB+, AB-, O+, O-
  allergies TEXT, -- JSON array stored as text
  chronic_diseases TEXT, -- JSON array
  current_medications TEXT, -- JSON array
  avatar_url TEXT,
  notes TEXT,
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS patient_emergency_contacts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  patient_id INTEGER NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  relationship TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT,
  is_primary INTEGER NOT NULL DEFAULT 0
);

-- ============================================================
-- APPOINTMENTS
-- ============================================================

CREATE TABLE IF NOT EXISTS appointments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  patient_id INTEGER NOT NULL REFERENCES patients(id),
  doctor_id INTEGER NOT NULL REFERENCES doctors(id),
  specialty_id INTEGER REFERENCES specialties(id),
  appointment_date DATE NOT NULL,
  start_time TEXT NOT NULL, -- HH:MM
  end_time TEXT NOT NULL, -- HH:MM
  status TEXT NOT NULL DEFAULT 'pending', -- pending, confirmed, in_progress, completed, cancelled, no_show
  type TEXT NOT NULL DEFAULT 'presencial', -- presencial, virtual
  reason TEXT,
  notes TEXT,
  reminder_sent INTEGER DEFAULT 0,
  consultation_id INTEGER, -- set when consultation is created
  cancelled_at DATETIME,
  cancelled_reason TEXT,
  created_by INTEGER REFERENCES users(id),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- CONSULTATIONS
-- ============================================================

CREATE TABLE IF NOT EXISTS consultations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  appointment_id INTEGER REFERENCES appointments(id),
  patient_id INTEGER NOT NULL REFERENCES patients(id),
  doctor_id INTEGER NOT NULL REFERENCES doctors(id),
  consultation_date DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  chief_complaint TEXT,
  symptoms TEXT,
  physical_exam TEXT,
  diagnosis TEXT,
  diagnosis_codes TEXT, -- ICD-10 codes JSON
  treatment TEXT,
  observations TEXT,
  -- Vital signs
  weight_kg REAL,
  height_cm REAL,
  temperature_c REAL,
  heart_rate INTEGER,
  blood_pressure_systolic INTEGER,
  blood_pressure_diastolic INTEGER,
  oxygen_saturation REAL,
  respiratory_rate INTEGER,
  glucose_mg_dl REAL,
  -- Follow up
  follow_up_date DATE,
  follow_up_notes TEXT,
  status TEXT NOT NULL DEFAULT 'open', -- open, closed
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- PRESCRIPTIONS
-- ============================================================

CREATE TABLE IF NOT EXISTS prescriptions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  consultation_id INTEGER REFERENCES consultations(id),
  patient_id INTEGER NOT NULL REFERENCES patients(id),
  doctor_id INTEGER NOT NULL REFERENCES doctors(id),
  prescription_date DATE NOT NULL DEFAULT (date('now')),
  diagnosis TEXT,
  notes TEXT,
  digital_signature TEXT, -- base64 encoded signature
  status TEXT NOT NULL DEFAULT 'active', -- active, dispensed, cancelled, expired
  valid_until DATE,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS prescription_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  prescription_id INTEGER NOT NULL REFERENCES prescriptions(id) ON DELETE CASCADE,
  medication_name TEXT NOT NULL,
  generic_name TEXT,
  dosage TEXT NOT NULL,
  frequency TEXT NOT NULL,
  duration TEXT NOT NULL,
  quantity INTEGER,
  instructions TEXT,
  route TEXT DEFAULT 'oral' -- oral, topical, injectable, etc
);

-- ============================================================
-- EXAMS & FILES
-- ============================================================

CREATE TABLE IF NOT EXISTS exams (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  patient_id INTEGER NOT NULL REFERENCES patients(id),
  consultation_id INTEGER REFERENCES consultations(id),
  doctor_id INTEGER REFERENCES doctors(id),
  exam_type TEXT NOT NULL, -- laboratory, imaging, other
  exam_name TEXT NOT NULL,
  exam_date DATE NOT NULL,
  r2_key TEXT NOT NULL, -- Cloudflare R2 object key
  file_name TEXT NOT NULL,
  file_type TEXT NOT NULL, -- pdf, jpg, png
  file_size_bytes INTEGER,
  description TEXT,
  results TEXT,
  status TEXT DEFAULT 'pending', -- pending, completed, reviewed
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- MEDICAL HISTORY (events timeline)
-- ============================================================

CREATE TABLE IF NOT EXISTS medical_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  patient_id INTEGER NOT NULL REFERENCES patients(id),
  event_type TEXT NOT NULL, -- consultation, prescription, exam, hospitalization, surgery, allergy, note
  event_date DATE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  related_consultation_id INTEGER REFERENCES consultations(id),
  related_prescription_id INTEGER REFERENCES prescriptions(id),
  related_exam_id INTEGER REFERENCES exams(id),
  doctor_id INTEGER REFERENCES doctors(id),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- INVOICES & PAYMENTS
-- ============================================================

CREATE TABLE IF NOT EXISTS invoices (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  invoice_number TEXT NOT NULL UNIQUE,
  patient_id INTEGER NOT NULL REFERENCES patients(id),
  consultation_id INTEGER REFERENCES consultations(id),
  appointment_id INTEGER REFERENCES appointments(id),
  issue_date DATE NOT NULL DEFAULT (date('now')),
  due_date DATE,
  subtotal REAL NOT NULL DEFAULT 0,
  tax_rate REAL DEFAULT 0,
  tax_amount REAL DEFAULT 0,
  discount_amount REAL DEFAULT 0,
  total REAL NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'draft', -- draft, sent, paid, overdue, cancelled, refunded
  notes TEXT,
  created_by INTEGER REFERENCES users(id),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS invoice_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  invoice_id INTEGER NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  unit_price REAL NOT NULL,
  total REAL NOT NULL
);

CREATE TABLE IF NOT EXISTS payments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  invoice_id INTEGER NOT NULL REFERENCES invoices(id),
  payment_date DATE NOT NULL DEFAULT (date('now')),
  amount REAL NOT NULL,
  payment_method TEXT NOT NULL, -- cash, card, transfer, insurance
  reference TEXT,
  notes TEXT,
  created_by INTEGER REFERENCES users(id),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- MESSAGES
-- ============================================================

CREATE TABLE IF NOT EXISTS conversations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT,
  type TEXT NOT NULL DEFAULT 'direct', -- direct, group
  created_by INTEGER REFERENCES users(id),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS conversation_participants (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  conversation_id INTEGER NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  joined_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  last_read_at DATETIME,
  UNIQUE(conversation_id, user_id)
);

CREATE TABLE IF NOT EXISTS messages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  conversation_id INTEGER NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  sender_id INTEGER NOT NULL REFERENCES users(id),
  content TEXT NOT NULL,
  message_type TEXT NOT NULL DEFAULT 'text', -- text, file, system
  r2_key TEXT, -- if file attachment
  file_name TEXT,
  is_edited INTEGER DEFAULT 0,
  edited_at DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- NOTIFICATIONS
-- ============================================================

CREATE TABLE IF NOT EXISTS notifications (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'info', -- info, success, warning, error, appointment, message
  is_read INTEGER NOT NULL DEFAULT 0,
  action_url TEXT,
  related_id INTEGER,
  related_type TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  read_at DATETIME
);

-- ============================================================
-- SETTINGS
-- ============================================================

CREATE TABLE IF NOT EXISTS settings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  key TEXT NOT NULL UNIQUE,
  value TEXT,
  type TEXT DEFAULT 'string', -- string, json, boolean, number
  description TEXT,
  updated_by INTEGER REFERENCES users(id),
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- AUDIT LOGS
-- ============================================================

CREATE TABLE IF NOT EXISTS audit_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER REFERENCES users(id),
  action TEXT NOT NULL,
  resource TEXT NOT NULL,
  resource_id INTEGER,
  old_value TEXT, -- JSON
  new_value TEXT, -- JSON
  ip_address TEXT,
  user_agent TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- INDEXES
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role_id);
CREATE INDEX IF NOT EXISTS idx_patients_document ON patients(document_number);
CREATE INDEX IF NOT EXISTS idx_patients_email ON patients(email);
CREATE INDEX IF NOT EXISTS idx_doctors_specialty ON doctors(specialty_id);
CREATE INDEX IF NOT EXISTS idx_doctors_license ON doctors(license_number);
CREATE INDEX IF NOT EXISTS idx_appointments_date ON appointments(appointment_date);
CREATE INDEX IF NOT EXISTS idx_appointments_patient ON appointments(patient_id);
CREATE INDEX IF NOT EXISTS idx_appointments_doctor ON appointments(doctor_id);
CREATE INDEX IF NOT EXISTS idx_appointments_status ON appointments(status);
CREATE INDEX IF NOT EXISTS idx_consultations_patient ON consultations(patient_id);
CREATE INDEX IF NOT EXISTS idx_consultations_doctor ON consultations(doctor_id);
CREATE INDEX IF NOT EXISTS idx_prescriptions_patient ON prescriptions(patient_id);
CREATE INDEX IF NOT EXISTS idx_exams_patient ON exams(patient_id);
CREATE INDEX IF NOT EXISTS idx_medical_history_patient ON medical_history(patient_id);
CREATE INDEX IF NOT EXISTS idx_invoices_patient ON invoices(patient_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_resource ON audit_logs(resource, resource_id);
