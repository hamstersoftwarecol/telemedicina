/**
 * Exams Page — Lab results & file management with R2 upload
 */
import { useState, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  FlaskConical, Plus, Search, Download, Trash2, ChevronLeft, ChevronRight,
  Upload, FileText, FileImage, File, CheckCircle, Clock, AlertCircle,
  X, Eye,
} from 'lucide-react'
import { PDFDownloadLink } from '@react-pdf/renderer'
import { ExamDocument } from '@/components/pdf/ExamDocument'
import { toast } from 'sonner'
import { Card, CardContent } from '@/components/ui/card'
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
interface Exam {
  id: number
  patient_id: number
  patient_name: string
  doctor_name: string | null
  exam_type: string
  exam_name: string
  exam_date: string
  file_name: string
  file_type: string
  file_size_bytes: number
  status: string
  results_summary: string | null
  r2_key: string
}

const EXAM_TYPES = [
  { value: 'laboratory', label: 'Laboratorio' },
  { value: 'imaging',    label: 'Imagen (RX/TAC/MRI)' },
  { value: 'pathology',  label: 'Patología' },
  { value: 'cardiology', label: 'Cardiología' },
  { value: 'other',      label: 'Otro' },
]

const STATUS_META: Record<string, { label: string; variant: 'success' | 'warning' | 'secondary' | 'outline'; icon: React.ElementType }> = {
  pending:   { label: 'Pendiente',  variant: 'warning',   icon: Clock },
  completed: { label: 'Completado', variant: 'success',   icon: CheckCircle },
  cancelled: { label: 'Cancelado',  variant: 'secondary', icon: AlertCircle },
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function FileTypeIcon({ type }: { type: string }) {
  if (type === 'pdf') return <FileText className="h-4 w-4 text-red-500" />
  if (type === 'png' || type === 'jpg') return <FileImage className="h-4 w-4 text-sky-500" />
  return <File className="h-4 w-4 text-muted-foreground" />
}

// ─── Upload Dialog ────────────────────────────────────────────────────────────
function UploadExamDialog({ open, onClose, onSuccess }: { open: boolean; onClose: () => void; onSuccess: () => void }) {
  const { data: patients } = useQuery({
    queryKey: ['patients-list'],
    queryFn: async () => { const { data } = await api.get('/patients?limit=100'); return data },
    enabled: open,
  })

  const [form, setForm] = useState({ patient_id: '', exam_name: '', exam_type: 'laboratory', exam_date: new Date().toISOString().split('T')[0] })
  const [file, setFile] = useState<File | null>(null)
  const [dragging, setDragging] = useState(false)
  const [uploading, setUploading] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const handleFile = (f: File) => {
    const allowed = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp']
    if (!allowed.includes(f.type)) { toast.error('Tipo de archivo no permitido. Usa PDF, JPG o PNG'); return }
    if (f.size > 10 * 1024 * 1024) { toast.error('Archivo demasiado grande. Máximo 10MB'); return }
    setFile(f)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault(); setDragging(false)
    if (e.dataTransfer.files[0]) handleFile(e.dataTransfer.files[0])
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!file) { toast.error('Selecciona un archivo'); return }
    if (!form.patient_id) { toast.error('Selecciona un paciente'); return }
    if (!form.exam_name) { toast.error('Ingresa el nombre del examen'); return }

    setUploading(true)
    try {
      const fd = new FormData()
      fd.append('file', file)
      fd.append('patient_id', form.patient_id)
      fd.append('exam_name', form.exam_name)
      fd.append('exam_type', form.exam_type)
      fd.append('exam_date', form.exam_date)

      // Use axios with multipart headers
      await api.post('/exams', fd, { headers: { 'Content-Type': 'multipart/form-data' } })
      toast.success('Examen subido correctamente')
      onSuccess(); onClose()
      setFile(null)
      setForm({ patient_id: '', exam_name: '', exam_type: 'laboratory', exam_date: new Date().toISOString().split('T')[0] })
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Error al subir el examen'))
    } finally {
      setUploading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5 text-primary" />
            Subir examen / resultado
          </DialogTitle>
          <DialogDescription>Adjunta el archivo PDF o imagen del resultado</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Paciente *</label>
            <SearchableSelect
              value={form.patient_id}
              onChange={(val) => setForm({ ...form, patient_id: String(val) })}
              options={(patients?.data ?? []).map((p: any) => ({ value: p.id, label: `${p.first_name} ${p.last_name}` }))}
              placeholder="Seleccionar paciente..."
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            {/* Name */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Nombre del examen *</label>
              <Input placeholder="Hemograma, Glucosa, RX Tórax..."
                value={form.exam_name} onChange={(e) => setForm({ ...form, exam_name: e.target.value })} />
            </div>
            {/* Date */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Fecha del examen</label>
              <Input type="date" value={form.exam_date} onChange={(e) => setForm({ ...form, exam_date: e.target.value })} />
            </div>
          </div>

          {/* Type */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Tipo de examen</label>
            <select
              value={form.exam_type}
              onChange={(e) => setForm({ ...form, exam_type: e.target.value })}
              className="flex h-9 w-full rounded-lg border border-input bg-background px-3 py-1 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              {EXAM_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </div>

          {/* Drop zone */}
          <div
            onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
            onDragLeave={() => setDragging(false)}
            onDrop={handleDrop}
            onClick={() => fileRef.current?.click()}
            className={cn(
              'relative flex flex-col items-center justify-center gap-2 p-6 rounded-xl border-2 border-dashed cursor-pointer transition-all',
              dragging ? 'border-primary bg-primary/5 scale-[1.01]' : 'border-border hover:border-primary/50 hover:bg-muted/30',
              file && 'border-emerald-400 bg-emerald-50 dark:bg-emerald-900/20'
            )}
          >
            <input ref={fileRef} type="file" className="hidden" accept=".pdf,.jpg,.jpeg,.png,.webp"
              onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])} />

            {file ? (
              <>
                <div className="h-10 w-10 rounded-xl bg-emerald-500/10 flex items-center justify-center">
                  <FileTypeIcon type={file.type.includes('pdf') ? 'pdf' : file.type.includes('png') ? 'png' : 'jpg'} />
                </div>
                <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-400">{file.name}</p>
                <p className="text-xs text-muted-foreground">{formatBytes(file.size)}</p>
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); setFile(null) }}
                  className="absolute top-2 right-2 h-6 w-6 rounded-full bg-muted flex items-center justify-center hover:bg-destructive/10 hover:text-destructive"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </>
            ) : (
              <>
                <div className="h-10 w-10 rounded-xl bg-muted flex items-center justify-center">
                  <Upload className="h-5 w-5 text-muted-foreground" />
                </div>
                <p className="text-sm font-medium">Arrastra el archivo aquí</p>
                <p className="text-xs text-muted-foreground">PDF, JPG o PNG — máximo 10MB</p>
              </>
            )}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
            <Button type="submit" loading={uploading} disabled={!file || !form.patient_id}>
              <Upload className="h-4 w-4 mr-1.5" />
              Subir examen
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export function ExamsPage() {
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [page, setPage] = useState(1)
  const [uploadOpen, setUploadOpen] = useState(false)
  const [deleteId, setDeleteId] = useState<number | null>(null)
  const LIMIT = 15

  const { data, isLoading } = useQuery({
    queryKey: ['exams', typeFilter, statusFilter, page],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (typeFilter !== 'all') params.set('exam_type', typeFilter)
      if (statusFilter !== 'all') params.set('status', statusFilter)
      const { data } = await api.get(`/exams?${params}`)
      return data
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: number) => api.delete(`/exams/${id}`),
    onSuccess: () => {
      toast.success('Examen eliminado')
      queryClient.invalidateQueries({ queryKey: ['exams'] })
      setDeleteId(null)
    },
    onError: (err) => toast.error(getApiErrorMessage(err, 'Error al eliminar')),
  })

  const handleDownload = async (exam: Exam) => {
    try {
      const response = await api.get(`/exams/${exam.id}/download`, { responseType: 'blob' })
      const url = URL.createObjectURL(response.data)
      const a = document.createElement('a')
      a.href = url; a.download = exam.file_name; a.click()
      URL.revokeObjectURL(url)
    } catch {
      toast.error('Error al descargar el archivo')
    }
  }

  const allExams: Exam[] = data?.data ?? []
  const filtered = allExams.filter(e => {
    if (search && !e.patient_name?.toLowerCase().includes(search.toLowerCase()) &&
        !e.exam_name?.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  const paginated = filtered.slice((page - 1) * LIMIT, page * LIMIT)
  const totalPages = Math.ceil(filtered.length / LIMIT) || 1

  const byType = EXAM_TYPES.map(t => ({
    ...t,
    count: allExams.filter(e => e.exam_type === t.value).length,
  })).filter(t => t.count > 0)

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title flex items-center gap-2">
            <FlaskConical className="h-6 w-6 text-primary" />
            Exámenes
          </h1>
          <p className="page-subtitle">Resultados y gestión de exámenes de laboratorio</p>
        </div>
        <Button onClick={() => setUploadOpen(true)} id="btn-subir-examen">
          <Upload className="h-4 w-4 mr-1" />
          Subir examen
        </Button>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total exámenes',  value: allExams.length,                                       color: 'bg-sky-500',     icon: FlaskConical },
          { label: 'Completados',     value: allExams.filter(e => e.status === 'completed').length,  color: 'bg-emerald-500', icon: CheckCircle },
          { label: 'Pendientes',      value: allExams.filter(e => e.status === 'pending').length,    color: 'bg-amber-500',   icon: Clock },
          { label: 'Tipos distintos', value: byType.length,                                         color: 'bg-violet-500',  icon: File },
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

      {/* Type breakdown pills */}
      {byType.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {byType.map(t => (
            <button
              key={t.value}
              onClick={() => setTypeFilter(typeFilter === t.value ? 'all' : t.value)}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors',
                typeFilter === t.value
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'bg-background hover:bg-muted border-border'
              )}
            >
              <FlaskConical className="h-3 w-3" />
              {t.label} <span className="opacity-70">({t.count})</span>
            </button>
          ))}
        </div>
      )}

      {/* Filters */}
      <Card>
        <CardContent className="p-4 flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input className="pl-9" placeholder="Buscar por paciente o nombre del examen..."
              value={search} onChange={(e) => { setSearch(e.target.value); setPage(1) }} />
          </div>
          <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1) }}>
            <SelectTrigger className="w-40"><SelectValue placeholder="Estado" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="pending">Pendientes</SelectItem>
              <SelectItem value="completed">Completados</SelectItem>
              <SelectItem value="cancelled">Cancelados</SelectItem>
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 space-y-3">{[...Array(6)].map((_, i) => <div key={i} className="skeleton h-14 rounded-lg" />)}</div>
          ) : paginated.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="h-14 w-14 rounded-2xl bg-muted flex items-center justify-center mb-3">
                <FlaskConical className="h-7 w-7 text-muted-foreground/40" />
              </div>
              <p className="font-semibold text-muted-foreground">
                {search || typeFilter !== 'all' || statusFilter !== 'all' ? 'Sin resultados' : 'No hay exámenes cargados'}
              </p>
              {!search && typeFilter === 'all' && statusFilter === 'all' && (
                <Button className="mt-4" onClick={() => setUploadOpen(true)}>
                  <Upload className="h-4 w-4 mr-1" /> Subir primer examen
                </Button>
              )}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Archivo</TableHead>
                  <TableHead>Paciente</TableHead>
                  <TableHead>Examen</TableHead>
                  <TableHead className="hidden md:table-cell">Tipo</TableHead>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Tamaño</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginated.map((exam) => {
                  const meta = STATUS_META[exam.status] ?? { label: exam.status, variant: 'outline' as const, icon: File }
                  const examType = EXAM_TYPES.find(t => t.value === exam.exam_type)
                  return (
                    <TableRow key={exam.id}>
                      <TableCell>
                        <div className="flex items-center justify-center h-9 w-9 rounded-lg border bg-muted/30">
                          <FileTypeIcon type={exam.file_type} />
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center text-xs font-semibold text-primary shrink-0">
                            {exam.patient_name?.charAt(0)}
                          </div>
                          <span className="text-sm font-medium">{exam.patient_name}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <p className="text-sm font-medium">{exam.exam_name}</p>
                        <p className="text-xs text-muted-foreground truncate max-w-[140px]">{exam.file_name}</p>
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        <Badge variant="secondary" className="text-xs">{examType?.label ?? exam.exam_type}</Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                        {formatRelativeTime(exam.exam_date)}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {formatBytes(exam.file_size_bytes)}
                      </TableCell>
                      <TableCell>
                        <Badge variant={meta.variant}>{meta.label}</Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <PDFDownloadLink
                            document={<ExamDocument data={exam} />}
                            fileName={`Examen_${exam.patient_name.replace(/\s+/g, '_')}_${formatDate(exam.exam_date).replace(/\s+/g, '')}.pdf`}
                          >
                            {({ loading }) => (
                              <Button
                                variant="ghost" size="icon-sm"
                                disabled={loading}
                                aria-label="Descargar PDF Resumen"
                                title="Descargar Resumen PDF"
                                className="hover:text-blue-600"
                              >
                                <FileText className="h-3.5 w-3.5" />
                              </Button>
                            )}
                          </PDFDownloadLink>
                          <Button
                            variant="ghost" size="icon-sm"
                            onClick={() => handleDownload(exam)}
                            aria-label="Descargar Archivo Original"
                            title="Descargar Archivo Original"
                          >
                            <Download className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost" size="icon-sm"
                            className="hover:text-destructive"
                            onClick={() => setDeleteId(exam.id)}
                            aria-label="Eliminar"
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
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground">{filtered.length} exámenes</p>
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
      <UploadExamDialog
        open={uploadOpen}
        onClose={() => setUploadOpen(false)}
        onSuccess={() => queryClient.invalidateQueries({ queryKey: ['exams'] })}
      />

      <Dialog open={deleteId !== null} onOpenChange={() => setDeleteId(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Eliminar examen</DialogTitle>
            <DialogDescription>
              Se eliminará el examen y su archivo del almacenamiento. Esta acción es irreversible.
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
