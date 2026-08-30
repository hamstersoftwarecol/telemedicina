-- Seed data for Telemedicina App
-- Run: npm run db:seed

-- ============================================================
-- ROLES
-- ============================================================

INSERT OR IGNORE INTO roles (id, name, display_name, description) VALUES
  (1, 'admin', 'Administrador', 'Acceso total al sistema'),
  (2, 'doctor', 'Médico', 'Gestión de consultas y pacientes propios'),
  (3, 'receptionist', 'Recepcionista', 'Gestión de citas y pacientes'),
  (4, 'patient', 'Paciente', 'Acceso a su propia información');

-- ============================================================
-- PERMISSIONS
-- ============================================================

INSERT OR IGNORE INTO permissions (name, display_name, resource, action) VALUES
  ('users.read', 'Ver usuarios', 'users', 'read'),
  ('users.create', 'Crear usuarios', 'users', 'create'),
  ('users.update', 'Editar usuarios', 'users', 'update'),
  ('users.delete', 'Eliminar usuarios', 'users', 'delete'),
  ('patients.read', 'Ver pacientes', 'patients', 'read'),
  ('patients.create', 'Crear pacientes', 'patients', 'create'),
  ('patients.update', 'Editar pacientes', 'patients', 'update'),
  ('patients.delete', 'Eliminar pacientes', 'patients', 'delete'),
  ('doctors.read', 'Ver médicos', 'doctors', 'read'),
  ('doctors.create', 'Crear médicos', 'doctors', 'create'),
  ('doctors.update', 'Editar médicos', 'doctors', 'update'),
  ('doctors.delete', 'Eliminar médicos', 'doctors', 'delete'),
  ('appointments.read', 'Ver citas', 'appointments', 'read'),
  ('appointments.create', 'Crear citas', 'appointments', 'create'),
  ('appointments.update', 'Editar citas', 'appointments', 'update'),
  ('appointments.delete', 'Eliminar citas', 'appointments', 'delete'),
  ('consultations.read', 'Ver consultas', 'consultations', 'read'),
  ('consultations.create', 'Crear consultas', 'consultations', 'create'),
  ('consultations.update', 'Editar consultas', 'consultations', 'update'),
  ('prescriptions.read', 'Ver recetas', 'prescriptions', 'read'),
  ('prescriptions.create', 'Crear recetas', 'prescriptions', 'create'),
  ('invoices.read', 'Ver facturas', 'invoices', 'read'),
  ('invoices.create', 'Crear facturas', 'invoices', 'create'),
  ('invoices.update', 'Editar facturas', 'invoices', 'update'),
  ('reports.read', 'Ver reportes', 'reports', 'read'),
  ('settings.read', 'Ver configuración', 'settings', 'read'),
  ('settings.update', 'Editar configuración', 'settings', 'update');

-- Admin gets all permissions
INSERT OR IGNORE INTO role_permissions (role_id, permission_id)
  SELECT 1, id FROM permissions;

-- Doctor permissions
INSERT OR IGNORE INTO role_permissions (role_id, permission_id)
  SELECT 2, id FROM permissions 
  WHERE name IN ('patients.read', 'patients.update', 'appointments.read', 'appointments.update',
                 'consultations.read', 'consultations.create', 'consultations.update',
                 'prescriptions.read', 'prescriptions.create', 'doctors.read', 'invoices.read', 'reports.read');

-- Receptionist permissions
INSERT OR IGNORE INTO role_permissions (role_id, permission_id)
  SELECT 3, id FROM permissions 
  WHERE name IN ('patients.read', 'patients.create', 'patients.update',
                 'appointments.read', 'appointments.create', 'appointments.update',
                 'doctors.read', 'invoices.read', 'invoices.create');

-- Patient permissions
INSERT OR IGNORE INTO role_permissions (role_id, permission_id)
  SELECT 4, id FROM permissions 
  WHERE name IN ('appointments.read', 'consultations.read', 'prescriptions.read');

-- ============================================================
-- DEFAULT ADMIN USER (password: Admin@12345)
-- The hash below is for "Admin@12345" using SHA-256
-- ============================================================

INSERT OR IGNORE INTO users (id, email, password_hash, first_name, last_name, role_id, is_active, is_verified) VALUES
  (1, 'info@hamstersoftware.com', '$2a$10$rOzJqZQOCnUE2nGJnEmpIOjHplVJI2OGjCvJYX8vH3QNkJTbXZNi6', 'Administrador', 'Sistema', 1, 1, 1),
  (2, 'dr.garcia@telemedicina.app', '$2a$10$rOzJqZQOCnUE2nGJnEmpIOjHplVJI2OGjCvJYX8vH3QNkJTbXZNi6', 'Carlos', 'García', 2, 1, 1),
  (3, 'dr.rodriguez@telemedicina.app', '$2a$10$rOzJqZQOCnUE2nGJnEmpIOjHplVJI2OGjCvJYX8vH3QNkJTbXZNi6', 'María', 'Rodríguez', 2, 1, 1),
  (4, 'recepcion@telemedicina.app', '$2a$10$rOzJqZQOCnUE2nGJnEmpIOjHplVJI2OGjCvJYX8vH3QNkJTbXZNi6', 'Ana', 'López', 3, 1, 1);

-- ============================================================
-- SPECIALTIES
-- ============================================================

INSERT OR IGNORE INTO specialties (id, name, description, color) VALUES
  (1, 'Medicina General', 'Atención médica general y preventiva', '#3B82F6'),
  (2, 'Cardiología', 'Especialidad del corazón y sistema cardiovascular', '#EF4444'),
  (3, 'Dermatología', 'Piel, cabello y uñas', '#F59E0B'),
  (4, 'Pediatría', 'Medicina para niños y adolescentes', '#10B981'),
  (5, 'Ginecología', 'Salud femenina y reproductiva', '#EC4899'),
  (6, 'Neurología', 'Sistema nervioso central y periférico', '#8B5CF6'),
  (7, 'Ortopedia', 'Huesos, articulaciones y músculos', '#6B7280'),
  (8, 'Oftalmología', 'Ojos y visión', '#14B8A6'),
  (9, 'Psiquiatría', 'Salud mental', '#F97316'),
  (10, 'Endocrinología', 'Sistema endocrino y hormonas', '#84CC16');

-- ============================================================
-- DOCTORS
-- ============================================================

INSERT OR IGNORE INTO doctors (id, user_id, specialty_id, license_number, first_name, last_name, email, phone, office_number, consultation_fee, bio) VALUES
  (1, 2, 1, 'MED-001-2020', 'Carlos', 'García', 'dr.garcia@telemedicina.app', '+57 300 123 4567', 'Consultorio 101', 80000, 'Médico general con 15 años de experiencia'),
  (2, 3, 2, 'CAR-002-2018', 'María', 'Rodríguez', 'dr.rodriguez@telemedicina.app', '+57 300 234 5678', 'Consultorio 205', 150000, 'Cardióloga especialista en enfermedades coronarias'),
  (3, NULL, 4, 'PED-003-2019', 'Luis', 'Martínez', 'dr.martinez@telemedicina.app', '+57 300 345 6789', 'Consultorio 110', 90000, 'Pediatra con enfoque en desarrollo infantil'),
  (4, NULL, 6, 'NEU-004-2017', 'Sandra', 'Pérez', 'dr.perez@telemedicina.app', '+57 300 456 7890', 'Consultorio 302', 180000, 'Neuróloga especialista en cefaleas');

-- Doctor schedules (Mon-Fri)
INSERT OR IGNORE INTO doctor_schedules (doctor_id, day_of_week, start_time, end_time, slot_duration_minutes) VALUES
  (1, 1, '08:00', '12:00', 30), (1, 1, '14:00', '18:00', 30),
  (1, 2, '08:00', '12:00', 30), (1, 2, '14:00', '18:00', 30),
  (1, 3, '08:00', '12:00', 30), (1, 4, '14:00', '18:00', 30),
  (1, 5, '08:00', '12:00', 30),
  (2, 1, '09:00', '13:00', 45), (2, 3, '09:00', '13:00', 45),
  (2, 5, '09:00', '13:00', 45),
  (3, 2, '08:00', '16:00', 30), (3, 4, '08:00', '16:00', 30),
  (4, 1, '10:00', '14:00', 60), (4, 3, '10:00', '14:00', 60), (4, 5, '10:00', '14:00', 60);

-- ============================================================
-- PATIENTS
-- ============================================================

INSERT OR IGNORE INTO patients (id, first_name, last_name, document_type, document_number, date_of_birth, gender, email, phone, city, blood_type, allergies, insurance_provider) VALUES
  (1, 'Juan', 'Pérez', 'CC', '1234567890', '1985-06-15', 'M', 'juan.perez@email.com', '+57 310 111 2222', 'Bogotá', 'O+', '["Penicilina"]', 'Sura'),
  (2, 'Lucía', 'González', 'CC', '0987654321', '1990-03-22', 'F', 'lucia.gonzalez@email.com', '+57 320 222 3333', 'Medellín', 'A+', '[]', 'Colsanitas'),
  (3, 'Roberto', 'Sánchez', 'CC', '1122334455', '1978-11-08', 'M', 'roberto.sanchez@email.com', '+57 311 333 4444', 'Cali', 'B+', '["Aspirina","Ibuprofeno"]', 'Nueva EPS'),
  (4, 'Ana', 'Torres', 'CC', '5544332211', '1995-07-30', 'F', 'ana.torres@email.com', '+57 312 444 5555', 'Barranquilla', 'AB+', '[]', 'Coomeva'),
  (5, 'Miguel', 'Ramírez', 'CC', '9988776655', '2001-01-14', 'M', 'miguel.ramirez@email.com', '+57 313 555 6666', 'Bogotá', 'O-', '["Latex"]', 'Compensar'),
  (6, 'Carmen', 'López', 'CC', '6677889900', '1965-09-05', 'F', 'carmen.lopez@email.com', '+57 314 666 7777', 'Bogotá', 'A-', '["Sulfonamidas"]', 'Sura'),
  (7, 'Diego', 'Vargas', 'CC', '1357924680', '1992-04-18', 'M', 'diego.vargas@email.com', '+57 315 777 8888', 'Medellín', 'B-', '[]', 'Sanitas'),
  (8, 'Patricia', 'Morales', 'CC', '2468013579', '1970-12-25', 'F', 'patricia.morales@email.com', '+57 316 888 9999', 'Cali', 'O+', '["Amoxicilina"]', 'Colmédica');

-- Emergency contacts
INSERT OR IGNORE INTO patient_emergency_contacts (patient_id, name, relationship, phone, is_primary) VALUES
  (1, 'María Pérez', 'Esposa', '+57 310 999 8888', 1),
  (2, 'Carlos González', 'Padre', '+57 320 888 7777', 1),
  (3, 'Elena Sánchez', 'Esposa', '+57 311 777 6666', 1);

-- ============================================================
-- APPOINTMENTS (past and upcoming)
-- ============================================================

INSERT OR IGNORE INTO appointments (id, patient_id, doctor_id, specialty_id, appointment_date, start_time, end_time, status, type, reason) VALUES
  (1, 1, 1, 1, date('now', '-5 day'), '09:00', '09:30', 'completed', 'presencial', 'Chequeo de rutina'),
  (2, 2, 2, 2, date('now', '-3 day'), '10:00', '10:45', 'completed', 'presencial', 'Control cardiológico'),
  (3, 3, 1, 1, date('now', '-1 day'), '11:00', '11:30', 'completed', 'virtual', 'Consulta por fiebre'),
  (4, 4, 3, 4, date('now'), '08:00', '08:30', 'confirmed', 'presencial', 'Control pediátrico'),
  (5, 5, 1, 1, date('now'), '09:30', '10:00', 'confirmed', 'virtual', 'Consulta general'),
  (6, 6, 2, 2, date('now'), '10:00', '10:45', 'pending', 'presencial', 'Dolor en el pecho'),
  (7, 1, 4, 6, date('now', '+1 day'), '10:00', '11:00', 'confirmed', 'presencial', 'Migraña recurrente'),
  (8, 7, 3, 4, date('now', '+2 day'), '08:30', '09:00', 'pending', 'virtual', 'Vacunación'),
  (9, 8, 2, 2, date('now', '+3 day'), '11:00', '11:45', 'pending', 'presencial', 'Control anual'),
  (10, 2, 1, 1, date('now', '+5 day'), '14:00', '14:30', 'confirmed', 'presencial', 'Resultado de exámenes');

-- ============================================================
-- CONSULTATIONS
-- ============================================================

INSERT OR IGNORE INTO consultations (id, appointment_id, patient_id, doctor_id, consultation_date, chief_complaint, symptoms, diagnosis, treatment, weight_kg, height_cm, temperature_c, heart_rate, blood_pressure_systolic, blood_pressure_diastolic, oxygen_saturation, status) VALUES
  (1, 1, 1, 1, datetime('now', '-5 day'), 'Chequeo de rutina anual', 'Ninguno específico', 'Paciente en buen estado de salud', 'Continuar hábitos saludables, ejercicio regular', 78.5, 175, 36.7, 72, 120, 80, 98, 'closed'),
  (2, 2, 2, 2, datetime('now', '-3 day'), 'Control cardiológico', 'Palpitaciones ocasionales', 'Arritmia leve', 'Bisoprolol 2.5mg una vez al día', 65, 163, 36.5, 88, 130, 85, 97, 'closed'),
  (3, 3, 3, 1, datetime('now', '-1 day'), 'Fiebre y malestar general', 'Fiebre 38.5°C, dolor de cabeza, fatiga', 'Infección viral aguda', 'Reposo, acetaminofén 500mg cada 8h, hidratación', 82, 178, 38.5, 95, 125, 82, 96, 'closed');

-- ============================================================
-- PRESCRIPTIONS
-- ============================================================

INSERT OR IGNORE INTO prescriptions (id, consultation_id, patient_id, doctor_id, prescription_date, diagnosis, status) VALUES
  (1, 2, 2, 2, date('now', '-3 day'), 'Arritmia leve', 'active'),
  (2, 3, 3, 1, date('now', '-1 day'), 'Infección viral aguda', 'active');

INSERT OR IGNORE INTO prescription_items (prescription_id, medication_name, dosage, frequency, duration, instructions) VALUES
  (1, 'Bisoprolol', '2.5mg', 'Una vez al día', '30 días', 'Tomar en la mañana con el desayuno'),
  (2, 'Acetaminofén', '500mg', 'Cada 8 horas', '5 días', 'Tomar con agua, no exceder 4 dosis al día'),
  (2, 'Loratadina', '10mg', 'Una vez al día', '5 días', 'Tomar antes de dormir');

-- ============================================================
-- INVOICES
-- ============================================================

INSERT OR IGNORE INTO invoices (id, invoice_number, patient_id, consultation_id, issue_date, subtotal, tax_amount, total, status) VALUES
  (1, 'FAC-2024-001', 1, 1, date('now', '-5 day'), 80000, 0, 80000, 'paid'),
  (2, 'FAC-2024-002', 2, 2, date('now', '-3 day'), 150000, 0, 150000, 'paid'),
  (3, 'FAC-2024-003', 3, 3, date('now', '-1 day'), 80000, 0, 80000, 'sent'),
  (4, 'FAC-2024-004', 4, NULL, date('now'), 90000, 0, 90000, 'draft');

INSERT OR IGNORE INTO invoice_items (invoice_id, description, quantity, unit_price, total) VALUES
  (1, 'Consulta Medicina General', 1, 80000, 80000),
  (2, 'Consulta Cardiología', 1, 150000, 150000),
  (3, 'Consulta Medicina General - Virtual', 1, 80000, 80000),
  (4, 'Consulta Pediatría', 1, 90000, 90000);

INSERT OR IGNORE INTO payments (invoice_id, payment_date, amount, payment_method, reference) VALUES
  (1, date('now', '-5 day'), 80000, 'card', 'TXN-001'),
  (2, date('now', '-3 day'), 150000, 'transfer', 'TXN-002');

-- ============================================================
-- MEDICAL HISTORY EVENTS
-- ============================================================

INSERT OR IGNORE INTO medical_history (patient_id, event_type, event_date, title, description, related_consultation_id, doctor_id) VALUES
  (1, 'consultation', date('now', '-5 day'), 'Chequeo de rutina', 'Chequeo anual, resultados normales', 1, 1),
  (2, 'consultation', date('now', '-3 day'), 'Control cardiológico', 'Arritmia leve detectada, se inicia tratamiento', 2, 2),
  (2, 'prescription', date('now', '-3 day'), 'Receta médica', 'Bisoprolol 2.5mg prescrito', NULL, 2),
  (3, 'consultation', date('now', '-1 day'), 'Consulta por fiebre', 'Infección viral aguda tratada con reposo y analgésicos', 3, 1);

-- ============================================================
-- SETTINGS
-- ============================================================

INSERT OR IGNORE INTO settings (key, value, type, description) VALUES
  ('app.name', 'TelemedApp', 'string', 'Nombre de la aplicación'),
  ('app.logo_url', '', 'string', 'URL del logo'),
  ('app.primary_color', '#3B82F6', 'string', 'Color primario'),
  ('app.language', 'es', 'string', 'Idioma por defecto'),
  ('appointment.duration_default', '30', 'number', 'Duración por defecto de citas (minutos)'),
  ('appointment.reminder_hours', '24', 'number', 'Horas antes para enviar recordatorio'),
  ('invoice.tax_rate', '0', 'number', 'Tasa de impuesto por defecto'),
  ('invoice.currency', 'COP', 'string', 'Moneda'),
  ('hospital.name', 'Centro Médico TelemedApp', 'string', 'Nombre del hospital/clínica'),
  ('hospital.address', 'Calle 123 #45-67, Bogotá', 'string', 'Dirección'),
  ('hospital.phone', '+57 1 234 5678', 'string', 'Teléfono'),
  ('hospital.email', 'info@telemedicina.app', 'string', 'Email institucional'),
  ('hospital.nit', '900.123.456-7', 'string', 'NIT/RUT de la empresa');

-- ============================================================
-- NOTIFICATIONS
-- ============================================================

INSERT OR IGNORE INTO notifications (user_id, title, body, type, is_read) VALUES
  (1, 'Bienvenido al sistema', 'TelemedApp ha sido configurado correctamente', 'success', 0),
  (1, 'Nueva cita agendada', 'Juan Pérez tiene una cita hoy a las 09:30', 'appointment', 0),
  (1, 'Paciente nuevo registrado', 'Se registró Miguel Ramírez como nuevo paciente', 'info', 0),
  (2, 'Cita confirmada', 'Tu consulta con Juan Pérez está confirmada para hoy', 'appointment', 0);
