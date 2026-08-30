/**
 * Patients Routes — Full CRUD with search, filters, pagination
 * GET    /api/patients
 * GET    /api/patients/:id
 * POST   /api/patients
 * PUT    /api/patients/:id
 * DELETE /api/patients/:id
 */

import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import { Bindings, Variables } from '../types'
import { authMiddleware } from '../middleware/auth'

const router = new Hono<{ Bindings: Bindings; Variables: Variables }>()
router.use('*', authMiddleware)

const patientSchema = z.object({
  first_name: z.string().min(2).max(100),
  last_name: z.string().min(2).max(100),
  document_type: z.enum(['CC', 'TI', 'CE', 'PASSPORT', 'NIT']).default('CC'),
  document_number: z.string().min(5).max(20),
  date_of_birth: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  gender: z.enum(['M', 'F', 'O']),
  email: z.string().email().optional().nullable(),
  phone: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
  city: z.string().optional().nullable(),
  state: z.string().optional().nullable(),
  country: z.string().default('Colombia'),
  insurance_provider: z.string().optional().nullable(),
  insurance_number: z.string().optional().nullable(),
  blood_type: z.enum(['A+','A-','B+','B-','AB+','AB-','O+','O-']).optional().nullable(),
  allergies: z.array(z.string()).default([]),
  chronic_diseases: z.array(z.string()).default([]),
  current_medications: z.array(z.string()).default([]),
  notes: z.string().optional().nullable(),
})

/**
 * GET /api/patients — List with search, filters, pagination
 */
router.get('/', async (c) => {
  const { search, page = '1', limit = '20', city, gender, insurance_provider, blood_type } = c.req.query()
  
  const pageNum = Math.max(1, parseInt(page, 10))
  const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10)))
  const offset = (pageNum - 1) * limitNum
  
  let conditions = ['p.is_active = 1']
  const params: (string | number)[] = []
  
  if (search) {
    conditions.push(`(p.first_name LIKE ? OR p.last_name LIKE ? OR p.document_number LIKE ? OR p.email LIKE ?)`)
    const q = `%${search}%`
    params.push(q, q, q, q)
  }
  if (city) { conditions.push('p.city = ?'); params.push(city) }
  if (gender) { conditions.push('p.gender = ?'); params.push(gender) }
  if (insurance_provider) { conditions.push('p.insurance_provider = ?'); params.push(insurance_provider) }
  if (blood_type) { conditions.push('p.blood_type = ?'); params.push(blood_type) }
  
  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : ''
  
  const countResult = await c.env.DB.prepare(
    `SELECT COUNT(*) as total FROM patients p ${where}`
  ).bind(...params).first<{ total: number }>()
  
  const patients = await c.env.DB.prepare(
    `SELECT p.*, 
            (SELECT COUNT(*) FROM appointments a WHERE a.patient_id = p.id) as appointment_count,
            (SELECT MAX(a.appointment_date) FROM appointments a WHERE a.patient_id = p.id) as last_appointment
     FROM patients p ${where} ORDER BY p.created_at DESC LIMIT ? OFFSET ?`
  ).bind(...params, limitNum, offset).all()
  
  return c.json({
    data: patients.results,
    pagination: {
      page: pageNum,
      limit: limitNum,
      total: countResult?.total ?? 0,
      total_pages: Math.ceil((countResult?.total ?? 0) / limitNum),
    }
  })
})

/**
 * GET /api/patients/:id
 */
router.get('/:id', async (c) => {
  const id = parseInt(c.req.param('id'), 10)
  
  const patient = await c.env.DB.prepare(
    `SELECT p.* FROM patients p WHERE p.id = ? AND p.is_active = 1`
  ).bind(id).first()
  
  if (!patient) return c.json({ error: 'Patient not found' }, 404)
  
  const contacts = await c.env.DB.prepare(
    `SELECT * FROM patient_emergency_contacts WHERE patient_id = ?`
  ).bind(id).all()
  
  const appointments = await c.env.DB.prepare(
    `SELECT a.*, d.first_name || ' ' || d.last_name as doctor_name, s.name as specialty_name
     FROM appointments a 
     LEFT JOIN doctors d ON a.doctor_id = d.id
     LEFT JOIN specialties s ON a.specialty_id = s.id
     WHERE a.patient_id = ? ORDER BY a.appointment_date DESC LIMIT 10`
  ).bind(id).all()
  
  return c.json({ 
    data: { 
      ...patient, 
      emergency_contacts: contacts.results,
      recent_appointments: appointments.results
    } 
  })
})

/**
 * POST /api/patients
 */
router.post('/', zValidator('json', patientSchema), async (c) => {
  const data = c.req.valid('json')
  const user = c.get('user')
  
  const existing = await c.env.DB.prepare(
    'SELECT id FROM patients WHERE document_number = ? AND is_active = 1'
  ).bind(data.document_number).first()
  
  if (existing) {
    return c.json({ error: 'Patient with this document already exists' }, 409)
  }
  
  const result = await c.env.DB.prepare(
    `INSERT INTO patients (first_name, last_name, document_type, document_number, date_of_birth, gender,
      email, phone, address, city, state, country, insurance_provider, insurance_number, blood_type,
      allergies, chronic_diseases, current_medications, notes)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).bind(
    data.first_name, data.last_name, data.document_type, data.document_number,
    data.date_of_birth, data.gender, data.email ?? null, data.phone ?? null,
    data.address ?? null, data.city ?? null, data.state ?? null, data.country,
    data.insurance_provider ?? null, data.insurance_number ?? null, data.blood_type ?? null,
    JSON.stringify(data.allergies), JSON.stringify(data.chronic_diseases), JSON.stringify(data.current_medications),
    data.notes ?? null
  ).run()
  
  // Audit log
  await c.env.DB.prepare(
    `INSERT INTO audit_logs (user_id, action, resource, resource_id, new_value) VALUES (?, 'create', 'patients', ?, ?)`
  ).bind(user.id, result.meta.last_row_id, JSON.stringify({ document_number: data.document_number })).run()
  
  return c.json({ message: 'Patient created', id: result.meta.last_row_id }, 201)
})

/**
 * PUT /api/patients/:id
 */
router.put('/:id', zValidator('json', patientSchema.partial()), async (c) => {
  const id = parseInt(c.req.param('id'), 10)
  const data = c.req.valid('json')
  const user = c.get('user')
  
  const patient = await c.env.DB.prepare(
    'SELECT id FROM patients WHERE id = ? AND is_active = 1'
  ).bind(id).first()
  
  if (!patient) return c.json({ error: 'Patient not found' }, 404)
  
  const fields = Object.entries(data)
    .filter(([, v]) => v !== undefined)
    .map(([k]) => {
      if (['allergies', 'chronic_diseases', 'current_medications'].includes(k)) {
        return `${k} = ?`
      }
      return `${k} = ?`
    })
  
  const values = Object.entries(data)
    .filter(([, v]) => v !== undefined)
    .map(([k, v]) => {
      if (['allergies', 'chronic_diseases', 'current_medications'].includes(k)) {
        return JSON.stringify(v)
      }
      return v
    })
  
  if (fields.length === 0) return c.json({ error: 'No fields to update' }, 400)
  
  await c.env.DB.prepare(
    `UPDATE patients SET ${fields.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`
  ).bind(...values, id).run()
  
  await c.env.DB.prepare(
    `INSERT INTO audit_logs (user_id, action, resource, resource_id) VALUES (?, 'update', 'patients', ?)`
  ).bind(user.id, id).run()
  
  return c.json({ message: 'Patient updated' })
})

/**
 * DELETE /api/patients/:id (soft delete)
 */
router.delete('/:id', async (c) => {
  const id = parseInt(c.req.param('id'), 10)
  const user = c.get('user')
  
  if (!['admin', 'receptionist'].includes(user.role_name)) {
    return c.json({ error: 'Forbidden' }, 403)
  }
  
  await c.env.DB.prepare(
    'UPDATE patients SET is_active = 0, updated_at = CURRENT_TIMESTAMP WHERE id = ?'
  ).bind(id).run()
  
  await c.env.DB.prepare(
    `INSERT INTO audit_logs (user_id, action, resource, resource_id) VALUES (?, 'delete', 'patients', ?)`
  ).bind(user.id, id).run()
  
  return c.json({ message: 'Patient deleted' })
})

export { router as patientsRouter }
