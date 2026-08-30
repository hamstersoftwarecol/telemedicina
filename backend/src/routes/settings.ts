/**
 * Settings Routes
 */
import { Hono } from 'hono'
import { Bindings, Variables } from '../types'
import { authMiddleware, requireRole } from '../middleware/auth'

const router = new Hono<{ Bindings: Bindings; Variables: Variables }>()
router.use('*', authMiddleware)

router.get('/', async (c) => {
  const rows = await c.env.DB.prepare('SELECT key, value, type, description FROM settings ORDER BY key').all()
  // Convert to key-value object
  const settings: Record<string, unknown> = {}
  for (const row of rows.results as Array<{ key: string; value: string; type: string }>) {
    if (row.type === 'number') settings[row.key] = Number(row.value)
    else if (row.type === 'boolean') settings[row.key] = row.value === 'true'
    else if (row.type === 'json') { try { settings[row.key] = JSON.parse(row.value) } catch { settings[row.key] = row.value } }
    else settings[row.key] = row.value
  }
  return c.json({ data: settings, raw: rows.results })
})

router.put('/', requireRole('admin'), async (c) => {
  const user = c.get('user')
  const body = await c.req.json() as Record<string, unknown>
  for (const [key, value] of Object.entries(body)) {
    await c.env.DB.prepare(
      `INSERT INTO settings (key, value, updated_by, updated_at) VALUES (?, ?, ?, CURRENT_TIMESTAMP)
       ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_by = excluded.updated_by, updated_at = CURRENT_TIMESTAMP`
    ).bind(key, String(value), user.id).run()
  }
  return c.json({ message: 'Settings updated' })
})

router.get('/:key', async (c) => {
  const key = c.req.param('key')
  const row = await c.env.DB.prepare('SELECT * FROM settings WHERE key = ?').bind(key).first()
  if (!row) return c.json({ error: 'Setting not found' }, 404)
  return c.json({ data: row })
})

export { router as settingsRouter }
