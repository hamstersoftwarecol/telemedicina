import { useState, useEffect, useRef } from 'react'
import { Mic, Loader2, Volume2, X, Bot, Activity } from 'lucide-react'
import { Button } from './button'
import { cn } from '@/lib/utils'
import api from '@/lib/api'
import { toast } from 'sonner'

// TypeScript declarations for Web Speech API
declare global {
  interface Window {
    SpeechRecognition: any
    webkitSpeechRecognition: any
  }
}

type AssetState = 'idle' | 'listening' | 'processing' | 'speaking' | 'error'

export function VoiceAssistant() {
  const [isOpen, setIsOpen] = useState(false)
  const [state, setState] = useState<AssetState>('idle')
  const [transcript, setTranscript] = useState('')
  const [replyText, setReplyText] = useState('¡Hola! Soy tu asistente médico virtual. Puedo ayudarte a ver los doctores disponibles, agendar una cita o validar un pago. Toca el micrófono y dime, ¿en qué te puedo ayudar hoy?')
  const [history, setHistory] = useState<any[]>([])
  
  const recognitionRef = useRef<any>(null)
  const synthRef = useRef<SpeechSynthesis | null>(null)
  const hasGreeted = useRef(false)
  
  // Initialize APIs
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
      if (SpeechRecognition) {
        recognitionRef.current = new SpeechRecognition()
        recognitionRef.current.continuous = false
        recognitionRef.current.interimResults = true
        recognitionRef.current.lang = 'es-ES' // default to spanish
        
        recognitionRef.current.onresult = (event: any) => {
          let finalTranscript = ''
          let interimTranscript = ''
          
          for (let i = event.resultIndex; i < event.results.length; ++i) {
            if (event.results[i].isFinal) {
              finalTranscript += event.results[i][0].transcript
            } else {
              interimTranscript += event.results[i][0].transcript
            }
          }
          
          if (finalTranscript) {
            setTranscript(finalTranscript)
            handleProcessCommand(finalTranscript)
          } else {
            setTranscript(interimTranscript)
          }
        }
        
        recognitionRef.current.onerror = (event: any) => {
          console.error('Speech recognition error', event.error)
          if (event.error !== 'no-speech') {
            setState('error')
            toast.error('Error al escuchar. Por favor intenta de nuevo.')
          } else {
             setState('idle')
          }
        }
        
        recognitionRef.current.onend = () => {
          if (state === 'listening') {
             // If it ended automatically without final results, we reset
             // setState('idle')
          }
        }
      } else {
        toast.error('Tu navegador no soporta reconocimiento de voz.')
      }
      
      synthRef.current = window.speechSynthesis
    }
  }, [state])

  useEffect(() => {
    if (isOpen && !hasGreeted.current) {
      hasGreeted.current = true
      // Small delay to ensure the UI is rendered before speaking
      setTimeout(() => {
        speakReply('¡Hola! Soy tu asistente médico virtual. Puedo ayudarte a ver los doctores disponibles, agendar una cita o validar un pago. Toca el micrófono y dime, ¿en qué te puedo ayudar hoy?')
      }, 500)
    }
  }, [isOpen])

  const handleProcessCommand = async (text: string) => {
    setState('processing')
    try {
      const res = await api.post('/assistant/chat', {
        message: text,
        history: history
      })
      
      const { reply, history: updatedHistory } = res.data
      setReplyText(reply)
      setHistory(updatedHistory)
      speakReply(reply)
      
      // Force UI refresh for appointments list so changes are visible immediately
      if (typeof window !== 'undefined') {
        const evt = new CustomEvent('ai-action-completed')
        window.dispatchEvent(evt)
      }
      
    } catch (error) {
      console.error('API Error:', error)
      setState('error')
      toast.error('Ocurrió un error de comunicación.')
      setTimeout(() => setState('idle'), 3000)
    }
  }

  const handleSuggestionClick = (text: string) => {
    setTranscript(text)
    handleProcessCommand(text)
  }

  const speakReply = (text: string) => {
    if (!synthRef.current) return
    
    synthRef.current.cancel() // Stop any ongoing speech
    
    setState('speaking')
    const utterance = new SpeechSynthesisUtterance(text)
    utterance.lang = 'es-ES'
    
    // Attempt to pick a good voice
    const voices = synthRef.current.getVoices()
    const spanishVoice = voices.find(v => v.lang.startsWith('es'))
    if (spanishVoice) utterance.voice = spanishVoice
    
    utterance.onend = () => {
      setState('idle')
      setTranscript('')
    }
    
    utterance.onerror = () => {
      setState('idle')
    }
    
    synthRef.current.speak(utterance)
  }

  const toggleListening = () => {
    if (state === 'listening') {
      recognitionRef.current?.stop()
      setState('idle')
    } else if (state === 'speaking') {
      synthRef.current?.cancel()
      setState('idle')
    } else {
      setReplyText('')
      setTranscript('')
      setState('listening')
      recognitionRef.current?.start()
    }
  }

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 h-14 w-14 bg-primary text-primary-foreground rounded-full shadow-lg hover:shadow-xl hover:scale-105 transition-all flex items-center justify-center z-50 group"
        aria-label="Abrir asistente de voz"
      >
        <Mic className="h-6 w-6 group-hover:scale-110 transition-transform" />
      </button>
    )
  }

  return (
    <div className="fixed bottom-6 right-6 w-80 bg-background border border-border rounded-2xl shadow-2xl z-50 overflow-hidden flex flex-col animate-in slide-in-from-bottom-5 fade-in duration-300">
      {/* Header */}
      <div className="bg-muted/50 p-3 flex items-center justify-between border-b border-border">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-full gradient-primary flex items-center justify-center">
            <Bot className="h-4 w-4 text-white" />
          </div>
          <div>
            <h3 className="text-sm font-semibold leading-none">Asistente Virtual</h3>
            <p className="text-xs text-muted-foreground mt-0.5">Siempre activo</p>
          </div>
        </div>
        <Button variant="ghost" size="icon-sm" onClick={() => { setIsOpen(false); synthRef.current?.cancel(); recognitionRef.current?.stop(); setState('idle') }}>
          <X className="h-4 w-4" />
        </Button>
      </div>
      
      {/* Visualizer / Status Area */}
      <div className="p-6 flex flex-col items-center justify-center min-h-[160px] text-center gap-4 relative">
        {/* Glow effect background */}
        <div className={cn(
          "absolute inset-0 opacity-20 blur-2xl transition-colors duration-500",
          state === 'listening' ? "bg-blue-500" :
          state === 'processing' ? "bg-purple-500" :
          state === 'speaking' ? "bg-green-500" :
          state === 'error' ? "bg-red-500" : "bg-transparent"
        )} />

        <div className="relative z-10 flex flex-col items-center justify-center">
          <button 
            onClick={toggleListening}
            className={cn(
              "h-20 w-20 rounded-full flex items-center justify-center transition-all duration-300 shadow-md",
              state === 'listening' ? "bg-blue-100 text-blue-600 animate-pulse scale-110" :
              state === 'processing' ? "bg-purple-100 text-purple-600" :
              state === 'speaking' ? "bg-green-100 text-green-600 scale-105" :
              state === 'error' ? "bg-red-100 text-red-600" :
              "bg-primary text-primary-foreground hover:scale-105"
            )}
          >
            {state === 'processing' ? <Loader2 className="h-8 w-8 animate-spin" /> :
             state === 'speaking' ? <Volume2 className="h-8 w-8 animate-pulse" /> :
             state === 'listening' ? <Activity className="h-8 w-8 animate-bounce" /> :
             <Mic className="h-8 w-8" />}
          </button>
          
          <p className="mt-4 text-sm font-medium">
            {state === 'idle' ? 'Toca para hablar' :
             state === 'listening' ? 'Escuchando...' :
             state === 'processing' ? 'Pensando...' :
             state === 'speaking' ? 'Respondiendo...' :
             state === 'error' ? 'Ocurrió un error' : ''}
          </p>
        </div>
      </div>
      
      {/* Transcript & Reply Log */}
      <div className="bg-muted/30 p-4 border-t border-border min-h-[80px] max-h-[150px] overflow-y-auto">
        {transcript && (
          <p className="text-sm text-right text-muted-foreground italic mb-2">"{transcript}"</p>
        )}
        {replyText && (
          <p className="text-sm font-medium text-left">{replyText}</p>
        )}
      </div>

      {/* Sugerencias de Mensajes */}
      {state === 'idle' && !transcript && (
        <div className="bg-muted/30 px-4 pb-4 flex flex-wrap gap-2 justify-center">
          {['"Agendar cita médica"', '"Doctores disponibles"', '"Cancelar mi cita"'].map((suggestion, idx) => (
            <button
              key={idx}
              onClick={() => handleSuggestionClick(suggestion.replace(/"/g, ''))}
              className="text-xs bg-background border border-border px-3 py-1.5 rounded-full text-muted-foreground hover:bg-primary/10 hover:text-primary hover:border-primary/30 transition-all shadow-sm"
            >
              {suggestion}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
