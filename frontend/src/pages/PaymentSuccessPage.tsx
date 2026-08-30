import { useEffect, useState } from 'react'
import { useSearchParams, useNavigate, Link } from 'react-router-dom'
import { CheckCircle, Loader2, ArrowLeft, Calendar } from 'lucide-react'
import { Button } from '@/components/ui/button'
import api from '@/lib/api'

export function PaymentSuccessPage() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const sessionId = searchParams.get('session_id')
  const appointmentId = searchParams.get('appointment_id')
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading')
  const [appointmentData, setAppointmentData] = useState<any>(null)

  useEffect(() => {
    if (!sessionId || !appointmentId) {
      setStatus('error')
      return
    }

    const fetchAppointment = async () => {
      try {
        const { data } = await api.get(`/appointments/${appointmentId}`)
        setAppointmentData(data.data)
        setStatus('success')
      } catch (e) {
        setStatus('error')
      }
    }
    
    fetchAppointment()
  }, [sessionId, appointmentId])

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center p-4">
      <div className="max-w-md w-full bg-white dark:bg-slate-900 rounded-3xl border border-border shadow-2xl p-8 text-center animate-in zoom-in-95 duration-500">
        
        {status === 'loading' && (
          <div className="py-12 flex flex-col items-center">
            <Loader2 className="h-12 w-12 text-primary animate-spin mb-4" />
            <h2 className="text-xl font-semibold">Verificando tu pago...</h2>
            <p className="text-muted-foreground mt-2">Por favor, no cierres esta ventana.</p>
          </div>
        )}

        {status === 'success' && (
          <div className="py-8 flex flex-col items-center">
            <div className="h-20 w-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mb-6">
              <CheckCircle className="h-10 w-10" />
            </div>
            <h2 className="text-2xl font-bold mb-2">¡Pago exitoso!</h2>
            <p className="text-muted-foreground mb-6">Tu cita ha sido agendada y confirmada.</p>
            
            {appointmentData && (
              <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-4 w-full text-left mb-6 space-y-2 border">
                <div className="flex items-center gap-2 text-sm font-medium border-b pb-2 mb-2">
                  <Calendar className="h-4 w-4" /> Resumen de la cita
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Médico</span>
                  <span className="font-medium">Dr. {appointmentData.doctor_name}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Fecha</span>
                  <span className="font-medium">{appointmentData.appointment_date} a las {appointmentData.start_time}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Modalidad</span>
                  <span className="font-medium capitalize">{appointmentData.type}</span>
                </div>
              </div>
            )}

            <Link to="/portal">
              <Button className="w-full">Volver al portal</Button>
            </Link>
          </div>
        )}

        {status === 'error' && (
          <div className="py-12 flex flex-col items-center">
            <div className="h-20 w-20 bg-red-100 text-red-600 rounded-full flex items-center justify-center mb-6">
              <CheckCircle className="h-10 w-10 rotate-45" />
            </div>
            <h2 className="text-2xl font-bold mb-2">Hubo un problema</h2>
            <p className="text-muted-foreground mb-6">No pudimos verificar tu cita o el pago fue rechazado.</p>
            <Link to="/portal">
              <Button variant="outline" className="w-full"><ArrowLeft className="mr-2 h-4 w-4"/> Volver a intentar</Button>
            </Link>
          </div>
        )}

      </div>
    </div>
  )
}
