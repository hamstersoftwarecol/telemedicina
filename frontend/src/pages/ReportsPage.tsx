/**
 * Reports Page — Detailed analytics with date filters and CSV export
 */
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend, RadarChart, Radar, PolarGrid, PolarAngleAxis,
  AreaChart, Area, LineChart, Line,
} from 'recharts'
import {
  BarChart3, Download, TrendingUp, Users, DollarSign, Calendar,
  FileText, AlertCircle, CheckCircle, Clock,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import api from '@/lib/api'
import { formatCurrency, getStatusLabel } from '@/lib/utils'

const COLORS = ['#0ea5e9', '#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899']
const MONTHS_ES: Record<string, string> = {
  '01': 'Ene', '02': 'Feb', '03': 'Mar', '04': 'Abr',
  '05': 'May', '06': 'Jun', '07': 'Jul', '08': 'Ago',
  '09': 'Sep', '10': 'Oct', '11': 'Nov', '12': 'Dic',
}

type Period = 'month' | '3months' | '6months' | 'year'

const PERIOD_LABELS: Record<Period, string> = {
  month: 'Este mes',
  '3months': 'Últimos 3 meses',
  '6months': 'Últimos 6 meses',
  year: 'Este año',
}

export function ReportsPage() {
  const [period, setPeriod] = useState<Period>('3months')

  const { data: dashData, isLoading } = useQuery({
    queryKey: ['reports', 'dashboard'],
    queryFn: async () => { const { data } = await api.get('/reports/dashboard'); return data },
  })

  const { data: patientData } = useQuery({
    queryKey: ['reports', 'patients'],
    queryFn: async () => { const { data } = await api.get('/reports/patients'); return data },
  })

  const { data: revenueData } = useQuery({
    queryKey: ['reports', 'revenue'],
    queryFn: async () => { const { data } = await api.get('/reports/revenue'); return data },
  })

  // Format monthly data with period filter
  const allMonthlyAppts = (dashData?.charts?.appointments_by_month ?? []).map((d: { month: string; count: number }) => ({
    month: MONTHS_ES[d.month.split('-')[1]] ?? d.month,
    citas: d.count,
    raw: d.month,
  }))

  const allMonthlyRevenue = (dashData?.charts?.revenue_by_month ?? []).map((d: { month: string; revenue: number }) => ({
    month: MONTHS_ES[d.month.split('-')[1]] ?? d.month,
    ingresos: d.revenue,
  }))

  const periodLimit = period === 'month' ? 1 : period === '3months' ? 3 : period === '6months' ? 6 : 12
  const monthlyAppts = allMonthlyAppts.slice(-periodLimit)
  const monthlyRevenue = allMonthlyRevenue.slice(-periodLimit)

  // Status breakdown
  const statusData = (dashData?.charts?.appointments_by_status ?? []).map((d: { status: string; count: number }) => ({
    name: getStatusLabel(d.status),
    value: d.count,
    status: d.status,
  }))

  const totalAppts = statusData.reduce((acc: number, d: { value: number }) => acc + d.value, 0)
  const cancelledCount = statusData.find((d: { status: string }) => d.status === 'cancelled')?.value ?? 0
  const cancelRate = totalAppts > 0 ? ((cancelledCount / totalAppts) * 100).toFixed(1) : '0'
  const completedCount = statusData.find((d: { status: string }) => d.status === 'completed')?.value ?? 0
  const completionRate = totalAppts > 0 ? ((completedCount / totalAppts) * 100).toFixed(1) : '0'

  // Patient analytics
  const genderData = (patientData?.by_gender ?? []).map((d: { gender: string; count: number }) => ({
    name: d.gender === 'M' ? 'Masculino' : d.gender === 'F' ? 'Femenino' : 'Otro',
    value: d.count,
  }))
  const bloodTypeData = patientData?.by_blood_type ?? []
  const ageData = patientData?.by_age ?? []
  const specialtyData = (dashData?.charts?.patients_by_specialty ?? []).slice(0, 7)

  // CSV export
  const handleExportCSV = () => {
    let csv = `REPORTE ANALÍTICO - TelemedApp\nPeriodo: ${PERIOD_LABELS[period]}\nGenerado: ${new Date().toLocaleString('es-ES')}\n\n`
    csv += `RESUMEN GENERAL\nTotal pacientes,${dashData?.kpis?.patients_total ?? 0}\nMédicos activos,${dashData?.kpis?.doctors_active ?? 0}\nIngresos del mes,${dashData?.kpis?.monthly_revenue ?? 0}\nCitas hoy,${dashData?.kpis?.appointments_today ?? 0}\nTasa de cancelación,${cancelRate}%\nTasa de completación,${completionRate}%\n\n`
    csv += `CITAS POR MES\nMes,Citas\n`
    monthlyAppts.forEach((d: { month: string; citas: number }) => { csv += `${d.month},${d.citas}\n` })
    csv += `\nINGRESOS POR MES\nMes,Ingresos\n`
    monthlyRevenue.forEach((d: { month: string; ingresos: number }) => { csv += `${d.month},${d.ingresos}\n` })
    csv += `\nESTADO DE CITAS\nEstado,Cantidad\n`
    statusData.forEach((d: { name: string; value: number }) => { csv += `${d.name},${d.value}\n` })

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.setAttribute('href', URL.createObjectURL(blob))
    link.setAttribute('download', `reporte_analitico_${new Date().toISOString().split('T')[0]}.csv`)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const Skeleton = () => <div className="skeleton h-48 w-full rounded-xl" />

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="page-title flex items-center gap-2"><BarChart3 className="h-6 w-6 text-primary" />Reportes</h1>
          <p className="page-subtitle">Análisis y estadísticas del sistema</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {/* Period filter */}
          <div className="flex items-center gap-1 bg-muted rounded-lg p-1">
            {(Object.keys(PERIOD_LABELS) as Period[]).map(p => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${period === p ? 'bg-background shadow text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
              >
                {PERIOD_LABELS[p]}
              </button>
            ))}
          </div>
          <Button variant="outline" size="sm" onClick={handleExportCSV}>
            <Download className="h-4 w-4 mr-1" />CSV
          </Button>
        </div>
      </div>

      {/* KPI Summary */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
        {[
          { label: 'Total pacientes', value: dashData?.kpis?.patients_total ?? 0, icon: Users, color: 'text-sky-600', bg: 'bg-sky-100 dark:bg-sky-900/20' },
          { label: 'Médicos activos', value: dashData?.kpis?.doctors_active ?? 0, icon: TrendingUp, color: 'text-emerald-600', bg: 'bg-emerald-100 dark:bg-emerald-900/20' },
          { label: 'Ingresos mes', value: formatCurrency(dashData?.kpis?.monthly_revenue ?? 0), icon: DollarSign, color: 'text-amber-600', bg: 'bg-amber-100 dark:bg-amber-900/20' },
          { label: 'Citas hoy', value: dashData?.kpis?.appointments_today ?? 0, icon: Calendar, color: 'text-violet-600', bg: 'bg-violet-100 dark:bg-violet-900/20' },
          { label: 'Tasa cancelación', value: `${cancelRate}%`, icon: AlertCircle, color: 'text-red-600', bg: 'bg-red-100 dark:bg-red-900/20' },
          { label: 'Tasa completación', value: `${completionRate}%`, icon: CheckCircle, color: 'text-green-600', bg: 'bg-green-100 dark:bg-green-900/20' },
        ].map(({ label, value, icon: Icon, color, bg }) => (
          <Card key={label} className="card-hover">
            <CardContent className="p-5">
              <div className={`inline-flex h-9 w-9 rounded-lg items-center justify-center mb-3 ${bg}`}>
                <Icon className={`h-4.5 w-4.5 ${color}`} />
              </div>
              <p className="text-xl font-bold">{value}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts row 1: Citas por mes + Estado */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Consultas por mes</CardTitle>
            <CardDescription>{PERIOD_LABELS[period]}</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? <Skeleton /> : (
              <ResponsiveContainer width="100%" height={210}>
                <AreaChart data={monthlyAppts}>
                  <defs>
                    <linearGradient id="repGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Area type="monotone" dataKey="citas" stroke="#0ea5e9" strokeWidth={2} fill="url(#repGrad)" name="Citas" />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Estado de citas</CardTitle>
            <CardDescription>Distribución actual</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? <Skeleton /> : (
              <>
                <ResponsiveContainer width="100%" height={150}>
                  <PieChart>
                    <Pie data={statusData.length ? statusData : [{ name: 'Sin datos', value: 1 }]}
                      cx="50%" cy="50%" innerRadius={45} outerRadius={70} paddingAngle={3} dataKey="value">
                      {statusData.map((_: unknown, i: number) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
                <div className="space-y-1.5 mt-2">
                  {statusData.slice(0, 4).map((d: { name: string; value: number }, i: number) => (
                    <div key={d.name} className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-1.5">
                        <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                        <span className="text-muted-foreground">{d.name}</span>
                      </div>
                      <span className="font-semibold">{d.value}</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Charts row 2: Ingresos + Cancelaciones */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Ingresos mensuales</CardTitle>
            <CardDescription>En COP · {PERIOD_LABELS[period]}</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? <Skeleton /> : (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={monthlyRevenue} barSize={28}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `$${(v / 1000).toFixed(0)}k`} />
                  <Tooltip formatter={v => formatCurrency(Number(v))} />
                  <Bar dataKey="ingresos" fill="#6366f1" radius={[4, 4, 0, 0]} name="Ingresos" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Consultas por especialidad</CardTitle>
            <CardDescription>Top especialidades</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? <Skeleton /> : (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={specialtyData.length ? specialtyData : [
                  { name: 'Med. General', count: 45 }, { name: 'Cardiología', count: 22 },
                  { name: 'Pediatría', count: 18 }, { name: 'Neurología', count: 12 },
                ]} layout="vertical" barSize={14}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis type="number" tick={{ fontSize: 11 }} />
                  <YAxis dataKey="name" type="category" tick={{ fontSize: 10 }} width={90} />
                  <Tooltip />
                  <Bar dataKey="count" fill="#10b981" radius={[0, 4, 4, 0]} name="Citas" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Charts row 3: Pacientes */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader><CardTitle className="text-base">Por género</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={180}>
              <PieChart>
                <Pie data={genderData.length ? genderData : [{ name: 'Masculino', value: 55 }, { name: 'Femenino', value: 40 }, { name: 'Otro', value: 5 }]}
                  cx="50%" cy="50%" outerRadius={70} dataKey="value"
                  label={({ name, percent }) => `${name.slice(0, 3)} ${(percent * 100).toFixed(0)}%`} labelLine={false}>
                  {genderData.map((_: unknown, i: number) => <Cell key={i} fill={COLORS[i]} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Distribución de edades</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={ageData.length ? ageData : [
                { age_group: '0-17', count: 5 }, { age_group: '18-34', count: 25 },
                { age_group: '35-49', count: 35 }, { age_group: '50-64', count: 25 }, { age_group: '65+', count: 10 },
              ]}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="age_group" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip />
                <Bar dataKey="count" fill="#f59e0b" radius={[4, 4, 0, 0]} name="Pacientes" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Tipos de sangre</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={180}>
              <RadarChart data={bloodTypeData.length ? bloodTypeData : [
                { blood_type: 'O+', count: 38 }, { blood_type: 'A+', count: 28 },
                { blood_type: 'B+', count: 12 }, { blood_type: 'AB+', count: 5 },
                { blood_type: 'O-', count: 7 }, { blood_type: 'A-', count: 5 },
              ]}>
                <PolarGrid />
                <PolarAngleAxis dataKey="blood_type" tick={{ fontSize: 10 }} />
                <Radar name="Pacientes" dataKey="count" stroke="#ef4444" fill="#ef4444" fillOpacity={0.3} />
                <Tooltip />
              </RadarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Status breakdown table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <FileText className="h-4 w-4 text-primary" />
            Desglose por estado de citas
          </CardTitle>
          <CardDescription>Resumen detallado del estado actual de todas las citas</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Estado</TableHead>
                <TableHead className="text-right">Cantidad</TableHead>
                <TableHead className="text-right">Porcentaje</TableHead>
                <TableHead>Barra</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(statusData.length ? statusData : [
                { name: 'Completadas', value: 120, status: 'completed' },
                { name: 'Confirmadas', value: 45, status: 'confirmed' },
                { name: 'Pendientes', value: 30, status: 'pending' },
                { name: 'Canceladas', value: 15, status: 'cancelled' },
              ]).map((d: { name: string; value: number }, i: number) => {
                const pct = totalAppts > 0 ? ((d.value / totalAppts) * 100).toFixed(1) : '0'
                return (
                  <TableRow key={d.name}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                        <span className="font-medium text-sm">{d.name}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right font-semibold">{d.value}</TableCell>
                    <TableCell className="text-right text-muted-foreground">{pct}%</TableCell>
                    <TableCell className="w-48">
                      <div className="h-2 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all"
                          style={{ width: `${pct}%`, backgroundColor: COLORS[i % COLORS.length] }}
                        />
                      </div>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
