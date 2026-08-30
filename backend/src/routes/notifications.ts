/**
 * Notifications Routes
 */
import { Hono } from 'hono'
import { Bindings, Variables } from '../types'
import { authMiddleware } from '../middleware/auth'

const router = new Hono<{ Bindings: Bindings; Variables: Variables }>()
router.use('*', authMiddleware)

router.get('/', async (c) => {
  const user = c.get('user')
  const { is_read, limit = '20' } = c.req.query()
  let where = 'WHERE n.user_id = ?'
  const params: (string | number)[] = [user.id]
  if (is_read !== undefined) { where += ' AND n.is_read = ?'; params.push(parseInt(is_read, 10)) }
  const rows = await c.env.DB.prepare(
    `SELECT * FROM notifications n ${where} ORDER BY n.created_at DESC LIMIT ?`
  ).bind(...params, parseInt(limit, 10)).all()
  const unread = await c.env.DB.prepare('SELECT COUNT(*) as c FROM notifications WHERE user_id = ? AND is_read = 0').bind(user.id).first<{ c: number }>()
  return c.json({ data: rows.results, unread_count: unread?.c ?? 0 })
})

router.patch('/:id/read', async (c) => {
  const user = c.get('user')
  await c.env.DB.prepare(
    'UPDATE notifications SET is_read = 1, read_at = CURRENT_TIMESTAMP WHERE id = ? AND user_id = ?'
  ).bind(parseInt(c.req.param('id'), 10), user.id).run()
  return c.json({ message: 'Marked as read' })
})

router.patch('/read-all', async (c) => {
  const user = c.get('user')
  await c.env.DB.prepare(
    'UPDATE notifications SET is_read = 1, read_at = CURRENT_TIMESTAMP WHERE user_id = ? AND is_read = 0'
  ).bind(user.id).run()
  return c.json({ message: 'All notifications marked as read' })
})

router.delete('/:id', async (c) => {
  const user = c.get('user')
  await c.env.DB.prepare('DELETE FROM notifications WHERE id = ? AND user_id = ?').bind(parseInt(c.req.param('id'), 10), user.id).run()
  return c.json({ message: 'Deleted' })
})

export { router as notificationsRouter }
