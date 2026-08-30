/**
 * Videoconsulta Page — UI integrated with WebRTC signaling
 * Includes test room mode: generates a shareable URL for immediate testing
 */
import { useState, useCallback, useEffect } from 'react'
import type React from 'react'
import { useSearchParams, useNavigate, useParams } from 'react-router-dom'
import {
  Video, Mic, MicOff, VideoOff, PhoneOff, Monitor, MessageSquare,
  Settings, Users, Clock, Shield, Wifi, AlertCircle, Loader2,
  Link, Copy, CheckCheck, FlaskConical, ExternalLink, Sparkles, Bot, Send
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { useWebRTC } from '@/hooks/useWebRTC'
import { toast } from 'sonner'
import { useAuthStore } from '@/store/auth'

/* ─── Generate a random room code ─────────────────────────── */
function generateRoomCode() {
  const chars = 'abcdefghijkmnpqrstuvwxyz23456789'
  return Array.from({ length: 8 }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
}

/* ─── Main page ────────────────────────────────────────────── */
export function VideoconsultaPage() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const params = useParams<{ roomId?: string }>()

  // Support both ?room=xxx and /sala/:roomId
  const roomFromUrl = searchParams.get('room') ?? params.roomId ?? null

  const [activeConsultationId, setActiveConsultationId] = useState<string | null>(roomFromUrl)
  const [activePatientName, setActivePatientName] = useState<string | null>(roomFromUrl ? 'Sala de prueba' : null)
  const [shareScreen, setShareScreen] = useState(false)
  const [chatOpen, setChatOpen] = useState(false)
  const [chatMessage, setChatMessage] = useState('')
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [videoDevices, setVideoDevices] = useState<MediaDeviceInfo[]>([])
  const [audioDevices, setAudioDevices] = useState<MediaDeviceInfo[]>([])
  const [messages, setMessages] = useState([
    { from: 'system', text: 'La sesión está lista. Esperando conexión P2P...' },
  ])
  const [copied, setCopied] = useState(false)
  const [generatedRoom, setGeneratedRoom] = useState<string | null>(null)

  const [copilotLoading, setCopilotLoading] = useState(false)
  const [copilotSuggestions, setCopilotSuggestions] = useState<string[]>([])
  const [copilotPrompt, setCopilotPrompt] = useState('')
  const [activeTab, setActiveTab] = useState<'chat'|'copilot'>('chat')
  const { user } = useAuthStore()

  // Fetch devices when settings opened
  useEffect(() => {
    if (settingsOpen) {
      navigator.mediaDevices.enumerateDevices().then(devices => {
        setVideoDevices(devices.filter(d => d.kind === 'videoinput'))
        setAudioDevices(devices.filter(d => d.kind === 'audioinput'))
      }).catch(err => console.error('Error enumerating devices', err))
    }
  }, [settingsOpen])

  const {
    localVideoRef,
    remoteVideoRef,
    micOn,
    camOn,
    isScreenSharing,
    toggleMic,
    toggleCam,
    toggleScreenShare,
    changeDevice,
    sendMessage,
    endCall,
    error,
    connected,
    remoteStream,
  } = useWebRTC({
    consultationId: activeConsultationId,
    onMessageReceived: (msg) => {
      setMessages((prev) => [...prev, { from: 'patient', text: msg }])
      // Auto open chat if closed
      setChatOpen(true)
    },
    onCallEnded: () => {
      toast('Llamada finalizada', { description: 'Cerrando la pestaña...' })
      setTimeout(() => {
        window.close()
        // Fallback en caso de que el navegador bloquee window.close()
        window.location.href = '/'
      }, 1500)
      setGeneratedRoom(null)
      navigate('/videollamadas')
    },
  })

  // Add system message when connected
  useEffect(() => {
    if (connected) {
      setMessages((prev) => [...prev, { from: 'system', text: 'Conexión P2P establecida. Puedes chatear.' }])
    }
  }, [connected])

  // Ref callback: attach stream immediately when the <video> element mounts
  // This handles the case where ontrack fired before the element was rendered
  const remoteVideoCallbackRef = useCallback((node: HTMLVideoElement | null) => {
    // forward the ref so the hook can also use it
    ;(remoteVideoRef as React.MutableRefObject<HTMLVideoElement | null>).current = node
    if (node && remoteStream) {
      node.srcObject = remoteStream
      node.play().catch(() => {})
    }
  }, [remoteStream, remoteVideoRef])

  const handleStartCall = (id: string, name: string) => {
    setActiveConsultationId(id)
    setActivePatientName(name)
  }

  /* ─── Create test room ─────────────────────────────────── */
  const handleCreateTestRoom = useCallback(() => {
    const code = generateRoomCode()
    setGeneratedRoom(code)
    setActiveConsultationId(`test-${code}`)
    setActivePatientName('Sala de prueba')
  }, [])

  const shareUrl = generatedRoom
    ? `${window.location.origin}/sala/test-${generatedRoom}`
    : roomFromUrl
    ? `${window.location.origin}/sala/${roomFromUrl}`
    : ''

    const shareRoom = async (roomCode: string) => {
    const url = `${window.location.origin}/app/videollamadas?room=${roomCode}`
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      toast.success('Enlace copiado al portapapeles', { description: 'Compártelo con el paciente para unirse' })
      setTimeout(() => setCopied(false), 3000)
    } catch (e) {
      toast.error('No se pudo copiar el enlace')
    }
  }

  const handleCopilotRequest = async (promptText?: string) => {
    try {
      setCopilotLoading(true)
      const context = messages.map(m => `${m.from}: ${m.text}`).join('\n')
      const token = localStorage.getItem('access_token') || ''
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'https://telemedicina-backend.business-alejandrolopezmurillo.workers.dev/api'}/assistant/copilot`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ context, prompt: promptText })
      })
      if (!res.ok) throw new Error('Error al generar sugerencia')
      const data = await res.json()
      if (data.reply) {
        setCopilotSuggestions(prev => [...prev, data.reply])
      }
    } catch (e: any) {
      toast.error(e.message)
    } finally {
      setCopilotLoading(false)
      if (promptText) setCopilotPrompt('')
    }
  }

  const handleCopy = () => {
    navigator.clipboard.writeText(shareUrl).then(() => {
      setCopied(true)
      toast.success('Enlace copiado al portapapeles')
      setTimeout(() => setCopied(false), 3000)
    })
  }

  /* ─── Lobby ────────────────────────────────────────────── */
  if (!activeConsultationId) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div>
          <h1 className="page-title flex items-center gap-2"><Video className="h-6 w-6 text-primary" />Videoconsultas</h1>
          <p className="page-subtitle">Consultas médicas por videollamada en tiempo real</p>
        </div>

        {/* Test Room Banner */}
        <Card className="border-2 border-primary/30 bg-gradient-to-br from-primary/5 to-violet-500/5">
          <CardContent className="p-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
              <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                <FlaskConical className="h-6 w-6 text-primary" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-foreground">Sala de prueba instantánea</h3>
                <p className="text-sm text-muted-foreground mt-0.5">
                  Crea una sala de video y comparte el enlace con otra persona para probar la videollamada ahora mismo. No requiere cita previa.
                </p>
              </div>
              <Button
                className="shrink-0 bg-gradient-to-r from-primary to-violet-600 hover:from-primary/90 hover:to-violet-700 text-white shadow-lg"
                onClick={handleCreateTestRoom}
              >
                <FlaskConical className="h-4 w-4 mr-2" />
                Crear sala de prueba
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Tech features */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            { icon: Shield, title: 'Cifrado DTLS/SRTP', desc: 'Conexión P2P completamente cifrada', color: 'text-green-600 bg-green-100 dark:bg-green-900/20' },
            { icon: Wifi, title: 'Baja latencia', desc: 'Conexión directa P2P con STUN de Google', color: 'text-blue-600 bg-blue-100 dark:bg-blue-900/20' },
            { icon: Users, title: 'Señalización KV', desc: 'Servidor de señalización en Cloudflare KV', color: 'text-violet-600 bg-violet-100 dark:bg-violet-900/20' },
          ].map(({ icon: Icon, title, desc, color }) => (
            <Card key={title} className="card-hover">
              <CardContent className="p-5">
                <div className={cn('h-10 w-10 rounded-xl flex items-center justify-center mb-3', color)}>
                  <Icon className="h-5 w-5" />
                </div>
                <h3 className="font-semibold text-sm">{title}</h3>
                <p className="text-xs text-muted-foreground mt-1">{desc}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Scheduled appointments */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Videoconsultas programadas</CardTitle>
            <CardDescription>Próximas citas de tipo virtual</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {[
                { id: 'vc-001', patient: 'Miguel Ramírez', time: 'Hoy 09:30', duration: '30 min', status: 'confirmed' },
                { id: 'vc-002', patient: 'Ana Torres', time: 'Hoy 11:00', duration: '30 min', status: 'pending' },
                { id: 'vc-003', patient: 'Roberto Sánchez', time: 'Mañana 14:00', duration: '45 min', status: 'confirmed' },
              ].map((appt) => (
                <div key={appt.id} className="flex items-center justify-between p-3 rounded-lg border border-border hover:bg-muted/30 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center">
                      <Users className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">{appt.patient}</p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        {appt.time} · {appt.duration}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={appt.status === 'confirmed' ? 'success' : 'warning'} className="text-xs">
                      {appt.status === 'confirmed' ? 'Confirmada' : 'Pendiente'}
                    </Badge>
                    <Button size="sm" onClick={() => handleStartCall(appt.id, appt.patient)}>
                      <Video className="h-3.5 w-3.5 mr-1" />Iniciar
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  /* ─── In-call UI ───────────────────────────────────────── */
  return (
    <div className="flex flex-col gap-3 animate-fade-in" style={{ height: 'calc(100vh - 8rem)' }}>

      {/* Share link banner (test rooms) */}
      {shareUrl && (
        <div className="flex items-center gap-2 bg-primary/5 border border-primary/20 rounded-xl px-4 py-2.5">
          <Link className="h-4 w-4 text-primary shrink-0" />
          <span className="text-xs font-medium text-foreground flex-1 min-w-0 truncate">
            Comparte este enlace para que otra persona se una: <span className="text-primary">{shareUrl}</span>
          </span>
          <div className="flex gap-1.5 shrink-0">
            <Button variant="outline" size="sm" className="h-7 text-xs" onClick={handleCopy}>
              {copied ? <CheckCheck className="h-3.5 w-3.5 mr-1 text-green-600" /> : <Copy className="h-3.5 w-3.5 mr-1" />}
              {copied ? 'Copiado' : 'Copiar'}
            </Button>
            <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => window.open(shareUrl, '_blank')}>
              <ExternalLink className="h-3.5 w-3.5 mr-1" />Abrir
            </Button>
          </div>
        </div>
      )}

      <div className="flex-1 flex gap-4 min-h-0">
        {/* Main video area */}
        <div className="flex-1 flex flex-col gap-3 min-h-0">

          {error && (
            <div className="bg-amber-500/10 border border-amber-500/30 text-amber-700 dark:text-amber-400 p-3 rounded-xl flex items-center gap-2 text-sm">
              <AlertCircle className="h-4 w-4 shrink-0" /> {error}
            </div>
          )}

          {/* Remote video */}
          <div className="flex-1 relative bg-slate-900 rounded-2xl overflow-hidden shadow-2xl min-h-0">
            <video ref={remoteVideoCallbackRef} autoPlay playsInline className="w-full h-full object-cover" />

            {!connected && !error && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-900/90 backdrop-blur-sm z-10">
                <div className="relative mb-6">
                  <div className="h-20 w-20 rounded-full bg-slate-700 flex items-center justify-center">
                    <Users className="h-10 w-10 text-slate-400" />
                  </div>
                  <div className="absolute -bottom-1 -right-1 h-6 w-6 rounded-full bg-amber-500 flex items-center justify-center">
                    <Loader2 className="h-4 w-4 text-white animate-spin" />
                  </div>
                </div>
                <p className="text-white font-semibold">Esperando al otro participante...</p>
                <p className="text-slate-400 text-sm mt-1">Sala: <span className="font-mono text-slate-300">{activeConsultationId}</span></p>
                {shareUrl && (
                  <button
                    onClick={handleCopy}
                    className="mt-4 flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white text-xs px-4 py-2 rounded-full transition-colors"
                  >
                    {copied ? <CheckCheck className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                    {copied ? 'Enlace copiado' : 'Copiar enlace de invitación'}
                  </button>
                )}
              </div>
            )}

            {/* Fallback avatar when connected but no video */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none -z-10">
              <div className="text-center text-white">
                <div className="h-20 w-20 rounded-full bg-slate-700 flex items-center justify-center mx-auto mb-3">
                  <Users className="h-10 w-10 text-slate-400" />
                </div>
                <p className="text-lg font-semibold">{activePatientName}</p>
              </div>
            </div>

            {/* Self preview */}
            <div className="absolute bottom-4 right-4 w-40 h-28 sm:w-48 sm:h-32 bg-slate-800 rounded-xl border-2 border-slate-600 flex items-center justify-center overflow-hidden z-20 shadow-xl transition-all hover:scale-105">
              <video ref={localVideoRef} autoPlay playsInline muted className={cn('w-full h-full object-cover', !camOn && 'hidden')} />
              {!camOn && <VideoOff className="h-8 w-8 text-red-400" />}
              <span className="absolute bottom-1 left-2 text-xs text-white bg-black/50 px-1.5 py-0.5 rounded backdrop-blur-md">Tú</span>
              {!micOn && (
                <span className="absolute top-1 right-2 bg-red-500/80 p-1 rounded-full backdrop-blur-md">
                  <MicOff className="h-3 w-3 text-white" />
                </span>
              )}
            </div>

            {/* Status badges */}
            <div className="absolute top-4 left-4 flex items-center gap-2 bg-black/50 backdrop-blur-md rounded-full px-3 py-1.5 z-20">
              <div className={cn('h-2 w-2 rounded-full animate-pulse', connected ? 'bg-green-500' : 'bg-amber-500')} />
              <span className="text-white text-xs font-medium">{connected ? 'Conectado P2P' : 'Conectando...'}</span>
            </div>
            <div className="absolute top-4 right-4 flex items-center gap-1.5 bg-green-600/80 backdrop-blur-md text-white rounded-full px-2.5 py-1 text-xs z-20">
              <Shield className="h-3 w-3" />Cifrado
            </div>
          </div>

          {/* Controls */}
          <div className="flex items-center justify-center gap-2 sm:gap-3 py-1">
            <Button
              variant={micOn ? 'outline' : 'destructive'}
              size="icon"
              className="rounded-full h-11 w-11 sm:h-12 sm:w-12 transition-all hover:scale-105"
              onClick={toggleMic}
              aria-label={micOn ? 'Silenciar' : 'Activar micrófono'}
            >
              {micOn ? <Mic className="h-5 w-5" /> : <MicOff className="h-5 w-5" />}
            </Button>
            <Button
              variant={camOn ? 'outline' : 'destructive'}
              size="icon"
              className="rounded-full h-11 w-11 sm:h-12 sm:w-12 transition-all hover:scale-105"
              onClick={toggleCam}
              aria-label={camOn ? 'Apagar cámara' : 'Activar cámara'}
            >
              {camOn ? <Video className="h-5 w-5" /> : <VideoOff className="h-5 w-5" />}
            </Button>
            <Button
              variant={isScreenSharing ? 'default' : 'outline'}
              size="icon"
              className="rounded-full h-11 w-11 sm:h-12 sm:w-12 transition-all hover:scale-105 hidden sm:flex"
              onClick={toggleScreenShare}
              aria-label="Compartir pantalla"
            >
              <Monitor className="h-5 w-5" />
            </Button>
            <Button
              variant={chatOpen ? 'default' : 'outline'}
              size="icon"
              className="rounded-full h-11 w-11 sm:h-12 sm:w-12 transition-all hover:scale-105"
              onClick={() => setChatOpen(!chatOpen)}
              aria-label="Chat"
            >
              <MessageSquare className="h-5 w-5" />
            </Button>
            {shareUrl && (
              <Button
                variant="outline"
                size="icon"
                className="rounded-full h-11 w-11 sm:h-12 sm:w-12 transition-all hover:scale-105"
                onClick={handleCopy}
                aria-label="Copiar enlace"
              >
                {copied ? <CheckCheck className="h-5 w-5 text-green-600" /> : <Copy className="h-5 w-5" />}
              </Button>
            )}
            <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
              <DialogTrigger asChild>
                <Button
                  variant="outline"
                  size="icon"
                  className="rounded-full h-11 w-11 sm:h-12 sm:w-12 transition-all hover:scale-105 hidden sm:flex"
                  aria-label="Configuración"
                >
                  <Settings className="h-5 w-5" />
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                  <DialogTitle>Configuración de Dispositivos</DialogTitle>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Cámara</label>
                    <Select onValueChange={(val) => changeDevice('videoinput', val)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecciona una cámara" />
                      </SelectTrigger>
                      <SelectContent>
                        {videoDevices.map(d => (
                          <SelectItem key={d.deviceId} value={d.deviceId}>
                            {d.label || `Cámara ${d.deviceId.slice(0, 5)}`}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Micrófono</label>
                    <Select onValueChange={(val) => changeDevice('audioinput', val)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecciona un micrófono" />
                      </SelectTrigger>
                      <SelectContent>
                        {audioDevices.map(d => (
                          <SelectItem key={d.deviceId} value={d.deviceId}>
                            {d.label || `Micrófono ${d.deviceId.slice(0, 5)}`}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
            <Button
              variant="destructive"
              size="icon"
              className="rounded-full h-13 w-13 sm:h-14 sm:w-14 shadow-lg transition-all hover:scale-110 hover:bg-red-600"
              onClick={endCall}
              aria-label="Finalizar llamada"
            >
              <PhoneOff className="h-6 w-6" />
            </Button>
          </div>
        </div>

        {/* Chat sidebar */}
        {chatOpen && (
          <Card className="w-64 sm:w-72 flex flex-col overflow-hidden">
            <CardHeader className="p-0 border-b">
              {['doctor', 'admin'].includes(user?.role || '') ? (
                <div className="flex w-full bg-muted/30">
                  <button 
                    className={cn("flex-1 py-3 text-xs font-medium flex items-center justify-center gap-2 border-b-2 transition-colors", activeTab === 'chat' ? 'border-primary text-primary bg-background' : 'border-transparent text-muted-foreground hover:bg-muted')}
                    onClick={() => setActiveTab('chat')}
                  >
                    <MessageSquare className="h-4 w-4" /> Chat
                  </button>
                  <button 
                    className={cn("flex-1 py-3 text-xs font-medium flex items-center justify-center gap-2 border-b-2 transition-colors", activeTab === 'copilot' ? 'border-purple-500 text-purple-600 bg-purple-50/30 dark:bg-purple-900/10' : 'border-transparent text-muted-foreground hover:bg-muted')}
                    onClick={() => setActiveTab('copilot')}
                  >
                    <Sparkles className="h-4 w-4" /> IA Copilot
                  </button>
                </div>
              ) : (
                <CardTitle className="text-sm p-4 flex items-center gap-2">
                  <MessageSquare className="h-4 w-4" /> Chat
                </CardTitle>
              )}
            </CardHeader>

            {activeTab === 'chat' ? (
              <>
                <CardContent className="flex-1 overflow-y-auto p-3 space-y-2 bg-slate-50 dark:bg-slate-900/50">
                  {messages.map((msg, i) => (
                    <div key={i} className={cn(
                      'text-xs p-2.5 rounded-xl max-w-[90%] shadow-sm',
                      msg.from === 'system' ? 'bg-muted/80 text-muted-foreground mx-auto text-center border' :
                      (msg.from === 'doctor' && ['doctor', 'admin'].includes(user?.role || '')) || (msg.from !== 'doctor' && !['doctor', 'admin'].includes(user?.role || '')) ? 'bg-primary text-primary-foreground ml-auto rounded-tr-sm' :
                      'bg-background border text-foreground rounded-tl-sm'
                    )}>
                      {msg.text}
                    </div>
                  ))}
                </CardContent>
                <div className="p-3 border-t bg-background flex gap-2">
                  <input
                    className="flex-1 rounded-lg border border-input bg-background px-3 py-1.5 text-xs focus:ring-2 focus:ring-primary focus:outline-none transition-all"
                    placeholder="Escribir mensaje..."
                    value={chatMessage}
                    onChange={(e) => setChatMessage(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && chatMessage) {
                        const sent = sendMessage(chatMessage)
                        if (sent) {
                          setMessages((prev) => [...prev, { from: user?.role || 'user', text: chatMessage }])
                          setChatMessage('')
                        } else {
                          toast.error('No se pudo enviar el mensaje. Espera a que conecte.')
                        }
                      }
                    }}
                  />
                  <Button size="sm" className="text-xs rounded-lg" onClick={() => {
                    if (chatMessage) {
                      const sent = sendMessage(chatMessage)
                      if (sent) {
                        setMessages((prev) => [...prev, { from: user?.role || 'user', text: chatMessage }])
                        setChatMessage('')
                      } else {
                        toast.error('No se pudo enviar el mensaje. Espera a que conecte.')
                      }
                    }
                  }}>
                    <Send className="h-3 w-3" />
                  </Button>
                </div>
              </>
            ) : (
              <div className="flex flex-col h-full bg-purple-50/30 dark:bg-purple-900/10">
                <div className="flex-1 overflow-y-auto p-3 space-y-3">
                  {copilotSuggestions.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-center space-y-3 text-muted-foreground">
                      <Bot className="h-10 w-10 text-purple-300 opacity-50" />
                      <p className="text-xs">Soy tu asistente de IA. Puedo sugerir respuestas al paciente o explicar términos médicos.</p>
                      <Button variant="outline" size="sm" className="text-xs" onClick={() => handleCopilotRequest()} disabled={copilotLoading}>
                        <Sparkles className="h-3 w-3 mr-2 text-purple-500" />
                        Sugerir respuesta al chat
                      </Button>
                    </div>
                  ) : (
                    copilotSuggestions.map((sug, i) => (
                      <div key={i} className="bg-background border border-purple-100 dark:border-purple-900/50 rounded-lg p-3 shadow-sm flex flex-col gap-2 animate-in fade-in slide-in-from-bottom-2">
                        <div className="flex items-center gap-1.5 text-purple-600 dark:text-purple-400 mb-1">
                          <Bot className="h-3.5 w-3.5" />
                          <span className="text-[10px] font-semibold uppercase tracking-wider">Sugerencia de IA</span>
                        </div>
                        <p className="text-xs text-foreground">{sug}</p>
                        <Button 
                          variant="secondary" 
                          size="sm" 
                          className="h-7 text-xs w-full mt-1 bg-purple-100 hover:bg-purple-200 text-purple-700 dark:bg-purple-900 dark:text-purple-300"
                          onClick={() => {
                            setChatMessage(sug)
                            setActiveTab('chat')
                          }}
                        >
                          Usar sugerencia
                        </Button>
                      </div>
                    ))
                  )}
                  {copilotLoading && (
                    <div className="flex items-center gap-2 text-xs text-muted-foreground justify-center p-4">
                      <Loader2 className="h-4 w-4 animate-spin text-purple-500" />
                      Generando respuesta...
                    </div>
                  )}
                </div>
                <div className="p-3 border-t bg-background">
                  <div className="relative">
                    <input
                      className="w-full rounded-lg border-purple-200 focus:border-purple-400 bg-background pl-3 pr-8 py-2 text-xs focus:ring-2 focus:ring-purple-500/20 focus:outline-none transition-all"
                      placeholder="Pedir consejo médico (ej. 'explica hipertensión')"
                      value={copilotPrompt}
                      onChange={(e) => setCopilotPrompt(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && copilotPrompt && !copilotLoading) {
                          handleCopilotRequest(copilotPrompt)
                        }
                      }}
                    />
                    <button 
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-purple-500 hover:text-purple-700 disabled:opacity-50"
                      disabled={!copilotPrompt || copilotLoading}
                      onClick={() => handleCopilotRequest(copilotPrompt)}
                    >
                      <Sparkles className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            )}
          </Card>
        )}
      </div>
    </div>
  )
}
