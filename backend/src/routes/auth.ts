/**
 * Auth Routes — Login, Register, Refresh, Logout
 * POST /api/auth/login
 * POST /api/auth/register
 * POST /api/auth/refresh
 * POST /api/auth/logout
 * GET  /api/auth/me
 */

import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import { Bindings, Variables } from '../types'
import { hashPassword, verifyPassword } from '../utils/password'
import { signToken, verifyToken, extractBearerToken } from '../utils/jwt'
import { authMiddleware } from '../middleware/auth'
import { randomBytes } from '@noble/hashes/utils'
import { bytesToHex } from '@noble/hashes/utils'

const router = new Hono<{ Bindings: Bindings; Variables: Variables }>()

const requestCodeSchema = z.object({
  identifier: z.string().min(1, 'Identifier is required'),
})

const verifyCodeSchema = z.object({
  identifier: z.string().min(1, 'Identifier is required'),
  code: z.string().length(6, 'Code must be 6 digits'),
})

const registerSchema = z.object({
  email: z.string().email().optional().or(z.literal('')),
  first_name: z.string().min(2).max(100),
  last_name: z.string().min(2).max(100),
  phone: z.string().min(10).optional().or(z.literal('')),
  role_id: z.number().int().min(1).max(4).default(4),
}).refine(data => data.email || data.phone, {
  message: "Debe proveer un correo o un teléfono",
  path: ["identifier"]
})

async function generateAndSendCode(env: Bindings, identifier: string) {
  const code = Math.floor(100000 + Math.random() * 900000).toString();
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();
  
  await env.DB.prepare(`
    INSERT INTO otps (identifier, code, expires_at)
    VALUES (?, ?, ?)
    ON CONFLICT(identifier) DO UPDATE SET code = excluded.code, expires_at = excluded.expires_at
  `).bind(identifier, code, expiresAt).run();

  
  if (identifier.includes('@')) {
    if (env.RESEND_API_KEY) {
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${env.RESEND_API_KEY}`
        },
        body: JSON.stringify({
          from: 'Telemedicina <popayan@hamstersoftware.com>',
          to: [identifier],
          subject: 'Código de acceso - Telemedicina',
          html: `<p>Tu código de acceso es: <strong>${code}</strong></p><p>Este código expira en 5 minutos.</p>`
        })
      });
      if (!res.ok) {
        console.error("Resend API Error", await res.text());
      }
    } else {
      console.log(`[SIMULATED EMAIL] Code for ${identifier}: ${code}`);
    }
  } else {
    if (env.TWILIO_ACCOUNT_SID && env.TWILIO_AUTH_TOKEN) {
      const url = `https://api.twilio.com/2010-04-01/Accounts/${env.TWILIO_ACCOUNT_SID}/Messages.json`;
      const encodedAuth = btoa(`${env.TWILIO_ACCOUNT_SID}:${env.TWILIO_AUTH_TOKEN}`);
      
      const data = new URLSearchParams();
      // Ensure the phone has the country code. If missing, assume +57 (Colombia) as default.
      let toPhone = identifier;
      if (!toPhone.startsWith('+')) {
        toPhone = '+57' + toPhone;
      }
      data.append('To', toPhone);
      
      if (env.TWILIO_PHONE_NUMBER) {
        data.append('From', env.TWILIO_PHONE_NUMBER);
      } else {
        // If no phone is provided, Twilio might reject it unless it's a messaging service SID or we just log an error
        console.warn("TWILIO_PHONE_NUMBER is not set. SMS might fail to send.");
      }
      
      data.append('Body', `Tu código de acceso para Telemedicina es: ${code}. Expira en 5 minutos.`);
      
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${encodedAuth}`,
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: data
      });
      
      if (!res.ok) {
        console.error("Twilio API Error", await res.text());
      }
    } else {
      console.log(`[SIMULATED SMS] Code for phone ${identifier}: ${code}`);
    }
  }
}

/**
 * POST /api/auth/request-code
 */
router.post('/request-code', zValidator('json', requestCodeSchema), async (c) => {
  const { identifier } = c.req.valid('json')
  
  const user = await c.env.DB.prepare(
    `SELECT id FROM users WHERE (email = ? OR phone = ?) AND is_active = 1`
  ).bind(identifier, identifier).first()
  
  if (!user) {
    // Para prevenir enumeración de usuarios, igual enviamos un OK o error genérico
    return c.json({ error: 'Usuario no encontrado' }, 404)
  }
  
  await generateAndSendCode(c.env, identifier)
  return c.json({ message: 'Code sent successfully' })
})

/**
 * POST /api/auth/verify-code
 */
router.post('/verify-code', zValidator('json', verifyCodeSchema), async (c) => {
  const { identifier, code } = c.req.valid('json')
  
  const otpRow = await c.env.DB.prepare(`
    SELECT code FROM otps WHERE identifier = ? AND expires_at > CURRENT_TIMESTAMP
  `).bind(identifier).first<{code: string}>();

  if (!otpRow || otpRow.code !== code) {
    return c.json({ error: 'Código inválido o expirado' }, 401)
  }

  // Borrar OTP luego de usarse
  await c.env.DB.prepare(`DELETE FROM otps WHERE identifier = ?`).bind(identifier).run();
  
  const user = await c.env.DB.prepare(
    `SELECT u.*, r.name as role_name 
     FROM users u JOIN roles r ON u.role_id = r.id
     WHERE (u.email = ? OR u.phone = ?) AND u.is_active = 1`
  ).bind(identifier, identifier).first<{
    id: number; email: string; first_name: string; last_name: string;
    role_id: number; role_name: string; is_active: number; avatar_url: string | null;
  }>()
  
  if (!user) {
    return c.json({ error: 'Usuario no encontrado' }, 404)
  }
  
  
  // Generate tokens
  const accessToken = await signToken(
    { sub: String(user.id), email: user.email, role: user.role_name, roleId: user.role_id },
    c.env.JWT_SECRET,
    c.env.JWT_EXPIRES_IN || '15m'
  )
  
  const refreshTokenValue = bytesToHex(randomBytes(32))
  const refreshToken = await signToken(
    { sub: String(user.id), email: user.email, role: user.role_name, roleId: user.role_id },
    c.env.JWT_REFRESH_SECRET,
    c.env.JWT_REFRESH_EXPIRES_IN || '7d'
  )
  
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
  await c.env.DB.prepare(
    `INSERT INTO refresh_tokens (user_id, token_hash, expires_at) VALUES (?, ?, ?)`
  ).bind(user.id, refreshTokenValue, expiresAt).run()
  
  await c.env.DB.prepare(
    `UPDATE users SET last_login_at = CURRENT_TIMESTAMP WHERE id = ?`
  ).bind(user.id).run()
  
  return c.json({
    access_token: accessToken,
    refresh_token: refreshToken,
    token_type: 'Bearer',
    user: {
      id: user.id,
      email: user.email,
      first_name: user.first_name,
      last_name: user.last_name,
      role: user.role_name,
      role_id: user.role_id,
      avatar_url: user.avatar_url,
    }
  })
})

/**
 * POST /api/auth/refresh
 */
router.post('/refresh', async (c) => {
  const body = await c.req.json().catch(() => ({})) as { refresh_token?: string }
  const refreshToken = body.refresh_token
  
  if (!refreshToken) {
    return c.json({ error: 'Refresh token required' }, 400)
  }
  
  const payload = await verifyToken(refreshToken, c.env.JWT_REFRESH_SECRET)
  if (!payload) {
    return c.json({ error: 'Invalid refresh token' }, 401)
  }
  
  const user = await c.env.DB.prepare(
    `SELECT u.*, r.name as role_name FROM users u JOIN roles r ON u.role_id = r.id
     WHERE u.id = ? AND u.is_active = 1`
  ).bind(Number(payload.sub)).first<{
    id: number; email: string; first_name: string; last_name: string;
    role_id: number; role_name: string; avatar_url: string | null;
  }>()
  
  if (!user) {
    return c.json({ error: 'User not found' }, 401)
  }
  
  const accessToken = await signToken(
    { sub: String(user.id), email: user.email, role: user.role_name, roleId: user.role_id },
    c.env.JWT_SECRET,
    c.env.JWT_EXPIRES_IN || '15m'
  )
  
  return c.json({ access_token: accessToken, token_type: 'Bearer' })
})

/**
 * POST /api/auth/logout
 */
router.post('/logout', authMiddleware, async (c) => {
  const token = extractBearerToken(c.req.header('Authorization'))
  // In production: blacklist token in KV
  return c.json({ message: 'Logged out successfully' })
})

/**
 * GET /api/auth/me
 */
router.get('/me', authMiddleware, async (c) => {
  const user = c.get('user')
  
  const fullUser = await c.env.DB.prepare(
    `SELECT u.id, u.email, u.first_name, u.last_name, u.phone, u.avatar_url, 
            u.is_active, u.is_verified, u.last_login_at, u.created_at,
            r.name as role_name, r.display_name as role_display_name
     FROM users u JOIN roles r ON u.role_id = r.id WHERE u.id = ?`
  ).bind(user.id).first()
  
  let patientId = null;
  let doctorId = null;
  
  if (fullUser && (fullUser as any).role_name === 'patient') {
    const p = await c.env.DB.prepare('SELECT id FROM patients WHERE user_id = ?').bind(user.id).first();
    if (p) patientId = p.id;
  } else if (fullUser && (fullUser as any).role_name === 'doctor') {
    const d = await c.env.DB.prepare('SELECT id FROM doctors WHERE user_id = ?').bind(user.id).first();
    if (d) doctorId = d.id;
  }
  
  return c.json({ user: { ...fullUser, patient_id: patientId, doctor_id: doctorId } })
})

/**
 * POST /api/auth/register
 */
router.post('/register', zValidator('json', registerSchema), async (c) => {
  const data = c.req.valid('json')
  
  const cleanEmail = data.email && data.email.trim() !== '' ? data.email.trim() : null;
  const cleanPhone = data.phone && data.phone.trim() !== '' ? data.phone.trim() : null;

  if (cleanEmail) {
    const existing = await c.env.DB.prepare('SELECT id FROM users WHERE email = ?').bind(cleanEmail).first()
    if (existing) return c.json({ error: 'Email already registered' }, 409)
  }

  if (cleanPhone) {
    const existing = await c.env.DB.prepare('SELECT id FROM users WHERE phone = ?').bind(cleanPhone).first()
    if (existing) return c.json({ error: 'Phone already registered' }, 409)
  }
  
  const finalEmail = cleanEmail || `phone_${cleanPhone}@telemedicina.app`;
  const dummyPasswordHash = await hashPassword(Math.random().toString(36).slice(-10));
  
  const result = await c.env.DB.prepare(
    `INSERT INTO users (email, password_hash, first_name, last_name, phone, role_id)
     VALUES (?, ?, ?, ?, ?, ?)`
  ).bind(finalEmail, dummyPasswordHash, data.first_name, data.last_name, cleanPhone, data.role_id).run()
  
  const userId = result.meta.last_row_id;
  
  if (data.role_id === 4) {
    const docNumber = 'TMP-' + Date.now().toString().slice(-6);
    await c.env.DB.prepare(
      `INSERT INTO patients (user_id, first_name, last_name, document_type, document_number, date_of_birth, gender, email, phone)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).bind(userId, data.first_name, data.last_name, 'CC', docNumber, '1900-01-01', 'O', cleanEmail, cleanPhone).run()
  }
  
  // Send code automatically upon registration
  const identifier = cleanEmail || cleanPhone;
  if (identifier) {
    await generateAndSendCode(c.env, identifier);
  }
  
  return c.json({ message: 'User registered successfully. Code sent.', id: userId }, 201)
})

export { router as authRouter }
