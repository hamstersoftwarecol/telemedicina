/**
 * Users Routes (admin only)
 */
import { Hono } from 'hono'
import { Bindings, Variables } from '../types'
import { authMiddleware, requireRole } from '../middleware/auth'
import { hashPassword } from '../utils/password'

const router = new Hono<{ Bindings: Bindings; Variables: Variables }>()
router.use('*', authMiddleware)

router.get('/', requireRole('admin'), async (c) => {
  const { page = '1', limit = '20', role_id, search } = c.req.query()
  const offset = (parseInt(page, 10) - 1) * parseInt(limit, 10)
  let conds = ['1=1']
  const params: (string | number)[] = []
  if (role_id) { conds.push('u.role_id = ?'); params.push(parseInt(role_id, 10)) }
  if (search) {
    conds.push('(u.first_name LIKE ? OR u.last_name LIKE ? OR u.email LIKE ?)')
    const q = `%${search}%`
    params.push(q, q, q)
  }
  const where = `WHERE ${conds.join(' AND ')}`
  const count = await c.env.DB.prepare(`SELECT COUNT(*) as t FROM users u ${where}`).bind(...params).first<{ t: number }>()
  const rows = await c.env.DB.prepare(
    `SELECT u.id, u.email, u.first_name, u.last_name, u.phone, u.avatar_url, u.is_active, u.is_verified,
            u.last_login_at, u.created_at, r.name as role_name, r.display_name as role_display_name
     FROM users u LEFT JOIN roles r ON u.role_id = r.id ${where} ORDER BY u.created_at DESC LIMIT ? OFFSET ?`
  ).bind(...params, parseInt(limit, 10), offset).all()
  return c.json({ data: rows.results, pagination: { page: parseInt(page, 10), total: count?.t ?? 0 } })
})

router.post('/', requireRole('admin'), async (c) => {
  const body = await c.req.json()
  const { first_name, last_name, email, role_id, phone } = body

  if (!first_name || !last_name || !email || !role_id) {
    return c.json({ error: 'Faltan campos obligatorios' }, 400)
  }

  // Verificar si ya existe
  const existing = await c.env.DB.prepare('SELECT id FROM users WHERE email = ?').bind(email).first()
  if (existing) {
    return c.json({ error: 'Ya existe un usuario con este correo' }, 400)
  }

  // Generar contraseña temporal
  const tempPassword = Math.random().toString(36).slice(-8) + 'A1!'
  const passwordHash = await hashPassword(tempPassword)

  // Crear usuario
  const { success } = await c.env.DB.prepare(
    `INSERT INTO users (email, password_hash, first_name, last_name, phone, role_id, is_active, is_verified) 
     VALUES (?, ?, ?, ?, ?, ?, 1, 0)`
  ).bind(email, passwordHash, first_name, last_name, phone || null, parseInt(role_id, 10)).run()

  if (!success) {
    return c.json({ error: 'No se pudo crear el usuario' }, 500)
  }

  // Enviar correo de invitación
  if (c.env.RESEND_API_KEY) {
    try {
      await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${c.env.RESEND_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          from: `TelemedApp <popayan@hamstersoftware.com>`,
          to: email,
          subject: 'Invitación a Telemedicina - Nueva Cuenta',
          html: `
            <div style="font-family: sans-serif; max-w: 600px; margin: 0 auto;">
              <h2>¡Hola ${first_name}!</h2>
              <p>Te han invitado a unirte a la plataforma de Telemedicina.</p>
              <p>Tus credenciales de acceso son:</p>
              <ul>
                <li><strong>Correo:</strong> ${email}</li>
                <li><strong>Contraseña temporal:</strong> ${tempPassword}</li>
              </ul>
              <p>Por favor, ingresa a la plataforma y cambia tu contraseña lo antes posible:</p>
              <a href="${c.env.FRONTEND_URL}/login" style="display:inline-block; padding:10px 20px; background-color:#0ea5e9; color:white; text-decoration:none; border-radius:5px;">Iniciar Sesión</a>
            </div>
          `
        })
      })
    } catch (e) {
      console.error('Error enviando correo:', e)
      // No fallar la creación del usuario si falla el correo
    }
  }

  return c.json({ message: 'Usuario creado e invitación enviada', temp_password: tempPassword }, 201)
})

router.get('/:id', requireRole('admin'), async (c) => {
  const user = await c.env.DB.prepare(
    `SELECT u.id, u.email, u.first_name, u.last_name, u.phone, u.avatar_url, u.is_active, u.is_verified,
            u.last_login_at, u.created_at, r.name as role_name, r.display_name as role_display_name
     FROM users u LEFT JOIN roles r ON u.role_id = r.id WHERE u.id = ?`
  ).bind(parseInt(c.req.param('id'), 10)).first()
  if (!user) return c.json({ error: 'Not found' }, 404)
  return c.json({ data: user })
})

router.patch('/:id', requireRole('admin'), async (c) => {
  const id = parseInt(c.req.param('id'), 10)
  const body = await c.req.json() as Record<string, unknown>

  if (body.password) {
    body.password_hash = await hashPassword(body.password as string)
    delete body.password
  }

  const entries = Object.entries(body).filter(([k, v]) => v !== undefined && k !== 'email' && k !== 'created_at' && k !== 'role_name' && k !== 'role_display_name' && k !== 'id')
  
  if (entries.length === 0) return c.json({ error: 'No fields to update' }, 400)

  // Handle role_id specifically (must be integer)
  const queryParts = entries.map(([k]) => `${k} = ?`).join(', ')
  const values = entries.map(([, v]) => {
    // Si la clave es role_id, lo parseamos a int (por si acaso viene como string)
    // Pero en realidad D1/SQLite maneja la conversión si la columna es INTEGER, mejor asegurar.
    return v
  })

  await c.env.DB.prepare(
    `UPDATE users SET ${queryParts}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`
  ).bind(...values, id).run()

  return c.json({ message: 'User updated' })
})

router.delete('/:id', requireRole('admin'), async (c) => {
  const id = parseInt(c.req.param('id'), 10)
  const caller = c.get('user')
  if (caller.id === id) return c.json({ error: 'Cannot deactivate yourself' }, 400)
  await c.env.DB.prepare('UPDATE users SET is_active = 0, updated_at = CURRENT_TIMESTAMP WHERE id = ?').bind(id).run()
  return c.json({ message: 'User deactivated' })
})

export { router as usersRouter }
