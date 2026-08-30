import React, { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Bot, Send, User, Calendar, Activity, ShieldCheck, Mic, Loader2, Volume2, MicOff } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

declare global {
  interface Window {
    SpeechRecognition: any
    webkitSpeechRecognition: any
  }
}

type AssetState = 'idle' | 'listening' | 'processing' | 'speaking' | 'error'

export function LandingPage() {
  const navigate = useNavigate()
  
  const [messages, setMessages] = useState<any[]>([
    { role: 'model', parts: [{ text: '¡Hola! Soy tu asistente médico virtual. Puedo ayudarte a ver los doctores disponibles, agendar una cita o validar un pago. Toca el micrófono y dime, ¿en qué te puedo ayudar hoy?' }] }
  ])
  const [input, setInput] = useState('')
  const [state, setState] = useState<AssetState>('idle')
  const [hasStarted, setHasStarted] = useState(false)
  const [chatHistory, setChatHistory] = useState<any[]>([])
  
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const recognitionRef = useRef<any>(null)
  const synthRef = useRef<SpeechSynthesis | null>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages, input])

  // Initialize Speech APIs
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
      if (SpeechRecognition) {
        recognitionRef.current = new SpeechRecognition()
        recognitionRef.current.continuous = false
        recognitionRef.current.interimResults = true
        recognitionRef.current.lang = 'es-ES'
        
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
            setInput('')
            handleSend(finalTranscript)
          } else {
            setInput(interimTranscript)
          }
        }
        
        recognitionRef.current.onerror = (event: any) => {
          console.error('Speech recognition error', event.error)
          if (event.error !== 'no-speech') {
            setState('error')
          } else {
            setState('idle')
          }
          setInput('')
        }
        
        recognitionRef.current.onend = () => {
          if (state === 'listening') {
             // Let it resolve if it captured something
          }
        }
      }
      synthRef.current = window.speechSynthesis
    }
  }, [state])

  const speakReply = (text: string) => {
    if (!synthRef.current) return
    synthRef.current.cancel()
    
    setState('speaking')
    const utterance = new SpeechSynthesisUtterance(text)
    utterance.lang = 'es-ES'
    
    const voices = synthRef.current.getVoices()
    const spanishVoice = voices.find(v => v.lang.startsWith('es'))
    if (spanishVoice) utterance.voice = spanishVoice
    
    utterance.onend = () => {
      setState('idle')
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
      setInput('')
    } else if (state === 'speaking') {
      synthRef.current?.cancel()
      setState('idle')
    } else {
      synthRef.current?.cancel()
      setState('listening')
      setInput('')
      recognitionRef.current?.start()
    }
  }

  const handleSend = async (text: string) => {
    if (!text.trim()) return

    setMessages(prev => [...prev, { role: 'user', parts: [{ text }] }])
    setState('processing')

    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/assistant/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text,
          history: chatHistory
        })
      })

      const data = await response.json()
      
      if (response.ok) {
        setMessages(prev => [...prev, { role: 'model', parts: [{ text: data.reply }] }])
        setChatHistory(data.history || [])
        speakReply(data.reply)
      } else {
        const errText = `Error: ${data.reply || data.error}`
        setMessages(prev => [...prev, { role: 'model', parts: [{ text: errText }] }])
        speakReply("Lo siento, ocurrió un error.")
      }
    } catch (err) {
      console.error(err)
      const errText = 'Lo siento, hubo un problema de conexión. Intenta de nuevo más tarde.'
      setMessages(prev => [...prev, { role: 'model', parts: [{ text: errText }] }])
      speakReply(errText)
      setState('idle')
    }
  }

  // Handle manual text submission as fallback
  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (input.trim() && state !== 'listening') {
      handleSend(input)
      setInput('')
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      {/* Navbar */}
      <header className="bg-white shadow-sm border-b px-6 py-4 flex justify-between items-center z-10 sticky top-0">
        <div className="flex items-center gap-2 text-primary">
          <Activity size={28} className="text-blue-600" />
          <span className="text-xl font-bold text-slate-800 tracking-tight">TelemedApp</span>
        </div>
        <div className="flex gap-4">
          <Button variant="ghost" onClick={() => navigate('/portal')}>Portal del Paciente</Button>
          <Button onClick={() => navigate('/login')}>Acceso Doctores</Button>
        </div>
      </header>

      <main className="flex-1 flex flex-col md:flex-row max-w-7xl w-full mx-auto p-6 gap-12 items-center">
        
        {/* Left Side: Hero */}
        <div className="flex-1 space-y-8">
          <h1 className="text-5xl font-extrabold text-slate-900 leading-tight">
            Atención Médica <br/> <span className="text-blue-600">Al Alcance de tu Voz</span>
          </h1>
          <p className="text-lg text-slate-600 leading-relaxed max-w-md">
            Agenda tu cita en segundos hablando con nuestro asistente de Inteligencia Artificial. Consulta disponibilidad, gestiona pagos y conéctate con los mejores especialistas sin esperas.
          </p>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4">
            <div className="flex items-center gap-3 bg-white p-4 rounded-xl shadow-sm border">
              <Mic className="text-blue-500" />
              <span className="font-medium text-slate-700">100% por Voz</span>
            </div>
            <div className="flex items-center gap-3 bg-white p-4 rounded-xl shadow-sm border">
              <Calendar className="text-blue-500" />
              <span className="font-medium text-slate-700">Agenda en Tiempo Real</span>
            </div>
          </div>
        </div>

        {/* Right Side: Voice Assistant UI */}
        <div className="flex-1 w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden flex flex-col relative" style={{ height: '600px' }}>
          
          {/* Overlay to require user interaction for audio */}
          {!hasStarted && (
            <div className="absolute inset-0 z-20 bg-slate-50/90 backdrop-blur-sm flex flex-col items-center justify-center p-6 text-center">
              <div className="bg-blue-100 text-blue-600 p-4 rounded-full mb-4 animate-bounce">
                <Bot size={48} />
              </div>
              <h3 className="text-2xl font-bold text-slate-800 mb-2">Asistente Virtual</h3>
              <p className="text-slate-600 mb-8 max-w-[250px]">
                Presiona comenzar para activar la interacción por voz.
              </p>
              <Button 
                onClick={() => {
                  setHasStarted(true)
                  speakReply(messages[0].parts[0].text)
                }}
                className="rounded-full shadow-lg text-lg px-8 py-6 bg-blue-600 hover:bg-blue-700 transition-all hover:scale-105"
              >
                <Volume2 className="mr-2 h-6 w-6" /> Iniciar Asistente
              </Button>
            </div>
          )}

          <div className="bg-blue-600 p-4 text-white flex items-center justify-between shadow-md relative overflow-hidden">
             {/* Glow effect when listening/processing/speaking */}
            <div className={cn(
              "absolute inset-0 opacity-40 blur-xl transition-colors duration-500",
              state === 'listening' ? "bg-cyan-300" :
              state === 'processing' ? "bg-purple-400" :
              state === 'speaking' ? "bg-green-400" : "bg-transparent"
            )} />
            
            <div className="relative z-10 flex items-center gap-3">
              <div className="bg-white/20 p-2 rounded-full">
                {state === 'speaking' ? <Volume2 className="animate-pulse" /> : <Bot size={24} />}
              </div>
              <div>
                <h3 className="font-bold">Asistente por Voz IA</h3>
                <p className="text-blue-100 text-xs">
                  {state === 'idle' ? 'En línea - Toca el micrófono' :
                   state === 'listening' ? 'Te estoy escuchando...' :
                   state === 'processing' ? 'Pensando...' :
                   state === 'speaking' ? 'Hablando...' : 'Listo para ayudarte'}
                </p>
              </div>
            </div>
            <div className="relative z-10">
               {state === 'processing' && <Loader2 className="h-5 w-5 animate-spin" />}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/50">
            {messages.map((msg, idx) => {
              const isUser = msg.role === 'user'
              return (
                <div key={idx} className={`flex gap-3 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
                  <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${isUser ? 'bg-indigo-100 text-indigo-600' : 'bg-blue-100 text-blue-600'}`}>
                    {isUser ? <User size={16} /> : <Bot size={16} />}
                  </div>
                  <div className={`p-3 rounded-2xl max-w-[75%] text-sm shadow-sm ${
                    isUser 
                      ? 'bg-blue-600 text-white rounded-tr-none' 
                      : 'bg-white border text-slate-700 rounded-tl-none'
                  }`}>
                    {msg.parts[0].text}
                  </div>
                </div>
              )
            })}
            
            {/* Live interim transcript bubble */}
            {state === 'listening' && input && (
               <div className="flex gap-3 flex-row-reverse">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center bg-indigo-100 text-indigo-600">
                    <User size={16} />
                  </div>
                  <div className="p-3 rounded-2xl max-w-[75%] text-sm shadow-sm bg-blue-400 text-white rounded-tr-none opacity-70 italic">
                    {input}
                  </div>
                </div>
            )}
            
            {state === 'processing' && (
              <div className="flex gap-3">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center">
                  <Bot size={16} />
                </div>
                <div className="p-3 bg-white border rounded-2xl rounded-tl-none flex gap-1 items-center">
                  <div className="w-2 h-2 bg-slate-300 rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-slate-300 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                  <div className="w-2 h-2 bg-slate-300 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <div className="p-4 bg-white border-t flex flex-col items-center gap-4 justify-center">
            
            <div className="flex flex-wrap justify-center gap-2 w-full">
              {['Agendar cita médica', 'Doctores disponibles', 'Cancelar mi cita'].map((suggestion, i) => (
                <button
                  key={i}
                  onClick={() => {
                    if (state !== 'listening' && state !== 'processing') {
                      handleSend(suggestion)
                    }
                  }}
                  disabled={state === 'processing' || state === 'listening'}
                  className="bg-blue-50 text-blue-600 hover:bg-blue-100 border border-blue-200 text-xs px-3 py-1.5 rounded-full transition-colors disabled:opacity-50"
                >
                  "{suggestion}"
                </button>
              ))}
            </div>
            
            <button 
              onClick={toggleListening}
              className={cn(
                "h-16 w-16 rounded-full flex items-center justify-center transition-all duration-300 shadow-lg relative",
                state === 'listening' ? "bg-red-500 text-white animate-pulse scale-110" :
                state === 'speaking' ? "bg-green-500 text-white" :
                "bg-blue-600 text-white hover:scale-105 hover:bg-blue-700"
              )}
            >
              {state === 'listening' ? <MicOff className="h-7 w-7" /> : <Mic className="h-7 w-7" />}
              
              {/* Ripple effect when speaking */}
              {state === 'speaking' && (
                 <span className="absolute inset-0 rounded-full border-4 border-green-500 animate-ping opacity-75"></span>
              )}
            </button>
            
            <p className="text-xs text-slate-500 font-medium">
              {state === 'listening' ? 'Toca para detener' : 'Toca el micrófono para hablar'}
            </p>
            
            {/* Fallback textual input for accessibility */}
            <form onSubmit={handleManualSubmit} className="w-full flex gap-2 mt-2">
              <input
                type="text"
                value={state !== 'listening' ? input : ''}
                onChange={(e) => {
                  if (state !== 'listening') setInput(e.target.value)
                }}
                placeholder="O escribe aquí..."
                className="flex-1 border rounded-full px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 text-xs"
                disabled={state === 'processing' || state === 'listening'}
              />
              <button 
                type="submit" 
                disabled={state === 'processing' || state === 'listening' || !input.trim()}
                className="bg-slate-100 text-slate-600 p-2 rounded-full hover:bg-slate-200 disabled:opacity-50 transition-colors"
              >
                <Send size={16} />
              </button>
            </form>

          </div>
        </div>
      </main>
    </div>
  )
}

