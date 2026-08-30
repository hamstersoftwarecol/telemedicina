/**
 * Specialties, Appointments, Consultations, Prescriptions, Exams,
 * Medical History, Invoices, Payments, Messages, Notifications,
 * Reports, Settings, Users routes
 */

// ─── SPECIALTIES ────────────────────────────────────────────────────────────
import { Hono } from 'hono'
import { Bindings, Variables } from '../types'
import { authMiddleware } from '../middleware/auth'

// Specialties
const specialtiesHono = new Hono<{ Bindings: Bindings; Variables: Variables }>()
specialtiesHono.use('*', authMiddleware)

specialtiesHono.get('/', async (c) => {
  const { is_active } = c.req.query()
  let query = 'SELECT s.*, COUNT(d.id) as doctor_count FROM specialties s LEFT JOIN doctors d ON d.specialty_id = s.id AND d.is_active = 1'
  const params: (string | number)[] = []
  if (is_active !== undefined) { query += ` WHERE s.is_active = ?`; params.push(parseInt(is_active, 10)) }
  query += ' GROUP BY s.id ORDER BY s.name'
  const results = await c.env.DB.prepare(query).bind(...params).all()
  return c.json({ data: results.results })
})

specialtiesHono.get('/:id', async (c) => {
  const s = await c.env.DB.prepare('SELECT * FROM specialties WHERE id = ?').bind(parseInt(c.req.param('id'), 10)).first()
  if (!s) return c.json({ error: 'Not found' }, 404)
  return c.json({ data: s })
})

specialtiesHono.post('/', async (c) => {
  const user = c.get('user')
  if (user.role_name !== 'admin') return c.json({ error: 'Forbidden' }, 403)
  const body = await c.req.json() as { name: string; description?: string; color?: string; icon?: string; doctor_ids?: number[] }
  const r = await c.env.DB.prepare(
    'INSERT INTO specialties (name, description, color, icon) VALUES (?, ?, ?, ?)'
  ).bind(body.name, body.description ?? null, body.color ?? '#3B82F6', body.icon ?? null).run()
  
  const newId = r.meta.last_row_id;
  if (body.doctor_ids && body.doctor_ids.length > 0) {
    const placeholders = body.doctor_ids.map(() => '?').join(',')
    await c.env.DB.prepare(`UPDATE doctors SET specialty_id = ? WHERE id IN (${placeholders})`).bind(newId, ...body.doctor_ids).run()
  }
  
  return c.json({ message: 'Specialty created', id: newId }, 201)
})

specialtiesHono.put('/:id', async (c) => {
  const user = c.get('user')
  if (user.role_name !== 'admin') return c.json({ error: 'Forbidden' }, 403)
  const id = parseInt(c.req.param('id'), 10)
  const body = await c.req.json() as Record<string, unknown>
  const doctor_ids = body.doctor_ids as number[] | undefined;
  delete body.doctor_ids;
  
  const entries = Object.entries(body).filter(([, v]) => v !== undefined)
  if (entries.length > 0) {
    await c.env.DB.prepare(
      `UPDATE specialties SET ${entries.map(([k]) => `${k} = ?`).join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`
    ).bind(...entries.map(([, v]) => v), id).run()
  }
  
  if (doctor_ids && doctor_ids.length > 0) {
    const placeholders = doctor_ids.map(() => '?').join(',')
    await c.env.DB.prepare(`UPDATE doctors SET specialty_id = ? WHERE id IN (${placeholders})`).bind(id, ...doctor_ids).run()
  }
  
  return c.json({ message: 'Updated' })
})

specialtiesHono.delete('/:id', async (c) => {
  const user = c.get('user')
  if (user.role_name !== 'admin') return c.json({ error: 'Forbidden' }, 403)
  await c.env.DB.prepare('UPDATE specialties SET is_active = 0 WHERE id = ?').bind(parseInt(c.req.param('id'), 10)).run()
  return c.json({ message: 'Deleted' })
})

export { specialtiesHono as specialtiesRouter }
