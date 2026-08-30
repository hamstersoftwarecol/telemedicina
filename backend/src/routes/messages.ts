/**
 * Messages Routes — Internal chat with polling
 */
import { Hono } from 'hono'
import { Bindings, Variables } from '../types'
import { authMiddleware } from '../middleware/auth'

const router = new Hono<{ Bindings: Bindings; Variables: Variables }>()
router.use('*', authMiddleware)

// List users available to message
router.get('/users', async (c) => {
  const user = c.get('user')
  const rows = await c.env.DB.prepare(
    `SELECT id, first_name, last_name, email FROM users WHERE id != ? AND is_active = 1 ORDER BY first_name`
  ).bind(user.id).all()
  return c.json({ data: rows.results })
})

// List conversations for current user
router.get('/conversations', async (c) => {
  const user = c.get('user')
  const rows = await c.env.DB.prepare(
    `SELECT cv.*, 
            (SELECT m.content FROM messages m WHERE m.conversation_id = cv.id ORDER BY m.created_at DESC LIMIT 1) as last_message,
            (SELECT m.created_at FROM messages m WHERE m.conversation_id = cv.id ORDER BY m.created_at DESC LIMIT 1) as last_message_at,
            (SELECT COUNT(*) FROM messages m WHERE m.conversation_id = cv.id AND m.sender_id != ? 
             AND m.created_at > COALESCE((SELECT cp2.last_read_at FROM conversation_participants cp2 WHERE cp2.conversation_id = cv.id AND cp2.user_id = ?), '1970-01-01')) as unread_count
     FROM conversations cv
     INNER JOIN conversation_participants cp ON cp.conversation_id = cv.id AND cp.user_id = ?
     ORDER BY last_message_at DESC`
  ).bind(user.id, user.id, user.id).all()
  return c.json({ data: rows.results })
})

router.post('/conversations', async (c) => {
  const user = c.get('user')
  const body = await c.req.json() as { participant_ids: number[]; title?: string }
  const r = await c.env.DB.prepare(
    'INSERT INTO conversations (title, type, created_by) VALUES (?, ?, ?)'
  ).bind(body.title ?? null, body.participant_ids.length > 1 ? 'group' : 'direct', user.id).run()
  const cvId = r.meta.last_row_id
  const participants = Array.from(new Set([user.id, ...body.participant_ids]))
  for (const pid of participants) {
    await c.env.DB.prepare('INSERT OR IGNORE INTO conversation_participants (conversation_id, user_id) VALUES (?, ?)').bind(cvId, pid).run()
  }
  return c.json({ message: 'Conversation created', id: cvId }, 201)
})

router.get('/conversations/:id/messages', async (c) => {
  const convId = parseInt(c.req.param('id'), 10)
  const user = c.get('user')
  const { since, limit = '50' } = c.req.query()

  let query = `SELECT m.*, u.first_name || ' ' || u.last_name as sender_name, u.avatar_url as sender_avatar
               FROM messages m LEFT JOIN users u ON m.sender_id = u.id
               WHERE m.conversation_id = ?`
  const params: (string | number)[] = [convId]
  if (since) { query += ' AND m.created_at > ?'; params.push(since) }
  query += ' ORDER BY m.created_at DESC LIMIT ?'
  params.push(parseInt(limit, 10))

  const rows = await c.env.DB.prepare(query).bind(...params).all()

  // Mark as read
  await c.env.DB.prepare(
    'UPDATE conversation_participants SET last_read_at = CURRENT_TIMESTAMP WHERE conversation_id = ? AND user_id = ?'
  ).bind(convId, user.id).run()

  return c.json({ data: rows.results.reverse() })
})

router.post('/conversations/:id/messages', async (c) => {
  const convId = parseInt(c.req.param('id'), 10)
  const user = c.get('user')
  const body = await c.req.json() as { content: string; message_type?: string }

  const r = await c.env.DB.prepare(
    'INSERT INTO messages (conversation_id, sender_id, content, message_type) VALUES (?, ?, ?, ?)'
  ).bind(convId, user.id, body.content, body.message_type ?? 'text').run()

  // Update conversation updated_at
  await c.env.DB.prepare('UPDATE conversations SET updated_at = CURRENT_TIMESTAMP WHERE id = ?').bind(convId).run()

  return c.json({ message: 'Message sent', id: r.meta.last_row_id }, 201)
})

export { router as messagesRouter }
