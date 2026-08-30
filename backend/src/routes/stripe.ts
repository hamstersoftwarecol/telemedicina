/**
 * Stripe Payments Routes
 */
import { Hono } from 'hono'
import Stripe from 'stripe'
import { Bindings, Variables } from '../types'
import { authMiddleware } from '../middleware/auth'

const router = new Hono<{ Bindings: Bindings; Variables: Variables }>()

// Ensure we have a Stripe instance configured properly per request
const getStripe = (env: Bindings) => {
  return new Stripe(env.STRIPE_SECRET_KEY || 'sk_test_dummy', {
    apiVersion: '2024-10-28.acacia',
  })
}

router.post('/create-checkout', authMiddleware, async (c) => {
  const user = c.get('user')
  const body = await c.req.json() as {
    doctor_id: number
    patient_id: number
    specialty_id?: number
    appointment_date: string
    start_time: string
    end_time: string
    type: string
    reason?: string
    notes?: string
  }

  // Check doctor fee
  const doctor = await c.env.DB.prepare('SELECT consultation_fee, first_name, last_name FROM doctors WHERE id = ?').bind(body.doctor_id).first<{ consultation_fee: number, first_name: string, last_name: string }>()
  
  if (!doctor) {
    return c.json({ error: 'Doctor not found' }, 404)
  }

  if (doctor.consultation_fee <= 0) {
    return c.json({ error: 'This doctor has no consultation fee set' }, 400)
  }

  // Create an appointment in "payment_pending" status first
  const result = await c.env.DB.prepare(
    `INSERT INTO appointments (patient_id, doctor_id, specialty_id, appointment_date, start_time, end_time, type, reason, notes, status, payment_status, created_by)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'payment_pending', 'unpaid', ?)`
  ).bind(
    body.patient_id, body.doctor_id, body.specialty_id ?? null, body.appointment_date,
    body.start_time, body.end_time, body.type, body.reason ?? null, body.notes ?? null, user.id
  ).run()

  const appointmentId = result.meta.last_row_id as number

  const stripe = getStripe(c.env)
  const frontendUrl = c.env.FRONTEND_URL || 'http://localhost:5173'

  try {
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'usd', // or cop, mxn, depending on the app's country
            product_data: {
              name: `Consulta médica - Dr. ${doctor.first_name} ${doctor.last_name}`,
              description: `Fecha: ${body.appointment_date} a las ${body.start_time} (${body.type})`,
            },
            unit_amount: Math.round(doctor.consultation_fee * 100), // Stripe expects cents
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: `${frontendUrl}/portal/payment-success?session_id={CHECKOUT_SESSION_ID}&appointment_id=${appointmentId}`,
      cancel_url: `${frontendUrl}/portal/payment-cancelled?appointment_id=${appointmentId}`,
      metadata: {
        appointment_id: appointmentId.toString(),
        patient_id: body.patient_id.toString(),
        doctor_id: body.doctor_id.toString(),
      }
    })

    // Update appointment with stripe session id
    await c.env.DB.prepare('UPDATE appointments SET stripe_session_id = ? WHERE id = ?')
      .bind(session.id, appointmentId)
      .run()

    return c.json({ url: session.url, appointment_id: appointmentId })
  } catch (error: any) {
    console.error('Stripe error:', error)
    return c.json({ error: error.message }, 500)
  }
})

// Webhook doesn't use authMiddleware because it's called by Stripe
router.post('/webhook', async (c) => {
  const stripe = getStripe(c.env)
  const signature = c.req.header('stripe-signature')
  
  if (!signature) {
    return c.json({ error: 'Missing stripe-signature header' }, 400)
  }

  const payload = await c.req.text()
  const secret = c.env.STRIPE_WEBHOOK_SECRET || 'whsec_dummy'

  let event: Stripe.Event

  try {
    event = stripe.webhooks.constructEvent(payload, signature, secret)
  } catch (err: any) {
    console.error('Webhook signature verification failed:', err.message)
    return c.json({ error: err.message }, 400)
  }

  // Handle the event
  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session
    const appointmentId = session.metadata?.appointment_id

    if (appointmentId) {
      // Confirm the appointment
      await c.env.DB.prepare(
        `UPDATE appointments 
         SET status = 'confirmed', payment_status = 'paid', stripe_payment_intent_id = ?, updated_at = CURRENT_TIMESTAMP 
         WHERE id = ?`
      ).bind(session.payment_intent as string, parseInt(appointmentId, 10)).run()
      
      // We could also create an invoice here automatically
    }
  }

  return c.json({ received: true })
})

export { router as stripeRouter }
