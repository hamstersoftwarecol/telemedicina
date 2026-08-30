/**
 * Dashboard Page — KPIs + Charts, diferenciado por rol
 * Roles: admin, doctor, receptionist
 */
import { useQuery } from '@tanstack/react-query'
import {
  Users, UserRound, Calendar, DollarSign,
  Clock, Video, TrendingUp, TrendingDown,
  ChevronRight, CheckCircle, AlertCircle, Activity,
  Stethoscope, FileText, ClipboardList, Bell, HeartPulse, Pill,
} from 'lucide-react'
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { ExportReportDialog } from '@/components/ExportReportDialog'
import { cn, formatCurrency, formatDate, formatNumber, getInitials, getStatusColor, getStatusLabel } from '@/lib/utils'
import api from '@/lib/api'
import { Link, useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/store/auth'

/* ─── Types ─────────────────────────────────────────────── */
interface DashboardData {
  kpis: {
    patients_total: number
    doctors_active: number
    appointments_today: number
    appointments_pending: number
    monthly_revenue: number
    active_videocalls: number
    appointments_month?: number
    appointments_cancelled_month?: number
    active_prescriptions?: number
    patients_new_30d?: number
    revenue_month?: number
  }
  charts: {
    appointments_by_status: Array<{ status: string; count: number }>
    appointments_by_month: Array<{ month: string; count: number }>
    revenue_by_month: Array<{ month: string; revenue: number }>
    patients_by_specialty: Array<{ name: string; count: number }>
    weekly_activity: Array<{ day_of_week: string; count: number }>
  }
  recent_appointments: Array<{
    id: number
    appointment_date: string
    start_time: string
    status: string
    type: string
    patient_name: string
    doctor_name: string
    specialty_name: string
  }>
}

/* ─── Constants ─────────────────────────────────────────── */
const CHART_COLORS = ['#0ea5e9', '#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6']
const DAYS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']
const MONTHS_ES: Record<string, string> = {
  '01': 'Ene', '02': 'Feb', '03': 'Mar', '04': 'Abr',
  '05': 'May', '06': 'Jun', '07': 'Jul', '08': 'Ago',
  '09': 'Sep', '10': 'Oct', '11': 'Nov', '12': 'Dic'
}

/* ─── Shared KPI card ────────────────────────────────────── */
function KPICard({
  title, value, subtitle, icon: Icon, trend, color, loading, href
}: {
  title: string
  value: string | number
  subtitle?: string
  icon: React.ElementType
  trend?: { value: number; label: string }
  color: string
  loading?: boolean
  href?: string
}) {
  const content = (
    <Card className={cn('card-hover', href && 'cursor-pointer hover:border-primary/50 transition-colors')}>
      <CardContent className="p-6">

        {loading ? (
          <div className="space-y-3">
            <div className="skeleton h-4 w-24" />
            <div className="skeleton h-8 w-16" />
            <div className="skeleton h-3 w-32" />
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm font-medium text-muted-foreground">{title}</p>
              <div className={cn('h-9 w-9 rounded-lg flex items-center justify-center', color)}>
                <Icon className="h-4.5 w-4.5 text-white" aria-hidden />
              </div>
            </div>
            <p className="text-2xl font-bold text-foreground">{value}</p>
            {subtitle && <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>}
            {trend && (
              <div className={cn('flex items-center gap-1 mt-2 text-xs font-medium', trend.value >= 0 ? 'text-green-600' : 'text-red-500')}>
                {trend.value >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                {trend.value >= 0 ? '+' : ''}{trend.value}% {trend.label}
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  )

  if (href) {
    return <Link to={href} className="block h-full">{content}</Link>
  }
  return content
}

/* ─── Shared appointment table ───────────────────────────── */
function AppointmentsTable({
  appointments, isLoading, showDoctor = true,
}: {
  appointments: DashboardData['recent_appointments']
  isLoading: boolean
  showDoctor?: boolean
}) {
  if (isLoading) return <div className="p-6 space-y-3">{[...Array(4)].map((_, i) => <div key={i} className="skeleton h-12 rounded-lg" />)}</div>
  if (appointments.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <Calendar className="h-10 w-10 text-muted-foreground/40 mb-3" />
        <p className="text-sm text-muted-foreground">No hay citas próximas</p>
      </div>
    )
  }
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Paciente</TableHead>
          {showDoctor && <TableHead>Médico</TableHead>}
          <TableHead className="hidden md:table-cell">Especialidad</TableHead>
          <TableHead>Fecha / Hora</TableHead>
          <TableHead>Tipo</TableHead>
          <TableHead>Estado</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {appointments.map((appt) => (
          <TableRow 
            key={appt.id} 
            className="cursor-pointer hover:bg-muted/30 transition-colors"
            onClick={() => window.location.href = '/app/agenda'}
          >
            <TableCell>
              <div className="flex items-center gap-2.5">
                <Avatar className="h-7 w-7">
                  <AvatarFallback className="text-xs">{getInitials(appt.patient_name)}</AvatarFallback>
                </Avatar>
                <span className="font-medium text-sm">{appt.patient_name}</span>
              </div>
            </TableCell>
            {showDoctor && <TableCell className="text-sm text-muted-foreground">{appt.doctor_name}</TableCell>}
            <TableCell className="hidden md:table-cell text-sm text-muted-foreground">{appt.specialty_name}</TableCell>
            <TableCell className="text-sm">
              <div className="font-medium">{formatDate(appt.appointment_date)}</div>
              <div className="text-muted-foreground text-xs">{appt.start_time}</div>
            </TableCell>
            <TableCell>
              <Badge variant={appt.type === 'virtual' ? 'info' : 'secondary'} className="text-xs">
                {appt.type === 'virtual' ? (<><Video className="h-3 w-3 mr-1" />Virtual</>) : 'Presencial'}
              </Badge>
            </TableCell>
            <TableCell>
              <span className={cn('inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-semibold', getStatusColor(appt.status))}>
                {appt.status === 'completed' ? <CheckCircle className="h-3 w-3 mr-1" /> : appt.status === 'cancelled' ? <AlertCircle className="h-3 w-3 mr-1" /> : null}
                {getStatusLabel(appt.status)}
              </span>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}

/* ─── ADMIN Dashboard ────────────────────────────────────── */
function AdminDashboard({ data, isLoading }: { data?: DashboardData; isLoading: boolean }) {
  const kpis = data?.kpis
  const charts = data?.charts
  const appointments = data?.recent_appointments ?? []

    // Removed to use ExportReportDialog Instead

  const monthlyData = (charts?.appointments_by_month ?? []).map(d => ({ month: MONTHS_ES[d.month.split('-')[1]] ?? d.month, citas: d.count }))
  const revenueData = (charts?.revenue_by_month ?? []).map(d => ({ month: MONTHS_ES[d.month.split('-')[1]] ?? d.month, ingresos: d.revenue }))
  const weeklyData = (charts?.weekly_activity ?? []).map(d => ({ dia: DAYS[parseInt(d.day_of_week, 10)] ?? d.day_of_week, citas: d.count }))
  const statusData = (charts?.appointments_by_status ?? []).map(d => ({ name: getStatusLabel(d.status), value: d.count }))

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title">Panel</h1>
          <p className="page-subtitle">Panel de administración del sistema</p>
        </div>
        <ExportReportDialog>
          <Button variant="outline" size="sm" disabled={!data || isLoading}>
            <Activity className="h-4 w-4 mr-1.5" />Exportar reporte
          </Button>
        </ExportReportDialog>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
        <KPICard title="Pacientes registrados" value={formatNumber(kpis?.patients_total ?? 0)} icon={Users} color="bg-sky-500" trend={{ value: 12, label: 'vs mes anterior' }} loading={isLoading} href="/app/pacientes" />
        <KPICard title="Consultas del día" value={kpis?.appointments_today ?? 0} subtitle="Citas programadas hoy" icon={Calendar} color="bg-violet-500" loading={isLoading} href="/app/agenda" />
        <KPICard title="Médicos activos" value={kpis?.doctors_active ?? 0} icon={UserRound} color="bg-emerald-500" loading={isLoading} href="/app/medicos" />
        <KPICard title="Ingresos del mes" value={formatCurrency(kpis?.monthly_revenue ?? 0)} icon={DollarSign} color="bg-amber-500" trend={{ value: 8, label: 'vs mes anterior' }} loading={isLoading} href="/app/facturacion" />
        <KPICard title="Citas pendientes" value={kpis?.appointments_pending ?? 0} subtitle="Requieren atención" icon={Clock} color="bg-orange-500" loading={isLoading} href="/app/agenda" />
        <KPICard title="Videollamadas activas" value={kpis?.active_videocalls ?? 0} icon={Video} color="bg-rose-500" loading={isLoading} href="/app/videollamadas" />
      </div>

      {/* Charts row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader><CardTitle className="text-base">Consultas por mes</CardTitle><CardDescription>Últimos 12 meses</CardDescription></CardHeader>
          <CardContent>
            {isLoading ? <div className="skeleton h-52 w-full rounded-lg" /> : (
              <ResponsiveContainer width="100%" height={210}>
                <AreaChart data={monthlyData}>
                  <defs><linearGradient id="colorCitas" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.3} /><stop offset="95%" stopColor="#0ea5e9" stopOpacity={0} /></linearGradient></defs>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} /><YAxis tick={{ fontSize: 11 }} />
                  <Tooltip /><Area type="monotone" dataKey="citas" stroke="#0ea5e9" strokeWidth={2} fill="url(#colorCitas)" name="Citas" />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-base">Estado de citas</CardTitle><CardDescription>Distribución actual</CardDescription></CardHeader>
          <CardContent>
            {isLoading ? <div className="skeleton h-52 w-full rounded-lg" /> : (
              <ResponsiveContainer width="100%" height={210}>
                <PieChart>
                  <Pie data={statusData} cx="50%" cy="50%" innerRadius={55} outerRadius={85} paddingAngle={3} dataKey="value">
                    {statusData.map((_, index) => <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />)}
                  </Pie>
                  <Tooltip /><Legend iconType="circle" iconSize={8} formatter={(v) => <span className="text-xs">{v}</span>} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Charts row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle className="text-base">Ingresos mensuales</CardTitle><CardDescription>En COP</CardDescription></CardHeader>
          <CardContent>
            {isLoading ? <div className="skeleton h-48 w-full rounded-lg" /> : (
              <ResponsiveContainer width="100%" height={190}>
                <BarChart data={revenueData} barSize={28}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
                  <Tooltip formatter={(v) => formatCurrency(Number(v))} />
                  <Bar dataKey="ingresos" fill="#6366f1" radius={[4, 4, 0, 0]} name="Ingresos" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-base">Actividad semanal</CardTitle><CardDescription>Citas por día de la semana</CardDescription></CardHeader>
          <CardContent>
            {isLoading ? <div className="skeleton h-48 w-full rounded-lg" /> : (
              <ResponsiveContainer width="100%" height={190}>
                <BarChart data={weeklyData.length ? weeklyData : DAYS.map(d => ({ dia: d, citas: 0 }))}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="dia" tick={{ fontSize: 11 }} /><YAxis tick={{ fontSize: 11 }} />
                  <Tooltip /><Bar dataKey="citas" fill="#10b981" radius={[4, 4, 0, 0]} name="Citas" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Próximas citas */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-4">
          <div><CardTitle className="text-base">Próximas consultas</CardTitle><CardDescription>Citas programadas próximamente</CardDescription></div>
          <Button variant="outline" size="sm" onClick={() => window.location.href = '/app/agenda'}>
            Ver agenda <ChevronRight className="h-3.5 w-3.5 ml-1" />
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          <AppointmentsTable appointments={appointments} isLoading={isLoading} showDoctor />
        </CardContent>
      </Card>
    </div>
  )
}

/* ─── DOCTOR Dashboard ───────────────────────────────────── */
function DoctorDashboard({ data, isLoading, userName }: { data?: DashboardData; isLoading: boolean; userName: string }) {
  const kpis = data?.kpis
  const todayAppts = (data?.recent_appointments ?? []).filter(a => a.status !== 'cancelled')
  const pending = todayAppts.filter(a => a.status === 'pending' || a.status === 'confirmed')
  const completed = todayAppts.filter(a => a.status === 'completed')

  return (
    <div className="space-y-6">
      {/* Header personalizado */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title">Bienvenido, {userName}</h1>
          <p className="page-subtitle">Panel del médico · {new Date().toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
        </div>
        <Button size="sm" onClick={() => window.location.href = '/app/agenda'}>
          <Calendar className="h-4 w-4 mr-1.5" />Ver mi agenda
        </Button>
      </div>

      {/* KPIs del médico */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KPICard title="Citas hoy" value={todayAppts.length} subtitle="Total programadas" icon={Calendar} color="bg-sky-500" loading={isLoading} href="/app/agenda" />
        <KPICard title="Pendientes" value={pending.length} subtitle="Por atender" icon={Clock} color="bg-amber-500" loading={isLoading} href="/app/agenda" />
        <KPICard title="Completadas" value={completed.length} subtitle="Hoy" icon={CheckCircle} color="bg-emerald-500" loading={isLoading} href="/app/agenda" />
        <KPICard title="Mis pacientes" value={formatNumber(kpis?.patients_total ?? 0)} subtitle="Total activos" icon={Users} color="bg-violet-500" loading={isLoading} href="/app/pacientes" />
      </div>

      {/* Citas de hoy en formato tarjeta de agenda */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between pb-4">
            <div><CardTitle className="text-base">Agenda de hoy</CardTitle><CardDescription>Tus citas para el día de hoy</CardDescription></div>
            <Badge variant={pending.length > 0 ? 'warning' : 'success'}>
              {pending.length > 0 ? `${pending.length} pendiente${pending.length > 1 ? 's' : ''}` : 'Al día'}
            </Badge>
          </CardHeader>
          <CardContent className="p-0">
            <AppointmentsTable appointments={todayAppts} isLoading={isLoading} showDoctor={false} />
          </CardContent>
        </Card>

        {/* Panel rápido de acciones */}
        <div className="space-y-4">
          <Card>
            <CardHeader><CardTitle className="text-sm">Acciones rápidas</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {[
                { label: 'Nueva consulta', icon: Stethoscope, href: '/app/consultas', color: 'text-blue-600 bg-blue-50 hover:bg-blue-100' },
                { label: 'Emitir receta', icon: FileText, href: '/app/recetas', color: 'text-violet-600 bg-violet-50 hover:bg-violet-100' },
                { label: 'Historial clínico', icon: ClipboardList, href: '/app/historial', color: 'text-emerald-600 bg-emerald-50 hover:bg-emerald-100' },
                { label: 'Videoconsulta', icon: Video, href: '/app/videollamadas', color: 'text-rose-600 bg-rose-50 hover:bg-rose-100' },
              ].map(({ label, icon: Icon, href, color }) => (
                <button key={label} onClick={() => window.location.href = href}
                  className={cn('w-full flex items-center gap-3 p-3 rounded-lg text-sm font-medium transition-colors', color)}>
                  <Icon className="h-4 w-4" />{label}
                </button>
              ))}
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle className="text-sm">Resumen del mes</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {isLoading ? [...Array(3)].map((_, i) => <div key={i} className="skeleton h-5 rounded" />) : (
                <>
                  <div className="flex justify-between text-sm"><span className="text-muted-foreground">Consultas</span><span className="font-semibold">{kpis?.appointments_month ?? 0}</span></div>
                  <div className="flex justify-between text-sm"><span className="text-muted-foreground">Canceladas</span><span className="font-semibold text-red-500">{kpis?.appointments_cancelled_month ?? 0}</span></div>
                  <div className="flex justify-between text-sm"><span className="text-muted-foreground">Recetas activas</span><span className="font-semibold text-green-600">{kpis?.active_prescriptions ?? 0}</span></div>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

/* ─── RECEPTIONIST Dashboard ─────────────────────────────── */
function ReceptionistDashboard({ data, isLoading, userName }: { data?: DashboardData; isLoading: boolean; userName: string }) {
  const kpis = data?.kpis
  const appointments = data?.recent_appointments ?? []
  const pending = appointments.filter(a => a.status === 'pending')
  const confirmed = appointments.filter(a => a.status === 'confirmed')
  const today = appointments.filter(a => {
    const today = new Date().toISOString().split('T')[0]
    return a.appointment_date === today
  })

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title">Bienvenida, {userName}</h1>
          <p className="page-subtitle">Panel de recepción · {new Date().toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => window.location.href = '/app/pacientes'}>
            <Users className="h-4 w-4 mr-1.5" />Nuevo paciente
          </Button>
          <Button size="sm" onClick={() => window.location.href = '/app/agenda'}>
            <Calendar className="h-4 w-4 mr-1.5" />Agendar cita
          </Button>
        </div>
      </div>

      {/* KPIs de recepción */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KPICard title="Pacientes registrados" value={formatNumber(kpis?.patients_total ?? 0)} icon={Users} color="bg-sky-500" trend={{ value: 5, label: 'este mes' }} loading={isLoading} href="/app/pacientes" />
        <KPICard title="Citas de hoy" value={today.length} subtitle="Programadas para hoy" icon={Calendar} color="bg-violet-500" loading={isLoading} href="/app/agenda" />
        <KPICard title="Por confirmar" value={pending.length} subtitle="Requieren acción" icon={Bell} color="bg-amber-500" loading={isLoading} href="/app/agenda" />
        <KPICard title="Médicos activos" value={kpis?.doctors_active ?? 0} subtitle="Disponibles hoy" icon={UserRound} color="bg-emerald-500" loading={isLoading} href="/app/medicos" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Citas pendientes de confirmación — lo más urgente para recepción */}
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between pb-4">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <Bell className="h-4 w-4 text-amber-500" />
                Citas por confirmar
              </CardTitle>
              <CardDescription>Citas en estado pendiente que requieren confirmación</CardDescription>
            </div>
            {pending.length > 0 && <Badge variant="warning">{pending.length} sin confirmar</Badge>}
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-6 space-y-3">{[...Array(3)].map((_, i) => <div key={i} className="skeleton h-12 rounded-lg" />)}</div>
            ) : pending.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <CheckCircle className="h-10 w-10 text-green-500/60 mb-3" />
                <p className="text-sm text-muted-foreground font-medium">¡Todo al día!</p>
                <p className="text-xs text-muted-foreground">No hay citas pendientes de confirmación</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Paciente</TableHead>
                    <TableHead>Médico</TableHead>
                    <TableHead>Fecha / Hora</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Acción</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pending.map(appt => (
                    <TableRow key={appt.id} className="hover:bg-muted/30">
                      <TableCell>
                        <div className="flex items-center gap-2.5">
                          <Avatar className="h-7 w-7"><AvatarFallback className="text-xs">{getInitials(appt.patient_name)}</AvatarFallback></Avatar>
                          <span className="font-medium text-sm">{appt.patient_name}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">{appt.doctor_name}</TableCell>
                      <TableCell className="text-sm">
                        <div className="font-medium">{formatDate(appt.appointment_date)}</div>
                        <div className="text-muted-foreground text-xs">{appt.start_time}</div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={appt.type === 'virtual' ? 'info' : 'secondary'} className="text-xs">
                          {appt.type === 'virtual' ? <><Video className="h-3 w-3 mr-1" />Virtual</> : 'Presencial'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Button size="sm" variant="outline" className="text-xs h-7" onClick={() => window.location.href = '/app/agenda'}>
                          Confirmar
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Panel lateral de acceso rápido */}
        <div className="space-y-4">
          <Card>
            <CardHeader><CardTitle className="text-sm">Acciones de recepción</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {[
                { label: 'Registrar paciente', icon: Users, href: '/app/pacientes', color: 'text-sky-600 bg-sky-50 hover:bg-sky-100' },
                { label: 'Agendar cita', icon: Calendar, href: '/app/agenda', color: 'text-violet-600 bg-violet-50 hover:bg-violet-100' },
                { label: 'Ver médicos', icon: UserRound, href: '/app/medicos', color: 'text-emerald-600 bg-emerald-50 hover:bg-emerald-100' },
                { label: 'Crear factura', icon: DollarSign, href: '/app/facturacion', color: 'text-amber-600 bg-amber-50 hover:bg-amber-100' },
              ].map(({ label, icon: Icon, href, color }) => (
                <button key={label} onClick={() => window.location.href = href}
                  className={cn('w-full flex items-center gap-3 p-3 rounded-lg text-sm font-medium transition-colors', color)}>
                  <Icon className="h-4 w-4" />{label}
                </button>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-sm">Estado del día</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {isLoading ? [...Array(3)].map((_, i) => <div key={i} className="skeleton h-5 rounded" />) : (
                <>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-muted-foreground">Confirmadas</span>
                    <Badge variant="success" className="text-xs">{confirmed.length}</Badge>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-muted-foreground">Pendientes</span>
                    <Badge variant="warning" className="text-xs">{pending.length}</Badge>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-muted-foreground">Total hoy</span>
                    <span className="font-semibold">{today.length}</span>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Agenda completa de hoy */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-4">
          <div><CardTitle className="text-base">Agenda de hoy</CardTitle><CardDescription>Todas las citas programadas para hoy</CardDescription></div>
          <Button variant="outline" size="sm" onClick={() => window.location.href = '/app/agenda'}>
            Ver agenda completa <ChevronRight className="h-3.5 w-3.5 ml-1" />
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          <AppointmentsTable appointments={today.length ? today : appointments.slice(0, 5)} isLoading={isLoading} showDoctor />
        </CardContent>
      </Card>
    </div>
  )
}

/* ─── PATIENT Dashboard ──────────────────────────────────────── */
function PatientDashboard({ data, isLoading, user: authUser }: { data?: DashboardData; isLoading: boolean; user: { first_name: string; last_name: string; email?: string | null } | null }) {
  const myAppointments = (data?.recent_appointments ?? []).filter(a => a.status !== 'cancelled')
  const upcoming = myAppointments.filter(a => a.status === 'pending' || a.status === 'confirmed')
  const todayStr = new Date().toISOString().split('T')[0]
  const todayAppts = myAppointments.filter(a => a.appointment_date === todayStr)
  const virtualToday = todayAppts.filter(a => a.type === 'virtual' && (a.status === 'confirmed' || a.status === 'in_progress'))

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="page-title">Hola, {authUser?.first_name} 👋</h1>
          <p className="page-subtitle">Tu portal de salud personal · {new Date().toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
        </div>
        <div className="flex gap-2">
          {virtualToday.length > 0 && (
            <Button size="sm" className="bg-gradient-to-r from-rose-500 to-pink-600 hover:from-rose-600 hover:to-pink-700 text-white animate-pulse" onClick={() => window.location.href = '/app/videollamadas'}>
              <Video className="h-4 w-4 mr-1.5" />Unirse a videollamada
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={() => window.location.href = '/app/agenda'}>
            <Calendar className="h-4 w-4 mr-1.5" />Agendar nueva cita
          </Button>
        </div>
      </div>

      {/* KPIs personales */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <KPICard title="Citas programadas" value={upcoming.length} subtitle="Próximas" icon={Calendar} color="bg-sky-500" loading={isLoading} />
        <KPICard title="Citas hoy" value={todayAppts.length} subtitle="Para hoy" icon={Clock} color="bg-violet-500" loading={isLoading} />
        <KPICard title="Videollamadas" value={virtualToday.length} subtitle="Activas hoy" icon={Video} color="bg-rose-500" loading={isLoading} />
        <KPICard title="Mis consultas" value={myAppointments.filter(a => a.status === 'completed').length} subtitle="Completadas" icon={HeartPulse} color="bg-emerald-500" loading={isLoading} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Próximas citas */}
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between pb-4">
            <div><CardTitle className="text-base">Mis próximas citas</CardTitle><CardDescription>Citas confirmadas y pendientes</CardDescription></div>
            <Button variant="outline" size="sm" onClick={() => window.location.href = '/app/agenda'}>Ver todas <ChevronRight className="h-3.5 w-3.5 ml-1" /></Button>
          </CardHeader>
          <CardContent className="p-0">
            <AppointmentsTable appointments={upcoming.slice(0, 5)} isLoading={isLoading} showDoctor />
          </CardContent>
        </Card>

        {/* Acciones rápidas */}
        <div className="space-y-4">
          <Card>
            <CardHeader><CardTitle className="text-sm">Mi portal de salud</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {[
                { label: 'Agendar consulta', icon: Calendar, href: '/app/agenda', color: 'text-sky-600 bg-sky-50 hover:bg-sky-100 dark:bg-sky-900/20 dark:hover:bg-sky-900/40' },
                { label: 'Mis recetas', icon: Pill, href: '/app/recetas', color: 'text-violet-600 bg-violet-50 hover:bg-violet-100 dark:bg-violet-900/20 dark:hover:bg-violet-900/40' },
                { label: 'Mis exámenes', icon: FileText, href: '/app/examenes', color: 'text-emerald-600 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-900/20 dark:hover:bg-emerald-900/40' },
                { label: 'Mi historial', icon: ClipboardList, href: '/app/historial', color: 'text-amber-600 bg-amber-50 hover:bg-amber-100 dark:bg-amber-900/20 dark:hover:bg-amber-900/40' },
                { label: 'Videoconsulta', icon: Video, href: '/app/videollamadas', color: 'text-rose-600 bg-rose-50 hover:bg-rose-100 dark:bg-rose-900/20 dark:hover:bg-rose-900/40' },
              ].map(({ label, icon: Icon, href, color }) => (
                <button key={label} onClick={() => window.location.href = href}
                  className={cn('w-full flex items-center gap-3 p-3 rounded-lg text-sm font-medium transition-colors', color)}>
                  <Icon className="h-4 w-4" />{label}
                </button>
              ))}
            </CardContent>
          </Card>

          <Card className="border-blue-200 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-900/10">
            <CardContent className="pt-5">
              <div className="flex items-start gap-3">
                <div className="h-9 w-9 rounded-full bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center shrink-0">
                  <Bell className="h-4 w-4 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-blue-800 dark:text-blue-300">Recordatorio</p>
                  <p className="text-xs text-blue-600 dark:text-blue-400 mt-0.5">Recuerda llegar 10 minutos antes a tus consultas presenciales.</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

/* ─── Main exported component ────────────────────────────── */
export function DashboardPage() {
  const { user } = useAuthStore()

  const { data, isLoading } = useQuery<DashboardData>({
    queryKey: ['reports', 'dashboard'],
    queryFn: async () => {
      const { data } = await api.get('/reports/dashboard')
      return data
    },
    refetchInterval: 60000,
  })

  const role = user?.role ?? 'admin'
  const firstName = user?.first_name ?? ''

  return (
    <div className="animate-fade-in" aria-label="Dashboard principal">
      {role === 'doctor' ? (
        <DoctorDashboard data={data} isLoading={isLoading} userName={`Dr. ${firstName}`} />
      ) : role === 'receptionist' ? (
        <ReceptionistDashboard data={data} isLoading={isLoading} userName={firstName} />
      ) : role === 'patient' ? (
        <PatientDashboard data={data} isLoading={isLoading} user={user} />
      ) : (
        <AdminDashboard data={data} isLoading={isLoading} />
      )}
    </div>
  )
}
