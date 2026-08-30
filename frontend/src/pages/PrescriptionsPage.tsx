/**
 * Prescriptions Page — List + Detail + New prescription with medication items
 */
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm, useFieldArray, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  FileText, Plus, Search, Eye, Trash2, ChevronLeft, ChevronRight,
  Pill, User, Stethoscope, Calendar, CheckCircle, Clock, XCircle, AlertCircle, Download
} from 'lucide-react'
import { PDFDownloadLink } from '@react-pdf/renderer'
import { PrescriptionDocument } from '@/components/pdf/PrescriptionDocument'
import { toast } from 'sonner'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
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
interface PrescriptionItem {
  id: number
  medication_name: string
  generic_name: string | null
  dosage: string
  frequency: string
  duration: string
  quantity: number | null
  instructions: string | null
  route: string
}

interface Prescription {
  id: number
  patient_id: number
  doctor_id: number
  patient_name: string
  doctor_name: string
  doctor_email?: string
  license_number?: string
  prescription_date: string
  diagnosis: string | null
  notes: string | null
  valid_until: string | null
  status: string
  items?: PrescriptionItem[]
  patient_document_number?: string
  patient_blood_type?: string
  patient_allergies?: string
}

const STATUS_META: Record<string, { label: string; variant: 'success' | 'warning' | 'destructive' | 'secondary' | 'outline'; icon: React.ElementType }> = {
  active:    { label: 'Activa',     variant: 'success',     icon: CheckCircle },
  dispensed: { label: 'Dispensada', variant: 'info' as 'outline',   icon: CheckCircle },
  expired:   { label: 'Expirada',   variant: 'secondary',   icon: XCircle },
  cancelled: { label: 'Cancelada',  variant: 'destructive', icon: XCircle },
}

// ─── Schemas ──────────────────────────────────────────────────────────────────
const itemSchema = z.object({
  medication_name: z.string().min(2, 'Nombre requerido'),
  generic_name: z.string().optional(),
  dosage: z.string().min(1, 'Dosis requerida'),
  frequency: z.string().min(1, 'Frecuencia requerida'),
  duration: z.string().min(1, 'Duración requerida'),
  quantity: z.coerce.number().positive().optional().or(z.literal('')),
  instructions: z.string().optional(),
  route: z.string().default('oral'),
})

const rxSchema = z.object({
  patient_id: z.coerce.number().min(1, 'Selecciona un paciente'),
  doctor_id: z.coerce.number().min(1, 'Selecciona un médico'),
  diagnosis: z.string().optional(),
  notes: z.string().optional(),
  valid_until: z.string().optional(),
  items: z.array(itemSchema).min(1, 'Agrega al menos un medicamento'),
})
type RxFormData = z.infer<typeof rxSchema>

// ─── Detail Dialog ────────────────────────────────────────────────────────────
function PrescriptionDetailDialog({ id, onClose }: { id: number; onClose: () => void }) {
  const queryClient = useQueryClient()
  const { data, isLoading } = useQuery({
    queryKey: ['prescription', id],
    queryFn: async () => { const { data } = await api.get(`/prescriptions/${id}`); return data },
  })
  const rx: Prescription | undefined = data?.data

  const statusMutation = useMutation({
    mutationFn: (status: string) => api.patch(`/prescriptions/${id}/status`, { status }),
    onSuccess: () => {
      toast.success('Estado actualizado')
      queryClient.invalidateQueries({ queryKey: ['prescriptions'] })
      queryClient.invalidateQueries({ queryKey: ['prescription', id] })
    },
  })

  const ROUTE_LABELS: Record<string, string> = {
    oral: 'Oral', sublingual: 'Sublingual', topico: 'Tópico',
    intravenoso: 'IV', intramuscular: 'IM', inhalado: 'Inhalado',
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              Receta #{id}
            </div>
            {rx && (
              <PDFDownloadLink
                document={<PrescriptionDocument data={rx} />}
                fileName={`Receta_${rx.patient_name.replace(/\s+/g, '_')}_${formatDate(rx.prescription_date).replace(/\s+/g, '')}.pdf`}
              >
                {({ loading }) => (
                  <Button variant="outline" size="sm" disabled={loading} className="h-8">
                    <Download className="h-4 w-4 mr-1.5" />
                    {loading ? 'Generando...' : 'Descargar PDF'}
                  </Button>
                )}
              </PDFDownloadLink>
            )}
          </DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="space-y-3">{[...Array(4)].map((_, i) => <div key={i} className="skeleton h-12 rounded-lg" />)}</div>
        ) : !rx ? (
          <p className="text-center text-muted-foreground py-8">No se encontró la receta</p>
        ) : (
          <div className="space-y-5">
            {/* Header card */}
            <div className="p-4 rounded-xl border bg-gradient-to-r from-sky-50 to-indigo-50 dark:from-sky-900/20 dark:to-indigo-900/20">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <p className="text-xs text-muted-foreground">Fecha de emisión</p>
                  <p className="font-semibold text-sm">{formatDate(rx.prescription_date)}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={(STATUS_META[rx.status]?.variant) ?? 'outline'}>
                    {STATUS_META[rx.status]?.label ?? rx.status}
                  </Badge>
                  {rx.status === 'active' && (
                    <Button size="sm" variant="outline" className="text-xs h-7"
                      onClick={() => statusMutation.mutate('dispensed')} loading={statusMutation.isPending}>
                      Marcar dispensada
                    </Button>
                  )}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                    <User className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Paciente</p>
                    <p className="text-sm font-semibold">{rx.patient_name}</p>
                    {rx.patient_blood_type && <p className="text-xs text-muted-foreground">Tipo sangre: {rx.patient_blood_type}</p>}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                    <Stethoscope className="h-4 w-4 text-emerald-600" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Médico</p>
                    <p className="text-sm font-semibold">{rx.doctor_name}</p>
                    {rx.license_number && <p className="text-xs text-muted-foreground">Reg. {rx.license_number}</p>}
                  </div>
                </div>
              </div>
            </div>

            {/* Allergies warning */}
            {rx.patient_allergies && rx.patient_allergies !== '[]' && (
              <div className="flex items-start gap-2 p-3 rounded-lg border border-red-200 bg-red-50 dark:bg-red-900/20">
                <AlertCircle className="h-4 w-4 text-red-600 mt-0.5 shrink-0" />
                <div>
                  <p className="text-xs font-semibold text-red-700 dark:text-red-400">Alergias del paciente</p>
                  <p className="text-xs text-red-600 dark:text-red-400 mt-0.5">{rx.patient_allergies}</p>
                </div>
              </div>
            )}

            {rx.diagnosis && (
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Diagnóstico</p>
                <p className="text-sm bg-muted/40 rounded-lg px-3 py-2">{rx.diagnosis}</p>
              </div>
            )}

            {/* Medication items */}
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
                Medicamentos ({rx.items?.length ?? 0})
              </p>
              <div className="space-y-3">
                {(rx.items ?? []).map((item, i) => (
                  <div key={item.id}
                    className="p-4 rounded-xl border bg-background hover:border-primary/30 transition-colors">
                    <div className="flex items-start gap-3">
                      <div className="h-9 w-9 rounded-lg bg-violet-500/10 flex items-center justify-center shrink-0 mt-0.5">
                        <Pill className="h-4 w-4 text-violet-600" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="font-semibold text-sm">{item.medication_name}</p>
                          <Badge variant="secondary" className="text-xs">{ROUTE_LABELS[item.route] ?? item.route}</Badge>
                        </div>
                        {item.generic_name && (
                          <p className="text-xs text-muted-foreground mb-2">Genérico: {item.generic_name}</p>
                        )}
                        <div className="grid grid-cols-3 gap-2 text-xs">
                          <div className="bg-muted/50 rounded px-2 py-1">
                            <p className="text-muted-foreground">Dosis</p>
                            <p className="font-medium">{item.dosage}</p>
                          </div>
                          <div className="bg-muted/50 rounded px-2 py-1">
                            <p className="text-muted-foreground">Frecuencia</p>
                            <p className="font-medium">{item.frequency}</p>
                          </div>
                          <div className="bg-muted/50 rounded px-2 py-1">
                            <p className="text-muted-foreground">Duración</p>
                            <p className="font-medium">{item.duration}</p>
                          </div>
                        </div>
                        {item.instructions && (
                          <p className="text-xs text-muted-foreground mt-2 italic">📝 {item.instructions}</p>
                        )}
                      </div>
                      {item.quantity && (
                        <div className="text-right shrink-0">
                          <p className="text-xs text-muted-foreground">Cantidad</p>
                          <p className="text-sm font-bold">{item.quantity}</p>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Notes + validity */}
            {rx.notes && (
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Notas</p>
                <p className="text-sm bg-muted/40 rounded-lg px-3 py-2 italic">{rx.notes}</p>
              </div>
            )}
            {rx.valid_until && (
              <div className="flex items-center gap-2 p-3 rounded-lg border border-amber-200 bg-amber-50 dark:bg-amber-900/20">
                <Calendar className="h-4 w-4 text-amber-600 shrink-0" />
                <p className="text-sm"><span className="font-semibold text-amber-700 dark:text-amber-400">Válida hasta:</span> {formatDate(rx.valid_until)}</p>
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

// ─── New Prescription Dialog ──────────────────────────────────────────────────
function NewPrescriptionDialog({ open, onClose, onSuccess }: { open: boolean; onClose: () => void; onSuccess: () => void }) {
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

  const { register, handleSubmit, control, reset, formState: { errors, isSubmitting } } = useForm<RxFormData>({
    resolver: zodResolver(rxSchema),
    defaultValues: { items: [{ medication_name: '', dosage: '', frequency: '', duration: '', route: 'oral' }] },
  })

  const { fields, append, remove } = useFieldArray({ control, name: 'items' })

  const onSubmit = async (data: RxFormData) => {
    try {
      const payload = {
        ...data,
        items: data.items.map(item => ({
          ...item,
          quantity: item.quantity === '' ? null : item.quantity,
        })),
      }
      await api.post('/prescriptions', payload)
      toast.success('Receta emitida correctamente')
      onSuccess()
      onClose()
      reset()
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Error al emitir la receta'))
    }
  }

  const ROUTES = ['oral', 'sublingual', 'topico', 'intravenoso', 'intramuscular', 'inhalado']

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            Nueva receta médica
          </DialogTitle>
          <DialogDescription>Emite una prescripción con uno o más medicamentos</DialogDescription>
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

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Diagnóstico</label>
              <Input placeholder="Ej: Hipertensión arterial" {...register('diagnosis')} />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Válida hasta</label>
              <Input type="date" {...register('valid_until')} />
            </div>
          </div>

          {/* Medications */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Medicamentos *
              </p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => append({ medication_name: '', dosage: '', frequency: '', duration: '', route: 'oral' })}
              >
                <Plus className="h-3.5 w-3.5 mr-1" /> Agregar medicamento
              </Button>
            </div>
            {errors.items && typeof errors.items === 'object' && 'message' in errors.items && (
              <p className="text-xs text-destructive mb-2">{errors.items.message as string}</p>
            )}

            <div className="space-y-4">
              {fields.map((field, index) => (
                <div key={field.id} className="p-4 rounded-xl border bg-muted/20 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="h-6 w-6 rounded-full bg-violet-500 flex items-center justify-center">
                        <Pill className="h-3 w-3 text-white" />
                      </div>
                      <span className="text-xs font-semibold">Medicamento {index + 1}</span>
                    </div>
                    {fields.length > 1 && (
                      <Button type="button" variant="ghost" size="icon-sm"
                        className="hover:text-destructive" onClick={() => remove(index)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-muted-foreground">Nombre comercial *</label>
                      <Input placeholder="Ej: Losartan" {...register(`items.${index}.medication_name`)} />
                      {errors.items?.[index]?.medication_name && (
                        <p className="text-xs text-destructive">{errors.items[index].medication_name?.message}</p>
                      )}
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-muted-foreground">Nombre genérico</label>
                      <Input placeholder="Ej: Losartán potásico" {...register(`items.${index}.generic_name`)} />
                    </div>
                  </div>

                  <div className="grid grid-cols-4 gap-2">
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-muted-foreground">Dosis *</label>
                      <Input placeholder="50mg" {...register(`items.${index}.dosage`)} />
                      {errors.items?.[index]?.dosage && (
                        <p className="text-xs text-destructive">{errors.items[index].dosage?.message}</p>
                      )}
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-muted-foreground">Frecuencia *</label>
                      <Input placeholder="Cada 12h" {...register(`items.${index}.frequency`)} />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-muted-foreground">Duración *</label>
                      <Input placeholder="30 días" {...register(`items.${index}.duration`)} />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-muted-foreground">Cantidad</label>
                      <Input type="number" placeholder="30" {...register(`items.${index}.quantity`)} />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-muted-foreground">Vía de administración</label>
                      <select {...register(`items.${index}.route`)}
                        className="flex h-9 w-full rounded-lg border border-input bg-background px-3 py-1 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                        {ROUTES.map(r => <option key={r} value={r} className="capitalize">{r.charAt(0).toUpperCase() + r.slice(1)}</option>)}
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-muted-foreground">Instrucciones especiales</label>
                      <Input placeholder="Tomar con alimentos..." {...register(`items.${index}.instructions`)} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">Notas adicionales</label>
            <textarea {...register('notes')} rows={2}
              className="flex w-full rounded-lg border border-input bg-background px-3 py-2 text-sm resize-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              placeholder="Indicaciones adicionales para el paciente..." />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
            <Button type="submit" loading={isSubmitting}>
              <FileText className="h-4 w-4 mr-1.5" /> Emitir receta
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export function PrescriptionsPage() {
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [page, setPage] = useState(1)
  const [newOpen, setNewOpen] = useState(false)
  const [detailId, setDetailId] = useState<number | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['prescriptions', statusFilter, page],
    queryFn: async () => {
      const params = new URLSearchParams({ page: String(page), limit: '15' })
      if (statusFilter !== 'all') params.set('status', statusFilter)
      const { data } = await api.get(`/prescriptions?${params}`)
      return data
    },
  })

  const prescriptions: Prescription[] = data?.data ?? []
  const filtered = search
    ? prescriptions.filter(rx =>
        rx.patient_name?.toLowerCase().includes(search.toLowerCase()) ||
        rx.doctor_name?.toLowerCase().includes(search.toLowerCase()) ||
        rx.diagnosis?.toLowerCase().includes(search.toLowerCase())
      )
    : prescriptions

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title flex items-center gap-2">
            <FileText className="h-6 w-6 text-primary" />
            Recetas médicas
          </h1>
          <p className="page-subtitle">Gestión de prescripciones médicas</p>
        </div>
        <Button onClick={() => setNewOpen(true)} id="btn-nueva-receta">
          <Plus className="h-4 w-4 mr-1" /> Nueva receta
        </Button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total recetas', value: prescriptions.length, icon: FileText, color: 'bg-sky-500' },
          { label: 'Activas', value: prescriptions.filter(r => r.status === 'active').length, icon: CheckCircle, color: 'bg-emerald-500' },
          { label: 'Dispensadas', value: prescriptions.filter(r => r.status === 'dispensed').length, icon: Pill, color: 'bg-violet-500' },
          { label: 'Expiradas', value: prescriptions.filter(r => r.status === 'expired').length, icon: Clock, color: 'bg-amber-500' },
        ].map(({ label, value, icon: Icon, color }) => (
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
        <CardContent className="p-4 flex gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input className="pl-9" placeholder="Buscar por paciente, médico o diagnóstico..."
              value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1) }}>
            <SelectTrigger className="w-40"><SelectValue placeholder="Estado" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="active">Activas</SelectItem>
              <SelectItem value="dispensed">Dispensadas</SelectItem>
              <SelectItem value="expired">Expiradas</SelectItem>
              <SelectItem value="cancelled">Canceladas</SelectItem>
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 space-y-3">{[...Array(5)].map((_, i) => <div key={i} className="skeleton h-14 rounded-lg" />)}</div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="h-14 w-14 rounded-2xl bg-muted flex items-center justify-center mb-3">
                <FileText className="h-7 w-7 text-muted-foreground/40" />
              </div>
              <p className="font-semibold text-muted-foreground">
                {search ? 'Sin resultados' : 'No hay recetas registradas'}
              </p>
              {!search && (
                <Button className="mt-4" onClick={() => setNewOpen(true)}>
                  <Plus className="h-4 w-4 mr-1" /> Nueva receta
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
                  <TableHead className="hidden md:table-cell">Diagnóstico</TableHead>
                  <TableHead>Fecha</TableHead>
                  <TableHead className="hidden md:table-cell">Válida hasta</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="text-right">Acción</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((rx) => {
                  const meta = STATUS_META[rx.status] ?? { label: rx.status, variant: 'outline', icon: FileText }
                  return (
                    <TableRow key={rx.id} className="cursor-pointer" onClick={() => setDetailId(rx.id)}>
                      <TableCell className="font-mono text-xs text-muted-foreground">#{rx.id}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center text-xs font-semibold text-primary shrink-0">
                            {rx.patient_name?.charAt(0)}
                          </div>
                          <span className="text-sm font-medium">{rx.patient_name}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">{rx.doctor_name}</TableCell>
                      <TableCell className="hidden md:table-cell max-w-[160px]">
                        <p className="text-sm truncate">{rx.diagnosis ?? '—'}</p>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                        {formatRelativeTime(rx.prescription_date)}
                      </TableCell>
                      <TableCell className="hidden md:table-cell text-sm text-muted-foreground">
                        {rx.valid_until ? formatDate(rx.valid_until) : '—'}
                      </TableCell>
                      <TableCell>
                        <Badge variant={meta.variant as 'success' | 'warning' | 'destructive' | 'secondary' | 'outline'}>
                          {meta.label}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="icon-sm"
                          onClick={(e) => { e.stopPropagation(); setDetailId(rx.id) }}
                          aria-label="Ver detalle">
                          <Eye className="h-3.5 w-3.5" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Dialogs */}
      <NewPrescriptionDialog
        open={newOpen}
        onClose={() => setNewOpen(false)}
        onSuccess={() => queryClient.invalidateQueries({ queryKey: ['prescriptions'] })}
      />
      {detailId !== null && (
        <PrescriptionDetailDialog id={detailId} onClose={() => setDetailId(null)} />
      )}
    </div>
  )
}
