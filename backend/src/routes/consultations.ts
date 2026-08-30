/**
 * Consultations, Prescriptions, Exams, Medical History,
 * Invoices, Payments, Messages, Notifications, Reports, Settings, Users
 * — All remaining API routes
 */
import { Hono } from 'hono'
import { Bindings, Variables } from '../types'
import { authMiddleware } from '../middleware/auth'

// ─── CONSULTATIONS ────────────────────────────────────────────────────────────
const consultationsHono = new Hono<{ Bindings: Bindings; Variables: Variables }>()
consultationsHono.use('*', authMiddleware)

consultationsHono.get('/', async (c) => {
  const { patient_id, doctor_id, status, page = '1', limit = '20' } = c.req.query()
  const offset = (parseInt(page, 10) - 1) * parseInt(limit, 10)
  let conds: string[] = []
  const params: (string | number)[] = []
  if (patient_id) { conds.push('c.patient_id = ?'); params.push(parseInt(patient_id, 10)) }
  if (doctor_id) { conds.push('c.doctor_id = ?'); params.push(parseInt(doctor_id, 10)) }
  if (status) { conds.push('c.status = ?'); params.push(status) }
  const where = conds.length ? `WHERE ${conds.join(' AND ')}` : ''
  const rows = await c.env.DB.prepare(
    `SELECT c.*, p.first_name || ' ' || p.last_name as patient_name,
            d.first_name || ' ' || d.last_name as doctor_name
     FROM consultations c
     LEFT JOIN patients p ON c.patient_id = p.id
     LEFT JOIN doctors d ON c.doctor_id = d.id
     ${where} ORDER BY c.consultation_date DESC LIMIT ? OFFSET ?`
  ).bind(...params, parseInt(limit, 10), offset).all()
  const count = await c.env.DB.prepare(`SELECT COUNT(*) as t FROM consultations c ${where}`).bind(...params).first<{ t: number }>()
  return c.json({ data: rows.results, pagination: { page: parseInt(page, 10), total: count?.t ?? 0 } })
})

consultationsHono.get('/:id', async (c) => {
  const id = parseInt(c.req.param('id'), 10)
  const cons = await c.env.DB.prepare(
    `SELECT c.*, p.first_name || ' ' || p.last_name as patient_name, p.blood_type, p.allergies,
            d.first_name || ' ' || d.last_name as doctor_name, s.name as specialty_name
     FROM consultations c
     LEFT JOIN patients p ON c.patient_id = p.id
     LEFT JOIN doctors d ON c.doctor_id = d.id
     LEFT JOIN specialties s ON d.specialty_id = s.id
     WHERE c.id = ?`
  ).bind(id).first()
  if (!cons) return c.json({ error: 'Not found' }, 404)
  const prescriptions = await c.env.DB.prepare('SELECT * FROM prescriptions WHERE consultation_id = ?').bind(id).all()
  const exams = await c.env.DB.prepare('SELECT * FROM exams WHERE consultation_id = ?').bind(id).all()
  return c.json({ data: { ...cons, prescriptions: prescriptions.results, exams: exams.results } })
})

consultationsHono.post('/', async (c) => {
  const body = await c.req.json() as Record<string, unknown>
  const user = c.get('user')
  const r = await c.env.DB.prepare(
    `INSERT INTO consultations (appointment_id, patient_id, doctor_id, consultation_date, chief_complaint,
      symptoms, physical_exam, diagnosis, diagnosis_codes, treatment, observations,
      weight_kg, height_cm, temperature_c, heart_rate, blood_pressure_systolic,
      blood_pressure_diastolic, oxygen_saturation, respiratory_rate, glucose_mg_dl,
      follow_up_date, follow_up_notes)
     VALUES (?, ?, ?, COALESCE(?, CURRENT_TIMESTAMP), ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).bind(
    body.appointment_id ?? null, body.patient_id, body.doctor_id, body.consultation_date ?? null,
    body.chief_complaint ?? null, body.symptoms ?? null, body.physical_exam ?? null,
    body.diagnosis ?? null, body.diagnosis_codes ?? null, body.treatment ?? null, body.observations ?? null,
    body.weight_kg ?? null, body.height_cm ?? null, body.temperature_c ?? null, body.heart_rate ?? null,
    body.blood_pressure_systolic ?? null, body.blood_pressure_diastolic ?? null,
    body.oxygen_saturation ?? null, body.respiratory_rate ?? null, body.glucose_mg_dl ?? null,
    body.follow_up_date ?? null, body.follow_up_notes ?? null
  ).run()

  // Update appointment status
  if (body.appointment_id) {
    await c.env.DB.prepare(
      `UPDATE appointments SET status = 'completed', consultation_id = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`
    ).bind(r.meta.last_row_id, body.appointment_id).run()
  }

  // Medical history event
  await c.env.DB.prepare(
    `INSERT INTO medical_history (patient_id, event_type, event_date, title, related_consultation_id, doctor_id)
     VALUES (?, 'consultation', date('now'), 'Consulta médica', ?, ?)`
  ).bind(body.patient_id, r.meta.last_row_id, body.doctor_id).run()

  return c.json({ message: 'Consultation created', id: r.meta.last_row_id }, 201)
})

consultationsHono.put('/:id', async (c) => {
  const id = parseInt(c.req.param('id'), 10)
  const body = await c.req.json() as Record<string, unknown>
  const entries = Object.entries(body).filter(([, v]) => v !== undefined)
  if (entries.length === 0) return c.json({ error: 'No fields' }, 400)
  await c.env.DB.prepare(
    `UPDATE consultations SET ${entries.map(([k]) => `${k} = ?`).join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`
  ).bind(...entries.map(([, v]) => v), id).run()
  return c.json({ message: 'Updated' })
})

export { consultationsHono as consultationsRouter }
