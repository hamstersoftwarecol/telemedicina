import { Link } from 'react-router-dom'
import { XCircle, ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'

export function PaymentCancelledPage() {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center p-4">
      <div className="max-w-md w-full bg-white dark:bg-slate-900 rounded-3xl border border-border shadow-2xl p-8 text-center animate-in zoom-in-95 duration-500">
        <div className="py-8 flex flex-col items-center">
          <div className="h-20 w-20 bg-red-100 text-red-600 rounded-full flex items-center justify-center mb-6">
            <XCircle className="h-10 w-10" />
          </div>
          <h2 className="text-2xl font-bold mb-2">Pago cancelado</h2>
          <p className="text-muted-foreground mb-6">No se ha completado la reserva de tu cita porque el pago fue cancelado.</p>
          <Link to="/portal">
            <Button className="w-full"><ArrowLeft className="mr-2 h-4 w-4"/> Volver al portal e intentar de nuevo</Button>
          </Link>
        </div>
      </div>
    </div>
  )
}
