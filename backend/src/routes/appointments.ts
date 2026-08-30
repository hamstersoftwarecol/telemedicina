/**
 * Appointments Routes — Calendar CRUD
 */
import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import { Bindings, Variables } from '../types'
import { authMiddleware } from '../middleware/auth'

const router = new Hono<{ Bindings: Bindings; Variables: Variables }>()
router.use('*', authMiddleware)

const appointmentSchema = z.object({
  patient_id: z.number().int().positive(),
  doctor_id: z.number().int().positive(),
  specialty_id: z.number().int().positive().optional(),
  appointment_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  start_time: z.string().regex(/^\d{2}:\d{2}$/),
  end_time: z.string().regex(/^\d{2}:\d{2}$/),
  type: z.enum(['presencial', 'virtual']).default('presencial'),
  reason: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
})

router.get('/', async (c) => {
  const { patient_id, doctor_id, status, from, to, page = '1', limit = '50' } = c.req.query()
  const pageNum = Math.max(1, parseInt(page, 10))
  const limitNum = Math.min(200, parseInt(limit, 10))
  const offset = (pageNum - 1) * limitNum

  let conditions: string[] = []
  const params: (string | number)[] = []

  if (patient_id) { conditions.push('a.patient_id = ?'); params.push(parseInt(patient_id, 10)) }
  if (doctor_id) { conditions.push('a.doctor_id = ?'); params.push(parseInt(doctor_id, 10)) }
  if (status) { conditions.push('a.status = ?'); params.push(status) }
  if (from) { conditions.push('a.appointment_date >= ?'); params.push(from) }
  if (to) { conditions.push('a.appointment_date <= ?'); params.push(to) }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : ''

  const count = await c.env.DB.prepare(
    `SELECT COUNT(*) as total FROM appointments a ${where}`
  ).bind(...params).first<{ total: number }>()

  const appointments = await c.env.DB.prepare(
    `SELECT a.*,
            p.first_name || ' ' || p.last_name as patient_name,
            p.document_number as patient_document,
            d.first_name || ' ' || d.last_name as doctor_name,
            s.name as specialty_name
     FROM appointments a
     LEFT JOIN patients p ON a.patient_id = p.id
     LEFT JOIN doctors d ON a.doctor_id = d.id
     LEFT JOIN specialties s ON a.specialty_id = s.id
     ${where} ORDER BY a.appointment_date DESC, a.start_time DESC LIMIT ? OFFSET ?`
  ).bind(...params, limitNum, offset).all()

  return c.json({
    data: appointments.results,
    pagination: { page: pageNum, limit: limitNum, total: count?.total ?? 0, total_pages: Math.ceil((count?.total ?? 0) / limitNum) }
  })
})

router.get('/available-slots', async (c) => {
  const { doctor_id, date } = c.req.query()
  if (!doctor_id || !date) return c.json({ error: 'doctor_id and date are required' }, 400)
  
  // Get all active schedules for this doctor on the given day of week
  const dayOfWeek = new Date(date).getDay() // 0-6
  const schedules = await c.env.DB.prepare(
    `SELECT start_time, end_time, slot_duration_minutes FROM doctor_schedules WHERE doctor_id = ? AND day_of_week = ? AND is_active = 1`
  ).bind(parseInt(doctor_id, 10), dayOfWeek).all<{start_time: string, end_time: string, slot_duration_minutes: number}>()
  
  // If no schedule, no available slots
  if (!schedules || schedules.results.length === 0) {
    return c.json({ data: [] })
  }
  
  // Get existing non-cancelled appointments for the doctor on that date
  const existing = await c.env.DB.prepare(
    `SELECT start_time FROM appointments WHERE doctor_id = ? AND appointment_date = ? AND status != 'cancelled'`
  ).bind(parseInt(doctor_id, 10), date).all<{start_time: string}>()
  
  const bookedTimes = existing.results.map(r => r.start_time)
  
  const availableTimes: string[] = []
  
  // For each schedule block, generate slots based on slot_duration_minutes
  schedules.results.forEach(schedule => {
    let [h, m] = schedule.start_time.split(':').map(Number)
    const [endH, endM] = schedule.end_time.split(':').map(Number)
    const duration = schedule.slot_duration_minutes || 30
    
    while (h < endH || (h === endH && m < endM)) {
      const timeStr = `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`
      if (!bookedTimes.includes(timeStr)) {
        availableTimes.push(timeStr)
      }
      m += duration
      if (m >= 60) {
        h += Math.floor(m / 60)
        m = m % 60
      }
    }
  })
  
  return c.json({ data: availableTimes })
})

router.get('/today', async (c) => {
  const user = c.get('user')
  let query = `SELECT a.*, p.first_name || ' ' || p.last_name as patient_name,
               d.first_name || ' ' || d.last_name as doctor_name, s.name as specialty_name
               FROM appointments a
               LEFT JOIN patients p ON a.patient_id = p.id
               LEFT JOIN doctors d ON a.doctor_id = d.id
               LEFT JOIN specialties s ON a.specialty_id = s.id
               WHERE a.appointment_date = date('now')`
  const params: (string | number)[] = []
  if (user.role_name === 'doctor') {
    const doctor = await c.env.DB.prepare('SELECT id FROM doctors WHERE user_id = ?').bind(user.id).first<{ id: number }>()
    if (doctor) { query += ' AND a.doctor_id = ?'; params.push(doctor.id) }
  }
  query += ' ORDER BY a.start_time'
  const results = await c.env.DB.prepare(query).bind(...params).all()
  return c.json({ data: results.results })
})

router.get('/:id', async (c) => {
  const id = parseInt(c.req.param('id'), 10)
  const appt = await c.env.DB.prepare(
    `SELECT a.*, p.first_name || ' ' || p.last_name as patient_name, p.phone as patient_phone,
            d.first_name || ' ' || d.last_name as doctor_name, s.name as specialty_name
     FROM appointments a
     LEFT JOIN patients p ON a.patient_id = p.id
     LEFT JOIN doctors d ON a.doctor_id = d.id
     LEFT JOIN specialties s ON a.specialty_id = s.id
     WHERE a.id = ?`
  ).bind(id).first()
  if (!appt) return c.json({ error: 'Not found' }, 404)
  return c.json({ data: appt })
})

router.post('/', zValidator('json', appointmentSchema), async (c) => {
  const data = c.req.valid('json')
  const user = c.get('user')

  const result = await c.env.DB.prepare(
    `INSERT INTO appointments (patient_id, doctor_id, specialty_id, appointment_date, start_time, end_time, type, reason, notes, created_by)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).bind(data.patient_id, data.doctor_id, data.specialty_id ?? null, data.appointment_date,
    data.start_time, data.end_time, data.type, data.reason ?? null, data.notes ?? null, user.id).run()

  // Create notification
  await c.env.DB.prepare(
    `INSERT INTO notifications (user_id, title, body, type, related_id, related_type)
     VALUES (?, 'Nueva cita agendada', ?, 'appointment', ?, 'appointment')`
  ).bind(user.id, `Cita agendada para el ${data.appointment_date} a las ${data.start_time}`, result.meta.last_row_id).run()

  return c.json({ message: 'Appointment created', id: result.meta.last_row_id }, 201)
})

router.patch('/:id/status', async (c) => {
  const id = parseInt(c.req.param('id'), 10)
  const body = await c.req.json() as { status: string; cancelled_reason?: string }

  const validStatuses = ['payment_pending', 'pending', 'confirmed', 'in_progress', 'completed', 'cancelled', 'no_show']
  if (!validStatuses.includes(body.status)) return c.json({ error: 'Invalid status' }, 400)

  // Fetch appointment info before update
  const appt = await c.env.DB.prepare('SELECT * FROM appointments WHERE id = ?').bind(id).first<{ patient_id: number, doctor_id: number, type: string, appointment_date: string }>()

  await c.env.DB.prepare(
    `UPDATE appointments SET status = ?, cancelled_reason = ?, 
     cancelled_at = CASE WHEN ? = 'cancelled' THEN CURRENT_TIMESTAMP ELSE cancelled_at END,
     updated_at = CURRENT_TIMESTAMP WHERE id = ?`
  ).bind(body.status, body.cancelled_reason ?? null, body.status, id).run()

  // Hook: If status changed to completed, add an entry to medical_history
  if (body.status === 'completed' && appt) {
    await c.env.DB.prepare(
      `INSERT INTO medical_history (patient_id, doctor_id, event_type, event_date, title, description)
       VALUES (?, ?, ?, ?, ?, ?)`
    ).bind(
      appt.patient_id, 
      appt.doctor_id, 
      'consultation', 
      appt.appointment_date, 
      `Consulta ${appt.type}`, 
      `Consulta médica completada.`
    ).run()
  }

  return c.json({ message: 'Status updated' })
})

router.put('/:id', zValidator('json', appointmentSchema.partial()), async (c) => {
  const id = parseInt(c.req.param('id'), 10)
  const data = c.req.valid('json')
  const entries = Object.entries(data).filter(([, v]) => v !== undefined)
  if (entries.length === 0) return c.json({ error: 'No fields' }, 400)

  await c.env.DB.prepare(
    `UPDATE appointments SET ${entries.map(([k]) => `${k} = ?`).join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`
  ).bind(...entries.map(([, v]) => v), id).run()

  return c.json({ message: 'Updated' })
})

router.delete('/:id', async (c) => {
  const id = parseInt(c.req.param('id'), 10)
  const user = c.get('user')
  if (!['admin', 'receptionist'].includes(user.role_name)) return c.json({ error: 'Forbidden' }, 403)
  await c.env.DB.prepare(`UPDATE appointments SET status = 'cancelled', cancelled_at = CURRENT_TIMESTAMP WHERE id = ?`).bind(id).run()
  return c.json({ message: 'Appointment cancelled' })
})

export { router as appointmentsRouter }
