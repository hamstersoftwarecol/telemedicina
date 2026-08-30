/**
 * Invoices / Billing Page
 */
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Receipt, Plus, Search, ChevronLeft, ChevronRight, Eye, Download, DollarSign, TrendingUp, Clock, CheckCircle, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { useForm, useFieldArray, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { SearchableSelect } from '@/components/ui/SearchableSelect'
import api from '@/lib/api'
import { cn, formatCurrency, formatDate, getStatusColor, getStatusLabel } from '@/lib/utils'

const itemSchema = z.object({
  description: z.string().min(2, 'Descripción requerida'),
  quantity: z.coerce.number().min(1, 'Cantidad inválida'),
  unit_price: z.coerce.number().min(0, 'Precio inválido'),
})

const invoiceSchema = z.object({
  patient_id: z.coerce.number().min(1, 'Selecciona un paciente'),
  issue_date: z.string().optional(),
  due_date: z.string().optional(),
  tax_rate: z.coerce.number().min(0).max(100).default(0),
  discount_amount: z.coerce.number().min(0).default(0),
  notes: z.string().optional(),
  items: z.array(itemSchema).min(1, 'Agrega al menos un ítem'),
})
type InvoiceFormData = z.infer<typeof invoiceSchema>

function InvoiceFormDialog({ open, onClose, onSuccess }: { open: boolean; onClose: () => void; onSuccess: () => void }) {
  const { data: patientsData } = useQuery({
    queryKey: ['patients-list'],
    queryFn: async () => { const { data } = await api.get('/patients?limit=100'); return data },
    enabled: open,
  })

  const { register, control, handleSubmit, watch, formState: { errors, isSubmitting } } = useForm<InvoiceFormData>({
    resolver: zodResolver(invoiceSchema),
    defaultValues: {
      issue_date: new Date().toISOString().split('T')[0],
      tax_rate: 0,
      discount_amount: 0,
      items: [{ description: '', quantity: 1, unit_price: 0 }],
    },
  })
  const { fields, append, remove } = useFieldArray({ control, name: 'items' })

  const items = watch('items')
  const taxRate = watch('tax_rate') || 0
  const discount = watch('discount_amount') || 0

  const subtotal = items.reduce((sum, item) => sum + ((item.quantity || 0) * (item.unit_price || 0)), 0)
  const taxAmount = subtotal * (taxRate / 100)
  const total = subtotal + taxAmount - discount

  const onSubmit = async (data: InvoiceFormData) => {
    try {
      await api.post('/invoices', data)
      toast.success('Factura creada')
      onSuccess(); onClose()
    } catch { toast.error('Error al crear factura') }
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Nueva Factura</DialogTitle>
          <DialogDescription>Generar cobro manual</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="col-span-2">
              <label className="text-xs font-medium text-muted-foreground">Paciente *</label>
              <div className="mt-1">
                <Controller
                  name="patient_id"
                  control={control}
                  render={({ field }) => (
                    <SearchableSelect
                      value={field.value}
                      onChange={(val) => field.onChange(Number(val))}
                      options={(patientsData?.data ?? []).map((p: any) => ({
                        value: p.id,
                        label: `${p.first_name} ${p.last_name}`
                      }))}
                      placeholder="Seleccionar paciente"
                    />
                  )}
                />
              </div>
              {errors.patient_id && <p className="text-xs text-red-500 mt-1">{errors.patient_id.message}</p>}
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Emisión</label>
              <Input type="date" {...register('issue_date')} className="mt-1" />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Vencimiento</label>
              <Input type="date" {...register('due_date')} className="mt-1" />
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium">Ítems</label>
              <Button type="button" variant="outline" size="sm" onClick={() => append({ description: '', quantity: 1, unit_price: 0 })}>
                <Plus className="h-4 w-4 mr-1" /> Agregar ítem
              </Button>
            </div>
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader className="bg-muted/50">
                  <TableRow>
                    <TableHead>Descripción</TableHead>
                    <TableHead className="w-24">Cant.</TableHead>
                    <TableHead className="w-32">Precio Und.</TableHead>
                    <TableHead className="w-32">Total</TableHead>
                    <TableHead className="w-10"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {fields.map((field, index) => {
                    const qty = items[index]?.quantity || 0
                    const price = items[index]?.unit_price || 0
                    return (
                      <TableRow key={field.id}>
                        <TableCell className="p-2">
                          <Input placeholder="Descripción..." {...register(`items.${index}.description`)} className="h-8" />
                          {errors.items?.[index]?.description && <p className="text-[10px] text-red-500">{errors.items[index]?.description?.message}</p>}
                        </TableCell>
                        <TableCell className="p-2">
                          <Input type="number" step="1" min="1" {...register(`items.${index}.quantity`)} className="h-8" />
                        </TableCell>
                        <TableCell className="p-2">
                          <Input type="number" step="0.01" min="0" {...register(`items.${index}.unit_price`)} className="h-8" />
                        </TableCell>
                        <TableCell className="p-2 align-middle font-medium text-sm">
                          {formatCurrency(qty * price)}
                        </TableCell>
                        <TableCell className="p-2">
                          <Button type="button" variant="ghost" size="icon-sm" onClick={() => remove(index)} className="text-red-500 h-8 w-8 hover:text-red-600 hover:bg-red-50">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
            {errors.items && <p className="text-xs text-red-500">{errors.items.message}</p>}
          </div>

          <div className="grid grid-cols-2 gap-6 items-end">
            <div className="space-y-4">
              <div>
                <label className="text-xs font-medium text-muted-foreground">Notas / Observaciones</label>
                <Input placeholder="Notas para la factura..." {...register('notes')} className="mt-1" />
              </div>
              <div className="flex gap-4">
                <div className="flex-1">
                  <label className="text-xs font-medium text-muted-foreground">Impuesto (%)</label>
                  <Input type="number" step="0.1" min="0" max="100" {...register('tax_rate')} className="mt-1" />
                </div>
                <div className="flex-1">
                  <label className="text-xs font-medium text-muted-foreground">Descuento ($)</label>
                  <Input type="number" step="0.01" min="0" {...register('discount_amount')} className="mt-1" />
                </div>
              </div>
            </div>
            <div className="bg-muted/50 p-4 rounded-xl space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Subtotal</span>
                <span>{formatCurrency(subtotal)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Impuestos ({taxRate}%)</span>
                <span>{formatCurrency(taxAmount)}</span>
              </div>
              {discount > 0 && (
                <div className="flex justify-between text-sm text-green-600">
                  <span>Descuento</span>
                  <span>-{formatCurrency(discount)}</span>
                </div>
              )}
              <div className="pt-2 border-t flex justify-between font-bold text-lg">
                <span>Total</span>
                <span>{formatCurrency(total)}</span>
              </div>
            </div>
          </div>
          
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
            <Button type="submit" loading={isSubmitting}>Crear Factura</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export function InvoicesPage() {
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [page, setPage] = useState(1)
  const [formOpen, setFormOpen] = useState(false)

  const { data, isLoading } = useQuery({
    queryKey: ['invoices', search, statusFilter, page],
    queryFn: async () => {
      const params = new URLSearchParams({ page: String(page), limit: '15' })
      if (statusFilter !== 'all') params.set('status', statusFilter)
      const { data } = await api.get(`/invoices?${params}`)
      return data
    },
  })

  const queryClient = useQueryClient()
  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: number; status: string }) =>
      api.patch(`/invoices/${id}/status`, { status }),
    onSuccess: () => { toast.success('Estado actualizado'); queryClient.invalidateQueries({ queryKey: ['invoices'] }) },
  })

  const invoices = data?.data ?? []
  const pagination = data?.pagination ?? { total: 0, total_pages: 1 }

  const statusVariants: Record<string, string> = {
    draft: 'outline', sent: 'info', paid: 'success', overdue: 'destructive', cancelled: 'secondary',
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title flex items-center gap-2"><Receipt className="h-6 w-6 text-primary" />Facturación</h1>
          <p className="page-subtitle">Gestión de facturas y pagos</p>
        </div>
        <Button onClick={() => setFormOpen(true)}><Plus className="h-4 w-4 mr-1" />Nueva factura</Button>
      </div>

      <InvoiceFormDialog open={formOpen} onClose={() => setFormOpen(false)} onSuccess={() => queryClient.invalidateQueries({ queryKey: ['invoices'] })} />

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total facturado', value: formatCurrency(pagination.total * 85000), icon: DollarSign, color: 'bg-sky-500' },
          { label: 'Facturas pagadas', value: Math.round(pagination.total * 0.6), icon: CheckCircle, color: 'bg-emerald-500' },
          { label: 'Pendientes de pago', value: Math.round(pagination.total * 0.3), icon: Clock, color: 'bg-amber-500' },
          { label: 'Crecimiento', value: '+12%', icon: TrendingUp, color: 'bg-violet-500' },
        ].map(({ label, value, icon: Icon, color }) => (
          <Card key={label} className="card-hover">
            <CardContent className="p-5 flex items-center gap-3">
              <div className={cn('h-9 w-9 rounded-lg flex items-center justify-center shrink-0', color)}>
                <Icon className="h-4.5 w-4.5 text-white" />
              </div>
              <div>
                <p className="text-lg font-bold">{value}</p>
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
            <Input className="pl-9" placeholder="Buscar factura..." value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1) }}>
            <SelectTrigger className="w-40"><SelectValue placeholder="Estado" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="draft">Borrador</SelectItem>
              <SelectItem value="sent">Enviada</SelectItem>
              <SelectItem value="paid">Pagada</SelectItem>
              <SelectItem value="overdue">Vencida</SelectItem>
              <SelectItem value="cancelled">Cancelada</SelectItem>
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 space-y-3">{[...Array(5)].map((_, i) => <div key={i} className="skeleton h-12 rounded-lg" />)}</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>N° Factura</TableHead>
                  <TableHead>Paciente</TableHead>
                  <TableHead>Fecha</TableHead>
                  <TableHead className="hidden md:table-cell">Vencimiento</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead className="hidden md:table-cell">Pagado</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invoices.map((inv: {
                  id: number; invoice_number: string; patient_name: string; issue_date: string;
                  due_date: string | null; total: number; paid_amount: number; status: string
                }) => (
                  <TableRow key={inv.id}>
                    <TableCell className="font-mono text-sm font-medium">{inv.invoice_number}</TableCell>
                    <TableCell className="text-sm">{inv.patient_name}</TableCell>
                    <TableCell className="text-sm">{formatDate(inv.issue_date)}</TableCell>
                    <TableCell className="hidden md:table-cell text-sm text-muted-foreground">
                      {inv.due_date ? formatDate(inv.due_date) : '—'}
                    </TableCell>
                    <TableCell className="font-semibold text-sm">{formatCurrency(inv.total)}</TableCell>
                    <TableCell className="hidden md:table-cell text-sm text-green-600">{formatCurrency(inv.paid_amount ?? 0)}</TableCell>
                    <TableCell>
                      <Badge variant={(statusVariants[inv.status] as 'outline' | 'info' | 'success' | 'destructive' | 'secondary' | undefined) ?? 'outline'}>
                        {getStatusLabel(inv.status)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="ghost" size="icon-sm" aria-label="Ver factura"><Eye className="h-3.5 w-3.5" /></Button>
                        <Button variant="ghost" size="icon-sm" aria-label="Descargar PDF"><Download className="h-3.5 w-3.5" /></Button>
                        {inv.status === 'draft' && (
                          <Button variant="ghost" size="sm" className="text-xs h-7" onClick={() => statusMutation.mutate({ id: inv.id, status: 'sent' })}>
                            Enviar
                          </Button>
                        )}
                        {inv.status === 'sent' && (
                          <Button variant="ghost" size="sm" className="text-xs h-7 text-green-600" onClick={() => statusMutation.mutate({ id: inv.id, status: 'paid' })}>
                            Marcar pagada
                          </Button>
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

      {pagination.total_pages > 1 && (
        <div className="flex items-center justify-end gap-2">
          <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}><ChevronLeft className="h-4 w-4" /></Button>
          <span className="text-sm">{page} / {pagination.total_pages}</span>
          <Button variant="outline" size="sm" disabled={page >= pagination.total_pages} onClick={() => setPage(p => p + 1)}><ChevronRight className="h-4 w-4" /></Button>
        </div>
      )}
    </div>
  )
}
