/**
 * Specialties Page — Full CRUD with color picker and stats
 */
import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  Stethoscope, Plus, Edit, Trash2, UserRound, Activity,
  CheckCircle, Search, LayoutGrid, List,
} from 'lucide-react'
import { toast } from 'sonner'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import api from '@/lib/api'
import { getApiErrorMessage } from '@/lib/errors'
import { cn } from '@/lib/utils'

interface Specialty {
  id: number
  name: string
  description: string | null
  color: string
  icon: string | null
  is_active: number
  doctor_count: number
}

const PRESET_COLORS = [
  '#0ea5e9', '#6366f1', '#10b981', '#f59e0b', '#ef4444',
  '#8b5cf6', '#ec4899', '#14b8a6', '#f97316', '#06b6d4',
  '#84cc16', '#a855f7',
]

const specialtySchema = z.object({
  name: z.string().min(2, 'Mínimo 2 caracteres').max(100),
  description: z.string().optional(),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Color hexadecimal inválido').default('#0ea5e9'),
  icon: z.string().optional(),
})

type SpecialtyFormData = z.infer<typeof specialtySchema>

function SpecialtyFormDialog({ open, onClose, specialty, onSuccess }: {
  open: boolean
  onClose: () => void
  specialty?: Specialty | null
  onSuccess: () => void
}) {
  const [selectedColor, setSelectedColor] = useState(specialty?.color ?? '#0ea5e9')

  const { register, handleSubmit, reset, setValue, formState: { errors, isSubmitting } } = useForm<SpecialtyFormData>({
    resolver: zodResolver(specialtySchema),
    defaultValues: specialty
      ? { name: specialty.name, description: specialty.description ?? '', color: specialty.color }
      : { color: '#0ea5e9' },
  })

  const [selectedDoctors, setSelectedDoctors] = useState<number[]>([])

  const { data: doctorsData, isLoading: isLoadingDoctors } = useQuery({
    queryKey: ['doctors'],
    queryFn: async () => { const { data } = await api.get('/doctors'); return data },
  })

  useEffect(() => {
    if (specialty && doctorsData?.data) {
      setSelectedDoctors(doctorsData.data.filter((d: any) => d.specialty_id === specialty.id).map((d: any) => d.id))
    } else {
      setSelectedDoctors([])
    }
  }, [specialty, doctorsData])

  const onSubmit = async (data: SpecialtyFormData) => {
    try {
      const payload = { ...data, doctor_ids: selectedDoctors }
      if (specialty) {
        await api.put(`/specialties/${specialty.id}`, payload)
        toast.success('Especialidad actualizada')
      } else {
        await api.post('/specialties', payload)
        toast.success('Especialidad creada')
      }
      onSuccess()
      onClose()
      reset()
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Error al guardar la especialidad'))
    }
  }

  const handleColorSelect = (color: string) => {
    setSelectedColor(color)
    setValue('color', color)
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{specialty ? 'Editar especialidad' : 'Nueva especialidad'}</DialogTitle>
          <DialogDescription>
            {specialty ? 'Modifica los datos de la especialidad' : 'Crea una nueva especialidad médica'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Preview */}
          <div
            className="flex items-center gap-3 p-4 rounded-xl"
            style={{ background: `${selectedColor}18`, borderLeft: `4px solid ${selectedColor}` }}
          >
            <div
              className="h-10 w-10 rounded-xl flex items-center justify-center"
              style={{ background: selectedColor }}
            >
              <Stethoscope className="h-5 w-5 text-white" />
            </div>
            <div>
              <p className="font-semibold text-sm">Vista previa</p>
              <p className="text-xs text-muted-foreground">Así se verá la especialidad</p>
            </div>
          </div>

          {/* Name */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Nombre *</label>
            <Input placeholder="Cardiología, Pediatría..." {...register('name')} />
            {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Descripción</label>
            <textarea
              className="flex w-full rounded-lg border border-input bg-background px-3 py-2 text-sm h-20 resize-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              placeholder="Breve descripción de la especialidad..."
              {...register('description')}
            />
          </div>

          {/* Color picker */}
          <div className="space-y-2">
            <label className="text-xs font-medium text-muted-foreground">Color de identificación</label>
            <div className="flex flex-wrap gap-2">
              {PRESET_COLORS.map((color) => (
                <button
                  key={color}
                  type="button"
                  onClick={() => handleColorSelect(color)}
                  className={cn(
                    'h-8 w-8 rounded-lg transition-all duration-150 hover:scale-110',
                    selectedColor === color && 'ring-2 ring-offset-2 ring-foreground scale-110'
                  )}
                  style={{ background: color }}
                  aria-label={`Color ${color}`}
                />
              ))}
            </div>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={selectedColor}
                onChange={(e) => handleColorSelect(e.target.value)}
                className="h-8 w-8 rounded cursor-pointer border"
              />
              <Input
                placeholder="#0ea5e9"
                value={selectedColor}
                onChange={(e) => handleColorSelect(e.target.value)}
                className="w-28 font-mono text-xs"
              />
              <span className="text-xs text-muted-foreground">O elige un color personalizado</span>
            </div>
          </div>

          {/* Doctors Assignment */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Médicos asignados</label>
            {isLoadingDoctors ? (
              <p className="text-xs text-muted-foreground">Cargando médicos...</p>
            ) : (
              <div className="max-h-36 overflow-y-auto border border-input rounded-lg p-2 space-y-1 bg-background">
                {!doctorsData?.data || doctorsData.data.length === 0 ? (
                  <p className="text-xs text-muted-foreground p-2 text-center">No hay médicos registrados</p>
                ) : (
                  doctorsData.data.map((doctor: any) => (
                    <label key={doctor.id} className="flex items-center gap-2 p-1.5 hover:bg-muted rounded cursor-pointer transition-colors">
                      <input 
                        type="checkbox" 
                        className="rounded border-gray-300 text-primary focus:ring-primary"
                        checked={selectedDoctors.includes(doctor.id)}
                        onChange={(e) => {
                          if (e.target.checked) setSelectedDoctors(prev => [...prev, doctor.id])
                          else setSelectedDoctors(prev => prev.filter(id => id !== doctor.id))
                        }}
                      />
                      <span className="text-sm">Dr. {doctor.first_name} {doctor.last_name}</span>
                    </label>
                  ))
                )}
              </div>
            )}
            <p className="text-[10px] text-muted-foreground leading-tight mt-1">
              Selecciona los médicos que pertenecen a esta especialidad. Si un médico ya tenía otra especialidad, se actualizará a esta nueva.
            </p>
          </div>


          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
            <Button type="submit" loading={isSubmitting} style={{ background: selectedColor }}>
              {specialty ? 'Guardar cambios' : 'Crear especialidad'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function SpecialtyCard({ specialty, onEdit, onDelete }: {
  specialty: Specialty
  onEdit: () => void
  onDelete: () => void
}) {
  return (
    <Card className="card-hover overflow-hidden group">
      {/* Color bar */}
      <div className="h-1.5 w-full" style={{ background: specialty.color }} />
      <CardContent className="p-5">
        <div className="flex items-start justify-between mb-3">
          <div
            className="h-11 w-11 rounded-xl flex items-center justify-center shadow-sm"
            style={{ background: specialty.color }}
          >
            <Stethoscope className="h-5 w-5 text-white" />
          </div>
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <Button variant="ghost" size="icon-sm" onClick={onEdit} aria-label="Editar">
              <Edit className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon-sm"
              className="hover:text-destructive"
              onClick={onDelete}
              aria-label="Eliminar"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>

        <h3 className="font-semibold text-sm mb-1">{specialty.name}</h3>
        {specialty.description && (
          <p className="text-xs text-muted-foreground line-clamp-2 mb-3">{specialty.description}</p>
        )}

        <div className="flex items-center justify-between pt-3 border-t border-border">
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <UserRound className="h-3.5 w-3.5" />
            <span>{specialty.doctor_count} médico{specialty.doctor_count !== 1 ? 's' : ''}</span>
          </div>
          <Badge
            variant={specialty.is_active ? 'success' : 'secondary'}
            className="text-xs"
          >
            {specialty.is_active ? 'Activa' : 'Inactiva'}
          </Badge>
        </div>
      </CardContent>
    </Card>
  )
}

export function SpecialtiesPage() {
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [formOpen, setFormOpen] = useState(false)
  const [selectedSpecialty, setSelectedSpecialty] = useState<Specialty | null>(null)
  const [deleteId, setDeleteId] = useState<number | null>(null)
  const [view, setView] = useState<'grid' | 'list'>('grid')

  const { data, isLoading } = useQuery({
    queryKey: ['specialties'],
    queryFn: async () => {
      const { data } = await api.get('/specialties')
      return data
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: number) => api.delete(`/specialties/${id}`),
    onSuccess: () => {
      toast.success('Especialidad desactivada')
      queryClient.invalidateQueries({ queryKey: ['specialties'] })
      setDeleteId(null)
    },
    onError: (err) => toast.error(getApiErrorMessage(err, 'Error al eliminar')),
  })

  const specialties: Specialty[] = (data?.data ?? []).filter(
    (s: Specialty) =>
      !search || s.name.toLowerCase().includes(search.toLowerCase())
  )

  const activeCount = specialties.filter((s) => s.is_active).length
  const totalDoctors = specialties.reduce((acc, s) => acc + s.doctor_count, 0)

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title flex items-center gap-2">
            <Stethoscope className="h-6 w-6 text-primary" />
            Especialidades
          </h1>
          <p className="page-subtitle">Gestión de especialidades médicas</p>
        </div>
        <Button onClick={() => { setSelectedSpecialty(null); setFormOpen(true) }} id="btn-nueva-especialidad">
          <Plus className="h-4 w-4 mr-1" />
          Nueva especialidad
        </Button>
      </div>

      {/* Summary KPIs */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Total especialidades', value: specialties.length, icon: Stethoscope, color: 'bg-sky-500' },
          { label: 'Especialidades activas', value: activeCount, icon: CheckCircle, color: 'bg-emerald-500' },
          { label: 'Médicos asignados', value: totalDoctors, icon: UserRound, color: 'bg-violet-500' },
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

      {/* Filters + view toggle */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Buscar especialidad..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="flex items-center border border-border rounded-lg overflow-hidden">
          <button
            onClick={() => setView('grid')}
            className={cn('p-2 transition-colors', view === 'grid' ? 'bg-primary text-primary-foreground' : 'hover:bg-muted')}
            aria-label="Vista cuadrícula"
          >
            <LayoutGrid className="h-4 w-4" />
          </button>
          <button
            onClick={() => setView('list')}
            className={cn('p-2 transition-colors', view === 'list' ? 'bg-primary text-primary-foreground' : 'hover:bg-muted')}
            aria-label="Vista lista"
          >
            <List className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className={cn(view === 'grid' ? 'grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4' : 'space-y-3')}>
          {[...Array(8)].map((_, i) => (
            <div key={i} className="skeleton rounded-xl" style={{ height: view === 'grid' ? '160px' : '64px' }} />
          ))}
        </div>
      ) : specialties.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <div className="h-16 w-16 rounded-2xl bg-muted flex items-center justify-center mb-4">
              <Stethoscope className="h-8 w-8 text-muted-foreground/40" />
            </div>
            <p className="font-semibold text-muted-foreground">
              {search ? 'No se encontraron especialidades' : 'No hay especialidades registradas'}
            </p>
            <p className="text-sm text-muted-foreground/70 mt-1">
              {search ? 'Intenta con otro término' : 'Crea la primera especialidad médica'}
            </p>
            {!search && (
              <Button className="mt-4" onClick={() => setFormOpen(true)}>
                <Plus className="h-4 w-4 mr-1" /> Nueva especialidad
              </Button>
            )}
          </CardContent>
        </Card>
      ) : view === 'grid' ? (
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
          {specialties.map((s) => (
            <SpecialtyCard
              key={s.id}
              specialty={s}
              onEdit={() => { setSelectedSpecialty(s); setFormOpen(true) }}
              onDelete={() => setDeleteId(s.id)}
            />
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Especialidad</TableHead>
                  <TableHead className="hidden md:table-cell">Descripción</TableHead>
                  <TableHead>Médicos</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {specialties.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div
                          className="h-8 w-8 rounded-lg flex items-center justify-center shrink-0"
                          style={{ background: s.color }}
                        >
                          <Stethoscope className="h-4 w-4 text-white" />
                        </div>
                        <div>
                          <p className="font-medium text-sm">{s.name}</p>
                          <div className="flex items-center gap-1 mt-0.5">
                            <span
                              className="inline-block h-2 w-2 rounded-full"
                              style={{ background: s.color }}
                            />
                            <span className="text-xs text-muted-foreground font-mono">{s.color}</span>
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-sm text-muted-foreground max-w-xs">
                      <p className="line-clamp-1">{s.description ?? '—'}</p>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1.5 text-sm">
                        <UserRound className="h-3.5 w-3.5 text-muted-foreground" />
                        {s.doctor_count}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={s.is_active ? 'success' : 'secondary'}>
                        {s.is_active ? 'Activa' : 'Inactiva'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          onClick={() => { setSelectedSpecialty(s); setFormOpen(true) }}
                          aria-label="Editar"
                        >
                          <Edit className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          className="hover:text-destructive"
                          onClick={() => setDeleteId(s.id)}
                          aria-label="Eliminar"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Form Dialog */}
      <SpecialtyFormDialog
        open={formOpen}
        onClose={() => { setFormOpen(false); setSelectedSpecialty(null) }}
        specialty={selectedSpecialty}
        onSuccess={() => queryClient.invalidateQueries({ queryKey: ['specialties'] })}
      />

      {/* Delete confirmation */}
      <Dialog open={deleteId !== null} onOpenChange={() => setDeleteId(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Desactivar especialidad</DialogTitle>
            <DialogDescription>
              Esta especialidad se marcará como inactiva. Los médicos asignados no serán afectados. ¿Deseas continuar?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteId(null)}>Cancelar</Button>
            <Button
              variant="destructive"
              loading={deleteMutation.isPending}
              onClick={() => deleteId && deleteMutation.mutate(deleteId)}
            >
              Desactivar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
