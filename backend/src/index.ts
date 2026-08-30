/**
 * Telemedicina Backend — Cloudflare Workers + Hono
 * Main entry point
 */

import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { logger } from 'hono/logger'
import { secureHeaders } from 'hono/secure-headers'
import { authRouter } from './routes/auth'
import { usersRouter } from './routes/users'
import { patientsRouter } from './routes/patients'
import domain from './routes/domain'
import { doctorsRouter } from './routes/doctors'
import { specialtiesRouter } from './routes/specialties'
import { appointmentsRouter } from './routes/appointments'
import { consultationsRouter } from './routes/consultations'
import { prescriptionsRouter } from './routes/prescriptions'
import { examsRouter } from './routes/exams'
import { medicalHistoryRouter } from './routes/medical-history'
import { invoicesRouter } from './routes/invoices'
import { paymentsRouter } from './routes/payments'
import { messagesRouter } from './routes/messages'
import { notificationsRouter } from './routes/notifications'
import { reportsRouter } from './routes/reports'
import { settingsRouter } from './routes/settings'
import { videocallsRouter } from './routes/videocalls'
import { stripeRouter } from './routes/stripe'
import { assistantRouter } from './routes/assistant'
import { profileRouter } from './routes/profile'
import { Bindings } from './types'

const app = new Hono<{ Bindings: Bindings }>()

// ─── Global Middleware ─────────────────────────────────────────────────────────

app.use('*', logger())

app.use('*', secureHeaders())

app.use('*', async (c, next) => {
  const configuredOrigin = c.env.FRONTEND_URL || 'http://localhost:5173'
  return cors({
    origin: (origin) => {
      const allowed = [
        'http://localhost:5173',
        'http://localhost:4173',
        'http://localhost:3000',
        configuredOrigin,
        'https://telemedicina-frontend.pages.dev',
        'https://telemed.hamstersoftware.com',
      ]
      if (!origin) return configuredOrigin
      if (allowed.includes(origin)) return origin
      // Allow all Cloudflare Pages preview deployments
      if (origin.endsWith('.telemedicina-frontend.pages.dev')) return origin
      return configuredOrigin
    },
    allowMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    credentials: true,
    maxAge: 86400,
  })(c, next)
})


// Rate limiting via KV
app.use('/api/*', async (c, next) => {
  const ip = c.req.header('CF-Connecting-IP') || 'unknown'
  const key = `rate:${ip}:${Math.floor(Date.now() / 60000)}`
  
  try {
    const count = await c.env.KV.get(key)
    const requests = parseInt(count || '0', 10)
    
    if (requests >= 300) {
      return c.json({ error: 'Too many requests' }, 429)
    }
    
    await c.env.KV.put(key, String(requests + 1), { expirationTtl: 120 })
  } catch {
    // KV might not be available in all envs, continue
  }
  
  return next()
})

// ─── Routes ──────────────────────────────────────────────────────────────────

app.route('/api/auth', authRouter)
app.route('/api/profile', profileRouter)
app.route('/api/users', usersRouter)
app.route('/api/patients', patientsRouter)
app.route('/api/domain', domain)
app.route('/api/doctors', doctorsRouter)
app.route('/api/specialties', specialtiesRouter)
app.route('/api/appointments', appointmentsRouter)
app.route('/api/consultations', consultationsRouter)
app.route('/api/prescriptions', prescriptionsRouter)
app.route('/api/exams', examsRouter)
app.route('/api/medical-history', medicalHistoryRouter)
app.route('/api/invoices', invoicesRouter)
app.route('/api/payments', paymentsRouter)
app.route('/api/stripe', stripeRouter)
app.route('/api/messages', messagesRouter)
app.route('/api/notifications', notificationsRouter)
app.route('/api/reports', reportsRouter)
app.route('/api/settings', settingsRouter)
app.route('/api/videocalls', videocallsRouter)
app.route('/api/assistant', assistantRouter)

// Health check
app.get('/health', (c) => c.json({ 
  status: 'ok', 
  app: 'telemedicina-backend',
  timestamp: new Date().toISOString() 
}))

// 404 fallback
app.notFound((c) => c.json({ error: 'Not Found', path: c.req.path }, 404))

// Error handler
app.onError((err, c) => {
  console.error('Unhandled error:', err)
  return c.json({ error: 'Internal Server Error', message: err.message }, 500)
})

export default app
