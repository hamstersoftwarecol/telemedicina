/**
 * Profile Routes — Unified GET/PUT for current user (Patient or Doctor)
 */
import { Hono } from 'hono'
import { Bindings, Variables } from '../types'
import { authMiddleware } from '../middleware/auth'

const router = new Hono<{ Bindings: Bindings; Variables: Variables }>()
router.use('*', authMiddleware)

// Get current user's profile
router.get('/', async (c) => {
  const user = c.get('user')
  if (!user) return c.json({ error: 'Unauthorized' }, 401)

  // 4 = Patient, 3 = Doctor
  if (user.role_id === 4) {
    const patient = await c.env.DB.prepare(
      `SELECT p.*, u.email as user_email
       FROM patients p
       JOIN users u ON p.user_id = u.id
       WHERE p.user_id = ?`
    ).bind(user.id).first()
    if (!patient) return c.json({ error: 'Patient profile not found' }, 404)
    return c.json({ data: patient })
  } else if (user.role_id === 3) {
    const doctor = await c.env.DB.prepare(
      `SELECT d.*, u.email as user_email, s.name as specialty_name, s.color as specialty_color
       FROM doctors d
       JOIN users u ON d.user_id = u.id
       LEFT JOIN specialties s ON d.specialty_id = s.id
       WHERE d.user_id = ?`
    ).bind(user.id).first()
    if (!doctor) return c.json({ error: 'Doctor profile not found' }, 404)
    return c.json({ data: doctor })
  }

  // Fallback for admin or others
  return c.json({ data: user })
})

// Update current user's profile
router.put('/', async (c) => {
  const user = c.get('user')
  if (!user) return c.json({ error: 'Unauthorized' }, 401)
  
  const body = await c.req.json() as Record<string, unknown>

  if (user.role_id === 4) {
    // Update patient
    const {
      first_name, last_name, document_type, document_number,
      date_of_birth, gender, phone, blood_type, allergies, medical_conditions,
      emergency_contact_name, emergency_contact_phone, address, avatar_url
    } = body

    await c.env.DB.prepare(
      `UPDATE patients SET 
        first_name = COALESCE(?, first_name),
        last_name = COALESCE(?, last_name),
        document_type = COALESCE(?, document_type),
        document_number = COALESCE(?, document_number),
        date_of_birth = COALESCE(?, date_of_birth),
        gender = COALESCE(?, gender),
        phone = COALESCE(?, phone),
        blood_type = COALESCE(?, blood_type),
        allergies = COALESCE(?, allergies),
        medical_conditions = COALESCE(?, medical_conditions),
        emergency_contact_name = COALESCE(?, emergency_contact_name),
        emergency_contact_phone = COALESCE(?, emergency_contact_phone),
        address = COALESCE(?, address),
        avatar_url = COALESCE(?, avatar_url)
       WHERE user_id = ?`
    ).bind(
      first_name ?? null, last_name ?? null, document_type ?? null, document_number ?? null,
      date_of_birth ?? null, gender ?? null, phone ?? null, blood_type ?? null, allergies ?? null,
      medical_conditions ?? null, emergency_contact_name ?? null, emergency_contact_phone ?? null,
      address ?? null, avatar_url ?? null, user.id
    ).run()

    return c.json({ message: 'Profile updated' })
  } else if (user.role_id === 3) {
    // Update doctor
    const {
      first_name, last_name, phone, office_number, consultation_fee, bio, avatar_url
    } = body

    await c.env.DB.prepare(
      `UPDATE doctors SET 
        first_name = COALESCE(?, first_name),
        last_name = COALESCE(?, last_name),
        phone = COALESCE(?, phone),
        office_number = COALESCE(?, office_number),
        consultation_fee = COALESCE(?, consultation_fee),
        bio = COALESCE(?, bio),
        avatar_url = COALESCE(?, avatar_url)
       WHERE user_id = ?`
    ).bind(
      first_name ?? null, last_name ?? null, phone ?? null, office_number ?? null,
      consultation_fee ?? null, bio ?? null, avatar_url ?? null, user.id
    ).run()

    return c.json({ message: 'Profile updated' })
  }

  return c.json({ error: 'Role not supported for profile update' }, 400)
})

export { router as profileRouter }
