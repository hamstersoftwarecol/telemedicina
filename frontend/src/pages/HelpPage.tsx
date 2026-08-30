/**
 * Help Page — Help center with search, guides, FAQs, shortcuts, and contact
 */
import { useState } from 'react'
import {
  HelpCircle, Search, BookOpen, Video, MessageSquare, ChevronDown,
  ChevronRight, Users, Calendar, ClipboardList, FileText, FlaskConical,
  Stethoscope, CreditCard, BarChart3, Settings, Shield, Zap,
  Keyboard, ExternalLink, CheckCircle, AlertCircle, Info, Lightbulb,
  Play, Star, ArrowRight,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

// ─── Data ─────────────────────────────────────────────────────────────────────
const GUIDES = [
  {
    icon: Users, color: 'bg-sky-500', label: 'Pacientes',
    title: 'Gestión de pacientes',
    desc: 'Registra, edita y busca pacientes con sus datos clínicos completos.',
    steps: ['Ve a Pacientes en el menú lateral', 'Haz clic en "Nuevo paciente"', 'Completa el formulario con los datos básicos y clínicos', 'Guarda para crear el registro'],
  },
  {
    icon: Calendar, color: 'bg-violet-500', label: 'Agenda',
    title: 'Programar una cita',
    desc: 'Agenda y gestiona citas médicas con vista de calendario.',
    steps: ['Accede a la sección Agenda', 'Haz clic en "Nueva cita"', 'Selecciona paciente, médico, fecha y hora', 'Elige el tipo de cita (presencial o videollamada)', 'Confirma para guardar'],
  },
  {
    icon: ClipboardList, color: 'bg-emerald-500', label: 'Consultas',
    title: 'Registrar una consulta',
    desc: 'Documenta el encuentro médico con signos vitales y diagnóstico.',
    steps: ['Ve a Consultas y haz clic en "Nueva consulta"', 'Selecciona el paciente y el médico tratante', 'Ingresa el motivo y los síntomas', 'Registra signos vitales (opcional)', 'Agrega diagnóstico y tratamiento'],
  },
  {
    icon: FileText, color: 'bg-rose-500', label: 'Recetas',
    title: 'Emitir una receta',
    desc: 'Crea recetas con múltiples medicamentos y vías de administración.',
    steps: ['Ve a Recetas → "Nueva receta"', 'Selecciona paciente y médico', 'Agrega medicamentos con dosis, frecuencia y duración', 'Usa "Agregar medicamento" para múltiples fármacos', 'Define fecha de validez y emite'],
  },
  {
    icon: FlaskConical, color: 'bg-amber-500', label: 'Exámenes',
    title: 'Subir un resultado de examen',
    desc: 'Adjunta archivos PDF o imágenes de resultados de laboratorio.',
    steps: ['Ve a Exámenes → "Subir examen"', 'Selecciona el paciente', 'Arrastra el archivo PDF/JPG al área de carga', 'Ingresa el nombre y tipo del examen', 'Confirma para subir al almacenamiento'],
  },
  {
    icon: Video, color: 'bg-cyan-500', label: 'Videollamadas',
    title: 'Iniciar videoconsulta',
    desc: 'Conecta con pacientes por videollamada usando WebRTC.',
    steps: ['Crea una cita de tipo "Videollamada"', 'Accede a Videollamadas en el menú', 'Ingresa el ID de la cita', 'El paciente se une con su enlace único', 'La consulta se graba automáticamente (opcional)'],
  },
]

const FAQS = [
  {
    q: '¿Cómo restablezco mi contraseña?',
    a: 'Actualmente el restablecimiento de contraseña lo gestiona el administrador del sistema. Contacta al administrador para que actualice tu contraseña desde la sección Configuración → Usuarios.',
    tag: 'Cuenta',
  },
  {
    q: '¿Cuánto espacio de almacenamiento tengo para exámenes?',
    a: 'El plan gratuito de Cloudflare R2 incluye 10 GB de almacenamiento. Cada archivo de examen tiene un límite de 10 MB. Puedes ver el uso actual en Configuración → Sistema.',
    tag: 'Almacenamiento',
  },
  {
    q: '¿Puedo exportar los datos de un paciente?',
    a: 'Sí. Desde el perfil del paciente puedes ver su historial completo. En Reportes puedes generar informes en PDF del historial clínico.',
    tag: 'Datos',
  },
  {
    q: '¿Las videollamadas son seguras y privadas?',
    a: 'Sí. Las videollamadas usan WebRTC con cifrado peer-to-peer. No se almacenan en servidores externos. Cloudflare proporciona la infraestructura de red segura.',
    tag: 'Privacidad',
  },
  {
    q: '¿Cómo funciona el sistema de mensajería?',
    a: 'Los mensajes se envían entre usuarios internos (médicos, recepción, administración). Usa polling cada 3 segundos para actualizar en tiempo real. No hay costo adicional.',
    tag: 'Mensajes',
  },
  {
    q: '¿Puedo tener múltiples médicos en el sistema?',
    a: 'Sí. El plan gratuito no tiene límite de usuarios internos. Crea tantos médicos como necesites desde la sección Médicos. Cada uno tendrá su propia especialidad y horario.',
    tag: 'Médicos',
  },
  {
    q: '¿Los datos están respaldados automáticamente?',
    a: 'Sí. Cloudflare D1 (la base de datos) realiza respaldos automáticos. Para producción se recomienda configurar también respaldos manuales periódicos desde Wrangler.',
    tag: 'Seguridad',
  },
  {
    q: '¿Puedo agregar campos personalizados a los pacientes?',
    a: 'En esta versión los campos son fijos según el esquema clínico. Puedes usar el campo "Notas" para información adicional. La personalización avanzada estará disponible en versiones futuras.',
    tag: 'Personalización',
  },
]

const SHORTCUTS = [
  { keys: ['N'], desc: 'Nuevo elemento en la sección actual' },
  { keys: ['Ctrl', 'K'], desc: 'Búsqueda global rápida' },
  { keys: ['Esc'], desc: 'Cerrar modal o diálogo' },
  { keys: ['Enter'], desc: 'Enviar mensaje (en Mensajes)' },
  { keys: ['Tab'], desc: 'Navegar entre campos del formulario' },
  { keys: ['Ctrl', '/'], desc: 'Mostrar esta pantalla de ayuda' },
]

const MODULES = [
  { icon: Users,        label: 'Pacientes',    color: 'text-sky-500',     bg: 'bg-sky-50 dark:bg-sky-900/20',    route: '/pacientes' },
  { icon: Stethoscope,  label: 'Médicos',      color: 'text-emerald-500', bg: 'bg-emerald-50 dark:bg-emerald-900/20', route: '/medicos' },
  { icon: Calendar,     label: 'Agenda',       color: 'text-violet-500',  bg: 'bg-violet-50 dark:bg-violet-900/20', route: '/agenda' },
  { icon: ClipboardList,label: 'Consultas',    color: 'text-blue-500',    bg: 'bg-blue-50 dark:bg-blue-900/20',  route: '/consultas' },
  { icon: FileText,     label: 'Recetas',      color: 'text-rose-500',    bg: 'bg-rose-50 dark:bg-rose-900/20',  route: '/recetas' },
  { icon: FlaskConical, label: 'Exámenes',     color: 'text-amber-500',   bg: 'bg-amber-50 dark:bg-amber-900/20', route: '/examenes' },
  { icon: BookOpen,     label: 'Historial',    color: 'text-teal-500',    bg: 'bg-teal-50 dark:bg-teal-900/20',  route: '/historial' },
  { icon: CreditCard,   label: 'Facturación',  color: 'text-indigo-500',  bg: 'bg-indigo-50 dark:bg-indigo-900/20', route: '/facturacion' },
  { icon: BarChart3,    label: 'Reportes',     color: 'text-orange-500',  bg: 'bg-orange-50 dark:bg-orange-900/20', route: '/reportes' },
  { icon: MessageSquare,label: 'Mensajes',     color: 'text-cyan-500',    bg: 'bg-cyan-50 dark:bg-cyan-900/20',  route: '/mensajes' },
  { icon: Settings,     label: 'Configuración',color: 'text-gray-500',    bg: 'bg-gray-50 dark:bg-gray-900/20',  route: '/configuracion' },
]

// ─── FAQ Item ──────────────────────────────────────────────────────────────────
function FaqItem({ faq }: { faq: typeof FAQS[number] }) {
  const [open, setOpen] = useState(false)
  return (
    <div
      className={cn('border border-border rounded-xl overflow-hidden transition-all duration-200', open && 'border-primary/30 shadow-sm')}
    >
      <button
        className="flex items-center justify-between w-full p-4 text-left hover:bg-muted/30 transition-colors gap-3"
        onClick={() => setOpen(!open)}
      >
        <div className="flex items-start gap-3 flex-1 min-w-0">
          <HelpCircle className={cn('h-4 w-4 shrink-0 mt-0.5 transition-colors', open ? 'text-primary' : 'text-muted-foreground')} />
          <span className="text-sm font-medium">{faq.q}</span>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Badge variant="secondary" className="text-xs hidden sm:flex">{faq.tag}</Badge>
          <ChevronDown className={cn('h-4 w-4 text-muted-foreground transition-transform duration-200', open && 'rotate-180')} />
        </div>
      </button>
      {open && (
        <div className="px-4 pb-4 pt-0 pl-11">
          <p className="text-sm text-muted-foreground leading-relaxed">{faq.a}</p>
        </div>
      )}
    </div>
  )
}

// ─── Guide Card ────────────────────────────────────────────────────────────────
function GuideCard({ guide, onClick }: { guide: typeof GUIDES[number]; onClick: () => void }) {
  const Icon = guide.icon
  return (
    <Card className="card-hover cursor-pointer group" onClick={onClick}>
      <CardContent className="p-5">
        <div className="flex items-start gap-3 mb-3">
          <div className={cn('h-10 w-10 rounded-xl flex items-center justify-center shrink-0', guide.color)}>
            <Icon className="h-5 w-5 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <Badge variant="secondary" className="text-xs mb-1">{guide.label}</Badge>
            <h3 className="text-sm font-semibold leading-snug">{guide.title}</h3>
          </div>
          <ArrowRight className="h-4 w-4 text-muted-foreground/40 group-hover:text-primary group-hover:translate-x-0.5 transition-all shrink-0 mt-1" />
        </div>
        <p className="text-xs text-muted-foreground">{guide.desc}</p>
      </CardContent>
    </Card>
  )
}

// ─── Guide Detail ──────────────────────────────────────────────────────────────
function GuideDetail({ guide, onBack }: { guide: typeof GUIDES[number]; onBack: () => void }) {
  const Icon = guide.icon
  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={onBack}>
          <ChevronDown className="h-4 w-4 rotate-90 mr-1" /> Volver
        </Button>
      </div>
      <div className="flex items-center gap-4 p-5 rounded-2xl bg-gradient-to-r from-muted/40 to-muted/20 border border-border">
        <div className={cn('h-14 w-14 rounded-2xl flex items-center justify-center shrink-0', guide.color)}>
          <Icon className="h-7 w-7 text-white" />
        </div>
        <div>
          <Badge variant="secondary" className="mb-1">{guide.label}</Badge>
          <h2 className="text-xl font-bold">{guide.title}</h2>
          <p className="text-sm text-muted-foreground mt-0.5">{guide.desc}</p>
        </div>
      </div>

      <div>
        <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
          <Play className="h-4 w-4 text-primary" /> Pasos
        </h3>
        <div className="space-y-3">
          {guide.steps.map((step, i) => (
            <div key={i} className="flex items-start gap-3">
              <div className="h-6 w-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">
                {i + 1}
              </div>
              <p className="text-sm text-foreground/90 leading-relaxed pt-0.5">{step}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="flex items-start gap-3 p-4 rounded-xl bg-sky-50 dark:bg-sky-900/20 border border-sky-200 dark:border-sky-800">
        <Lightbulb className="h-4 w-4 text-sky-600 shrink-0 mt-0.5" />
        <p className="text-xs text-sky-700 dark:text-sky-400">
          <strong>Consejo:</strong> Los cambios se guardan automáticamente en la base de datos. Si encuentras algún error, verifica que todos los campos requeridos estén completos.
        </p>
      </div>
    </div>
  )
}

// ─── Main Page ─────────────────────────────────────────────────────────────────
export function HelpPage() {
  const [search, setSearch] = useState('')
  const [activeGuide, setActiveGuide] = useState<typeof GUIDES[number] | null>(null)
  const [activeTab, setActiveTab] = useState<'guides' | 'faq' | 'shortcuts' | 'about'>('guides')

  const filteredFaqs = search
    ? FAQS.filter(f => f.q.toLowerCase().includes(search.toLowerCase()) || f.a.toLowerCase().includes(search.toLowerCase()))
    : FAQS

  const filteredGuides = search
    ? GUIDES.filter(g => g.title.toLowerCase().includes(search.toLowerCase()) || g.desc.toLowerCase().includes(search.toLowerCase()) || g.label.toLowerCase().includes(search.toLowerCase()))
    : GUIDES

  const TABS = [
    { id: 'guides', label: 'Guías de uso', icon: BookOpen },
    { id: 'faq', label: 'Preguntas frecuentes', icon: HelpCircle },
    { id: 'shortcuts', label: 'Atajos de teclado', icon: Keyboard },
    { id: 'about', label: 'Acerca del sistema', icon: Info },
  ] as const

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-indigo-600 via-sky-600 to-cyan-500 p-8 text-white">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCA0MCA0MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxjaXJjbGUgY3g9IjIwIiBjeT0iMjAiIHI9IjEiIGZpbGw9InJnYmEoMjU1LDI1NSwyNTUsMC4xKSIvPjwvZz48L3N2Zz4=')] opacity-40" />
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-4">
            <div className="h-12 w-12 rounded-2xl bg-white/20 backdrop-blur flex items-center justify-center">
              <HelpCircle className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Centro de Ayuda</h1>
              <p className="text-white/80 text-sm">Documentación y guías de la plataforma de Telemedicina</p>
            </div>
          </div>
          {/* Search */}
          <div className="relative max-w-lg">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-white/60" />
            <input
              type="text"
              placeholder="Buscar en la documentación..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-11 pr-4 py-3 rounded-xl bg-white/20 backdrop-blur border border-white/30 text-white placeholder:text-white/60 text-sm focus:outline-none focus:ring-2 focus:ring-white/50"
            />
          </div>
        </div>
      </div>

      {/* Quick modules */}
      {!search && !activeGuide && (
        <div className="grid grid-cols-4 md:grid-cols-6 lg:grid-cols-11 gap-2">
          {MODULES.map(({ icon: Icon, label, color, bg, route }) => (
            <a key={label} href={route}
              className={cn('flex flex-col items-center gap-1.5 p-3 rounded-xl border border-transparent hover:border-border transition-all hover:shadow-sm group', bg)}>
              <Icon className={cn('h-5 w-5', color)} />
              <span className="text-[10px] font-medium text-center text-muted-foreground group-hover:text-foreground leading-tight">{label}</span>
            </a>
          ))}
        </div>
      )}

      {activeGuide ? (
        <GuideDetail guide={activeGuide} onBack={() => setActiveGuide(null)} />
      ) : (
        <>
          {/* Tabs */}
          {!search && (
            <div className="flex gap-1 p-1 bg-muted rounded-xl w-fit">
              {TABS.map(({ id, label, icon: Icon }) => (
                <button key={id}
                  onClick={() => setActiveTab(id)}
                  className={cn(
                    'flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all',
                    activeTab === id
                      ? 'bg-background text-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground'
                  )}>
                  <Icon className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">{label}</span>
                </button>
              ))}
            </div>
          )}

          {/* ── Guides ── */}
          {(activeTab === 'guides' || search) && (
            <div className="space-y-4">
              {search && <p className="text-sm text-muted-foreground">{filteredGuides.length + filteredFaqs.length} resultados para "<strong>{search}</strong>"</p>}
              {filteredGuides.length > 0 && (
                <>
                  {search && <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Guías</h2>}
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                    {filteredGuides.map(guide => (
                      <GuideCard key={guide.label} guide={guide} onClick={() => setActiveGuide(guide)} />
                    ))}
                  </div>
                </>
              )}
              {search && filteredFaqs.length > 0 && (
                <>
                  <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mt-6">Preguntas frecuentes</h2>
                  <div className="space-y-2">
                    {filteredFaqs.map(faq => <FaqItem key={faq.q} faq={faq} />)}
                  </div>
                </>
              )}
              {search && filteredGuides.length === 0 && filteredFaqs.length === 0 && (
                <Card>
                  <CardContent className="flex flex-col items-center py-12 text-center">
                    <Search className="h-10 w-10 text-muted-foreground/30 mb-3" />
                    <p className="font-semibold text-muted-foreground">Sin resultados</p>
                    <p className="text-sm text-muted-foreground/70 mt-1">Prueba con otras palabras clave</p>
                  </CardContent>
                </Card>
              )}
            </div>
          )}

          {/* ── FAQ ── */}
          {activeTab === 'faq' && !search && (
            <div className="space-y-2">
              {FAQS.map(faq => <FaqItem key={faq.q} faq={faq} />)}
            </div>
          )}

          {/* ── Shortcuts ── */}
          {activeTab === 'shortcuts' && !search && (
            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Keyboard className="h-5 w-5 text-primary" /> Atajos de teclado
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {SHORTCUTS.map(({ keys, desc }) => (
                    <div key={desc} className="flex items-center justify-between py-2.5 border-b border-border/50 last:border-0">
                      <span className="text-sm text-muted-foreground">{desc}</span>
                      <div className="flex items-center gap-1">
                        {keys.map((k, i) => (
                          <span key={i} className="px-2 py-0.5 rounded-md bg-muted border border-border text-xs font-mono font-semibold">
                            {k}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>

              <div className="flex items-start gap-3 p-4 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
                <AlertCircle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                <p className="text-xs text-amber-700 dark:text-amber-400">
                  Los atajos de teclado funcionan cuando no hay ningún campo de texto activo. En Mac usa <kbd className="px-1 py-0.5 rounded bg-amber-100 dark:bg-amber-800 font-mono text-xs">⌘</kbd> en lugar de <kbd className="px-1 py-0.5 rounded bg-amber-100 dark:bg-amber-800 font-mono text-xs">Ctrl</kbd>.
                </p>
              </div>
            </div>
          )}

          {/* ── About ── */}
          {activeTab === 'about' && !search && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {/* Stack */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Zap className="h-5 w-5 text-amber-500" /> Stack tecnológico
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {[
                    { label: 'Frontend', tech: 'React 19 + Vite + TypeScript', color: 'bg-sky-500' },
                    { label: 'UI', tech: 'TailwindCSS + Shadcn/UI + Lucide', color: 'bg-violet-500' },
                    { label: 'Backend', tech: 'Cloudflare Workers + Hono', color: 'bg-orange-500' },
                    { label: 'Base de datos', tech: 'Cloudflare D1 (SQLite)', color: 'bg-emerald-500' },
                    { label: 'Almacenamiento', tech: 'Cloudflare R2 (S3-compatible)', color: 'bg-cyan-500' },
                    { label: 'Sesiones', tech: 'Cloudflare KV + JWT', color: 'bg-rose-500' },
                    { label: 'Estado', tech: 'TanStack Query + React Hook Form', color: 'bg-indigo-500' },
                  ].map(({ label, tech, color }) => (
                    <div key={label} className="flex items-center gap-3">
                      <span className={cn('h-2 w-2 rounded-full shrink-0', color)} />
                      <span className="text-xs text-muted-foreground w-28 shrink-0">{label}</span>
                      <span className="text-xs font-medium">{tech}</span>
                    </div>
                  ))}
                </CardContent>
              </Card>

              {/* Features */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <CheckCircle className="h-5 w-5 text-emerald-500" /> Características
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {[
                    '✅ CRUD completo de pacientes y médicos',
                    '✅ Gestión de citas y agenda',
                    '✅ Registro de consultas con signos vitales',
                    '✅ Recetas con múltiples medicamentos',
                    '✅ Exámenes con carga a R2',
                    '✅ Historial clínico cronológico',
                    '✅ Videoconsultas por WebRTC',
                    '✅ Mensajería interna en tiempo real',
                    '✅ Facturación y pagos',
                    '✅ Reportes y analytics',
                    '✅ Autenticación JWT segura',
                    '✅ Plan gratuito Cloudflare',
                  ].map(feat => (
                    <p key={feat} className="text-xs text-muted-foreground">{feat}</p>
                  ))}
                </CardContent>
              </Card>

              {/* Version info */}
              <Card className="md:col-span-2">
                <CardContent className="p-5">
                  <div className="flex items-center justify-between flex-wrap gap-4">
                    <div className="flex items-center gap-4">
                      <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-sky-500 to-indigo-600 flex items-center justify-center">
                        <Shield className="h-6 w-6 text-white" />
                      </div>
                      <div>
                        <p className="font-bold text-base">TeleMed Pro</p>
                        <p className="text-xs text-muted-foreground">Versión 1.0.0 · Plan Gratuito Cloudflare</p>
                        <div className="flex items-center gap-1 mt-0.5">
                          {[...Array(5)].map((_, i) => <Star key={i} className="h-3 w-3 text-amber-400 fill-amber-400" />)}
                          <span className="text-xs text-muted-foreground ml-1">Desarrollado con ❤️</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Badge variant="success" className="text-xs">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 mr-1.5 animate-pulse inline-block" />
                        Sistema activo
                      </Badge>
                      <Badge variant="secondary" className="text-xs">Cloudflare Workers</Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </>
      )}
    </div>
  )
}
