/**
 * Invoices Routes
 */
import { Hono } from 'hono'
import { Bindings, Variables } from '../types'
import { authMiddleware } from '../middleware/auth'

const router = new Hono<{ Bindings: Bindings; Variables: Variables }>()
router.use('*', authMiddleware)

router.get('/', async (c) => {
  const { patient_id, status, from, to, page = '1', limit = '20' } = c.req.query()
  const offset = (parseInt(page, 10) - 1) * parseInt(limit, 10)
  let conds: string[] = []
  const params: (string | number)[] = []
  if (patient_id) { conds.push('i.patient_id = ?'); params.push(parseInt(patient_id, 10)) }
  if (status) { conds.push('i.status = ?'); params.push(status) }
  if (from) { conds.push('i.issue_date >= ?'); params.push(from) }
  if (to) { conds.push('i.issue_date <= ?'); params.push(to) }
  const where = conds.length ? `WHERE ${conds.join(' AND ')}` : ''
  const rows = await c.env.DB.prepare(
    `SELECT i.*, p.first_name || ' ' || p.last_name as patient_name,
            COALESCE(SUM(pay.amount), 0) as paid_amount
     FROM invoices i LEFT JOIN patients p ON i.patient_id = p.id
     LEFT JOIN payments pay ON pay.invoice_id = i.id
     ${where} GROUP BY i.id ORDER BY i.issue_date DESC LIMIT ? OFFSET ?`
  ).bind(...params, parseInt(limit, 10), offset).all()
  const count = await c.env.DB.prepare(`SELECT COUNT(*) as t FROM invoices i ${where}`).bind(...params).first<{ t: number }>()
  return c.json({ data: rows.results, pagination: { page: parseInt(page, 10), total: count?.t ?? 0 } })
})

router.get('/:id', async (c) => {
  const id = parseInt(c.req.param('id'), 10)
  const inv = await c.env.DB.prepare(
    `SELECT i.*, p.first_name || ' ' || p.last_name as patient_name, p.email as patient_email,
            p.document_number, p.insurance_provider
     FROM invoices i LEFT JOIN patients p ON i.patient_id = p.id WHERE i.id = ?`
  ).bind(id).first()
  if (!inv) return c.json({ error: 'Not found' }, 404)
  const items = await c.env.DB.prepare('SELECT * FROM invoice_items WHERE invoice_id = ?').bind(id).all()
  const payments = await c.env.DB.prepare('SELECT * FROM payments WHERE invoice_id = ? ORDER BY payment_date DESC').bind(id).all()
  return c.json({ data: { ...inv, items: items.results, payments: payments.results } })
})

router.post('/', async (c) => {
  const user = c.get('user')
  const body = await c.req.json() as Record<string, unknown>
  const items = (body.items as Array<Record<string, unknown>>) ?? []

  // Generate invoice number
  const count = await c.env.DB.prepare('SELECT COUNT(*) as c FROM invoices').first<{ c: number }>()
  const invoiceNumber = `FAC-${new Date().getFullYear()}-${String((count?.c ?? 0) + 1).padStart(4, '0')}`

  const subtotal = items.reduce((s, item) => s + (Number(item.unit_price) * Number(item.quantity ?? 1)), 0)
  const taxRate = Number(body.tax_rate ?? 0)
  const taxAmount = subtotal * (taxRate / 100)
  const discountAmount = Number(body.discount_amount ?? 0)
  const total = subtotal + taxAmount - discountAmount

  const r = await c.env.DB.prepare(
    `INSERT INTO invoices (invoice_number, patient_id, consultation_id, appointment_id, issue_date, due_date,
      subtotal, tax_rate, tax_amount, discount_amount, total, notes, created_by)
     VALUES (?, ?, ?, ?, COALESCE(?, date('now')), ?, ?, ?, ?, ?, ?, ?, ?)`
  ).bind(invoiceNumber, body.patient_id, body.consultation_id ?? null, body.appointment_id ?? null,
    body.issue_date ?? null, body.due_date ?? null, subtotal, taxRate, taxAmount, discountAmount,
    total, body.notes ?? null, user.id).run()

  const invId = r.meta.last_row_id
  for (const item of items) {
    const itemTotal = Number(item.unit_price) * Number(item.quantity ?? 1)
    await c.env.DB.prepare(
      'INSERT INTO invoice_items (invoice_id, description, quantity, unit_price, total) VALUES (?, ?, ?, ?, ?)'
    ).bind(invId, item.description, item.quantity ?? 1, item.unit_price, itemTotal).run()
  }

  return c.json({ message: 'Invoice created', id: invId, invoice_number: invoiceNumber }, 201)
})

router.patch('/:id/status', async (c) => {
  const id = parseInt(c.req.param('id'), 10)
  const { status } = await c.req.json() as { status: string }
  await c.env.DB.prepare('UPDATE invoices SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').bind(status, id).run()
  return c.json({ message: 'Status updated' })
})

export { router as invoicesRouter }
