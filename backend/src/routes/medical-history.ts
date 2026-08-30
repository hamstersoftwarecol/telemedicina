/**
 * Medical History Routes — Timeline
 */
import { Hono } from 'hono'
import { Bindings, Variables } from '../types'
import { authMiddleware } from '../middleware/auth'

const router = new Hono<{ Bindings: Bindings; Variables: Variables }>()
router.use('*', authMiddleware)

router.get('/', async (c) => {
  const { patient_id, event_type, from, to, page = '1', limit = '50' } = c.req.query()
  let conds: string[] = []
  const params: (string | number)[] = []
  if (patient_id) { conds.push('mh.patient_id = ?'); params.push(parseInt(patient_id, 10)) }
  if (event_type) { conds.push('mh.event_type = ?'); params.push(event_type) }
  if (from) { conds.push('mh.event_date >= ?'); params.push(from) }
  if (to) { conds.push('mh.event_date <= ?'); params.push(to) }
  const where = conds.length ? `WHERE ${conds.join(' AND ')}` : ''
  const offset = (parseInt(page, 10) - 1) * parseInt(limit, 10)
  const rows = await c.env.DB.prepare(
    `SELECT mh.*, d.first_name || ' ' || d.last_name as doctor_name
     FROM medical_history mh LEFT JOIN doctors d ON mh.doctor_id = d.id
     ${where} ORDER BY mh.event_date DESC, mh.created_at DESC LIMIT ? OFFSET ?`
  ).bind(...params, parseInt(limit, 10), offset).all()
  const count = await c.env.DB.prepare(`SELECT COUNT(*) as t FROM medical_history mh ${where}`).bind(...params).first<{ t: number }>()
  return c.json({ data: rows.results, pagination: { page: parseInt(page, 10), total: count?.t ?? 0 } })
})

router.post('/', async (c) => {
  const body = await c.req.json() as Record<string, unknown>
  const r = await c.env.DB.prepare(
    `INSERT INTO medical_history (patient_id, event_type, event_date, title, description, doctor_id) VALUES (?, ?, ?, ?, ?, ?)`
  ).bind(body.patient_id, body.event_type, body.event_date, body.title, body.description ?? null, body.doctor_id ?? null).run()
  return c.json({ message: 'Event added', id: r.meta.last_row_id }, 201)
})

export { router as medicalHistoryRouter }
