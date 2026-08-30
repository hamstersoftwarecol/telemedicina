import { useState } from 'react'
import { FileSpreadsheet, Calendar, Loader2 } from 'lucide-react'
import { format, startOfMonth, endOfMonth, startOfYear, endOfYear } from 'date-fns'
import * as ExcelJS from 'exceljs'
import { saveAs } from 'file-saver'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import api from '@/lib/api'
import { getStatusLabel, formatCurrency } from '@/lib/utils'

export function ExportReportDialog({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [exportType, setExportType] = useState<'daily' | 'monthly' | 'annual'>('monthly')
  
  const [specificDate, setSpecificDate] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [month, setMonth] = useState(format(new Date(), 'MM'))
  const [year, setYear] = useState(format(new Date(), 'yyyy'))

  const handleExport = async () => {
    setLoading(true)
    try {
      let fromDateStr = ''
      let toDateStr = ''
      let filterText = ''

      if (exportType === 'daily') {
        fromDateStr = specificDate
        toDateStr = specificDate
        filterText = `Fecha Específica: ${specificDate}`
      } else if (exportType === 'monthly') {
        const d = new Date(parseInt(year), parseInt(month) - 1, 1)
        fromDateStr = format(startOfMonth(d), 'yyyy-MM-dd')
        toDateStr = format(endOfMonth(d), 'yyyy-MM-dd')
        filterText = `Mensual: ${month}/${year}`
      } else if (exportType === 'annual') {
        const d = new Date(parseInt(year), 0, 1)
        fromDateStr = format(startOfYear(d), 'yyyy-MM-dd')
        toDateStr = format(endOfYear(d), 'yyyy-MM-dd')
        filterText = `Anual: ${year}`
      }

      const { data } = await api.get(`/reports/export?from=${fromDateStr}&to=${toDateStr}`)

      const wb = new ExcelJS.Workbook()
      wb.creator = 'Telemedicina'
      wb.created = new Date()

      // Helper function to style headers
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const styleHeader = (worksheet: ExcelJS.Worksheet, rowNum: number) => {
        const row = worksheet.getRow(rowNum)
        row.font = { bold: true, color: { argb: 'FFFFFFFF' } }
        row.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0284C7' } } // Sky 600
        row.alignment = { vertical: 'middle', horizontal: 'center' }
        row.height = 25
      }

      // --- HOJA 1: RESUMEN ---
      const wsResumen = wb.addWorksheet('Resumen')
      wsResumen.columns = [
        { header: '', key: 'col1', width: 35 },
        { header: '', key: 'col2', width: 25 },
      ]
      
      wsResumen.mergeCells('A1:B2')
      const titleResumen = wsResumen.getCell('A1')
      titleResumen.value = 'Reporte General del Sistema'
      titleResumen.font = { size: 16, bold: true, color: { argb: 'FF0F172A' } }
      titleResumen.alignment = { vertical: 'middle', horizontal: 'center' }

      wsResumen.addRow([])
      wsResumen.addRow(['Parámetros del Reporte', ''])
      wsResumen.getRow(4).font = { bold: true }
      wsResumen.getRow(4).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE2E8F0' } }
      wsResumen.addRow(['Tipo de Filtro', filterText])
      wsResumen.addRow(['Desde', fromDateStr])
      wsResumen.addRow(['Hasta', toDateStr])
      
      wsResumen.addRow([])
      wsResumen.addRow(['Indicadores Clave', ''])
      wsResumen.getRow(9).font = { bold: true }
      wsResumen.getRow(9).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE2E8F0' } }
      
      wsResumen.addRow(['Pacientes Activos Totales', data.kpis.patients_total])
      wsResumen.addRow(['Médicos Activos Totales', data.kpis.doctors_active])
      wsResumen.addRow(['Citas en el período', data.kpis.period_appointments])
      
      const revRow = wsResumen.addRow(['Ingresos en el período (COP)', data.kpis.period_revenue])
      revRow.getCell(2).numFmt = '"$"#,##0.00'


      // --- HOJA 2: CITAS ---
      const wsCitas = wb.addWorksheet('Citas')
      wsCitas.columns = [
        { header: 'ID', key: 'id', width: 10 },
        { header: 'Fecha', key: 'fecha', width: 15 },
        { header: 'Hora', key: 'hora', width: 12 },
        { header: 'Paciente', key: 'paciente', width: 30 },
        { header: 'Médico', key: 'medico', width: 30 },
        { header: 'Especialidad', key: 'esp', width: 25 },
        { header: 'Tipo', key: 'tipo', width: 15 },
        { header: 'Estado', key: 'estado', width: 20 },
      ]
      styleHeader(wsCitas, 1)

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      data.appointments.forEach((a: any) => {
        wsCitas.addRow({
          id: a.id,
          fecha: a.appointment_date,
          hora: a.start_time,
          paciente: a.patient_name,
          medico: a.doctor_name,
          esp: a.specialty_name || 'N/A',
          tipo: a.type === 'virtual' ? 'Virtual' : 'Presencial',
          estado: getStatusLabel(a.status)
        })
      })


      // --- HOJA 3: FACTURACIÓN ---
      const wsFac = wb.addWorksheet('Facturación')
      wsFac.columns = [
        { header: 'ID Factura', key: 'id', width: 15 },
        { header: 'Fecha', key: 'fecha', width: 15 },
        { header: 'Paciente', key: 'paciente', width: 35 },
        { header: 'Total (COP)', key: 'total', width: 20 },
        { header: 'Estado', key: 'estado', width: 20 },
      ]
      styleHeader(wsFac, 1)

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      data.invoices.forEach((i: any) => {
        const row = wsFac.addRow({
          id: `FAC-${i.id.toString().padStart(4, '0')}`,
          fecha: i.issue_date,
          paciente: i.patient_name,
          total: i.total,
          estado: getStatusLabel(i.status)
        })
        row.getCell('total').numFmt = '"$"#,##0.00'
      })

      // Descargar
      const buffer = await wb.xlsx.writeBuffer()
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
      saveAs(blob, `Reporte_Telemedicina_${fromDateStr}_al_${toDateStr}.xlsx`)

      setOpen(false)
    } catch (error) {
      console.error('Error exporting report:', error)
      alert('Ocurrió un error al exportar el reporte.')
    } finally {
      setLoading(false)
    }
  }

  const currentYear = new Date().getFullYear()
  const years = Array.from({ length: 5 }, (_, i) => (currentYear - i).toString())

  const months = [
    { value: '01', label: 'Enero' },
    { value: '02', label: 'Febrero' },
    { value: '03', label: 'Marzo' },
    { value: '04', label: 'Abril' },
    { value: '05', label: 'Mayo' },
    { value: '06', label: 'Junio' },
    { value: '07', label: 'Julio' },
    { value: '08', label: 'Agosto' },
    { value: '09', label: 'Septiembre' },
    { value: '10', label: 'Octubre' },
    { value: '11', label: 'Noviembre' },
    { value: '12', label: 'Diciembre' },
  ]

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5 text-green-600" />
            Exportar reporte profesional
          </DialogTitle>
          <DialogDescription>
            Genera un archivo Excel (.xlsx) estructurado con métricas, citas y facturación.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <label className="text-sm font-medium leading-none">Tipo de reporte</label>
            <Select value={exportType} onValueChange={(v: any) => setExportType(v)}>
              <SelectTrigger>
                <SelectValue placeholder="Selecciona el tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="daily">Fecha específica (Diario)</SelectItem>
                <SelectItem value="monthly">Reporte Mensual</SelectItem>
                <SelectItem value="annual">Reporte Anual</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {exportType === 'daily' && (
            <div className="grid gap-2">
              <label className="text-sm font-medium leading-none">Selecciona la fecha</label>
              <div className="relative">
                <Input 
                  type="date" 
                  value={specificDate} 
                  onChange={(e) => setSpecificDate(e.target.value)} 
                  className="pl-10"
                />
                <Calendar className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              </div>
            </div>
          )}

          {exportType === 'monthly' && (
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <label className="text-sm font-medium leading-none">Mes</label>
                <Select value={month} onValueChange={setMonth}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {months.map(m => (
                      <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <label className="text-sm font-medium leading-none">Año</label>
                <Select value={year} onValueChange={setYear}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {years.map(y => (
                      <SelectItem key={y} value={y}>{y}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          {exportType === 'annual' && (
            <div className="grid gap-2">
              <label className="text-sm font-medium leading-none">Año</label>
              <Select value={year} onValueChange={setYear}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {years.map(y => (
                    <SelectItem key={y} value={y}>{y}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-3 mt-4">
          <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
          <Button onClick={handleExport} disabled={loading} className="bg-green-600 hover:bg-green-700">
            {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <FileSpreadsheet className="w-4 h-4 mr-2" />}
            Descargar Excel
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
