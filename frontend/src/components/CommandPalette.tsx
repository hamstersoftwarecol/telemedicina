/**
 * CommandPalette — Global search with ⌘K / Ctrl+K shortcut
 * Searches patients, doctors, and navigates to any section
 */
import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import {
  Search, Users, UserRound, Stethoscope, Calendar,
  ClipboardList, Video, FileText, FlaskConical, BookOpen,
  Receipt, BarChart3, MessageSquare, Bell, Settings, HelpCircle,
  LayoutDashboard, ArrowRight, User, Hash, X, Command,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import api from '@/lib/api'

// ─── Static nav items ─────────────────────────────────────────────────────────
const NAV_ITEMS = [
  { label: 'Panel',            icon: LayoutDashboard, path: '/dashboard',      group: 'Navegación' },
  { label: 'Pacientes',        icon: Users,           path: '/pacientes',      group: 'Navegación' },
  { label: 'Médicos',          icon: UserRound,       path: '/medicos',        group: 'Navegación' },
  { label: 'Especialidades',   icon: Stethoscope,     path: '/especialidades', group: 'Navegación' },
  { label: 'Agenda',           icon: Calendar,        path: '/agenda',         group: 'Navegación' },
  { label: 'Consultas',        icon: ClipboardList,   path: '/consultas',      group: 'Navegación' },
  { label: 'Videollamadas',    icon: Video,           path: '/videollamadas',  group: 'Navegación' },
  { label: 'Recetas',          icon: FileText,        path: '/recetas',        group: 'Navegación' },
  { label: 'Exámenes',         icon: FlaskConical,    path: '/examenes',       group: 'Navegación' },
  { label: 'Historial Clínico',icon: BookOpen,        path: '/historial',      group: 'Navegación' },
  { label: 'Facturación',      icon: Receipt,         path: '/facturacion',    group: 'Navegación' },
  { label: 'Reportes',         icon: BarChart3,       path: '/reportes',       group: 'Navegación' },
  { label: 'Mensajes',         icon: MessageSquare,   path: '/mensajes',       group: 'Navegación' },
  { label: 'Notificaciones',   icon: Bell,            path: '/notificaciones', group: 'Navegación' },
  { label: 'Configuración',    icon: Settings,        path: '/configuracion',  group: 'Navegación' },
  { label: 'Ayuda',            icon: HelpCircle,      path: '/ayuda',          group: 'Navegación' },
]

interface Result {
  id: string
  label: string
  sublabel?: string
  icon: React.ElementType
  path: string
  group: string
  iconColor?: string
}

interface CommandPaletteProps {
  open: boolean
  onClose: () => void
}

export function CommandPalette({ open, onClose }: CommandPaletteProps) {
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const [activeIndex, setActiveIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)

  // Patients search
  const { data: patientsData } = useQuery({
    queryKey: ['cmd-patients', query],
    queryFn: async () => {
      const { data } = await api.get(`/patients?search=${encodeURIComponent(query)}&limit=5`)
      return data
    },
    enabled: query.length >= 2,
    staleTime: 10_000,
  })

  // Doctors search
  const { data: doctorsData } = useQuery({
    queryKey: ['cmd-doctors', query],
    queryFn: async () => {
      const { data } = await api.get(`/doctors?search=${encodeURIComponent(query)}&limit=5`)
      return data
    },
    enabled: query.length >= 2,
    staleTime: 10_000,
  })

  // Build results
  const results: Result[] = (() => {
    const q = query.toLowerCase().trim()

    const navResults: Result[] = q
      ? NAV_ITEMS.filter(n => n.label.toLowerCase().includes(q)).map(n => ({
          id: `nav-${n.path}`,
          label: n.label,
          icon: n.icon,
          path: n.path,
          group: 'Navegación',
        }))
      : NAV_ITEMS.slice(0, 8).map(n => ({
          id: `nav-${n.path}`,
          label: n.label,
          icon: n.icon,
          path: n.path,
          group: 'Recientes',
        }))

    const patientResults: Result[] = (patientsData?.data ?? []).map((p: { id: number; first_name: string; last_name: string; document_number: string }) => ({
      id: `patient-${p.id}`,
      label: `${p.first_name} ${p.last_name}`,
      sublabel: `Paciente · ${p.document_number}`,
      icon: User,
      path: `/pacientes`,
      group: 'Pacientes',
      iconColor: 'text-sky-500',
    }))

    const doctorResults: Result[] = (doctorsData?.data ?? []).map((d: { id: number; first_name: string; last_name: string; specialty_name?: string }) => ({
      id: `doctor-${d.id}`,
      label: `Dr. ${d.first_name} ${d.last_name}`,
      sublabel: `Médico · ${d.specialty_name ?? ''}`,
      icon: UserRound,
      path: `/medicos`,
      group: 'Médicos',
      iconColor: 'text-emerald-500',
    }))

    return [...patientResults, ...doctorResults, ...navResults]
  })()

  // Group results
  const grouped = results.reduce<Record<string, Result[]>>((acc, r) => {
    if (!acc[r.group]) acc[r.group] = []
    acc[r.group].push(r)
    return acc
  }, {})

  const flatResults = Object.values(grouped).flat()

  // Reset on open
  useEffect(() => {
    if (open) {
      setQuery('')
      setActiveIndex(0)
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }, [open])

  // Keyboard navigation
  const handleKey = useCallback((e: KeyboardEvent) => {
    if (!open) return
    if (e.key === 'Escape') { onClose(); return }
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActiveIndex(i => Math.min(i + 1, flatResults.length - 1))
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActiveIndex(i => Math.max(i - 1, 0))
    }
    if (e.key === 'Enter' && flatResults[activeIndex]) {
      navigate(flatResults[activeIndex].path)
      onClose()
    }
  }, [open, flatResults, activeIndex, navigate, onClose])

  useEffect(() => {
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [handleKey])

  // Scroll active item into view
  useEffect(() => {
    const el = listRef.current?.querySelector(`[data-index="${activeIndex}"]`)
    el?.scrollIntoView({ block: 'nearest' })
  }, [activeIndex])

  // Reset active index when results change
  useEffect(() => { setActiveIndex(0) }, [query])

  const handleSelect = (result: Result) => {
    navigate(result.path)
    onClose()
  }

  if (!open) return null

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/40 backdrop-blur-md z-50 animate-fade-in"
        onClick={onClose}
        aria-hidden
      />

      {/* Palette */}
      <div className="fixed top-[15%] left-1/2 -translate-x-1/2 w-full max-w-xl z-50 animate-fade-in">
        <div className="mx-4 rounded-2xl border border-border bg-background shadow-2xl overflow-hidden">
          {/* Input */}
          <div className="flex items-center gap-3 px-4 py-3.5 border-b border-border">
            <Search className="h-4 w-4 text-muted-foreground shrink-0" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Buscar pacientes, médicos, secciones..."
              className="flex-1 bg-transparent text-sm focus:outline-none placeholder:text-muted-foreground/60"
              aria-label="Búsqueda global"
              autoComplete="off"
            />
            {query && (
              <button onClick={() => setQuery('')} className="text-muted-foreground hover:text-foreground transition-colors">
                <X className="h-4 w-4" />
              </button>
            )}
            <kbd className="hidden sm:flex items-center gap-1 px-1.5 py-0.5 rounded-md border border-border bg-muted text-[10px] font-mono text-muted-foreground">
              Esc
            </kbd>
          </div>

          {/* Results */}
          <div ref={listRef} className="max-h-[380px] overflow-y-auto overscroll-contain">
            {flatResults.length === 0 && query.length >= 2 ? (
              <div className="flex flex-col items-center justify-center py-10 text-center">
                <Search className="h-8 w-8 text-muted-foreground/30 mb-2" />
                <p className="text-sm text-muted-foreground">Sin resultados para "<strong>{query}</strong>"</p>
                <p className="text-xs text-muted-foreground/60 mt-1">Prueba con otro término</p>
              </div>
            ) : (
              <div className="py-2">
                {Object.entries(grouped).map(([group, items]) => (
                  <div key={group}>
                    <div className="flex items-center gap-2 px-4 py-1.5">
                      <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60">{group}</span>
                      <div className="h-px flex-1 bg-border/50" />
                    </div>
                    {items.map((result) => {
                      const globalIdx = flatResults.indexOf(result)
                      const isActive = globalIdx === activeIndex
                      const Icon = result.icon
                      return (
                        <button
                          key={result.id}
                          data-index={globalIdx}
                          onClick={() => handleSelect(result)}
                          onMouseEnter={() => setActiveIndex(globalIdx)}
                          className={cn(
                            'flex items-center gap-3 w-full px-4 py-2.5 text-left transition-colors',
                            isActive ? 'bg-primary/8' : 'hover:bg-muted/50'
                          )}
                        >
                          <div className={cn(
                            'h-8 w-8 rounded-lg flex items-center justify-center shrink-0',
                            isActive ? 'bg-primary/15' : 'bg-muted'
                          )}>
                            <Icon className={cn('h-4 w-4', result.iconColor ?? (isActive ? 'text-primary' : 'text-muted-foreground'))} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className={cn('text-sm font-medium truncate', isActive && 'text-primary')}>{result.label}</p>
                            {result.sublabel && <p className="text-xs text-muted-foreground truncate">{result.sublabel}</p>}
                          </div>
                          <ArrowRight className={cn('h-3.5 w-3.5 shrink-0 transition-opacity', isActive ? 'opacity-100 text-primary' : 'opacity-0')} />
                        </button>
                      )
                    })}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer hints */}
          <div className="flex items-center gap-4 px-4 py-2.5 border-t border-border bg-muted/30">
            <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
              <kbd className="px-1.5 py-0.5 rounded border border-border bg-background font-mono">↑↓</kbd>
              Navegar
            </div>
            <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
              <kbd className="px-1.5 py-0.5 rounded border border-border bg-background font-mono">↵</kbd>
              Ir a
            </div>
            <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
              <kbd className="px-1.5 py-0.5 rounded border border-border bg-background font-mono">Esc</kbd>
              Cerrar
            </div>
            <div className="ml-auto flex items-center gap-1 text-[10px] text-muted-foreground">
              <Command className="h-3 w-3" /> <span>TeleMed</span>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
