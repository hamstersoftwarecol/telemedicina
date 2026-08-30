/**
 * Exams Routes — R2 file upload/download
 */
import { Hono } from 'hono'
import { Bindings, Variables } from '../types'
import { authMiddleware } from '../middleware/auth'

const router = new Hono<{ Bindings: Bindings; Variables: Variables }>()
router.use('*', authMiddleware)

router.get('/', async (c) => {
  const { patient_id, exam_type, status } = c.req.query()
  let conds: string[] = []
  const params: (string | number)[] = []
  if (patient_id) { conds.push('e.patient_id = ?'); params.push(parseInt(patient_id, 10)) }
  if (exam_type) { conds.push('e.exam_type = ?'); params.push(exam_type) }
  if (status) { conds.push('e.status = ?'); params.push(status) }
  const where = conds.length ? `WHERE ${conds.join(' AND ')}` : ''
  const rows = await c.env.DB.prepare(
    `SELECT e.*, p.first_name || ' ' || p.last_name as patient_name,
            d.first_name || ' ' || d.last_name as doctor_name
     FROM exams e LEFT JOIN patients p ON e.patient_id = p.id
     LEFT JOIN doctors d ON e.doctor_id = d.id
     ${where} ORDER BY e.exam_date DESC`
  ).bind(...params).all()
  return c.json({ data: rows.results })
})

router.get('/:id', async (c) => {
  const id = parseInt(c.req.param('id'), 10)
  const exam = await c.env.DB.prepare('SELECT * FROM exams WHERE id = ?').bind(id).first()
  if (!exam) return c.json({ error: 'Not found' }, 404)
  return c.json({ data: exam })
})

/**
 * POST /api/exams — Upload file to R2
 */
router.post('/', async (c) => {
  const user = c.get('user')
  const formData = await c.req.formData()

  const file = formData.get('file') as File | null
  const patient_id = formData.get('patient_id') as string
  const exam_name = formData.get('exam_name') as string
  const exam_type = formData.get('exam_type') as string
  const exam_date = formData.get('exam_date') as string

  if (!file || !patient_id || !exam_name) {
    return c.json({ error: 'file, patient_id, and exam_name are required' }, 400)
  }

  const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp']
  if (!allowedTypes.includes(file.type)) {
    return c.json({ error: 'File type not allowed. Use PDF, JPG, or PNG' }, 400)
  }

  const maxSize = 10 * 1024 * 1024 // 10MB
  if (file.size > maxSize) {
    return c.json({ error: 'File too large. Max 10MB' }, 400)
  }

  const ext = file.name.split('.').pop()
  const r2Key = `exams/${patient_id}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`

  await c.env.R2.put(r2Key, await file.arrayBuffer(), {
    httpMetadata: { contentType: file.type },
    customMetadata: { patient_id, exam_name, uploaded_by: String(user.id) }
  })

  const fileType = file.type.includes('pdf') ? 'pdf' : file.type.includes('png') ? 'png' : 'jpg'

  const r = await c.env.DB.prepare(
    `INSERT INTO exams (patient_id, exam_type, exam_name, exam_date, r2_key, file_name, file_type, file_size_bytes, status)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'completed')`
  ).bind(parseInt(patient_id, 10), exam_type ?? 'other', exam_name, exam_date ?? new Date().toISOString().split('T')[0],
    r2Key, file.name, fileType, file.size).run()

  return c.json({ message: 'Exam uploaded', id: r.meta.last_row_id, r2_key: r2Key }, 201)
})

/**
 * GET /api/exams/:id/download — Generate presigned URL or stream from R2
 */
router.get('/:id/download', async (c) => {
  const id = parseInt(c.req.param('id'), 10)
  const exam = await c.env.DB.prepare('SELECT * FROM exams WHERE id = ?').bind(id).first<{ r2_key: string; file_name: string; file_type: string }>()
  if (!exam) return c.json({ error: 'Not found' }, 404)

  const obj = await c.env.R2.get(exam.r2_key)
  if (!obj) return c.json({ error: 'File not found in storage' }, 404)

  const contentType = exam.file_type === 'pdf' ? 'application/pdf'
    : exam.file_type === 'png' ? 'image/png' : 'image/jpeg'

  return new Response(obj.body, {
    headers: {
      'Content-Type': contentType,
      'Content-Disposition': `attachment; filename="${exam.file_name}"`,
      'Cache-Control': 'private, max-age=3600',
    }
  })
})

router.delete('/:id', async (c) => {
  const id = parseInt(c.req.param('id'), 10)
  const exam = await c.env.DB.prepare('SELECT r2_key FROM exams WHERE id = ?').bind(id).first<{ r2_key: string }>()
  if (!exam) return c.json({ error: 'Not found' }, 404)
  await c.env.R2.delete(exam.r2_key)
  await c.env.DB.prepare('DELETE FROM exams WHERE id = ?').bind(id).run()
  return c.json({ message: 'Exam deleted' })
})

export { router as examsRouter }
