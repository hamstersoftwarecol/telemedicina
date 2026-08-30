/**
 * Patient Portal — Public portal for patients to book & pay appointments
 * Route: /portal
 */
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Calendar, Video, MapPin, Clock, ChevronRight, ChevronLeft, Star,
  Shield, CreditCard, CheckCircle, Stethoscope, X, User, Phone,
  Mail, FileText, HeartPulse, Search, ArrowRight, Loader2,
  BadgeCheck, Lock, Sparkles, Activity,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import api from '@/lib/api'
import { toast } from 'sonner'

/* ─── Types ────────────────────────────────────────────────── */
interface Doctor {
  id: number
  first_name: string
  last_name: string
  specialty_name: string
  consultation_fee: number
  office_number?: string
  bio?: string
}

interface Specialty {
  id: number
  name: string
  color: string
}

/* ─── Step indicator ────────────────────────────────────────── */
const STEPS = ['Especialidad', 'Médico', 'Fecha & Hora', 'Datos', 'Pago', '¡Listo!']

function StepBar({ current }: { current: number }) {
  return (
    <div className="flex items-center justify-center gap-0 mb-8 overflow-x-auto pb-1">
      {STEPS.map((label, i) => (
        <div key={label} className="flex items-center">
          <div className="flex flex-col items-center">
            <div className={cn(
              'h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold transition-all',
              i < current ? 'bg-primary text-primary-foreground' :
              i === current ? 'bg-primary text-primary-foreground ring-4 ring-primary/20 scale-110' :
              'bg-muted text-muted-foreground'
            )}>
              {i < current ? <CheckCircle className="h-4 w-4" /> : i + 1}
            </div>
            <span className={cn('text-[10px] mt-1 font-medium hidden sm:block whitespace-nowrap',
              i === current ? 'text-primary' : 'text-muted-foreground'
            )}>{label}</span>
          </div>
          {i < STEPS.length - 1 && (
            <div className={cn('h-0.5 w-8 sm:w-12 mx-1 transition-all', i < current ? 'bg-primary' : 'bg-border')} />
          )}
        </div>
      ))}
    </div>
  )
}

/* ─── Main Portal ────────────────────────────────────────────── */
export function PatientPortalPage() {
  const [step, setStep] = useState(0)
  const [selectedSpecialty, setSelectedSpecialty] = useState<Specialty | null>(null)
  const [selectedDoctor, setSelectedDoctor] = useState<Doctor | null>(null)
  const [selectedDate, setSelectedDate] = useState('')
  const [selectedTime, setSelectedTime] = useState('')
  const [consultationType, setConsultationType] = useState<'presencial' | 'virtual'>('presencial')
  const [patientData, setPatientData] = useState({ name: '', email: '', phone: '', document: '', dob: '', reason: '' })
  const [payMethod, setPayMethod] = useState<'card' | 'transfer' | 'cash'>('card')
  const [cardData, setCardData] = useState({ number: '', expiry: '', cvv: '', holder: '' })
  const [bookingRef, setBookingRef] = useState('')

  const queryClient = useQueryClient()

  const { data: specialties = [], isLoading: loadingSpecs } = useQuery<Specialty[]>({
    queryKey: ['portal', 'specialties'],
    queryFn: async () => {
      const { data } = await api.get('/specialties?active=1&limit=20')
      return data.data ?? []
    },
  })

  const { data: doctors = [], isLoading: loadingDoctors } = useQuery<Doctor[]>({
    queryKey: ['portal', 'doctors', selectedSpecialty?.id],
    queryFn: async () => {
      const q = selectedSpecialty ? `?specialty_id=${selectedSpecialty.id}&limit=20` : '?limit=20'
      const { data } = await api.get(`/doctors${q}`)
      return data.data ?? []
    },
    enabled: step >= 1,
  })

  const bookMutation = useMutation({
    mutationFn: async () => {
      // 1. Create or find patient
      const patRes = await api.post('/patients', {
        first_name: patientData.name.split(' ')[0] ?? patientData.name,
        last_name: patientData.name.split(' ').slice(1).join(' ') || 'N/A',
        document_type: 'CC',
        document_number: patientData.document || `TMP-${Date.now()}`,
        date_of_birth: patientData.dob || '2000-01-01',
        gender: 'O',
        email: patientData.email,
        phone: patientData.phone,
      }).catch(() => null) // may already exist

      // Get patient id (try existing)
      const patSearch = await api.get(`/patients?search=${encodeURIComponent(patientData.email)}&limit=1`)
      const patId = patSearch.data.data?.[0]?.id ?? 1

      // 2. Create Stripe Checkout Session
      const checkoutRes = await api.post('/stripe/create-checkout', {
        patient_id: patId,
        doctor_id: selectedDoctor!.id,
        specialty_id: selectedSpecialty?.id,
        appointment_date: selectedDate,
        start_time: selectedTime,
        end_time: selectedTime.replace(/(\d{2}):(\d{2})/, (_, h, m) => `${String(parseInt(h) + (consultationType === 'presencial' ? 0 : 0)).padStart(2,'0')}:${String((parseInt(m) + 30) % 60).padStart(2,'0')}`),
        type: consultationType,
        reason: patientData.reason,
      })

      return checkoutRes.data
    },
    onSuccess: (data) => {
      if (data.url) {
        window.location.href = data.url
      } else {
        toast.error('Error al generar el link de pago')
      }
    },
  })

  // Available times slots
  const timeSlots = ['08:00', '08:30', '09:00', '09:30', '10:00', '10:30', '11:00', '11:30', '14:00', '14:30', '15:00', '15:30', '16:00', '16:30']

  // Next available dates (next 14 days, excluding Sundays)
  const availableDates = Array.from({ length: 14 }, (_, i) => {
    const d = new Date(); d.setDate(d.getDate() + i + 1)
    return d
  }).filter(d => d.getDay() !== 0)

  const formatLocalDate = (d: Date) => d.toISOString().split('T')[0]
  const formatDisplayDate = (d: Date) => d.toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short' })

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/40 dark:from-slate-950 dark:via-blue-950/20 dark:to-indigo-950/20">
      {/* Nav */}
      <nav className="sticky top-0 z-50 border-b bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl">
        <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center">
              <HeartPulse className="h-4.5 w-4.5 text-white" />
            </div>
            <span className="font-bold text-foreground">TelemedApp</span>
            <Badge variant="secondary" className="text-[10px]">Portal del Paciente</Badge>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Shield className="h-4 w-4 text-green-500" />
            <span className="hidden sm:inline">Plataforma segura y certificada</span>
          </div>
        </div>
      </nav>

      <div className="max-w-5xl mx-auto px-4 py-8">
        {/* Hero — only on step 0 */}
        {step === 0 && (
          <div className="text-center mb-10">
            <div className="inline-flex items-center gap-2 bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 rounded-full px-4 py-1.5 text-sm font-medium mb-4">
              <Sparkles className="h-3.5 w-3.5" />Agende su consulta en minutos
            </div>
            <h1 className="text-3xl sm:text-4xl font-bold text-foreground mb-3">
              Tu salud, <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">nuestra prioridad</span>
            </h1>
            <p className="text-muted-foreground text-base max-w-xl mx-auto">
              Agenda tu cita médica en línea, elige el horario que más te conviene y paga de forma segura.
            </p>
            {/* Trust badges */}
            <div className="flex flex-wrap items-center justify-center gap-4 mt-6 text-xs text-muted-foreground">
              {[
                { icon: BadgeCheck, label: 'Médicos certificados' },
                { icon: Lock, label: 'Pago 100% seguro' },
                { icon: Video, label: 'Consulta virtual disponible' },
                { icon: Activity, label: 'Atención el mismo día' },
              ].map(({ icon: Icon, label }) => (
                <div key={label} className="flex items-center gap-1.5">
                  <Icon className="h-3.5 w-3.5 text-blue-500" />{label}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Step indicator (step > 0 and not final) */}
        {step > 0 && step < 5 && <StepBar current={step} />}

        {/* ── STEP 0: Specialties ───────────────────────────────── */}
        {step === 0 && (
          <div>
            <h2 className="text-xl font-semibold text-center mb-6">¿Qué especialidad necesitas?</h2>
            {loadingSpecs ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                {[...Array(8)].map((_, i) => <div key={i} className="skeleton h-24 rounded-2xl" />)}
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                {specialties.map(spec => (
                  <button
                    key={spec.id}
                    onClick={() => { setSelectedSpecialty(spec); setStep(1) }}
                    className="group p-4 bg-white dark:bg-slate-900 rounded-2xl border border-border hover:border-primary hover:shadow-lg hover:shadow-primary/10 transition-all text-left"
                  >
                    <div className="h-10 w-10 rounded-xl mb-3 flex items-center justify-center" style={{ backgroundColor: spec.color + '20' }}>
                      <Stethoscope className="h-5 w-5" style={{ color: spec.color }} />
                    </div>
                    <p className="font-semibold text-sm text-foreground group-hover:text-primary transition-colors">{spec.name}</p>
                    <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">Ver médicos <ArrowRight className="h-3 w-3" /></p>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── STEP 1: Doctors ───────────────────────────────────── */}
        {step === 1 && (
          <div>
            <button onClick={() => setStep(0)} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4 transition-colors">
              <ChevronLeft className="h-4 w-4" />Volver a especialidades
            </button>
            <h2 className="text-xl font-semibold mb-1">Elige tu médico</h2>
            <p className="text-sm text-muted-foreground mb-6">Especialidad: <strong>{selectedSpecialty?.name}</strong></p>
            {loadingDoctors ? (
              <div className="space-y-4">{[...Array(3)].map((_, i) => <div key={i} className="skeleton h-32 rounded-2xl" />)}</div>
            ) : doctors.length === 0 ? (
              <div className="text-center py-16">
                <Stethoscope className="h-12 w-12 text-muted-foreground/40 mx-auto mb-3" />
                <p className="text-muted-foreground">No hay médicos disponibles para esta especialidad.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {doctors.map(doc => (
                  <button
                    key={doc.id}
                    onClick={() => { setSelectedDoctor(doc); setStep(2) }}
                    className="w-full group p-5 bg-white dark:bg-slate-900 rounded-2xl border border-border hover:border-primary hover:shadow-lg hover:shadow-primary/10 transition-all text-left"
                  >
                    <div className="flex items-start gap-4">
                      <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-lg font-bold shrink-0">
                        {doc.first_name[0]}{doc.last_name[0]}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-semibold text-foreground">Dr. {doc.first_name} {doc.last_name}</h3>
                          <div className="flex items-center gap-0.5 text-amber-500">
                            {[...Array(5)].map((_, i) => <Star key={i} className="h-3 w-3 fill-current" />)}
                          </div>
                        </div>
                        <p className="text-sm text-primary font-medium">{doc.specialty_name}</p>
                        {doc.bio && <p className="text-xs text-muted-foreground mt-1 line-clamp-1">{doc.bio}</p>}
                        <div className="flex items-center gap-4 mt-2 flex-wrap">
                          {doc.office_number && (
                            <span className="flex items-center gap-1 text-xs text-muted-foreground">
                              <MapPin className="h-3 w-3" />{doc.office_number}
                            </span>
                          )}
                          <span className="flex items-center gap-1 text-xs font-semibold text-emerald-600">
                            <CreditCard className="h-3 w-3" />${doc.consultation_fee?.toLocaleString('es-CO')} COP
                          </span>
                        </div>
                      </div>
                      <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors shrink-0 mt-2" />
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── STEP 2: Date & Time ───────────────────────────────── */}
        {step === 2 && (
          <div>
            <button onClick={() => setStep(1)} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4 transition-colors">
              <ChevronLeft className="h-4 w-4" />Volver a médicos
            </button>
            <h2 className="text-xl font-semibold mb-1">Fecha y horario</h2>
            <p className="text-sm text-muted-foreground mb-6">Dr. {selectedDoctor?.first_name} {selectedDoctor?.last_name}</p>

            {/* Type */}
            <div className="mb-6">
              <p className="text-sm font-medium mb-3">Tipo de consulta</p>
              <div className="grid grid-cols-2 gap-3">
                {(['presencial', 'virtual'] as const).map(t => (
                  <button key={t} onClick={() => setConsultationType(t)}
                    className={cn('p-4 rounded-xl border-2 flex items-center gap-3 transition-all',
                      consultationType === t ? 'border-primary bg-primary/5' : 'border-border bg-white dark:bg-slate-900 hover:border-primary/50')}>
                    {t === 'presencial' ? <MapPin className="h-5 w-5 text-primary" /> : <Video className="h-5 w-5 text-primary" />}
                    <div className="text-left">
                      <p className="font-semibold text-sm capitalize">{t}</p>
                      <p className="text-xs text-muted-foreground">{t === 'presencial' ? 'En el consultorio' : 'Por videollamada'}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Dates */}
            <div className="mb-6">
              <p className="text-sm font-medium mb-3">Selecciona el día</p>
              <div className="flex gap-2 overflow-x-auto pb-2">
                {availableDates.map(d => {
                  const iso = formatLocalDate(d)
                  return (
                    <button key={iso} onClick={() => setSelectedDate(iso)}
                      className={cn('flex flex-col items-center p-3 rounded-xl border-2 min-w-[72px] transition-all',
                        selectedDate === iso ? 'border-primary bg-primary text-primary-foreground' : 'border-border bg-white dark:bg-slate-900 hover:border-primary/50')}>
                      <span className="text-[10px] font-medium uppercase">{formatDisplayDate(d).split(' ')[0]}</span>
                      <span className="text-xl font-bold">{d.getDate()}</span>
                      <span className="text-[10px]">{formatDisplayDate(d).split(' ').slice(1).join(' ')}</span>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Times */}
            {selectedDate && (
              <div className="mb-8">
                <p className="text-sm font-medium mb-3">Horario disponible</p>
                <div className="grid grid-cols-4 sm:grid-cols-7 gap-2">
                  {timeSlots.map(t => (
                    <button key={t} onClick={() => setSelectedTime(t)}
                      className={cn('p-2.5 rounded-lg border text-sm font-medium transition-all',
                        selectedTime === t ? 'border-primary bg-primary text-primary-foreground' : 'border-border bg-white dark:bg-slate-900 hover:border-primary/50')}>
                      {t}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <Button disabled={!selectedDate || !selectedTime} onClick={() => setStep(3)} className="w-full sm:w-auto" size="lg">
              Continuar <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        )}

        {/* ── STEP 3: Patient Data ─────────────────────────────── */}
        {step === 3 && (
          <div>
            <button onClick={() => setStep(2)} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4 transition-colors">
              <ChevronLeft className="h-4 w-4" />Volver al horario
            </button>
            <h2 className="text-xl font-semibold mb-1">Tus datos personales</h2>
            <p className="text-sm text-muted-foreground mb-6">Información necesaria para agendar tu cita</p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-2xl">
              {[
                { key: 'name', label: 'Nombre completo', icon: User, placeholder: 'Ej: Juan Pérez' },
                { key: 'document', label: 'Número de documento', icon: FileText, placeholder: 'Cédula o pasaporte' },
                { key: 'email', label: 'Correo electrónico', icon: Mail, placeholder: 'tucorreo@email.com', type: 'email' },
                { key: 'phone', label: 'Teléfono / Celular', icon: Phone, placeholder: '+57 300 000 0000', type: 'tel' },
                { key: 'dob', label: 'Fecha de nacimiento', icon: Calendar, placeholder: '', type: 'date' },
              ].map(({ key, label, icon: Icon, placeholder, type = 'text' }) => (
                <div key={key}>
                  <label className="text-sm font-medium mb-1.5 block">{label}</label>
                  <div className="relative">
                    <Icon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <input
                      type={type}
                      placeholder={placeholder}
                      value={(patientData as any)[key]}
                      onChange={e => setPatientData(p => ({ ...p, [key]: e.target.value }))}
                      className="w-full pl-10 pr-3 py-2.5 rounded-xl border border-input bg-white dark:bg-slate-900 text-sm focus:ring-2 focus:ring-primary focus:outline-none transition-all"
                    />
                  </div>
                </div>
              ))}
              <div className="sm:col-span-2">
                <label className="text-sm font-medium mb-1.5 block">Motivo de la consulta</label>
                <textarea
                  placeholder="Describe brevemente tus síntomas o el motivo de tu visita..."
                  value={patientData.reason}
                  onChange={e => setPatientData(p => ({ ...p, reason: e.target.value }))}
                  rows={3}
                  className="w-full px-3 py-2.5 rounded-xl border border-input bg-white dark:bg-slate-900 text-sm focus:ring-2 focus:ring-primary focus:outline-none transition-all resize-none"
                />
              </div>
            </div>

            <Button
              disabled={!patientData.name || !patientData.email || !patientData.phone}
              onClick={() => setStep(4)}
              className="w-full sm:w-auto mt-6"
              size="lg"
            >
              Ir al pago <CreditCard className="h-4 w-4 ml-1" />
            </Button>
          </div>
        )}

        {/* ── STEP 4: Payment ──────────────────────────────────── */}
        {step === 4 && (
          <div className="max-w-2xl">
            <button onClick={() => setStep(3)} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4 transition-colors">
              <ChevronLeft className="h-4 w-4" />Volver a datos
            </button>
            <h2 className="text-xl font-semibold mb-1">Pago de la consulta</h2>
            <p className="text-sm text-muted-foreground mb-6">Transacción 100% segura y cifrada</p>

            <div className="grid grid-cols-1 sm:grid-cols-5 gap-6">
              {/* Payment form */}
              <div className="sm:col-span-3 space-y-5">
                {/* Method selector */}
                <div className="grid grid-cols-3 gap-2">
                  {([
                    { k: 'card', label: 'Tarjeta', icon: CreditCard },
                    { k: 'transfer', label: 'Transferencia', icon: Activity },
                    { k: 'cash', label: 'En clínica', icon: MapPin },
                  ] as const).map(({ k, label, icon: Icon }) => (
                    <button key={k} onClick={() => setPayMethod(k)}
                      className={cn('p-3 rounded-xl border-2 flex flex-col items-center gap-1.5 text-xs font-medium transition-all',
                        payMethod === k ? 'border-primary bg-primary/5 text-primary' : 'border-border hover:border-primary/50')}>
                      <Icon className="h-4 w-4" />{label}
                    </button>
                  ))}
                </div>

                {payMethod === 'card' && (
                  <div className="space-y-3">
                    <div>
                      <label className="text-sm font-medium mb-1.5 block">Número de tarjeta</label>
                      <input type="text" placeholder="4242 4242 4242 4242" maxLength={19}
                        value={cardData.number}
                        onChange={e => setCardData(p => ({ ...p, number: e.target.value.replace(/\D/g, '').replace(/(.{4})/g, '$1 ').trim() }))}
                        className="w-full px-3 py-2.5 rounded-xl border border-input bg-white dark:bg-slate-900 text-sm font-mono focus:ring-2 focus:ring-primary focus:outline-none transition-all" />
                    </div>
                    <div>
                      <label className="text-sm font-medium mb-1.5 block">Nombre en la tarjeta</label>
                      <input type="text" placeholder="JUAN PEREZ"
                        value={cardData.holder}
                        onChange={e => setCardData(p => ({ ...p, holder: e.target.value.toUpperCase() }))}
                        className="w-full px-3 py-2.5 rounded-xl border border-input bg-white dark:bg-slate-900 text-sm uppercase focus:ring-2 focus:ring-primary focus:outline-none transition-all" />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-sm font-medium mb-1.5 block">Vencimiento</label>
                        <input type="text" placeholder="MM/AA" maxLength={5}
                          value={cardData.expiry}
                          onChange={e => setCardData(p => ({ ...p, expiry: e.target.value.replace(/\D/g, '').replace(/^(\d{2})(\d)/, '$1/$2') }))}
                          className="w-full px-3 py-2.5 rounded-xl border border-input bg-white dark:bg-slate-900 text-sm font-mono focus:ring-2 focus:ring-primary focus:outline-none transition-all" />
                      </div>
                      <div>
                        <label className="text-sm font-medium mb-1.5 block">CVV</label>
                        <input type="password" placeholder="•••" maxLength={4}
                          value={cardData.cvv}
                          onChange={e => setCardData(p => ({ ...p, cvv: e.target.value.replace(/\D/g, '') }))}
                          className="w-full px-3 py-2.5 rounded-xl border border-input bg-white dark:bg-slate-900 text-sm font-mono focus:ring-2 focus:ring-primary focus:outline-none transition-all" />
                      </div>
                    </div>
                  </div>
                )}

                {payMethod === 'transfer' && (
                  <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-200 dark:border-blue-800 text-sm space-y-2">
                    <p className="font-semibold text-blue-800 dark:text-blue-300">Datos para transferencia</p>
                    <p className="text-blue-700 dark:text-blue-400">Banco: <strong>Bancolombia</strong></p>
                    <p className="text-blue-700 dark:text-blue-400">Cuenta corriente: <strong>123-456789-01</strong></p>
                    <p className="text-blue-700 dark:text-blue-400">NIT: <strong>900.123.456-7</strong></p>
                    <p className="text-xs text-blue-600 dark:text-blue-400 mt-2">Envía el comprobante a <strong>pagos@telemedicina.app</strong> con tu nombre completo y número de documento.</p>
                  </div>
                )}

                {payMethod === 'cash' && (
                  <div className="p-4 bg-emerald-50 dark:bg-emerald-900/20 rounded-xl border border-emerald-200 dark:border-emerald-800 text-sm space-y-2">
                    <p className="font-semibold text-emerald-800 dark:text-emerald-300">Pago en clínica</p>
                    <p className="text-emerald-700 dark:text-emerald-400">Puedes pagar en efectivo o con datáfono el día de tu consulta en recepción.</p>
                    <p className="text-xs text-emerald-600 dark:text-emerald-400">Presenta tu código de reserva al llegar.</p>
                  </div>
                )}
              </div>

              {/* Order summary */}
              <div className="sm:col-span-2">
                <div className="bg-white dark:bg-slate-900 rounded-2xl border p-5 sticky top-20">
                  <h3 className="font-semibold text-sm mb-4">Resumen de tu cita</h3>
                  <div className="space-y-3 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Médico</span>
                      <span className="font-medium text-right">Dr. {selectedDoctor?.first_name} {selectedDoctor?.last_name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Especialidad</span>
                      <span className="font-medium text-right">{selectedSpecialty?.name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Fecha</span>
                      <span className="font-medium">{selectedDate ? new Date(selectedDate + 'T12:00').toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Hora</span>
                      <span className="font-medium">{selectedTime || '—'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Tipo</span>
                      <Badge variant={consultationType === 'virtual' ? 'info' : 'secondary'} className="text-xs capitalize">{consultationType}</Badge>
                    </div>
                    <div className="border-t pt-3 flex justify-between font-bold">
                      <span>Total</span>
                      <span className="text-primary">${selectedDoctor?.consultation_fee?.toLocaleString('es-CO')} COP</span>
                    </div>
                  </div>
                  <div className="mt-4 flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Lock className="h-3 w-3 text-green-500" />Transacción cifrada con SSL
                  </div>
                </div>
              </div>
            </div>

            <Button
              onClick={() => bookMutation.mutate()}
              disabled={bookMutation.isPending || (payMethod === 'card' && (!cardData.number || !cardData.holder || !cardData.expiry || !cardData.cvv))}
              className="w-full sm:w-auto mt-6 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
              size="lg"
            >
              {bookMutation.isPending ? (
                <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Procesando...</>
              ) : (
                <><Shield className="h-4 w-4 mr-2" />Confirmar y pagar ${selectedDoctor?.consultation_fee?.toLocaleString('es-CO')} COP</>
              )}
            </Button>
            {bookMutation.isError && (
              <p className="text-sm text-destructive mt-2">Hubo un error al procesar. Intenta nuevamente.</p>
            )}
          </div>
        )}

        {/* ── STEP 5: Success ──────────────────────────────────── */}
        {step === 5 && (
          <div className="flex flex-col items-center justify-center text-center py-12 animate-fade-in">
            <div className="h-24 w-24 rounded-full bg-gradient-to-br from-green-400 to-emerald-500 flex items-center justify-center mb-6 shadow-xl shadow-emerald-500/30">
              <CheckCircle className="h-12 w-12 text-white" />
            </div>
            <h2 className="text-3xl font-bold text-foreground mb-2">¡Cita confirmada!</h2>
            <p className="text-muted-foreground text-base mb-6 max-w-md">
              Tu cita ha sido agendada exitosamente. Recibirás un correo de confirmación en <strong>{patientData.email}</strong>.
            </p>

            <div className="bg-white dark:bg-slate-900 rounded-2xl border p-6 w-full max-w-sm mb-6 text-left space-y-3">
              <div className="flex justify-between items-center border-b pb-3">
                <span className="text-muted-foreground text-sm">Código de reserva</span>
                <span className="font-bold text-primary text-lg font-mono">{bookingRef}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Médico</span>
                <span className="font-medium">Dr. {selectedDoctor?.first_name} {selectedDoctor?.last_name}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Fecha y hora</span>
                <span className="font-medium">{selectedDate ? new Date(selectedDate + 'T12:00').toLocaleDateString('es-ES', { day: 'numeric', month: 'short' }) : ''} · {selectedTime}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Tipo</span>
                <Badge variant={consultationType === 'virtual' ? 'info' : 'secondary'} className="text-xs capitalize">{consultationType}</Badge>
              </div>
              <div className="flex justify-between text-sm font-bold pt-2 border-t">
                <span>Total pagado</span>
                <span className="text-emerald-600">${selectedDoctor?.consultation_fee?.toLocaleString('es-CO')} COP</span>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <Button variant="outline" onClick={() => {
                setStep(0); setSelectedSpecialty(null); setSelectedDoctor(null)
                setSelectedDate(''); setSelectedTime(''); setPatientData({ name: '', email: '', phone: '', document: '', dob: '', reason: '' })
                setCardData({ number: '', expiry: '', cvv: '', holder: '' })
              }}>
                Agendar otra cita
              </Button>
              <Button onClick={() => window.print()}>
                <FileText className="h-4 w-4 mr-2" />Imprimir comprobante
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <footer className="border-t bg-white/60 dark:bg-slate-900/60 backdrop-blur mt-16">
        <div className="max-w-5xl mx-auto px-4 py-6 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-muted-foreground">
          <span>© {new Date().getFullYear()} TelemedApp · Todos los derechos reservados</span>
          <div className="flex items-center gap-4">
            <span>Términos de uso</span>
            <span>Política de privacidad</span>
            <span className="flex items-center gap-1"><Lock className="h-3 w-3 text-green-500" />SSL</span>
          </div>
        </div>
      </footer>
    </div>
  )
}
