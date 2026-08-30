/**
 * Doctors Routes
 */
import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import { Bindings, Variables } from '../types'
import { authMiddleware } from '../middleware/auth'

const router = new Hono<{ Bindings: Bindings; Variables: Variables }>()
router.use('*', authMiddleware)

const doctorSchema = z.object({
  specialty_id: z.number().int().positive(),
  license_number: z.string().min(3),
  first_name: z.string().min(2).max(100),
  last_name: z.string().min(2).max(100),
  email: z.string().email(),
  phone: z.string().optional().nullable(),
  office_number: z.string().optional().nullable(),
  consultation_fee: z.number().min(0).default(0),
  bio: z.string().optional().nullable(),
  education: z.string().optional().nullable(),
  is_active: z.number().int().min(0).max(1).default(1),
})

router.get('/', async (c) => {
  const { search, specialty_id, is_active, page = '1', limit = '20' } = c.req.query()
  const pageNum = Math.max(1, parseInt(page, 10))
  const limitNum = Math.min(100, parseInt(limit, 10))
  const offset = (pageNum - 1) * limitNum

  let conditions = ['1=1']
  const params: (string | number)[] = []

  if (search) {
    conditions.push(`(d.first_name LIKE ? OR d.last_name LIKE ? OR d.email LIKE ? OR d.license_number LIKE ?)`)
    const q = `%${search}%`
    params.push(q, q, q, q)
  }
  if (specialty_id) { conditions.push('d.specialty_id = ?'); params.push(parseInt(specialty_id, 10)) }
  if (is_active !== undefined) { conditions.push('d.is_active = ?'); params.push(parseInt(is_active, 10)) }

  const where = `WHERE ${conditions.join(' AND ')}`

  const count = await c.env.DB.prepare(`SELECT COUNT(*) as total FROM doctors d ${where}`).bind(...params).first<{ total: number }>()

  const doctors = await c.env.DB.prepare(
    `SELECT d.*, s.name as specialty_name, s.color as specialty_color
     FROM doctors d LEFT JOIN specialties s ON d.specialty_id = s.id
     ${where} ORDER BY d.first_name ASC LIMIT ? OFFSET ?`
  ).bind(...params, limitNum, offset).all()

  return c.json({
    data: doctors.results,
    pagination: { page: pageNum, limit: limitNum, total: count?.total ?? 0, total_pages: Math.ceil((count?.total ?? 0) / limitNum) }
  })
})

router.get('/:id', async (c) => {
  const id = parseInt(c.req.param('id'), 10)
  const doctor = await c.env.DB.prepare(
    `SELECT d.*, s.name as specialty_name FROM doctors d 
     LEFT JOIN specialties s ON d.specialty_id = s.id WHERE d.id = ?`
  ).bind(id).first()
  if (!doctor) return c.json({ error: 'Doctor not found' }, 404)

  const schedules = await c.env.DB.prepare(
    `SELECT * FROM doctor_schedules WHERE doctor_id = ? AND is_active = 1 ORDER BY day_of_week, start_time`
  ).bind(id).all()

  return c.json({ data: { ...doctor, schedules: schedules.results } })
})

router.post('/', zValidator('json', doctorSchema), async (c) => {
  const data = c.req.valid('json')
  const user = c.get('user')

  if (!['admin'].includes(user.role_name)) return c.json({ error: 'Forbidden' }, 403)

  const existing = await c.env.DB.prepare('SELECT id FROM doctors WHERE license_number = ?').bind(data.license_number).first()
  if (existing) return c.json({ error: 'License number already registered' }, 409)

  const result = await c.env.DB.prepare(
    `INSERT INTO doctors (specialty_id, license_number, first_name, last_name, email, phone, office_number, consultation_fee, bio, education, is_active)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).bind(data.specialty_id, data.license_number, data.first_name, data.last_name, data.email,
    data.phone ?? null, data.office_number ?? null, data.consultation_fee, data.bio ?? null, data.education ?? null, data.is_active).run()

  return c.json({ message: 'Doctor created', id: result.meta.last_row_id }, 201)
})

router.put('/:id', zValidator('json', doctorSchema.partial()), async (c) => {
  const id = parseInt(c.req.param('id'), 10)
  const data = c.req.valid('json')
  const user = c.get('user')
  if (!['admin'].includes(user.role_name)) return c.json({ error: 'Forbidden' }, 403)

  const doctor = await c.env.DB.prepare('SELECT id FROM doctors WHERE id = ?').bind(id).first()
  if (!doctor) return c.json({ error: 'Doctor not found' }, 404)

  const entries = Object.entries(data).filter(([, v]) => v !== undefined)
  if (entries.length === 0) return c.json({ error: 'No fields to update' }, 400)

  await c.env.DB.prepare(
    `UPDATE doctors SET ${entries.map(([k]) => `${k} = ?`).join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`
  ).bind(...entries.map(([, v]) => v), id).run()

  return c.json({ message: 'Doctor updated' })
})

router.delete('/:id', async (c) => {
  const id = parseInt(c.req.param('id'), 10)
  const user = c.get('user')
  if (!['admin'].includes(user.role_name)) return c.json({ error: 'Forbidden' }, 403)

  await c.env.DB.prepare('UPDATE doctors SET is_active = 0, updated_at = CURRENT_TIMESTAMP WHERE id = ?').bind(id).run()
  return c.json({ message: 'Doctor deactivated' })
})

// Doctor schedules
router.get('/:id/schedules', async (c) => {
  const id = parseInt(c.req.param('id'), 10)
  const schedules = await c.env.DB.prepare(
    `SELECT * FROM doctor_schedules WHERE doctor_id = ? ORDER BY day_of_week, start_time`
  ).bind(id).all()
  return c.json({ data: schedules.results })
})

router.post('/:id/schedules', async (c) => {
  const doctorId = parseInt(c.req.param('id'), 10)
  const body = await c.req.json() as { day_of_week: number; start_time: string; end_time: string; slot_duration_minutes?: number }

  const result = await c.env.DB.prepare(
    `INSERT INTO doctor_schedules (doctor_id, day_of_week, start_time, end_time, slot_duration_minutes) VALUES (?, ?, ?, ?, ?)`
  ).bind(doctorId, body.day_of_week, body.start_time, body.end_time, body.slot_duration_minutes ?? 30).run()

  return c.json({ message: 'Schedule added', id: result.meta.last_row_id }, 201)
})

router.delete('/:id/schedules/:schedule_id', async (c) => {
  const doctorId = parseInt(c.req.param('id'), 10)
  const scheduleId = parseInt(c.req.param('schedule_id'), 10)
  
  await c.env.DB.prepare(
    `DELETE FROM doctor_schedules WHERE id = ? AND doctor_id = ?`
  ).bind(scheduleId, doctorId).run()
  
  return c.json({ message: 'Schedule removed' })
})

export { router as doctorsRouter }
