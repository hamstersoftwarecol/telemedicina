/**
 * Consultations Page — List + Detail drawer + New consultation form
 */
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  ClipboardList, Plus, Search, Eye, ChevronLeft, ChevronRight,
  User, Stethoscope, Calendar, Activity, Heart, Thermometer,
  Droplets, Wind, X, FileText, FlaskConical,
} from 'lucide-react'
import { toast } from 'sonner'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog'
import { SearchableSelect } from '@/components/ui/SearchableSelect'
import api from '@/lib/api'
import { getApiErrorMessage } from '@/lib/errors'
import { cn, formatDate, formatRelativeTime } from '@/lib/utils'

// ─── Types ────────────────────────────────────────────────────────────────────
interface Consultation {
  id: number
  patient_id: number
  doctor_id: number
  patient_name: string
  doctor_name: string
  consultation_date: string
  chief_complaint: string | null
  symptoms: string | null
  physical_exam: string | null
  diagnosis: string | null
  diagnosis_codes: string | null
  treatment: string | null
  observations: string | null
  weight_kg: number | null
  height_cm: number | null
  temperature_c: number | null
  heart_rate: number | null
  blood_pressure_systolic: number | null
  blood_pressure_diastolic: number | null
  oxygen_saturation: number | null
  respiratory_rate: number | null
  glucose_mg_dl: number | null
  follow_up_date: string | null
  follow_up_notes: string | null
  prescriptions?: unknown[]
  exams?: unknown[]
}

// ─── Schema ───────────────────────────────────────────────────────────────────
const consultationSchema = z.object({
  patient_id: z.coerce.number().min(1, 'Selecciona un paciente'),
  doctor_id: z.coerce.number().min(1, 'Selecciona un médico'),
  chief_complaint: z.string().min(2, 'Motivo de consulta requerido'),
  symptoms: z.string().optional(),
  physical_exam: z.string().optional(),
  diagnosis: z.string().optional(),
  treatment: z.string().optional(),
  observations: z.string().optional(),
  weight_kg: z.coerce.number().positive().optional().or(z.literal('')),
  height_cm: z.coerce.number().positive().optional().or(z.literal('')),
  temperature_c: z.coerce.number().optional().or(z.literal('')),
  heart_rate: z.coerce.number().positive().optional().or(z.literal('')),
  blood_pressure_systolic: z.coerce.number().positive().optional().or(z.literal('')),
  blood_pressure_diastolic: z.coerce.number().positive().optional().or(z.literal('')),
  oxygen_saturation: z.coerce.number().min(0).max(100).optional().or(z.literal('')),
  follow_up_date: z.string().optional(),
  follow_up_notes: z.string().optional(),
})
type ConsultationFormData = z.infer<typeof consultationSchema>

// ─── New Consultation Dialog ──────────────────────────────────────────────────
function NewConsultationDialog({ open, onClose, onSuccess }: { open: boolean; onClose: () => void; onSuccess: () => void }) {
  const { data: patients } = useQuery({
    queryKey: ['patients-list'],
    queryFn: async () => { const { data } = await api.get('/patients?limit=100'); return data },
    enabled: open,
  })
  const { data: doctors } = useQuery({
    queryKey: ['doctors-list'],
    queryFn: async () => { const { data } = await api.get('/doctors?limit=100'); return data },
    enabled: open,
  })

  const { register, handleSubmit, reset, setValue, control, formState: { errors, isSubmitting } } = useForm<ConsultationFormData>({
    resolver: zodResolver(consultationSchema),
  })

  const onSubmit = async (data: ConsultationFormData) => {
    try {
      const payload = Object.fromEntries(
        Object.entries(data).map(([k, v]) => [k, v === '' ? null : v])
      )
      await api.post('/consultations', payload)
      toast.success('Consulta registrada correctamente')
      onSuccess()
      onClose()
      reset()
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Error al registrar la consulta'))
    }
  }

  const TextArea = ({ label, field, rows = 3 }: { label: string; field: keyof ConsultationFormData; rows?: number }) => (
    <div className="space-y-1">
      <label className="text-xs font-medium text-muted-foreground">{label}</label>
      <textarea
        {...register(field)}
        rows={rows}
        className="flex w-full rounded-lg border border-input bg-background px-3 py-2 text-sm resize-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      />
    </div>
  )

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ClipboardList className="h-5 w-5 text-primary" />
            Nueva consulta médica
          </DialogTitle>
          <DialogDescription>Registra los datos clínicos de la consulta</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          {/* Patient & Doctor */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Paciente *</label>
              <Controller
                name="patient_id"
                control={control}
                render={({ field }) => (
                  <SearchableSelect
                    value={field.value}
                    onChange={(val) => field.onChange(Number(val))}
                    options={(patients?.data ?? []).map((p: any) => ({
                      value: p.id,
                      label: `${p.first_name} ${p.last_name}`
                    }))}
                  />
                )}
              />
              {errors.patient_id && <p className="text-xs text-destructive">{errors.patient_id.message}</p>}
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Médico *</label>
              <Controller
                name="doctor_id"
                control={control}
                render={({ field }) => (
                  <SearchableSelect
                    value={field.value}
                    onChange={(val) => field.onChange(Number(val))}
                    options={(doctors?.data ?? []).map((d: any) => ({
                      value: d.id,
                      label: `${d.first_name} ${d.last_name}`
                    }))}
                  />
                )}
              />
              {errors.doctor_id && <p className="text-xs text-destructive">{errors.doctor_id.message}</p>}
            </div>
          </div>

          {/* Motivo */}
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">Motivo de consulta *</label>
            <Input placeholder="Ej: Dolor de cabeza persistente..." {...register('chief_complaint')} />
            {errors.chief_complaint && <p className="text-xs text-destructive">{errors.chief_complaint.message}</p>}
          </div>

          <TextArea label="Síntomas" field="symptoms" />
          <TextArea label="Examen físico" field="physical_exam" />
          <TextArea label="Diagnóstico" field="diagnosis" rows={2} />
          <TextArea label="Tratamiento" field="treatment" />
          <TextArea label="Observaciones" field="observations" rows={2} />

          {/* Vitals */}
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Signos vitales</p>
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: 'Peso (kg)', field: 'weight_kg' as const, placeholder: '70' },
                { label: 'Talla (cm)', field: 'height_cm' as const, placeholder: '170' },
                { label: 'Temp (°C)', field: 'temperature_c' as const, placeholder: '36.5' },
                { label: 'FC (lpm)', field: 'heart_rate' as const, placeholder: '75' },
                { label: 'TA sistólica', field: 'blood_pressure_systolic' as const, placeholder: '120' },
                { label: 'TA diastólica', field: 'blood_pressure_diastolic' as const, placeholder: '80' },
                { label: 'SpO₂ (%)', field: 'oxygen_saturation' as const, placeholder: '98' },
              ].map(({ label, field, placeholder }) => (
                <div key={field} className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground">{label}</label>
                  <Input type="number" step="0.1" placeholder={placeholder} {...register(field)} />
                </div>
              ))}
            </div>
          </div>

          {/* Follow-up */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Fecha de seguimiento</label>
              <Input type="date" {...register('follow_up_date')} />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Notas de seguimiento</label>
              <Input placeholder="Indicaciones para próxima cita..." {...register('follow_up_notes')} />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
            <Button type="submit" loading={isSubmitting}>Registrar consulta</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// ─── Detail Drawer ────────────────────────────────────────────────────────────
function ConsultationDetailDialog({ id, onClose }: { id: number; onClose: () => void }) {
  const { data, isLoading } = useQuery({
    queryKey: ['consultation', id],
    queryFn: async () => { const { data } = await api.get(`/consultations/${id}`); return data },
  })
  const c: Consultation | undefined = data?.data

  const VitalChip = ({ icon: Icon, label, value, unit, color }: { icon: React.ElementType; label: string; value: number | null; unit: string; color: string }) => (
    value ? (
      <div className={cn('flex items-center gap-2 px-3 py-2.5 rounded-xl border', color)}>
        <Icon className="h-4 w-4 shrink-0" />
        <div>
          <p className="text-xs text-muted-foreground">{label}</p>
          <p className="text-sm font-semibold">{value} <span className="text-xs font-normal text-muted-foreground">{unit}</span></p>
        </div>
      </div>
    ) : null
  )

  const Section = ({ title, content }: { title: string; content: string | null | undefined }) => (
    content ? (
      <div>
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">{title}</p>
        <p className="text-sm leading-relaxed text-foreground/90 bg-muted/40 rounded-lg px-3 py-2.5">{content}</p>
      </div>
    ) : null
  )

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ClipboardList className="h-5 w-5 text-primary" />
            Detalle de consulta #{id}
          </DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="space-y-3">{[...Array(5)].map((_, i) => <div key={i} className="skeleton h-10 rounded-lg" />)}</div>
        ) : !c ? (
          <p className="text-center text-muted-foreground py-8">No se encontró la consulta</p>
        ) : (
          <div className="space-y-5">
            {/* Header info */}
            <div className="grid grid-cols-2 gap-3">
              <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/40">
                <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center">
                  <User className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Paciente</p>
                  <p className="text-sm font-semibold">{c.patient_name}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/40">
                <div className="h-9 w-9 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                  <Stethoscope className="h-4 w-4 text-emerald-600" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Médico</p>
                  <p className="text-sm font-semibold">{c.doctor_name}</p>
                </div>
              </div>
            </div>

            {/* Date + chief complaint */}
            <div className="flex items-start gap-3 p-4 rounded-xl border border-primary/20 bg-primary/5">
              <Calendar className="h-5 w-5 text-primary mt-0.5 shrink-0" />
              <div>
                <p className="text-xs text-muted-foreground">{formatDate(c.consultation_date)}</p>
                <p className="text-sm font-semibold mt-0.5">{c.chief_complaint ?? 'Sin motivo registrado'}</p>
              </div>
            </div>

            {/* Vitals */}
            {(c.weight_kg || c.height_cm || c.temperature_c || c.heart_rate || c.blood_pressure_systolic || c.oxygen_saturation) && (
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Signos vitales</p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  <VitalChip icon={Activity} label="Peso" value={c.weight_kg} unit="kg" color="border-sky-200 bg-sky-50 dark:bg-sky-900/20" />
                  <VitalChip icon={Activity} label="Talla" value={c.height_cm} unit="cm" color="border-sky-200 bg-sky-50 dark:bg-sky-900/20" />
                  <VitalChip icon={Thermometer} label="Temperatura" value={c.temperature_c} unit="°C" color="border-amber-200 bg-amber-50 dark:bg-amber-900/20" />
                  <VitalChip icon={Heart} label="Frec. cardíaca" value={c.heart_rate} unit="lpm" color="border-red-200 bg-red-50 dark:bg-red-900/20" />
                  <VitalChip icon={Activity} label="TA" value={c.blood_pressure_systolic} unit={`/${c.blood_pressure_diastolic} mmHg`} color="border-violet-200 bg-violet-50 dark:bg-violet-900/20" />
                  <VitalChip icon={Droplets} label="SpO₂" value={c.oxygen_saturation} unit="%" color="border-teal-200 bg-teal-50 dark:bg-teal-900/20" />
                </div>
              </div>
            )}

            {/* Clinical notes */}
            <Section title="Síntomas" content={c.symptoms} />
            <Section title="Examen físico" content={c.physical_exam} />
            <Section title="Diagnóstico" content={c.diagnosis} />
            <Section title="Tratamiento" content={c.treatment} />
            <Section title="Observaciones" content={c.observations} />

            {/* Follow-up */}
            {c.follow_up_date && (
              <div className="flex items-start gap-3 p-4 rounded-xl border border-amber-200 bg-amber-50 dark:bg-amber-900/20">
                <Calendar className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs text-amber-700 dark:text-amber-400 font-semibold">Seguimiento programado</p>
                  <p className="text-sm font-medium mt-0.5">{formatDate(c.follow_up_date)}</p>
                  {c.follow_up_notes && <p className="text-xs text-muted-foreground mt-1">{c.follow_up_notes}</p>}
                </div>
              </div>
            )}

            {/* Prescriptions & Exams count */}
            {((c.prescriptions?.length ?? 0) > 0 || (c.exams?.length ?? 0) > 0) && (
              <div className="grid grid-cols-2 gap-3">
                {(c.prescriptions?.length ?? 0) > 0 && (
                  <div className="flex items-center gap-2 p-3 rounded-xl bg-muted/40">
                    <FileText className="h-4 w-4 text-violet-600" />
                    <p className="text-sm"><span className="font-bold">{c.prescriptions!.length}</span> receta{c.prescriptions!.length !== 1 ? 's' : ''}</p>
                  </div>
                )}
                {(c.exams?.length ?? 0) > 0 && (
                  <div className="flex items-center gap-2 p-3 rounded-xl bg-muted/40">
                    <FlaskConical className="h-4 w-4 text-sky-600" />
                    <p className="text-sm"><span className="font-bold">{c.exams!.length}</span> examen{c.exams!.length !== 1 ? 'es' : ''}</p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export function ConsultationsPage() {
  const queryClient = useQueryClient()
  const [statusFilter, setStatusFilter] = useState('all')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [newOpen, setNewOpen] = useState(false)
  const [detailId, setDetailId] = useState<number | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['consultations', statusFilter, page],
    queryFn: async () => {
      const params = new URLSearchParams({ page: String(page), limit: '15' })
      if (statusFilter !== 'all') params.set('status', statusFilter)
      const { data } = await api.get(`/consultations?${params}`)
      return data
    },
  })

  const consultations: Consultation[] = data?.data ?? []
  const pagination = data?.pagination ?? { total: 0 }
  const totalPages = Math.ceil(pagination.total / 15) || 1

  // Client-side search filter
  const filtered = search
    ? consultations.filter((c) =>
        c.patient_name?.toLowerCase().includes(search.toLowerCase()) ||
        c.doctor_name?.toLowerCase().includes(search.toLowerCase()) ||
        c.chief_complaint?.toLowerCase().includes(search.toLowerCase()) ||
        c.diagnosis?.toLowerCase().includes(search.toLowerCase())
      )
    : consultations

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title flex items-center gap-2">
            <ClipboardList className="h-6 w-6 text-primary" />
            Consultas
          </h1>
          <p className="page-subtitle">Historial y gestión de consultas médicas</p>
        </div>
        <Button onClick={() => setNewOpen(true)} id="btn-nueva-consulta">
          <Plus className="h-4 w-4 mr-1" />
          Nueva consulta
        </Button>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total consultas', value: pagination.total, color: 'bg-sky-500', icon: ClipboardList },
          { label: 'Hoy', value: consultations.filter(c => c.consultation_date?.startsWith(new Date().toISOString().slice(0,10))).length, color: 'bg-emerald-500', icon: Calendar },
          { label: 'Con diagnóstico', value: consultations.filter(c => c.diagnosis).length, color: 'bg-violet-500', icon: Activity },
          { label: 'Con seguimiento', value: consultations.filter(c => c.follow_up_date).length, color: 'bg-amber-500', icon: Wind },
        ].map(({ label, value, color, icon: Icon }) => (
          <Card key={label} className="card-hover">
            <CardContent className="p-5 flex items-center gap-3">
              <div className={cn('h-9 w-9 rounded-lg flex items-center justify-center shrink-0', color)}>
                <Icon className="h-4.5 w-4.5 text-white" />
              </div>
              <div>
                <p className="text-xl font-bold">{value}</p>
                <p className="text-xs text-muted-foreground">{label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4 flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              className="pl-9"
              placeholder="Buscar por paciente, médico o diagnóstico..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 space-y-3">
              {[...Array(6)].map((_, i) => <div key={i} className="skeleton h-14 rounded-lg" />)}
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="h-14 w-14 rounded-2xl bg-muted flex items-center justify-center mb-3">
                <ClipboardList className="h-7 w-7 text-muted-foreground/40" />
              </div>
              <p className="font-semibold text-muted-foreground">
                {search ? 'Sin resultados' : 'No hay consultas registradas'}
              </p>
              <p className="text-sm text-muted-foreground/70 mt-1">
                {!search && 'Registra la primera consulta médica'}
              </p>
              {!search && (
                <Button className="mt-4" onClick={() => setNewOpen(true)}>
                  <Plus className="h-4 w-4 mr-1" /> Nueva consulta
                </Button>
              )}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>#</TableHead>
                  <TableHead>Paciente</TableHead>
                  <TableHead>Médico</TableHead>
                  <TableHead className="hidden md:table-cell">Motivo</TableHead>
                  <TableHead className="hidden lg:table-cell">Diagnóstico</TableHead>
                  <TableHead>Fecha</TableHead>
                  <TableHead className="hidden md:table-cell">Seguimiento</TableHead>
                  <TableHead className="text-right">Acción</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((c) => (
                  <TableRow
                    key={c.id}
                    className="cursor-pointer"
                    onClick={() => setDetailId(c.id)}
                  >
                    <TableCell className="font-mono text-xs text-muted-foreground">#{c.id}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center text-xs font-semibold text-primary shrink-0">
                          {c.patient_name?.charAt(0)}
                        </div>
                        <span className="text-sm font-medium">{c.patient_name}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">{c.doctor_name}</TableCell>
                    <TableCell className="hidden md:table-cell max-w-[180px]">
                      <p className="text-sm truncate">{c.chief_complaint ?? '—'}</p>
                    </TableCell>
                    <TableCell className="hidden lg:table-cell max-w-[180px]">
                      {c.diagnosis ? (
                        <p className="text-sm truncate text-emerald-700 dark:text-emerald-400">{c.diagnosis}</p>
                      ) : (
                        <span className="text-muted-foreground text-xs">Sin diagnóstico</span>
                      )}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                      {formatRelativeTime(c.consultation_date)}
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      {c.follow_up_date ? (
                        <Badge variant="warning" className="text-xs">{formatDate(c.follow_up_date)}</Badge>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={(e) => { e.stopPropagation(); setDetailId(c.id) }}
                        aria-label="Ver detalle"
                      >
                        <Eye className="h-3.5 w-3.5" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground">{pagination.total} consultas en total</p>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm">{page} / {totalPages}</span>
            <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Dialogs */}
      <NewConsultationDialog
        open={newOpen}
        onClose={() => setNewOpen(false)}
        onSuccess={() => queryClient.invalidateQueries({ queryKey: ['consultations'] })}
      />
      {detailId !== null && (
        <ConsultationDetailDialog id={detailId} onClose={() => setDetailId(null)} />
      )}
    </div>
  )
}
