/**
 * Reports Routes — KPIs and aggregated data
 */
import { Hono } from 'hono'
import { Bindings, Variables } from '../types'
import { authMiddleware } from '../middleware/auth'

const router = new Hono<{ Bindings: Bindings; Variables: Variables }>()
router.use('*', authMiddleware)

/**
 * GET /api/reports/dashboard — Main dashboard KPIs
 */
router.get('/dashboard', async (c) => {
  const user = c.get('user')
  let apptCond = ''
  let apptParams: any[] = []
  let invCond = ''
  let invParams: any[] = []
  let patCond = 'WHERE is_active = 1'
  let patParams: any[] = []

  if (user.role === 'doctor') {
    const doc = await c.env.DB.prepare('SELECT id FROM doctors WHERE user_id = ?').bind(user.id).first<{id: number}>()
    if (doc) {
      apptCond = ' AND a.doctor_id = ?'
      apptParams = [doc.id]
      patCond = 'WHERE id IN (SELECT patient_id FROM appointments WHERE doctor_id = ?)'
      patParams = [doc.id]
    }
  } else if (user.role === 'patient') {
    const pat = await c.env.DB.prepare('SELECT id FROM patients WHERE user_id = ?').bind(user.id).first<{id: number}>()
    if (pat) {
      apptCond = ' AND a.patient_id = ?'
      apptParams = [pat.id]
      invCond = ' AND patient_id = ?'
      invParams = [pat.id]
    }
  }

  const [
    patientsCount,
    doctorsCount,
    todayAppointments,
    pendingAppointments,
    monthlyRevenue,
    activeVideocalls,
    recentAppointments,
    appointmentsByStatus,
    appointmentsByMonth,
    revenueByMonth,
    patientsBySpecialty,
    weeklyActivity,
  ] = await Promise.all([
    c.env.DB.prepare(`SELECT COUNT(*) as total FROM patients ${patCond}`).bind(...patParams).first<{ total: number }>(),
    c.env.DB.prepare('SELECT COUNT(*) as total FROM doctors WHERE is_active = 1').first<{ total: number }>(),
    c.env.DB.prepare(`SELECT COUNT(*) as total FROM appointments a WHERE a.appointment_date = date('now') ${apptCond}`).bind(...apptParams).first<{ total: number }>(),
    c.env.DB.prepare(`SELECT COUNT(*) as total FROM appointments a WHERE a.status IN ('pending', 'confirmed') AND a.appointment_date >= date('now') ${apptCond}`).bind(...apptParams).first<{ total: number }>(),
    c.env.DB.prepare(`SELECT COALESCE(SUM(total), 0) as total FROM invoices WHERE status = 'paid' AND issue_date >= date('now', 'start of month') ${invCond}`).bind(...invParams).first<{ total: number }>(),
    c.env.DB.prepare(`SELECT COUNT(*) as total FROM appointments a WHERE a.status = 'in_progress' AND a.type = 'virtual' ${apptCond}`).bind(...apptParams).first<{ total: number }>(),
    c.env.DB.prepare(
      `SELECT a.*, p.first_name || ' ' || p.last_name as patient_name, d.first_name || ' ' || d.last_name as doctor_name, s.name as specialty_name
       FROM appointments a LEFT JOIN patients p ON a.patient_id = p.id LEFT JOIN doctors d ON a.doctor_id = d.id LEFT JOIN specialties s ON a.specialty_id = s.id
       WHERE a.appointment_date >= date('now') ${apptCond} ORDER BY a.appointment_date, a.start_time LIMIT 8`
    ).bind(...apptParams).all(),
    c.env.DB.prepare(
      `SELECT a.status, COUNT(*) as count FROM appointments a WHERE 1=1 ${apptCond} GROUP BY a.status`
    ).bind(...apptParams).all(),
    c.env.DB.prepare(
      `SELECT strftime('%Y-%m', a.appointment_date) as month, COUNT(*) as count
       FROM appointments a WHERE a.appointment_date >= date('now', '-12 months') ${apptCond}
       GROUP BY month ORDER BY month`
    ).bind(...apptParams).all(),
    c.env.DB.prepare(
      `SELECT strftime('%Y-%m', issue_date) as month, SUM(total) as revenue
       FROM invoices WHERE status = 'paid' AND issue_date >= date('now', '-12 months') ${invCond}
       GROUP BY month ORDER BY month`
    ).bind(...invParams).all(),
    c.env.DB.prepare(
      `SELECT s.name, COUNT(a.id) as count FROM appointments a
       LEFT JOIN specialties s ON a.specialty_id = s.id
       WHERE a.appointment_date >= date('now', '-30 days') AND s.name IS NOT NULL ${apptCond}
       GROUP BY s.id ORDER BY count DESC LIMIT 8`
    ).bind(...apptParams).all(),
    c.env.DB.prepare(
      `SELECT strftime('%w', a.appointment_date) as day_of_week, COUNT(*) as count
       FROM appointments a WHERE a.appointment_date >= date('now', '-7 days') ${apptCond}
       GROUP BY day_of_week ORDER BY day_of_week`
    ).bind(...apptParams).all(),
  ])

  return c.json({
    kpis: {
      patients_total: patientsCount?.total ?? 0,
      doctors_active: doctorsCount?.total ?? 0,
      appointments_today: todayAppointments?.total ?? 0,
      appointments_pending: pendingAppointments?.total ?? 0,
      monthly_revenue: monthlyRevenue?.total ?? 0,
      active_videocalls: activeVideocalls?.total ?? 0,
    },
    charts: {
      appointments_by_status: appointmentsByStatus.results,
      appointments_by_month: appointmentsByMonth.results,
      revenue_by_month: revenueByMonth.results,
      patients_by_specialty: patientsBySpecialty.results,
      weekly_activity: weeklyActivity.results,
    },
    recent_appointments: recentAppointments.results,
  })
})

/**
 * GET /api/reports/revenue — Revenue report
 */
router.get('/revenue', async (c) => {
  const { from, to } = c.req.query()
  let where = "WHERE i.status = 'paid'"
  const params: string[] = []
  if (from) { where += ' AND i.issue_date >= ?'; params.push(from) }
  if (to) { where += ' AND i.issue_date <= ?'; params.push(to) }
  const total = await c.env.DB.prepare(`SELECT COALESCE(SUM(total), 0) as total FROM invoices i ${where}`).bind(...params).first<{ total: number }>()
  const byMethod = await c.env.DB.prepare(
    `SELECT p.payment_method, COUNT(*) as count, SUM(p.amount) as total FROM payments p
     INNER JOIN invoices i ON p.invoice_id = i.id ${where.replace('i.status', 'p.payment_date >= date(\'1970-01-01\')')} GROUP BY p.payment_method`
  ).bind(...params).all()
  return c.json({ total_revenue: total?.total ?? 0, by_payment_method: byMethod.results })
})

/**
 * GET /api/reports/patients — Patient stats
 */
router.get('/patients', async (c) => {
  const [byGender, byCity, byBloodType, byAge] = await Promise.all([
    c.env.DB.prepare('SELECT gender, COUNT(*) as count FROM patients WHERE is_active = 1 GROUP BY gender').all(),
    c.env.DB.prepare('SELECT city, COUNT(*) as count FROM patients WHERE is_active = 1 AND city IS NOT NULL GROUP BY city ORDER BY count DESC LIMIT 10').all(),
    c.env.DB.prepare('SELECT blood_type, COUNT(*) as count FROM patients WHERE is_active = 1 AND blood_type IS NOT NULL GROUP BY blood_type').all(),
    c.env.DB.prepare(`SELECT 
      CASE 
        WHEN (julianday('now') - julianday(date_of_birth)) / 365 < 18 THEN '0-17'
        WHEN (julianday('now') - julianday(date_of_birth)) / 365 < 35 THEN '18-34'
        WHEN (julianday('now') - julianday(date_of_birth)) / 365 < 50 THEN '35-49'
        WHEN (julianday('now') - julianday(date_of_birth)) / 365 < 65 THEN '50-64'
        ELSE '65+'
      END as age_group, COUNT(*) as count
      FROM patients WHERE is_active = 1 GROUP BY age_group ORDER BY age_group`).all(),
  ])
  return c.json({ by_gender: byGender.results, by_city: byCity.results, by_blood_type: byBloodType.results, by_age: byAge.results })
})

/**
 * GET /api/reports/export — Full data export for Excel
 */
router.get('/export', async (c) => {
  const { from, to } = c.req.query()
  if (!from || !to) {
    return c.json({ error: 'Faltan parámetros from y to' }, 400)
  }

  const [
    appointments,
    invoices,
    patientsCount,
    doctorsCount,
    periodRevenue,
  ] = await Promise.all([
    c.env.DB.prepare(
      `SELECT a.id, a.appointment_date, a.start_time, a.status, a.type,
              p.first_name || ' ' || p.last_name as patient_name,
              d.first_name || ' ' || d.last_name as doctor_name,
              s.name as specialty_name
       FROM appointments a 
       LEFT JOIN patients p ON a.patient_id = p.id 
       LEFT JOIN doctors d ON a.doctor_id = d.id 
       LEFT JOIN specialties s ON a.specialty_id = s.id
       WHERE a.appointment_date >= ? AND a.appointment_date <= ?
       ORDER BY a.appointment_date, a.start_time`
    ).bind(from, to).all(),
    c.env.DB.prepare(
      `SELECT i.id, i.issue_date, i.status, i.total,
              p.first_name || ' ' || p.last_name as patient_name
       FROM invoices i
       LEFT JOIN patients p ON i.patient_id = p.id
       WHERE i.issue_date >= ? AND i.issue_date <= ?
       ORDER BY i.issue_date`
    ).bind(from, to).all(),
    c.env.DB.prepare('SELECT COUNT(*) as total FROM patients WHERE is_active = 1').first<{ total: number }>(),
    c.env.DB.prepare('SELECT COUNT(*) as total FROM doctors WHERE is_active = 1').first<{ total: number }>(),
    c.env.DB.prepare(`SELECT COALESCE(SUM(total), 0) as total FROM invoices WHERE status = 'paid' AND issue_date >= ? AND issue_date <= ?`).bind(from, to).first<{ total: number }>(),
  ])

  return c.json({
    kpis: {
      patients_total: patientsCount?.total ?? 0,
      doctors_active: doctorsCount?.total ?? 0,
      period_appointments: appointments.results.length,
      period_revenue: periodRevenue?.total ?? 0,
    },
    appointments: appointments.results,
    invoices: invoices.results,
  })
})

export { router as reportsRouter }
