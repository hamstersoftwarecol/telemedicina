/**
 * Patients Page — Full CRUD with search, filters, pagination
 */
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  Users, Plus, Search, Filter, ChevronLeft, ChevronRight,
  Edit, Trash2, Eye, MoreHorizontal, Download, Phone, Mail,
  Droplets, AlertTriangle, UserPlus, BookOpen,
} from 'lucide-react'
import { toast } from 'sonner'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from '@/components/ui/dialog'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import api from '@/lib/api'
import { getApiErrorMessage } from '@/lib/errors'
import { cn, formatDate, calculateAge, getInitials, getGenderLabel } from '@/lib/utils'
import * as ExcelJS from 'exceljs'
import { saveAs } from 'file-saver'

interface Patient {
  id: number
  first_name: string
  last_name: string
  document_type: string
  document_number: string
  date_of_birth: string
  gender: string
  email: string | null
  phone: string | null
  city: string | null
  blood_type: string | null
  insurance_provider: string | null
  allergies: string
  appointment_count: number
  last_appointment: string | null
  is_active: number
  address?: string | null
}

const patientSchema = z.object({
  first_name: z.string().min(2, 'Mínimo 2 caracteres'),
  last_name: z.string().min(2, 'Mínimo 2 caracteres'),
  document_type: z.enum(['CC', 'TI', 'CE', 'PASSPORT', 'NIT']),
  document_number: z.string().min(5, 'Mínimo 5 dígitos'),
  date_of_birth: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Formato YYYY-MM-DD'),
  gender: z.enum(['M', 'F', 'O']),
  email: z.string().email('Email inválido').optional().or(z.literal('')),
  phone: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  country: z.string().default('Colombia'),
  insurance_provider: z.string().optional(),
  blood_type: z.enum(['A+','A-','B+','B-','AB+','AB-','O+','O-']).optional().nullable(),
  allergies: z.string().optional(),
  chronic_diseases: z.string().optional(),
})

type PatientFormData = z.infer<typeof patientSchema>

function PatientFormDialog({
  open, onClose, patient, onSuccess,
}: {
  open: boolean
  onClose: () => void
  patient?: Patient | null
  onSuccess: () => void
}) {
  const {
    register, handleSubmit, reset, formState: { errors, isSubmitting },
  } = useForm<PatientFormData>({
    resolver: zodResolver(patientSchema),
    defaultValues: patient
      ? {
          first_name: patient.first_name,
          last_name: patient.last_name,
          document_type: (patient.document_type as PatientFormData['document_type']) ?? 'CC',
          document_number: patient.document_number,
          date_of_birth: patient.date_of_birth?.split('T')[0] ?? '',
          gender: (patient.gender as PatientFormData['gender']) ?? 'O',
          email: patient.email ?? '',
          phone: patient.phone ?? '',
          city: patient.city ?? '',
          country: 'Colombia',
          insurance_provider: patient.insurance_provider ?? '',
          blood_type: (patient.blood_type as PatientFormData['blood_type']) ?? undefined,
          address: patient.address ?? '',
          allergies: (() => {
            try { return JSON.parse(patient.allergies || '[]').join(', ') } catch { return '' }
          })(),
          chronic_diseases: (() => {
            try { return JSON.parse((patient as any).chronic_diseases || '[]').join(', ') } catch { return '' }
          })(),
        } satisfies PatientFormData
      : { document_type: 'CC' as const, gender: 'M' as const, country: 'Colombia' },
  })

  const onSubmit = async (data: PatientFormData) => {
    try {
      const payload = {
        ...data,
        email: data.email || null,
        phone: data.phone || null,
        address: data.address || null,
        city: data.city || null,
        country: data.country || 'Colombia',
        insurance_provider: data.insurance_provider || null,
        blood_type: data.blood_type || null,
        allergies: data.allergies ? data.allergies.split(',').map((s) => s.trim()).filter(Boolean) : [],
        chronic_diseases: data.chronic_diseases ? data.chronic_diseases.split(',').map((s) => s.trim()).filter(Boolean) : [],
        current_medications: [],
      }

      if (patient) {
        await api.put(`/patients/${patient.id}`, payload)
        toast.success('Paciente actualizado correctamente')
      } else {
        await api.post('/patients', payload)
        toast.success('Paciente registrado correctamente')
      }
      onSuccess()
      onClose()
      reset()
    } catch (err: unknown) {
      toast.error(getApiErrorMessage(err, 'Error al guardar el paciente'))
    }
  }

  const Field = ({ label, id, error, children }: { label: string; id: string; error?: string; children: React.ReactNode }) => (
    <div className="space-y-1">
      <label htmlFor={id} className="text-xs font-medium text-muted-foreground">{label}</label>
      {children}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  )

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{patient ? 'Editar paciente' : 'Nuevo paciente'}</DialogTitle>
          <DialogDescription>
            {patient ? 'Modifica los datos del paciente' : 'Completa la información para registrar un nuevo paciente'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit as Parameters<typeof handleSubmit>[0])} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Nombre *" id="first_name" error={errors.first_name?.message}>
              <Input id="first_name" placeholder="Juan" {...register('first_name')} />
            </Field>
            <Field label="Apellido *" id="last_name" error={errors.last_name?.message}>
              <Input id="last_name" placeholder="Pérez" {...register('last_name')} />
            </Field>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <Field label="Tipo documento" id="document_type">
              <select id="document_type" className="flex h-9 w-full rounded-lg border border-input bg-background px-3 py-1 text-sm shadow-sm" {...register('document_type')}>
                <option value="CC">CC</option>
                <option value="TI">TI</option>
                <option value="CE">CE</option>
                <option value="PASSPORT">Pasaporte</option>
              </select>
            </Field>
            <Field label="Número documento *" id="document_number" error={errors.document_number?.message}>
              <Input id="document_number" placeholder="1234567890" {...register('document_number')} />
            </Field>
            <Field label="Sexo" id="gender">
              <select id="gender" className="flex h-9 w-full rounded-lg border border-input bg-background px-3 py-1 text-sm shadow-sm" {...register('gender')}>
                <option value="M">Masculino</option>
                <option value="F">Femenino</option>
                <option value="O">Otro</option>
              </select>
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Fecha de nacimiento *" id="date_of_birth">
              <Input id="date_of_birth" type="date" {...register('date_of_birth')} />
            </Field>
            <Field label="Tipo de sangre" id="blood_type">
              <select id="blood_type" className="flex h-9 w-full rounded-lg border border-input bg-background px-3 py-1 text-sm shadow-sm" {...register('blood_type')}>
                <option value="">Seleccionar</option>
                {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Email" id="email" error={errors.email?.message}>
              <Input id="email" type="email" placeholder="juan@email.com" {...register('email')} />
            </Field>
            <Field label="Teléfono" id="phone">
              <Input id="phone" placeholder="+57 300 123 4567" {...register('phone')} />
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Ciudad" id="city">
              <Input id="city" placeholder="Bogotá" {...register('city')} />
            </Field>
            <Field label="EPS / Aseguradora" id="insurance_provider">
              <Input id="insurance_provider" placeholder="Sura, Colsanitas..." {...register('insurance_provider')} />
            </Field>
          </div>

          <Field label="Alergias (separadas por coma)" id="allergies">
            <Input id="allergies" placeholder="Penicilina, Ibuprofeno..." {...register('allergies')} />
          </Field>

          <Field label="Enfermedades crónicas (separadas por coma)" id="chronic_diseases">
            <Input id="chronic_diseases" placeholder="Diabetes, Hipertensión..." {...register('chronic_diseases')} />
          </Field>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
            <Button type="submit" loading={isSubmitting}>
              {patient ? 'Guardar cambios' : 'Registrar paciente'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function PatientDetailsDialog({
  open, onClose, patient
}: {
  open: boolean
  onClose: () => void
  patient: Patient | null
}) {
  if (!patient) return null;
  const allergies = (() => {
    try { return JSON.parse(patient.allergies || '[]') } catch { return [] }
  })()
  const diseases = (() => {
    try { return JSON.parse((patient as any).chronic_diseases || '[]') } catch { return [] }
  })()

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Detalle del Paciente</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="flex items-center gap-4 border-b pb-4">
            <Avatar className="h-16 w-16">
              <AvatarFallback className="text-xl">{getInitials(`${patient.first_name} ${patient.last_name}`)}</AvatarFallback>
            </Avatar>
            <div>
              <h2 className="text-xl font-semibold">{patient.first_name} {patient.last_name}</h2>
              <p className="text-sm text-muted-foreground">{patient.document_type} {patient.document_number}</p>
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="font-medium text-muted-foreground block">Fecha de nacimiento</span>
              <span>{patient.date_of_birth?.split('T')[0]} ({calculateAge(patient.date_of_birth)} años)</span>
            </div>
            <div>
              <span className="font-medium text-muted-foreground block">Sexo</span>
              <span>{getGenderLabel(patient.gender)}</span>
            </div>
            <div>
              <span className="font-medium text-muted-foreground block">Email</span>
              <span>{patient.email || '—'}</span>
            </div>
            <div>
              <span className="font-medium text-muted-foreground block">Teléfono</span>
              <span>{patient.phone || '—'}</span>
            </div>
            <div>
              <span className="font-medium text-muted-foreground block">Ciudad</span>
              <span>{patient.city || '—'}</span>
            </div>
            <div>
              <span className="font-medium text-muted-foreground block">EPS / Aseguradora</span>
              <span>{patient.insurance_provider || '—'}</span>
            </div>
            <div>
              <span className="font-medium text-muted-foreground block">Tipo de Sangre</span>
              <span>{patient.blood_type || '—'}</span>
            </div>
            <div>
              <span className="font-medium text-muted-foreground block">Dirección</span>
              <span>{patient.address || '—'}</span>
            </div>
          </div>

          <div className="pt-2">
            <span className="font-medium text-muted-foreground block mb-1">Alergias</span>
            <div className="flex flex-wrap gap-1">
              {allergies.length > 0 ? allergies.map((a: string, i: number) => (
                <Badge key={i} variant="outline" className="text-amber-600 border-amber-200 bg-amber-50">{a}</Badge>
              )) : <span className="text-sm text-muted-foreground">Ninguna registrada</span>}
            </div>
          </div>

          <div className="pt-2">
            <span className="font-medium text-muted-foreground block mb-1">Enfermedades crónicas</span>
            <div className="flex flex-wrap gap-1">
              {diseases.length > 0 ? diseases.map((d: string, i: number) => (
                <Badge key={i} variant="outline" className="text-red-600 border-red-200 bg-red-50">{d}</Badge>
              )) : <span className="text-sm text-muted-foreground">Ninguna registrada</span>}
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cerrar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export function PatientsPage() {
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [genderFilter, setGenderFilter] = useState('')
  const [formOpen, setFormOpen] = useState(false)
  const [detailsOpen, setDetailsOpen] = useState(false)
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null)
  const [deleteId, setDeleteId] = useState<number | null>(null)
  const [isExporting, setIsExporting] = useState(false)

  const exportPatients = async () => {
    try {
      setIsExporting(true)
      const { data } = await api.get('/patients?limit=10000')
      const exportData: Patient[] = data.data ?? []

      const workbook = new ExcelJS.Workbook()
      const sheet = workbook.addWorksheet('Pacientes')

      sheet.columns = [
        { header: 'ID', key: 'id', width: 8 },
        { header: 'Nombres', key: 'first_name', width: 20 },
        { header: 'Apellidos', key: 'last_name', width: 20 },
        { header: 'Tipo Doc.', key: 'document_type', width: 12 },
        { header: 'N° Documento', key: 'document_number', width: 15 },
        { header: 'Fecha Nacimiento', key: 'date_of_birth', width: 15 },
        { header: 'Sexo', key: 'gender', width: 10 },
        { header: 'Email', key: 'email', width: 25 },
        { header: 'Teléfono', key: 'phone', width: 15 },
        { header: 'Ciudad', key: 'city', width: 15 },
        { header: 'EPS', key: 'insurance_provider', width: 20 },
        { header: 'Tipo Sangre', key: 'blood_type', width: 12 },
        { header: 'Alergias', key: 'allergies', width: 30 },
        { header: 'N° Citas', key: 'appointment_count', width: 10 },
      ]

      sheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } }
      sheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0284C7' } }

      exportData.forEach(p => {
        const allergies = (() => {
          try { return JSON.parse(p.allergies || '[]').join(', ') } catch { return '' }
        })()
        sheet.addRow({
          ...p,
          date_of_birth: p.date_of_birth ? p.date_of_birth.split('T')[0] : '',
          gender: getGenderLabel(p.gender),
          allergies: allergies || 'Ninguna'
        })
      })

      const buffer = await workbook.xlsx.writeBuffer()
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
      saveAs(blob, `Pacientes_${new Date().toISOString().split('T')[0]}.xlsx`)
      toast.success('Reporte exportado correctamente')
    } catch (err) {
      toast.error('Error al exportar pacientes')
    } finally {
      setIsExporting(false)
    }
  }

  const { data, isLoading } = useQuery({
    queryKey: ['patients', { search, page, gender: genderFilter }],
    queryFn: async () => {
      const params = new URLSearchParams({ page: String(page), limit: '15' })
      if (search) params.set('search', search)
      if (genderFilter) params.set('gender', genderFilter)
      const { data } = await api.get(`/patients?${params}`)
      return data
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: number) => api.delete(`/patients/${id}`),
    onSuccess: () => {
      toast.success('Paciente eliminado')
      queryClient.invalidateQueries({ queryKey: ['patients'] })
      setDeleteId(null)
    },
    onError: () => toast.error('Error al eliminar'),
  })

  const patients: Patient[] = data?.data ?? []
  const pagination = data?.pagination ?? { total: 0, total_pages: 1 }

  const parseAllergies = (allergies: string | null): string[] => {
    try {
      return JSON.parse(allergies ?? '[]')
    } catch {
      return []
    }
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title flex items-center gap-2">
            <Users className="h-6 w-6 text-primary" />
            Pacientes
          </h1>
          <p className="page-subtitle">{pagination.total} pacientes registrados</p>
        </div>
        <Button onClick={() => { setSelectedPatient(null); setFormOpen(true) }} id="btn-nuevo-paciente">
          <Plus className="h-4 w-4 mr-1" />
          Nuevo paciente
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nombre, documento, email..."
                className="pl-9"
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1) }}
              />
            </div>
            <Select value={genderFilter} onValueChange={(v) => { setGenderFilter(v === 'all' ? '' : v); setPage(1) }}>
              <SelectTrigger className="w-36">
                <SelectValue placeholder="Sexo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="M">Masculino</SelectItem>
                <SelectItem value="F">Femenino</SelectItem>
                <SelectItem value="O">Otro</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" size="sm" onClick={exportPatients} loading={isExporting}>
              <Download className="h-4 w-4 mr-1" />
              Exportar
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 space-y-3">
              {[...Array(8)].map((_, i) => <div key={i} className="skeleton h-14 rounded-lg" />)}
            </div>
          ) : patients.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <UserPlus className="h-12 w-12 text-muted-foreground/30 mb-3" />
              <p className="font-medium text-muted-foreground">No se encontraron pacientes</p>
              <p className="text-sm text-muted-foreground/70 mt-1">
                {search ? 'Intenta con otro término de búsqueda' : 'Comienza registrando el primer paciente'}
              </p>
              {!search && (
                <Button className="mt-4" onClick={() => setFormOpen(true)}>
                  <Plus className="h-4 w-4 mr-1" /> Nuevo paciente
                </Button>
              )}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Paciente</TableHead>
                  <TableHead>Documento</TableHead>
                  <TableHead className="hidden md:table-cell">Contacto</TableHead>
                  <TableHead className="hidden lg:table-cell">Sangre</TableHead>
                  <TableHead className="hidden lg:table-cell">Alergias</TableHead>
                  <TableHead className="hidden md:table-cell">Citas</TableHead>
                  <TableHead className="hidden xl:table-cell">EPS</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {patients.map((patient) => {
                  const allergies = parseAllergies(patient.allergies)
                  const age = calculateAge(patient.date_of_birth)
                  return (
                    <TableRow key={patient.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="h-8 w-8">
                            <AvatarFallback className="text-xs">
                              {getInitials(`${patient.first_name} ${patient.last_name}`)}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium text-sm">{patient.first_name} {patient.last_name}</p>
                            <p className="text-xs text-muted-foreground">{age} años • {getGenderLabel(patient.gender)}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm">
                        <span className="text-muted-foreground text-xs">{patient.document_type}: </span>
                        {patient.document_number}
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        <div className="space-y-0.5">
                          {patient.phone && (
                            <div className="flex items-center gap-1 text-xs text-muted-foreground">
                              <Phone className="h-3 w-3" /> {patient.phone}
                            </div>
                          )}
                          {patient.email && (
                            <div className="flex items-center gap-1 text-xs text-muted-foreground">
                              <Mail className="h-3 w-3" /> {patient.email}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="hidden lg:table-cell">
                        {patient.blood_type && (
                          <div className="flex items-center gap-1 text-sm font-medium text-red-600">
                            <Droplets className="h-3.5 w-3.5" />
                            {patient.blood_type}
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="hidden lg:table-cell">
                        {allergies.length > 0 ? (
                          <div className="flex items-center gap-1 text-xs text-amber-600">
                            <AlertTriangle className="h-3.5 w-3.5" />
                            {allergies.length} alergia{allergies.length > 1 ? 's' : ''}
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">Ninguna</span>
                        )}
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        <Badge variant="secondary" className="text-xs">{patient.appointment_count}</Badge>
                      </TableCell>
                      <TableCell className="hidden xl:table-cell text-xs text-muted-foreground">
                        {patient.insurance_provider ?? '—'}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button variant="ghost" size="icon-sm" title="Ver Historial" onClick={() => navigate('/app/historial', { state: { patient } })}>
                            <BookOpen className="h-3.5 w-3.5" />
                          </Button>
                          <Button variant="ghost" size="icon-sm" aria-label="Ver detalle" onClick={() => { setSelectedPatient(patient); setDetailsOpen(true) }}>
                            <Eye className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            aria-label="Editar paciente"
                            onClick={() => { setSelectedPatient(patient); setFormOpen(true) }}
                          >
                            <Edit className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            className="hover:text-destructive"
                            aria-label="Eliminar paciente"
                            onClick={() => setDeleteId(patient.id)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Pagination */}
      {pagination.total_pages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Mostrando {((page - 1) * 15) + 1} – {Math.min(page * 15, pagination.total)} de {pagination.total}
          </p>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm font-medium px-2">{page} / {pagination.total_pages}</span>
            <Button variant="outline" size="sm" disabled={page >= pagination.total_pages} onClick={() => setPage(p => p + 1)}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Form Dialog */}
      {formOpen && (
        <PatientFormDialog
          open={formOpen}
          onClose={() => setFormOpen(false)}
          patient={selectedPatient}
          onSuccess={() => queryClient.invalidateQueries({ queryKey: ['patients'] })}
        />
      )}

      {/* Details Dialog */}
      {detailsOpen && (
        <PatientDetailsDialog
          open={detailsOpen}
          onClose={() => setDetailsOpen(false)}
          patient={selectedPatient}
        />
      )}

      {/* Delete confirmation */}
      <Dialog open={deleteId !== null} onOpenChange={() => setDeleteId(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Eliminar paciente</DialogTitle>
            <DialogDescription>
              ¿Estás seguro? Esta acción no se puede deshacer. El historial clínico del paciente se conservará.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteId(null)}>Cancelar</Button>
            <Button
              variant="destructive"
              loading={deleteMutation.isPending}
              onClick={() => deleteId && deleteMutation.mutate(deleteId)}
            >
              Eliminar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
