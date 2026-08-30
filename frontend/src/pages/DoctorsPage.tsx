/**
 * Doctors Page
 */
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { UserRound, Plus, Search, Edit, CalendarDays, Phone, Mail, Building2, UserCheck, UserX, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import api from '@/lib/api'
import { getApiErrorMessage } from '@/lib/errors'
import { formatCurrency, getInitials } from '@/lib/utils'

interface Doctor {
  id: number
  specialty_id: number
  first_name: string
  last_name: string
  specialty_name: string
  specialty_color: string
  license_number: string
  email: string
  phone: string | null
  office_number: string | null
  consultation_fee: number
  is_active: number
}

interface Specialty {
  id: number
  name: string
}

interface Schedule {
  id: number
  day_of_week: number
  start_time: string
  end_time: string
  slot_duration_minutes: number
}

const DAYS_OF_WEEK = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']

const doctorSchema = z.object({
  specialty_id: z.number({ coerce: true }).int().positive('Selecciona una especialidad'),
  license_number: z.string().min(3, 'Número de licencia requerido'),
  first_name: z.string().min(2, 'Nombre requerido'),
  last_name: z.string().min(2, 'Apellido requerido'),
  email: z.string().email('Email inválido'),
  phone: z.string().optional(),
  office_number: z.string().optional(),
  consultation_fee: z.number({ coerce: true }).min(0).default(0),
  bio: z.string().optional(),
})

type DoctorFormData = z.infer<typeof doctorSchema>

function DoctorScheduleDialog({ open, onClose, doctor }: { open: boolean; onClose: () => void; doctor: Doctor | null }) {
  const queryClient = useQueryClient()
  const [dayOfWeek, setDayOfWeek] = useState<number>(1)
  const [startTime, setStartTime] = useState('08:00')
  const [endTime, setEndTime] = useState('12:00')
  const [duration, setDuration] = useState<number>(30)

  const { data: schedulesData, isLoading } = useQuery({
    queryKey: ['doctor-schedules', doctor?.id],
    queryFn: async () => {
      if (!doctor) return { data: [] }
      const { data } = await api.get(`/doctors/${doctor.id}/schedules`)
      return data
    },
    enabled: !!doctor,
  })

  const schedules: Schedule[] = schedulesData?.data ?? []

  const addScheduleMutation = useMutation({
    mutationFn: (data: any) => api.post(`/doctors/${doctor?.id}/schedules`, data),
    onSuccess: () => {
      toast.success('Horario añadido')
      queryClient.invalidateQueries({ queryKey: ['doctor-schedules', doctor?.id] })
    },
    onError: (err) => toast.error(getApiErrorMessage(err, 'Error al añadir horario'))
  })

  const removeScheduleMutation = useMutation({
    mutationFn: (scheduleId: number) => api.delete(`/doctors/${doctor?.id}/schedules/${scheduleId}`),
    onSuccess: () => {
      toast.success('Horario removido')
      queryClient.invalidateQueries({ queryKey: ['doctor-schedules', doctor?.id] })
    },
    onError: (err) => toast.error(getApiErrorMessage(err, 'Error al remover horario'))
  })

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault()
    if (!doctor) return
    if (startTime >= endTime) {
      toast.error('La hora de fin debe ser mayor a la hora de inicio')
      return
    }
    addScheduleMutation.mutate({
      day_of_week: dayOfWeek,
      start_time: startTime,
      end_time: endTime,
      slot_duration_minutes: duration
    })
  }

  if (!doctor) return null

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Gestionar Horarios</DialogTitle>
          <DialogDescription>
            Dr. {doctor.first_name} {doctor.last_name} ({doctor.specialty_name})
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
          {/* Add form */}
          <div>
            <h3 className="text-sm font-medium mb-3">Añadir bloque de disponibilidad</h3>
            <form onSubmit={handleAdd} className="space-y-3 bg-muted/30 p-4 rounded-lg border">
              <div>
                <label className="text-xs font-medium text-muted-foreground">Día de la semana</label>
                <select 
                  className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm mt-1"
                  value={dayOfWeek}
                  onChange={(e) => setDayOfWeek(parseInt(e.target.value))}
                >
                  {DAYS_OF_WEEK.map((d, i) => (
                    <option key={i} value={i}>{d}</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Hora inicio</label>
                  <Input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} required />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Hora fin</label>
                  <Input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} required />
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">Duración de cita (minutos)</label>
                <select 
                  className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm mt-1"
                  value={duration}
                  onChange={(e) => setDuration(parseInt(e.target.value))}
                >
                  <option value={15}>15 minutos</option>
                  <option value={20}>20 minutos</option>
                  <option value={30}>30 minutos</option>
                  <option value={45}>45 minutos</option>
                  <option value={60}>60 minutos</option>
                </select>
              </div>
              <Button type="submit" className="w-full mt-2" loading={addScheduleMutation.isPending}>
                Añadir Horario
              </Button>
            </form>
          </div>

          {/* List of current schedules */}
          <div>
            <h3 className="text-sm font-medium mb-3">Horarios Configurados</h3>
            {isLoading ? (
              <div className="space-y-2">
                {[...Array(3)].map((_, i) => <div key={i} className="skeleton h-12 w-full rounded-md" />)}
              </div>
            ) : schedules.length === 0 ? (
              <div className="text-center py-8 text-sm text-muted-foreground border rounded-lg bg-muted/10">
                No hay horarios configurados
              </div>
            ) : (
              <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2">
                {schedules.map(schedule => (
                  <div key={schedule.id} className="flex items-center justify-between p-3 border rounded-md bg-card text-sm">
                    <div>
                      <p className="font-semibold">{DAYS_OF_WEEK[schedule.day_of_week]}</p>
                      <p className="text-xs text-muted-foreground">
                        {schedule.start_time} - {schedule.end_time} ({schedule.slot_duration_minutes} min)
                      </p>
                    </div>
                    <Button 
                      variant="ghost" 
                      size="icon-sm" 
                      className="text-destructive hover:text-destructive/80 hover:bg-destructive/10"
                      onClick={() => removeScheduleMutation.mutate(schedule.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

function DoctorFormDialog({ open, onClose, doctor, specialties, onSuccess }: {
  open: boolean; onClose: () => void; doctor?: Doctor | null; specialties: Specialty[]; onSuccess: () => void
}) {
  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<DoctorFormData>({
    resolver: zodResolver(doctorSchema),
    defaultValues: doctor ? {
      specialty_id: doctor.specialty_id || 1,
      license_number: doctor.license_number,
      first_name: doctor.first_name,
      last_name: doctor.last_name,
      email: doctor.email,
      phone: doctor.phone ?? '',
      office_number: doctor.office_number ?? '',
      consultation_fee: doctor.consultation_fee,
    } : { consultation_fee: 0, specialty_id: '' as unknown as number },
  })

  const onSubmit = async (data: DoctorFormData) => {
    try {
      if (doctor) {
        await api.put(`/doctors/${doctor.id}`, data)
        toast.success('Médico actualizado')
      } else {
        await api.post('/doctors', data)
        toast.success('Médico registrado')
      }
      onSuccess(); onClose(); reset()
    } catch (err: unknown) {
      toast.error(getApiErrorMessage(err, 'Error al guardar'))
    }
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{doctor ? 'Editar médico' : 'Registrar médico'}</DialogTitle>
          <DialogDescription>Complete la información del profesional médico</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 mt-2">
          <div className="grid grid-cols-2 gap-3">
            <div><label className="text-xs font-medium text-muted-foreground">Nombre *</label>
              <Input placeholder="Carlos" {...register('first_name')} />
              {errors.first_name && <p className="text-xs text-destructive">{errors.first_name.message}</p>}</div>
            <div><label className="text-xs font-medium text-muted-foreground">Apellido *</label>
              <Input placeholder="García" {...register('last_name')} />
              {errors.last_name && <p className="text-xs text-destructive">{errors.last_name.message}</p>}</div>
          </div>
          <div><label className="text-xs font-medium text-muted-foreground">Especialidad *</label>
            <select className="flex h-9 w-full rounded-lg border border-input bg-background px-3 py-1 text-sm mt-1" defaultValue="" {...register('specialty_id', { valueAsNumber: true })}>
              <option value="" disabled>Seleccione una especialidad</option>
              {specialties.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
            {errors.specialty_id && <p className="text-xs text-destructive">{errors.specialty_id.message}</p>}</div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="text-xs font-medium text-muted-foreground">Número de licencia *</label>
              <Input placeholder="MED-001-2020" {...register('license_number')} />
              {errors.license_number && <p className="text-xs text-destructive">{errors.license_number.message}</p>}</div>
            <div><label className="text-xs font-medium text-muted-foreground">Consultorio</label>
              <Input placeholder="Consultorio 101" {...register('office_number')} /></div>
          </div>
          <div><label className="text-xs font-medium text-muted-foreground">Email *</label>
            <Input type="email" placeholder="dr.garcia@clinica.com" {...register('email')} />
            {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}</div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="text-xs font-medium text-muted-foreground">Teléfono</label>
              <Input placeholder="+57 300 123 4567" {...register('phone')} /></div>
            <div><label className="text-xs font-medium text-muted-foreground">Tarifa consulta (COP)</label>
              <Input type="number" placeholder="80000" {...register('consultation_fee')} /></div>
          </div>
          <div><label className="text-xs font-medium text-muted-foreground">Biografía</label>
            <textarea className="flex w-full rounded-lg border border-input bg-background px-3 py-2 text-sm mt-1 h-20 resize-none" placeholder="Descripción del médico..." {...register('bio')} /></div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
            <Button type="submit" loading={isSubmitting}>{doctor ? 'Guardar cambios' : 'Registrar médico'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export function DoctorsPage() {
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [formOpen, setFormOpen] = useState(false)
  const [scheduleOpen, setScheduleOpen] = useState(false)
  const [selectedDoctor, setSelectedDoctor] = useState<Doctor | null>(null)

  const { data: doctorsData, isLoading } = useQuery({
    queryKey: ['doctors', search],
    queryFn: async () => {
      const params = new URLSearchParams({ limit: '50' })
      if (search) params.set('search', search)
      const { data } = await api.get(`/doctors?${params}`)
      return data
    },
  })

  const { data: specialtiesData } = useQuery({
    queryKey: ['specialties'],
    queryFn: async () => { const { data } = await api.get('/specialties'); return data },
  })

  const doctors: Doctor[] = doctorsData?.data ?? []
  const specialties: Specialty[] = specialtiesData?.data ?? []

  const toggleActiveMutation = useMutation({
    mutationFn: ({ id, is_active }: { id: number, is_active: number }) => api.put(`/doctors/${id}`, { is_active }),
    onSuccess: (_, variables) => { 
      toast.success(variables.is_active ? 'Médico activado' : 'Médico desactivado'); 
      queryClient.invalidateQueries({ queryKey: ['doctors'] }) 
    },
  })

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title flex items-center gap-2"><UserRound className="h-6 w-6 text-primary" />Médicos</h1>
          <p className="page-subtitle">{doctors.length} médicos en el sistema</p>
        </div>
        <Button onClick={() => { setSelectedDoctor(null); setFormOpen(true) }}>
          <Plus className="h-4 w-4 mr-1" />Registrar médico
        </Button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input className="pl-9 max-w-md" placeholder="Buscar médico..." value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 space-y-3">{[...Array(5)].map((_, i) => <div key={i} className="skeleton h-16 rounded-lg" />)}</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Médico</TableHead>
                  <TableHead>Especialidad</TableHead>
                  <TableHead>Licencia</TableHead>
                  <TableHead className="hidden md:table-cell">Contacto</TableHead>
                  <TableHead className="hidden lg:table-cell">Consultorio</TableHead>
                  <TableHead className="hidden lg:table-cell">Tarifa</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {doctors.map((doctor) => (
                  <TableRow key={doctor.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-9 w-9">
                          <AvatarFallback className="text-xs" style={{ background: doctor.specialty_color || '#0ea5e9' }}>
                            {getInitials(`${doctor.first_name} ${doctor.last_name}`)}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium text-sm">Dr. {doctor.first_name} {doctor.last_name}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1.5">
                        <span className="h-2 w-2 rounded-full flex-shrink-0" style={{ background: doctor.specialty_color || '#0ea5e9' }} />
                        <span className="text-sm">{doctor.specialty_name}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm font-mono text-muted-foreground">{doctor.license_number}</TableCell>
                    <TableCell className="hidden md:table-cell">
                      <div className="space-y-0.5">
                        {doctor.phone && <div className="flex items-center gap-1 text-xs text-muted-foreground"><Phone className="h-3 w-3" />{doctor.phone}</div>}
                        <div className="flex items-center gap-1 text-xs text-muted-foreground"><Mail className="h-3 w-3" />{doctor.email}</div>
                      </div>
                    </TableCell>
                    <TableCell className="hidden lg:table-cell">
                      {doctor.office_number && <div className="flex items-center gap-1 text-sm"><Building2 className="h-3.5 w-3.5 text-muted-foreground" />{doctor.office_number}</div>}
                    </TableCell>
                    <TableCell className="hidden lg:table-cell text-sm font-medium">{formatCurrency(doctor.consultation_fee)}</TableCell>
                    <TableCell>
                      <Badge variant={doctor.is_active ? 'success' : 'secondary'}>{doctor.is_active ? 'Activo' : 'Inactivo'}</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button 
                          variant="ghost" 
                          size="icon-sm" 
                          className="text-primary hover:text-primary/80"
                          onClick={() => { setSelectedDoctor(doctor); setScheduleOpen(true) }}
                          title="Gestionar horarios"
                        >
                          <CalendarDays className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon-sm" 
                          onClick={() => { setSelectedDoctor(doctor); setFormOpen(true) }}
                          title="Editar perfil"
                        >
                          <Edit className="h-3.5 w-3.5" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon-sm" 
                          className={doctor.is_active ? "text-destructive hover:text-destructive/80" : "text-success hover:text-success/80"} 
                          onClick={() => toggleActiveMutation.mutate({ id: doctor.id, is_active: doctor.is_active ? 0 : 1 })}
                          title={doctor.is_active ? "Desactivar médico" : "Activar médico"}
                        >
                          {doctor.is_active ? <UserX className="h-4 w-4" /> : <UserCheck className="h-4 w-4" />}
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {formOpen && (
        <DoctorFormDialog
          open={formOpen}
          onClose={() => setFormOpen(false)}
          doctor={selectedDoctor}
          specialties={specialties}
          onSuccess={() => queryClient.invalidateQueries({ queryKey: ['doctors'] })}
        />
      )}

      {scheduleOpen && (
        <DoctorScheduleDialog
          open={scheduleOpen}
          onClose={() => setScheduleOpen(false)}
          doctor={selectedDoctor}
        />
      )}
    </div>
  )
}
