/**
 * Medical History Page — Full timeline with patient summary, type filters, and manual event entry
 */
import { useState, useRef, useEffect } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useLocation } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  BookOpen, Search, Stethoscope, FileText, FlaskConical, Pill,
  Calendar, User, Plus, Heart, AlertTriangle, Activity,
  X, ChevronDown, Filter, Clock, Download,
} from 'lucide-react'
import { PDFDownloadLink } from '@react-pdf/renderer'
import { MedicalHistoryDocument } from '@/components/pdf/MedicalHistoryDocument'
import { toast } from 'sonner'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog'
import api from '@/lib/api'
import { getApiErrorMessage } from '@/lib/errors'
import { cn, formatDate, formatRelativeTime, calculateAge } from '@/lib/utils'
import { useAuthStore } from '@/store/auth'

// ─── Config ────────────────────────────────────────────────────────────────────
const EVENT_META: Record<string, { label: string; icon: React.ElementType; color: string; border: string; bgDot: string }> = {
  consultation:    { label: 'Consulta',        icon: Stethoscope,   color: 'bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-400',             border: 'border-sky-200 dark:border-sky-800',         bgDot: 'bg-sky-500' },
  prescription:    { label: 'Receta',          icon: Pill,          color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400', border: 'border-emerald-200 dark:border-emerald-800', bgDot: 'bg-emerald-500' },
  exam:            { label: 'Examen',          icon: FlaskConical,  color: 'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400',   border: 'border-violet-200 dark:border-violet-800',   bgDot: 'bg-violet-500' },
  hospitalization: { label: 'Hospitalización', icon: Heart,         color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',               border: 'border-red-200 dark:border-red-800',         bgDot: 'bg-red-500' },
  surgery:         { label: 'Cirugía',         icon: Activity,      color: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',   border: 'border-orange-200 dark:border-orange-800',   bgDot: 'bg-orange-500' },
  allergy:         { label: 'Alergia',         icon: AlertTriangle, color: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',   border: 'border-yellow-200 dark:border-yellow-800',   bgDot: 'bg-yellow-500' },
  note:            { label: 'Nota',            icon: FileText,      color: 'bg-gray-100 text-gray-700 dark:bg-gray-800/50 dark:text-gray-400',           border: 'border-gray-200 dark:border-gray-700',       bgDot: 'bg-gray-400' },
}
const EVENT_TYPES = Object.entries(EVENT_META).map(([value, m]) => ({ value, label: m.label }))

// ─── Types ──────────────────────────────────────────────────────────────────────
interface Patient {
  id: number; first_name: string; last_name: string; document_number: string
  document_type: string; date_of_birth: string; gender: string
  blood_type: string | null; phone: string | null; email: string | null
  insurance_provider: string | null; allergies: string | null
}
interface MedicalEvent {
  id: number; patient_id: number; event_type: string
  event_date: string; title: string; description: string | null
  doctor_name: string | null; created_at: string
}

// ─── Add Event Dialog ────────────────────────────────────────────────────────
const eventSchema = z.object({
  event_type: z.enum(['consultation','prescription','exam','hospitalization','surgery','allergy','note']),
  event_date: z.string().min(1, 'Fecha requerida'),
  title: z.string().min(2, 'Título requerido'),
  description: z.string().optional(),
})
type EventFormData = z.infer<typeof eventSchema>

function AddEventDialog({ patientId, patientName, onClose, onSuccess }: {
  patientId: number; patientName: string; onClose: () => void; onSuccess: () => void
}) {
  const { register, handleSubmit, watch, formState: { errors, isSubmitting } } = useForm<EventFormData>({
    resolver: zodResolver(eventSchema),
    defaultValues: { event_type: 'note', event_date: new Date().toISOString().split('T')[0] },
  })
  const selectedType = watch('event_type')
  const meta = EVENT_META[selectedType] ?? EVENT_META.note
  const Icon = meta.icon

  const onSubmit = async (data: EventFormData) => {
    try {
      await api.post('/medical-history', { ...data, patient_id: patientId })
      toast.success('Evento agregado al historial')
      onSuccess(); onClose()
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Error al agregar el evento'))
    }
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5 text-primary" /> Agregar evento
          </DialogTitle>
          <DialogDescription>Registrar evento manual para <strong>{patientName}</strong></DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Preview */}
          <div className={cn('flex items-center gap-3 px-3 py-2.5 rounded-xl border', meta.color, meta.border)}>
            <Icon className="h-5 w-5 shrink-0" />
            <span className="text-sm font-medium">{meta.label}</span>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Tipo de evento *</label>
            <select {...register('event_type')}
              className="flex h-9 w-full rounded-lg border border-input bg-background px-3 py-1 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
              {EVENT_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Fecha *</label>
              <Input type="date" {...register('event_date')} />
              {errors.event_date && <p className="text-xs text-destructive">{errors.event_date.message}</p>}
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Título *</label>
            <Input placeholder="Ej: Cirugía de apendicitis..." {...register('title')} />
            {errors.title && <p className="text-xs text-destructive">{errors.title.message}</p>}
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Descripción</label>
            <textarea {...register('description')} rows={3}
              className="flex w-full rounded-lg border border-input bg-background px-3 py-2 text-sm resize-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              placeholder="Detalles adicionales del evento..." />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
            <Button type="submit" loading={isSubmitting}>Agregar evento</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// ─── Patient Card ────────────────────────────────────────────────────────────
function PatientCard({ patient, onClear, hideClear = false }: { patient: Patient; onClear: () => void; hideClear?: boolean }) {
  const age = patient.date_of_birth ? calculateAge(patient.date_of_birth) : null
  return (
    <Card className="border-primary/20 bg-gradient-to-r from-sky-50/60 to-indigo-50/60 dark:from-sky-900/10 dark:to-indigo-900/10">
      <CardContent className="p-4">
        <div className="flex items-start gap-4">
          <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-sky-500 to-indigo-600 flex items-center justify-center text-white font-bold text-lg shrink-0">
            {patient.first_name[0]}{patient.last_name[0]}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="font-bold text-base">{patient.first_name} {patient.last_name}</h2>
              {patient.blood_type && <Badge variant="destructive" className="text-xs">{patient.blood_type}</Badge>}
            </div>
            <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1 text-xs text-muted-foreground">
              <span>{patient.document_type}: {patient.document_number}</span>
              {age && <span>{age} años · {patient.gender === 'M' ? 'Masculino' : patient.gender === 'F' ? 'Femenino' : 'Otro'}</span>}
              {patient.phone && <span>📞 {patient.phone}</span>}
              {patient.insurance_provider && <span>🏥 {patient.insurance_provider}</span>}
            </div>
            {patient.allergies && patient.allergies !== '[]' && patient.allergies !== '' && (
              <div className="flex items-center gap-1.5 mt-2 px-2 py-1 rounded-md bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 w-fit">
                <AlertTriangle className="h-3 w-3 text-red-600 shrink-0" />
                <span className="text-xs text-red-700 dark:text-red-400 font-medium">Alergias: {patient.allergies}</span>
              </div>
            )}
          </div>
          {!hideClear && (
            <Button variant="ghost" size="icon-sm" onClick={onClear} aria-label="Cambiar paciente" className="shrink-0">
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

// ─── Timeline Event ──────────────────────────────────────────────────────────
function TimelineEvent({ event, showPatient = false }: { event: MedicalEvent & { patient_name?: string }; showPatient?: boolean }) {
  const [expanded, setExpanded] = useState(false)
  const meta = EVENT_META[event.event_type] ?? EVENT_META.note
  const Icon = meta.icon
  const hasDetail = !!event.description

  return (
    <div className="relative flex gap-4 group">
      <div className="relative z-10 shrink-0 mt-1">
        <div className={cn('h-9 w-9 rounded-full flex items-center justify-center border-2 border-background shadow-sm', meta.color)}>
          <Icon className="h-4 w-4" />
        </div>
      </div>
      <div
        className={cn(
          'flex-1 mb-4 rounded-xl border p-4 transition-all duration-200 bg-background',
          meta.border,
          hasDetail && 'cursor-pointer hover:shadow-sm'
        )}
        onClick={() => hasDetail && setExpanded(!expanded)}
      >
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <Badge variant="outline" className={cn('text-xs border-0 font-medium', meta.color)}>
                {meta.label}
              </Badge>
              <span className="text-xs text-muted-foreground">{formatDate(event.event_date)}</span>
              {showPatient && event.patient_name && (
                <span className="text-xs font-medium text-primary">· {event.patient_name}</span>
              )}
            </div>
            <p className="text-sm font-semibold leading-snug">{event.title}</p>
            {event.doctor_name && (
              <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                <Stethoscope className="h-3 w-3" /> Dr. {event.doctor_name}
              </p>
            )}
            {expanded && event.description && (
              <p className="text-sm text-muted-foreground/90 mt-2 leading-relaxed border-t border-border/50 pt-2">
                {event.description}
              </p>
            )}
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <span className="text-xs text-muted-foreground/50 whitespace-nowrap hidden sm:block">
              {formatRelativeTime(event.created_at)}
            </span>
            {hasDetail && (
              <ChevronDown className={cn('h-3.5 w-3.5 text-muted-foreground transition-transform', expanded && 'rotate-180')} />
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Main Page ───────────────────────────────────────────────────────────────
export function MedicalHistoryPage() {
  const user = useAuthStore(state => state.user)
  const isPatient = user?.role_id === 4
  const queryClient = useQueryClient()
  const location = useLocation()
  const statePatient = location.state?.patient as Patient | undefined
  const [patientSearch, setPatientSearch] = useState('')
  const [showDropdown, setShowDropdown] = useState(false)
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(statePatient || null)
  const [eventFilter, setEventFilter] = useState('all')
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  const [addEventOpen, setAddEventOpen] = useState(false)
  const [showFilters, setShowFilters] = useState(false)
  const searchRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) setShowDropdown(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  useQuery({
    queryKey: ['my-patient-profile'],
    queryFn: async () => {
      const { data } = await api.get('/profile')
      setSelectedPatient(data.data as Patient)
      return data
    },
    enabled: isPatient && !selectedPatient,
  })

  // Patient autocomplete
  const { data: patientsData } = useQuery({
    queryKey: ['patients-search', patientSearch],
    queryFn: async () => {
      const { data } = await api.get(`/patients?search=${encodeURIComponent(patientSearch)}&limit=8`)
      return data
    },
    enabled: !isPatient && patientSearch.length >= 1 && !selectedPatient,
  })

  // History — when patient selected: their full history; otherwise: recent from all
  const { data: historyData, isLoading } = useQuery({
    queryKey: ['medical-history', selectedPatient?.id ?? 'all', eventFilter, fromDate, toDate],
    queryFn: async () => {
      const params = new URLSearchParams({ limit: selectedPatient ? '200' : '20' })
      if (selectedPatient) params.set('patient_id', String(selectedPatient.id))
      if (eventFilter !== 'all') params.set('event_type', eventFilter)
      if (fromDate) params.set('from', fromDate)
      if (toDate) params.set('to', toDate)
      const { data } = await api.get(`/medical-history?${params}`)
      return data
    },
  })

  const events: (MedicalEvent & { patient_name?: string })[] = historyData?.data ?? []
  const patients: Patient[] = patientsData?.data ?? []
  const activeFilters = (eventFilter !== 'all' ? 1 : 0) + (fromDate ? 1 : 0) + (toDate ? 1 : 0)

  // Group by year (for patient mode) or flat list (for global mode)
  const grouped = events.reduce<Record<string, typeof events>>((acc, ev) => {
    const year = new Date(ev.event_date).getFullYear().toString()
    if (!acc[year]) acc[year] = []
    acc[year].push(ev)
    return acc
  }, {})
  const years = Object.keys(grouped).sort((a, b) => Number(b) - Number(a))

  // Counts by type (patient mode)
  const counts = events.reduce<Record<string, number>>((acc, ev) => {
    acc[ev.event_type] = (acc[ev.event_type] ?? 0) + 1; return acc
  }, {})

  const handleSelect = (p: Patient) => { setSelectedPatient(p); setPatientSearch(''); setShowDropdown(false) }
  const handleClear = () => { setSelectedPatient(null); setPatientSearch(''); setEventFilter('all'); setFromDate(''); setToDate('') }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title flex items-center gap-2">
            <BookOpen className="h-6 w-6 text-primary" /> Historial Clínico
          </h1>
          <p className="page-subtitle">Cronología completa del historial médico</p>
        </div>
        {selectedPatient && (
          <div className="flex items-center gap-2">
            <PDFDownloadLink
              document={<MedicalHistoryDocument data={{ patient: selectedPatient, events }} />}
              fileName={`Historial_${selectedPatient.first_name.replace(/\s+/g, '_')}_${selectedPatient.last_name.replace(/\s+/g, '_')}.pdf`}
            >
              {({ loading }) => (
                <Button variant="outline" disabled={loading} aria-label="Descargar PDF">
                  <Download className="h-4 w-4 mr-1.5" /> {loading ? 'Generando...' : 'Exportar PDF'}
                </Button>
              )}
            </PDFDownloadLink>
            {!isPatient && (
              <Button onClick={() => setAddEventOpen(true)} id="btn-agregar-evento">
                <Plus className="h-4 w-4 mr-1" /> Agregar evento
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Search + filters */}
      <Card>
        <CardContent className="p-4 space-y-3">
          <div className="flex gap-3">
            {!isPatient && (
              <div className="relative flex-1" ref={searchRef}>
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground z-10" />
                <Input
                  className="pl-9"
                  placeholder="Buscar paciente por nombre o documento..."
                  value={selectedPatient ? `${selectedPatient.first_name} ${selectedPatient.last_name}` : patientSearch}
                  onChange={(e) => { setPatientSearch(e.target.value); setShowDropdown(true); if (selectedPatient) setSelectedPatient(null) }}
                  onFocus={() => patients.length > 0 && !selectedPatient && setShowDropdown(true)}
                />
                {selectedPatient && (
                  <button onClick={handleClear}
                    className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 rounded-full bg-muted flex items-center justify-center hover:bg-muted-foreground/20 transition-colors">
                    <X className="h-3 w-3" />
                  </button>
                )}

                {/* Dropdown */}
                {showDropdown && patients.length > 0 && !selectedPatient && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-background border border-border rounded-xl shadow-2xl z-50 overflow-hidden divide-y divide-border/50">
                    {patients.map((p) => (
                      <button key={p.id}
                        className="flex items-center gap-3 w-full px-4 py-3 text-sm hover:bg-muted/50 text-left transition-colors"
                        onClick={() => handleSelect(p)}>
                        <div className="h-9 w-9 rounded-full bg-gradient-to-br from-sky-400 to-indigo-500 flex items-center justify-center text-white text-xs font-bold shrink-0">
                          {p.first_name[0]}{p.last_name[0]}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold truncate">{p.first_name} {p.last_name}</p>
                          <p className="text-xs text-muted-foreground">{p.document_type}: {p.document_number}</p>
                        </div>
                        {p.blood_type && <Badge variant="outline" className="text-xs shrink-0">{p.blood_type}</Badge>}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            <Button variant="outline"
              onClick={() => setShowFilters(!showFilters)}
              className={cn(showFilters && 'border-primary text-primary', 'relative')}>
              <Filter className="h-4 w-4 mr-1.5" /> Filtros
              {activeFilters > 0 && (
                <span className="absolute -top-1.5 -right-1.5 h-4 w-4 rounded-full bg-primary text-[10px] text-primary-foreground flex items-center justify-center font-bold">
                  {activeFilters}
                </span>
              )}
            </Button>
          </div>

          {showFilters && (
            <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-border">
              <Select value={eventFilter} onValueChange={setEventFilter}>
                <SelectTrigger className="w-44"><SelectValue placeholder="Tipo de evento" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los tipos</SelectItem>
                  {EVENT_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                </SelectContent>
              </Select>
              <div className="flex items-center gap-2">
                <Input type="date" className="w-36" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
                <span className="text-muted-foreground text-xs font-medium">hasta</span>
                <Input type="date" className="w-36" value={toDate} onChange={(e) => setToDate(e.target.value)} />
              </div>
              {activeFilters > 0 && (
                <Button variant="ghost" size="sm" onClick={() => { setEventFilter('all'); setFromDate(''); setToDate('') }}>
                  <X className="h-3.5 w-3.5 mr-1" /> Limpiar filtros
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Patient summary card */}
      {selectedPatient && <PatientCard patient={selectedPatient} onClear={handleClear} />}

      {/* Type pills (only in patient mode) */}
      {selectedPatient && Object.keys(counts).length > 0 && (
        <div className="flex flex-wrap gap-2">
          {Object.entries(counts).map(([type, count]) => {
            const meta = EVENT_META[type] ?? EVENT_META.note
            const Icon = meta.icon
            return (
              <button key={type}
                onClick={() => setEventFilter(eventFilter === type ? 'all' : type)}
                className={cn(
                  'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all',
                  eventFilter === type ? 'bg-primary text-primary-foreground border-primary scale-105' : `${meta.color} ${meta.border} hover:scale-105`
                )}>
                <Icon className="h-3 w-3" />
                {meta.label} <span className="opacity-60">({count})</span>
              </button>
            )
          })}
        </div>
      )}

      {/* Content */}
      {isLoading ? (
        <div className="space-y-3">{[...Array(5)].map((_, i) => <div key={i} className="skeleton h-20 rounded-xl" />)}</div>
      ) : events.length === 0 && selectedPatient ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <BookOpen className="h-10 w-10 text-muted-foreground/30 mb-3" />
            <p className="font-semibold text-muted-foreground">Sin eventos en el historial</p>
            <p className="text-sm text-muted-foreground/70 mt-1">
              {activeFilters > 0 ? 'Prueba con otros filtros' : 'No hay eventos registrados para este paciente'}
            </p>
            {activeFilters === 0 && (
              <Button className="mt-4" size="sm" onClick={() => setAddEventOpen(true)}>
                <Plus className="h-4 w-4 mr-1" /> Agregar primer evento
              </Button>
            )}
          </CardContent>
        </Card>
      ) : selectedPatient ? (
        /* ── Patient timeline grouped by year ── */
        <div className="space-y-8">
          <p className="text-xs text-muted-foreground">
            {events.length} evento{events.length !== 1 ? 's' : ''}
            {eventFilter !== 'all' && ` · ${EVENT_META[eventFilter]?.label}`}
          </p>
          {years.map((year) => (
            <div key={year}>
              <div className="flex items-center gap-3 mb-5">
                <div className="h-px flex-1 bg-border" />
                <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-muted border">
                  <Calendar className="h-3 w-3 text-muted-foreground" />
                  <span className="text-xs font-bold">{year}</span>
                  <span className="text-xs text-muted-foreground/60">({grouped[year].length})</span>
                </div>
                <div className="h-px flex-1 bg-border" />
              </div>
              <div className="relative">
                <div className="absolute left-4 top-4 bottom-4 w-0.5 bg-border/60" />
                <div className="space-y-0.5">
                  {grouped[year].map((ev) => <TimelineEvent key={ev.id} event={ev} />)}
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* ── Global mode: recent events + CTA ── */
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Recent activity feed */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <h2 className="text-sm font-semibold">Actividad reciente</h2>
              <Badge variant="secondary" className="text-xs">{events.length} eventos</Badge>
            </div>
            {events.length === 0 ? (
              <Card>
                <CardContent className="py-10 text-center">
                  <BookOpen className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">No hay eventos registrados aún</p>
                </CardContent>
              </Card>
            ) : (
              <div className="relative">
                <div className="absolute left-4 top-4 bottom-4 w-0.5 bg-border/60" />
                <div className="space-y-0.5">
                  {events.map((ev) => <TimelineEvent key={ev.id} event={ev} showPatient />)}
                </div>
              </div>
            )}
          </div>

          {/* Right panel: quick tip */}
          <div className="space-y-4">
            <Card className="border-dashed">
              <CardContent className="p-5 flex flex-col items-center text-center gap-3">
                <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-sky-100 to-indigo-100 dark:from-sky-900/30 dark:to-indigo-900/30 flex items-center justify-center">
                  <User className="h-7 w-7 text-primary/60" />
                </div>
                <div>
                  <p className="font-semibold text-sm">Ver historial completo</p>
                  <p className="text-xs text-muted-foreground mt-1">Busca un paciente por nombre o número de documento para acceder a su cronología completa</p>
                </div>
                <div className="w-full space-y-1.5">
                  {[
                    { color: 'bg-sky-500', label: 'Consultas' },
                    { color: 'bg-emerald-500', label: 'Recetas' },
                    { color: 'bg-violet-500', label: 'Exámenes' },
                    { color: 'bg-red-500', label: 'Hospitalizaciones' },
                    { color: 'bg-yellow-500', label: 'Alergias' },
                  ].map(({ color, label }) => (
                    <div key={label} className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span className={cn('h-2 w-2 rounded-full shrink-0', color)} />
                      {label}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {selectedPatient && addEventOpen && (
        <AddEventDialog
          patientId={selectedPatient.id}
          patientName={`${selectedPatient.first_name} ${selectedPatient.last_name}`}
          onClose={() => setAddEventOpen(false)}
          onSuccess={() => queryClient.invalidateQueries({ queryKey: ['medical-history'] })}
        />
      )}
    </div>
  )
}
