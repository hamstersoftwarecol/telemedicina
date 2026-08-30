/**
 * Auth middleware — validates JWT and injects user into context
 */

import { Context, Next } from 'hono'
import { Bindings, Variables } from '../types'
import { verifyToken, extractBearerToken } from '../utils/jwt'

type AppContext = Context<{ Bindings: Bindings; Variables: Variables }>

export async function authMiddleware(c: AppContext, next: Next) {
  const token = extractBearerToken(c.req.header('Authorization'))
  
  if (!token) {
    return c.json({ error: 'Unauthorized', message: 'No token provided' }, 401)
  }
  
  const payload = await verifyToken(token, c.env.JWT_SECRET)
  
  if (!payload) {
    return c.json({ error: 'Unauthorized', message: 'Invalid or expired token' }, 401)
  }
  
  // Fetch user from DB to ensure they're still active
  const user = await c.env.DB.prepare(
    `SELECT u.id, u.email, u.first_name, u.last_name, u.role_id, r.name as role_name, u.is_active
     FROM users u JOIN roles r ON u.role_id = r.id
     WHERE u.id = ? AND u.is_active = 1`
  ).bind(Number(payload.sub)).first<{
    id: number; email: string; first_name: string; last_name: string
    role_id: number; role_name: string; is_active: number
  }>()
  
  if (!user) {
    return c.json({ error: 'Unauthorized', message: 'User not found or inactive' }, 401)
  }
  
  c.set('user', user)
  return next()
}

export function requireRole(...roles: string[]) {
  return async (c: AppContext, next: Next) => {
    const user = c.get('user')
    if (!user || !roles.includes(user.role_name)) {
      return c.json({ error: 'Forbidden', message: 'Insufficient permissions' }, 403)
    }
    return next()
  }
}
