/**
 * Payments Routes
 */
import { Hono } from 'hono'
import { Bindings, Variables } from '../types'
import { authMiddleware } from '../middleware/auth'

const router = new Hono<{ Bindings: Bindings; Variables: Variables }>()
router.use('*', authMiddleware)

router.get('/', async (c) => {
  const { invoice_id } = c.req.query()
  let where = ''
  const params: (string | number)[] = []
  if (invoice_id) { where = 'WHERE p.invoice_id = ?'; params.push(parseInt(invoice_id, 10)) }
  const rows = await c.env.DB.prepare(
    `SELECT p.*, i.invoice_number, i.patient_id FROM payments p LEFT JOIN invoices i ON p.invoice_id = i.id ${where} ORDER BY p.payment_date DESC`
  ).bind(...params).all()
  return c.json({ data: rows.results })
})

router.post('/', async (c) => {
  const user = c.get('user')
  const body = await c.req.json() as Record<string, unknown>
  const r = await c.env.DB.prepare(
    'INSERT INTO payments (invoice_id, payment_date, amount, payment_method, reference, notes, created_by) VALUES (?, COALESCE(?, date(\'now\')), ?, ?, ?, ?, ?)'
  ).bind(body.invoice_id, body.payment_date ?? null, body.amount, body.payment_method, body.reference ?? null, body.notes ?? null, user.id).run()

  // Auto-update invoice to paid if fully paid
  const invoice = await c.env.DB.prepare('SELECT total FROM invoices WHERE id = ?').bind(body.invoice_id).first<{ total: number }>()
  const totalPaid = await c.env.DB.prepare('SELECT COALESCE(SUM(amount), 0) as s FROM payments WHERE invoice_id = ?').bind(body.invoice_id).first<{ s: number }>()
  if (invoice && totalPaid && totalPaid.s >= invoice.total) {
    await c.env.DB.prepare('UPDATE invoices SET status = \'paid\', updated_at = CURRENT_TIMESTAMP WHERE id = ?').bind(body.invoice_id).run()
  }

  return c.json({ message: 'Payment recorded', id: r.meta.last_row_id }, 201)
})

export { router as paymentsRouter }
