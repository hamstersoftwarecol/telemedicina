/**
 * Prescriptions Routes
 */
import { Hono } from 'hono'
import { Bindings, Variables } from '../types'
import { authMiddleware } from '../middleware/auth'

const router = new Hono<{ Bindings: Bindings; Variables: Variables }>()
router.use('*', authMiddleware)

router.get('/', async (c) => {
  const { patient_id, doctor_id, status, page = '1', limit = '20' } = c.req.query()
  const offset = (parseInt(page, 10) - 1) * parseInt(limit, 10)
  let conds: string[] = []
  const params: (string | number)[] = []
  if (patient_id) { conds.push('pr.patient_id = ?'); params.push(parseInt(patient_id, 10)) }
  if (doctor_id) { conds.push('pr.doctor_id = ?'); params.push(parseInt(doctor_id, 10)) }
  if (status) { conds.push('pr.status = ?'); params.push(status) }
  const where = conds.length ? `WHERE ${conds.join(' AND ')}` : ''
  const rows = await c.env.DB.prepare(
    `SELECT pr.*, p.first_name || ' ' || p.last_name as patient_name,
            d.first_name || ' ' || d.last_name as doctor_name
     FROM prescriptions pr
     LEFT JOIN patients p ON pr.patient_id = p.id
     LEFT JOIN doctors d ON pr.doctor_id = d.id
     ${where} ORDER BY pr.created_at DESC LIMIT ? OFFSET ?`
  ).bind(...params, parseInt(limit, 10), offset).all()
  return c.json({ data: rows.results })
})

router.get('/:id', async (c) => {
  const id = parseInt(c.req.param('id'), 10)
  const rx = await c.env.DB.prepare(
    `SELECT pr.*, p.first_name || ' ' || p.last_name as patient_name, p.document_number,
            p.date_of_birth, p.blood_type, p.allergies,
            d.first_name || ' ' || d.last_name as doctor_name, d.license_number, d.email as doctor_email
     FROM prescriptions pr
     LEFT JOIN patients p ON pr.patient_id = p.id
     LEFT JOIN doctors d ON pr.doctor_id = d.id
     WHERE pr.id = ?`
  ).bind(id).first()
  if (!rx) return c.json({ error: 'Not found' }, 404)
  const items = await c.env.DB.prepare('SELECT * FROM prescription_items WHERE prescription_id = ?').bind(id).all()
  return c.json({ data: { ...rx, items: items.results } })
})

router.post('/', async (c) => {
  const body = await c.req.json() as Record<string, unknown>
  const items = (body.items as Array<Record<string, unknown>>) ?? []

  const r = await c.env.DB.prepare(
    `INSERT INTO prescriptions (consultation_id, patient_id, doctor_id, prescription_date, diagnosis, notes, valid_until)
     VALUES (?, ?, ?, COALESCE(?, date('now')), ?, ?, ?)`
  ).bind(body.consultation_id ?? null, body.patient_id, body.doctor_id,
    body.prescription_date ?? null, body.diagnosis ?? null, body.notes ?? null, body.valid_until ?? null).run()

  const rxId = r.meta.last_row_id
  for (const item of items) {
    await c.env.DB.prepare(
      `INSERT INTO prescription_items (prescription_id, medication_name, generic_name, dosage, frequency, duration, quantity, instructions, route)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).bind(rxId, item.medication_name, item.generic_name ?? null, item.dosage, item.frequency, item.duration,
      item.quantity ?? null, item.instructions ?? null, item.route ?? 'oral').run()
  }

  // Medical history event
  await c.env.DB.prepare(
    `INSERT INTO medical_history (patient_id, event_type, event_date, title, related_prescription_id, doctor_id)
     VALUES (?, 'prescription', date('now'), 'Receta médica emitida', ?, ?)`
  ).bind(body.patient_id, rxId, body.doctor_id).run()

  return c.json({ message: 'Prescription created', id: rxId }, 201)
})

router.patch('/:id/status', async (c) => {
  const id = parseInt(c.req.param('id'), 10)
  const { status } = await c.req.json() as { status: string }
  await c.env.DB.prepare('UPDATE prescriptions SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').bind(status, id).run()
  return c.json({ message: 'Status updated' })
})

export { router as prescriptionsRouter }
