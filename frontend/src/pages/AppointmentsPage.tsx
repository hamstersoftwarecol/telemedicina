/**
 * Appointments / Agenda Page — Calendar with CRUD
 */
import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Calendar, ChevronLeft, ChevronRight, Plus, Clock, User, Stethoscope,
  CheckCircle, XCircle, AlertCircle, LayoutGrid, List, Video, Play, Check
} from 'lucide-react'
import { format, addDays, startOfWeek, isSameDay, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'
import { toast } from 'sonner'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { SearchableSelect } from '@/components/ui/SearchableSelect'
import api from '@/lib/api'
import { cn, formatDate, getStatusColor, getStatusLabel } from '@/lib/utils'

interface Appointment {
  id: number
  patient_id: number
  doctor_id: number
  patient_name: string
  doctor_name: string
  specialty_name: string
  appointment_date: string
  start_time: string
  end_time: string
  status: string
  type: string
  reason: string | null
}

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-yellow-100 border-yellow-300 text-yellow-800',
  confirmed: 'bg-blue-100 border-blue-300 text-blue-800',
  in_progress: 'bg-purple-100 border-purple-300 text-purple-800',
  completed: 'bg-green-100 border-green-300 text-green-800',
  cancelled: 'bg-red-100 border-red-300 text-red-800',
}

function AppointmentFormDialog({ open, onClose, onSuccess, patients, doctors }: {
  open: boolean; onClose: () => void; onSuccess: () => void;
  patients: Array<{ id: number; first_name: string; last_name: string }>;
  doctors: Array<{ id: number; first_name: string; last_name: string; specialty_name: string }>;
}) {
  const [form, setForm] = useState({
    patient_id: '', doctor_id: '', appointment_date: format(new Date(), 'yyyy-MM-dd'),
    start_time: '', end_time: '', type: 'presencial', reason: '',
  })
  const [loading, setLoading] = useState(false)

  const { data: availableSlotsData, isLoading: loadingSlots } = useQuery({
    queryKey: ['available-slots', form.doctor_id, form.appointment_date],
    queryFn: async () => {
      if (!form.doctor_id || !form.appointment_date) return { data: [] }
      const { data } = await api.get(`/appointments/available-slots?doctor_id=${form.doctor_id}&date=${form.appointment_date}`)
      return data
    },
    enabled: !!form.doctor_id && !!form.appointment_date,
  })

  const availableSlots: string[] = availableSlotsData?.data ?? []

  const handleTimeSelect = (time: string) => {
    let [h, m] = time.split(':').map(Number)
    m += 30
    if (m >= 60) { h += 1; m -= 60 }
    const end = `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`
    setForm({ ...form, start_time: time, end_time: end })
  }

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.patient_id || !form.doctor_id) { toast.error('Selecciona paciente y médico'); return }
    if (!form.start_time) { toast.error('Selecciona una hora disponible'); return }
    setLoading(true)
    try {
      await api.post('/appointments', { ...form, patient_id: parseInt(form.patient_id), doctor_id: parseInt(form.doctor_id) })
      toast.success('Cita agendada correctamente')
      onSuccess(); onClose()
    } catch { toast.error('Error al agendar la cita') }
    finally { setLoading(false) }
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Nueva cita</DialogTitle>
          <DialogDescription>Agenda una cita médica</DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label className="text-xs font-medium text-muted-foreground">Paciente *</label>
            <div className="mt-1">
              <SearchableSelect
                value={form.patient_id}
                onChange={(val) => setForm({ ...form, patient_id: String(val) })}
                options={patients.map((p) => ({ value: p.id, label: `${p.first_name} ${p.last_name}` }))}
                placeholder="Seleccionar paciente"
              />
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground">Médico *</label>
            <div className="mt-1">
              <SearchableSelect
                value={form.doctor_id}
                onChange={(val) => {
                  setForm({ ...form, doctor_id: String(val), start_time: '', end_time: '' })
                }}
                options={doctors.map((d) => ({ value: d.id, label: `Dr. ${d.first_name} ${d.last_name} — ${d.specialty_name}` }))}
                placeholder="Seleccionar médico"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="text-xs font-medium text-muted-foreground">Fecha *</label>
              <Input type="date" value={form.appointment_date} onChange={(e) => setForm({ ...form, appointment_date: e.target.value, start_time: '', end_time: '' })} /></div>
            <div><label className="text-xs font-medium text-muted-foreground">Tipo</label>
              <select className="flex h-9 w-full rounded-lg border border-input bg-background px-3 py-1 text-sm mt-1"
                value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
                <option value="presencial">Presencial</option>
                <option value="virtual">Virtual</option>
              </select>
            </div>
          </div>
          
          <div>
            <label className="text-xs font-medium text-muted-foreground">Hora disponible *</label>
            <div className="mt-2">
              {!form.doctor_id ? (
                <p className="text-sm text-muted-foreground bg-muted/30 p-3 rounded-lg border text-center">Seleccione un médico para ver horarios</p>
              ) : loadingSlots ? (
                <div className="grid grid-cols-4 gap-2">
                  {[...Array(4)].map((_, i) => <div key={i} className="skeleton h-9 w-full rounded-md" />)}
                </div>
              ) : availableSlots.length === 0 ? (
                <p className="text-sm text-destructive font-medium bg-destructive/10 p-3 rounded-lg border border-destructive/20 text-center">No hay horarios disponibles para esta fecha.</p>
              ) : (
                <div className="grid grid-cols-4 gap-2 max-h-[150px] overflow-y-auto pr-1">
                  {availableSlots.map(time => (
                    <Button 
                      key={time} 
                      type="button" 
                      variant={form.start_time === time ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => handleTimeSelect(time)}
                      className="w-full text-xs font-mono"
                    >
                      {time}
                    </Button>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div><label className="text-xs font-medium text-muted-foreground">Motivo de consulta</label>
            <Input placeholder="Chequeo de rutina, control..." value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} /></div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
            <Button type="submit" loading={loading} disabled={!form.start_time}>Agendar cita</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export function AppointmentsPage() {
  const queryClient = useQueryClient()
  const [view, setView] = useState<'week' | 'list'>('list')
  const [currentDate, setCurrentDate] = useState(new Date())
  const [formOpen, setFormOpen] = useState(false)

  const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 })
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))

  const fromDate = format(weekDays[0], 'yyyy-MM-dd')
  const toDate = format(weekDays[6], 'yyyy-MM-dd')

  const { data: appointmentsData, isLoading } = useQuery({
    queryKey: ['appointments', fromDate, toDate],
    queryFn: async () => {
      const { data } = await api.get(`/appointments?from=${fromDate}&to=${toDate}&limit=200`)
      return data
    },
  })

  const { data: patientsData } = useQuery({
    queryKey: ['patients-list'],
    queryFn: async () => { const { data } = await api.get('/patients?limit=100'); return data },
  })

  // Listen for AI actions to refresh data automatically
  useEffect(() => {
    const handleAiAction = () => {
      queryClient.invalidateQueries({ queryKey: ['appointments'] })
    }
    window.addEventListener('ai-action-completed', handleAiAction)
    return () => window.removeEventListener('ai-action-completed', handleAiAction)
  }, [queryClient])

  const { data: doctorsData } = useQuery({
    queryKey: ['doctors-list'],
    queryFn: async () => { const { data } = await api.get('/doctors?limit=100'); return data },
  })

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: number; status: string }) =>
      api.patch(`/appointments/${id}/status`, { status }),
    onSuccess: () => {
      toast.success('Estado actualizado')
      queryClient.invalidateQueries({ queryKey: ['appointments'] })
    },
  })

  const appointments: Appointment[] = appointmentsData?.data ?? []
  const patients = patientsData?.data ?? []
  const doctors = doctorsData?.data ?? []

  const getAppointmentsForDay = (date: Date) =>
    appointments.filter((a) => isSameDay(parseISO(a.appointment_date), date))

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title flex items-center gap-2"><Calendar className="h-6 w-6 text-primary" />Agenda</h1>
          <p className="page-subtitle">Gestión de citas médicas</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setView(view === 'week' ? 'list' : 'week')}>
            {view === 'week' ? <List className="h-4 w-4 mr-1" /> : <LayoutGrid className="h-4 w-4 mr-1" />}
            {view === 'week' ? 'Lista' : 'Semana'}
          </Button>
          <Button onClick={() => setFormOpen(true)}>
            <Plus className="h-4 w-4 mr-1" />Nueva cita
          </Button>
        </div>
      </div>

      {/* Week navigation */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <Button variant="ghost" size="sm" onClick={() => setCurrentDate(addDays(currentDate, -7))}><ChevronLeft className="h-4 w-4" /></Button>
            <h2 className="text-sm font-semibold">
              {format(weekDays[0], 'd MMM', { locale: es })} – {format(weekDays[6], 'd MMM yyyy', { locale: es })}
            </h2>
            <Button variant="ghost" size="sm" onClick={() => setCurrentDate(addDays(currentDate, 7))}><ChevronRight className="h-4 w-4" /></Button>
          </div>
        </CardContent>
      </Card>

      {view === 'week' ? (
        /* Weekly view */
        <div className="grid grid-cols-7 gap-2">
          {weekDays.map((day) => {
            const dayAppts = getAppointmentsForDay(day)
            const isToday = isSameDay(day, new Date())
            return (
              <Card key={day.toISOString()} className={cn('min-h-32', isToday && 'border-primary/50 shadow-sm')}>
                <CardHeader className="p-2">
                  <p className={cn('text-xs font-medium text-center', isToday && 'text-primary')}>{format(day, 'EEE', { locale: es })}</p>
                  <p className={cn('text-lg font-bold text-center', isToday && 'text-primary')}>{format(day, 'd')}</p>
                </CardHeader>
                <CardContent className="p-1 space-y-1">
                  {dayAppts.map((a) => (
                    <div key={a.id} className={cn('text-xs p-1.5 rounded border truncate', STATUS_COLORS[a.status] ?? 'bg-gray-100 border-gray-300')}>
                      <p className="font-medium truncate">{a.start_time}</p>
                      <p className="truncate">{a.patient_name}</p>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )
          })}
        </div>
      ) : (
        /* List view */
        <Card>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-6 space-y-3">{[...Array(6)].map((_, i) => <div key={i} className="skeleton h-14 rounded-lg" />)}</div>
            ) : appointments.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16"><Calendar className="h-10 w-10 text-muted-foreground/30 mb-3" /><p className="text-muted-foreground text-sm">No hay citas en esta semana</p></div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Fecha / Hora</TableHead>
                    <TableHead>Paciente</TableHead>
                    <TableHead>Médico</TableHead>
                    <TableHead className="hidden md:table-cell">Especialidad</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {appointments.map((appt) => (
                    <TableRow key={appt.id}>
                      <TableCell>
                        <p className="font-medium text-sm">{formatDate(appt.appointment_date)}</p>
                        <p className="text-xs text-muted-foreground flex items-center gap-1"><Clock className="h-3 w-3" />{appt.start_time} – {appt.end_time}</p>
                      </TableCell>
                      <TableCell><div className="flex items-center gap-1.5 text-sm"><User className="h-3.5 w-3.5 text-muted-foreground" />{appt.patient_name}</div></TableCell>
                      <TableCell className="text-sm">{appt.doctor_name}</TableCell>
                      <TableCell className="hidden md:table-cell text-sm text-muted-foreground">{appt.specialty_name}</TableCell>
                      <TableCell>
                        <Badge variant={appt.type === 'virtual' ? 'info' : 'secondary'} className="text-xs">
                          {appt.type === 'virtual' ? <><Video className="h-3 w-3 mr-1" />Virtual</> : 'Presencial'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <span className={cn('inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-semibold', getStatusColor(appt.status))}>
                          {getStatusLabel(appt.status)}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          {appt.status === 'pending' && (
                            <>
                              <Button variant="ghost" size="icon-sm" className="hover:text-green-600" title="Confirmar cita" onClick={() => statusMutation.mutate({ id: appt.id, status: 'confirmed' })}><CheckCircle className="h-4 w-4" /></Button>
                              <Button variant="ghost" size="icon-sm" className="hover:text-destructive" title="Cancelar cita" onClick={() => statusMutation.mutate({ id: appt.id, status: 'cancelled' })}><XCircle className="h-4 w-4" /></Button>
                            </>
                          )}
                          {appt.status === 'confirmed' && (
                            <>
                              <Button variant="ghost" size="icon-sm" className="hover:text-blue-600" title="Iniciar consulta" onClick={() => statusMutation.mutate({ id: appt.id, status: 'in_progress' })}><Play className="h-4 w-4" /></Button>
                              <Button variant="ghost" size="icon-sm" className="hover:text-destructive" title="Cancelar cita" onClick={() => statusMutation.mutate({ id: appt.id, status: 'cancelled' })}><XCircle className="h-4 w-4" /></Button>
                            </>
                          )}
                          {appt.status === 'in_progress' && (
                            <Button variant="ghost" size="icon-sm" className="hover:text-green-600" title="Finalizar consulta" onClick={() => statusMutation.mutate({ id: appt.id, status: 'completed' })}><Check className="h-4 w-4" /></Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      )}

      <AppointmentFormDialog
        open={formOpen}
        onClose={() => setFormOpen(false)}
        onSuccess={() => queryClient.invalidateQueries({ queryKey: ['appointments'] })}
        patients={patients}
        doctors={doctors}
      />
    </div>
  )
}
