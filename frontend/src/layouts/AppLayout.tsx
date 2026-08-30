/**
 * Main App Layout — Sidebar + Header + Content
 * Features: role-based nav, real-time notification badge, mobile bottom nav
 */
import { useState, useEffect } from 'react'
import { NavLink, useLocation, Outlet } from 'react-router-dom'
import { useTheme } from 'next-themes'
import {
  LayoutDashboard, Users, UserRound, Stethoscope, Calendar,
  ClipboardList, Video, FileText, FlaskConical, BookOpen,
  Receipt, BarChart3, MessageSquare, Bell, Settings, HelpCircle,
  ChevronLeft, Menu, Search, Moon, Sun, LogOut, ChevronRight,
  Activity, Building2,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { cn, getInitials } from '@/lib/utils'
import { useAuthStore } from '@/store/auth'
import { useNavigate } from 'react-router-dom'
import { CommandPalette } from '@/components/CommandPalette'
import { useNotifications } from '@/hooks/useNotifications'
import { VoiceAssistant } from '@/components/ui/VoiceAssistant'

interface NavItem {
  label: string
  icon: React.ElementType
  path: string
  roles?: string[] // if undefined → all roles
}

const ALL_NAV_ITEMS: NavItem[] = [
  { label: 'Panel', icon: LayoutDashboard, path: '/app/dashboard' },
  { label: 'Usuarios', icon: Users, path: '/app/usuarios', roles: ['admin'] },
  { label: 'Pacientes', icon: Users, path: '/app/pacientes', roles: ['admin', 'doctor', 'receptionist'] },
  { label: 'Médicos', icon: UserRound, path: '/app/medicos', roles: ['admin', 'receptionist'] },
  { label: 'Especialidades', icon: Stethoscope, path: '/app/especialidades', roles: ['admin'] },
  { label: 'Agenda', icon: Calendar, path: '/app/agenda' },
  { label: 'Consultas', icon: ClipboardList, path: '/app/consultas', roles: ['admin', 'doctor'] },
  { label: 'Videollamadas', icon: Video, path: '/app/videollamadas' },
  { label: 'Recetas', icon: FileText, path: '/app/recetas', roles: ['admin', 'doctor', 'patient'] },
  { label: 'Exámenes', icon: FlaskConical, path: '/app/examenes', roles: ['admin', 'doctor', 'patient'] },
  { label: 'Historial Clínico', icon: BookOpen, path: '/app/historial', roles: ['admin', 'doctor', 'patient'] },
  { label: 'Facturación', icon: Receipt, path: '/app/facturacion', roles: ['admin', 'receptionist'] },
  { label: 'Reportes', icon: BarChart3, path: '/app/reportes', roles: ['admin'] },
]

const BOTTOM_NAV_ITEMS: NavItem[] = [
  { label: 'Mensajes', icon: MessageSquare, path: '/app/mensajes' },
  { label: 'Notificaciones', icon: Bell, path: '/app/notificaciones' },
  { label: 'Configuración', icon: Settings, path: '/app/configuracion', roles: ['admin'] },
  { label: 'Ayuda', icon: HelpCircle, path: '/app/ayuda' },
]

function filterNavByRole(items: NavItem[], role: string) {
  return items.filter(item => !item.roles || item.roles.includes(role))
}

/* ─── Sidebar navigation ─────────────────────────────────────── */
function SidebarNav({ collapsed, role, unreadCount }: { collapsed: boolean; role: string; unreadCount: number }) {
  const location = useLocation()
  const nav = filterNavByRole(ALL_NAV_ITEMS, role)
  const bottom = filterNavByRole(BOTTOM_NAV_ITEMS, role)

  const renderItem = (item: NavItem) => {
    const Icon = item.icon
    const isActive = location.pathname.startsWith(item.path)
    const isBell = item.path === '/app/notificaciones'
    return (
      <NavLink
        key={item.path}
        to={item.path}
        className={cn('nav-link', isActive && 'nav-link-active')}
        title={collapsed ? item.label : undefined}
        aria-current={isActive ? 'page' : undefined}
      >
        <div className="relative">
          <Icon className="h-4.5 w-4.5 shrink-0" aria-hidden />
          {isBell && unreadCount > 0 && (
            <span className="absolute -top-1.5 -right-1.5 h-4 w-4 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </div>
        {!collapsed && <span className="truncate flex-1">{item.label}</span>}
        {!collapsed && isBell && unreadCount > 0 && (
          <span className="ml-auto bg-red-500 text-white text-xs font-bold rounded-full px-1.5 py-0.5 min-w-[20px] text-center">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </NavLink>
    )
  }

  return (
    <nav className="flex flex-col h-full px-2 py-3 space-y-0.5" aria-label="Navegación principal">
      <div className="space-y-0.5 flex-1">
        {nav.map(renderItem)}
      </div>
      <div className="border-t border-sidebar-border pt-2 space-y-0.5">
        {bottom.map(renderItem)}
      </div>
    </nav>
  )
}

/* ─── Header ─────────────────────────────────────────────────── */
function Header({
  collapsed, onToggle, onOpenSearch, unreadCount,
}: {
  collapsed: boolean
  onToggle: () => void
  onOpenSearch: () => void
  unreadCount: number
}) {
  const { theme, setTheme } = useTheme()
  const { user, logout } = useAuthStore()
  const navigate = useNavigate()
  const location = useLocation()

  const handleLogout = async () => {
    await logout()
    navigate('/login')
  }

  const pathParts = location.pathname.split('/').filter(Boolean)
  const breadcrumbs = pathParts.map((part, i) => ({
    label: part.charAt(0).toUpperCase() + part.slice(1).replace(/-/g, ' '),
    path: '/' + pathParts.slice(0, i + 1).join('/'),
  }))

  return (
    <header className="h-14 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 flex items-center px-4 gap-3 sticky top-0 z-40">
      {/* Sidebar toggle */}
      <Button
        variant="ghost"
        size="icon-sm"
        onClick={onToggle}
        aria-label={collapsed ? 'Expandir sidebar' : 'Colapsar sidebar'}
        className="text-muted-foreground"
      >
        {collapsed ? <Menu className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
      </Button>

      {/* Breadcrumb */}
      <nav aria-label="Breadcrumb" className="hidden sm:flex items-center gap-1 text-sm">
        <span className="text-muted-foreground/60">
          <Building2 className="h-4 w-4 inline mr-1" />
          TelemedApp
        </span>
        {breadcrumbs.map((crumb, i) => (
          <span key={crumb.path} className="flex items-center gap-1">
            <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/40" />
            <span className={cn('font-medium', i === breadcrumbs.length - 1 ? 'text-foreground' : 'text-muted-foreground')}>
              {crumb.label}
            </span>
          </span>
        ))}
      </nav>

      <div className="flex-1" />

      {/* Search */}
      <Button
        variant="outline"
        size="sm"
        className="hidden sm:flex gap-2 text-muted-foreground w-48 justify-start"
        onClick={onOpenSearch}
        aria-label="Buscar"
      >
        <Search className="h-3.5 w-3.5" />
        <span className="text-xs">Buscar...</span>
        <kbd className="ml-auto text-xs bg-muted px-1.5 py-0.5 rounded font-mono">⌘K</kbd>
      </Button>

      {/* Theme toggle */}
      <Button
        variant="ghost"
        size="icon-sm"
        onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
        aria-label={theme === 'dark' ? 'Activar modo claro' : 'Activar modo oscuro'}
      >
        {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
      </Button>

      {/* Notifications bell with live badge */}
      <NavLink to="/app/notificaciones" className="relative" aria-label={`Notificaciones${unreadCount > 0 ? ` (${unreadCount} sin leer)` : ''}`}>
        <Button variant="ghost" size="icon-sm">
          <Bell className="h-4 w-4" />
        </Button>
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 h-4 w-4 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center" aria-hidden>
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </NavLink>

      {/* User menu */}
      <div className="flex items-center gap-2 pl-2 border-l border-border">
        <Avatar className="h-7 w-7">
          {user?.avatar_url && <AvatarImage src={user.avatar_url} alt={`${user.first_name} ${user.last_name}`} />}
          <AvatarFallback className="text-xs">
            {user ? getInitials(`${user.first_name} ${user.last_name}`) : 'U'}
          </AvatarFallback>
        </Avatar>
        <div className="hidden md:block text-left">
          <p className="text-xs font-semibold leading-none">{user?.first_name} {user?.last_name}</p>
          <p className="text-xs text-muted-foreground capitalize mt-0.5">{user?.role}</p>
        </div>
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={handleLogout}
          aria-label="Cerrar sesión"
          className="text-muted-foreground hover:text-destructive"
        >
          <LogOut className="h-4 w-4" />
        </Button>
      </div>
    </header>
  )
}

/* ─── Mobile bottom nav ──────────────────────────────────────── */
function MobileBottomNav({ role, unreadCount }: { role: string; unreadCount: number }) {
  const location = useLocation()
  const mobileItems = filterNavByRole([
    { label: 'Panel', icon: LayoutDashboard, path: '/app/dashboard' },
    { label: 'Agenda', icon: Calendar, path: '/app/agenda' },
    { label: 'Mensajes', icon: MessageSquare, path: '/app/mensajes' },
    { label: 'Notificaciones', icon: Bell, path: '/app/notificaciones' },
    { label: 'Ajustes', icon: Settings, path: '/app/configuracion' },
  ], role)

  return (
    <nav className="sm:hidden fixed bottom-0 left-0 right-0 z-50 bg-background/95 backdrop-blur border-t border-border flex items-center justify-around px-1 pb-safe">
      {mobileItems.map(item => {
        const Icon = item.icon
        const isActive = location.pathname.startsWith(item.path)
        const isBell = item.path === '/app/notificaciones'
        return (
          <NavLink
            key={item.path}
            to={item.path}
            className={cn(
              'flex flex-col items-center gap-0.5 py-2 px-3 text-[10px] font-medium transition-colors flex-1',
              isActive ? 'text-primary' : 'text-muted-foreground'
            )}
          >
            <div className="relative">
              <Icon className="h-5 w-5" />
              {isBell && unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 h-3.5 w-3.5 bg-red-500 text-white text-[8px] font-bold rounded-full flex items-center justify-center">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </div>
            <span>{item.label}</span>
          </NavLink>
        )
      })}
    </nav>
  )
}

/* ─── Main Layout ────────────────────────────────────────────── */
export function AppLayout() {
  const [collapsed, setCollapsed] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const { user } = useAuthStore()
  const role = user?.role ?? 'admin'
  const { unreadCount } = useNotifications()

  // Handle Ctrl+K / Cmd+K
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        setSearchOpen((open) => !open)
      }
    }
    document.addEventListener('keydown', down)
    return () => document.removeEventListener('keydown', down)
  }, [])

  // Auto-collapse on small screens
  useEffect(() => {
    const checkSize = () => {
      setCollapsed(window.innerWidth < 768)
    }
    checkSize()
    window.addEventListener('resize', checkSize)
    return () => window.removeEventListener('resize', checkSize)
  }, [])

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      {/* Sidebar — hidden on mobile (sm:flex) */}
      <aside
        className={cn(
          'relative flex-shrink-0 flex-col bg-sidebar border-r border-sidebar-border transition-all duration-300 ease-in-out hidden sm:flex',
          collapsed ? 'w-14' : 'w-60'
        )}
        aria-label="Sidebar de navegación"
      >
        {/* Logo */}
        <div className={cn('flex items-center gap-2.5 h-14 px-3 border-b border-sidebar-border flex-shrink-0', collapsed && 'justify-center')}>
          <div className="h-8 w-8 rounded-xl gradient-primary flex items-center justify-center shrink-0 shadow-sm">
            <Activity className="h-4.5 w-4.5 text-white" />
          </div>
          {!collapsed && (
            <div>
              <p className="text-sm font-bold text-sidebar-foreground leading-none">TelemedApp</p>
              <p className="text-xs text-sidebar-foreground/50 mt-0.5">Telemedicina</p>
            </div>
          )}
        </div>
        {/* Nav */}
        <div className="flex-1 overflow-y-auto no-scrollbar">
          <SidebarNav collapsed={collapsed} role={role} unreadCount={unreadCount} />
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Header
          collapsed={collapsed}
          onToggle={() => setCollapsed(!collapsed)}
          onOpenSearch={() => setSearchOpen(true)}
          unreadCount={unreadCount}
        />
        <main
          className="flex-1 overflow-y-auto bg-muted/20 p-4 sm:p-6 pb-20 sm:pb-6"
          id="main-content"
          tabIndex={-1}
        >
          <Outlet />
        </main>
      </div>

      {/* Mobile bottom nav */}
      <MobileBottomNav role={role} unreadCount={unreadCount} />

      <CommandPalette open={searchOpen} onClose={() => setSearchOpen(false)} />
      <VoiceAssistant />
    </div>
  )
}
