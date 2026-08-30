/**
 * Login Page with OTP (Resend)
 */
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useNavigate } from 'react-router-dom'
import { Activity, Mail, AlertCircle, KeyRound, ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useAuthStore } from '@/store/auth'
import { getApiErrorMessage } from '@/lib/errors'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

const requestSchema = z.object({
  identifier: z.string().min(1, 'Requerido'),
})
type RequestForm = z.infer<typeof requestSchema>

const verifySchema = z.object({
  code: z.string().length(6, 'Debe ser de 6 dígitos'),
})
type VerifyForm = z.infer<typeof verifySchema>

export function LoginPage() {
  const navigate = useNavigate()
  const { requestCode, verifyCode } = useAuthStore()
  const [step, setStep] = useState<1 | 2>(1)
  const [error, setError] = useState('')
  const [identifier, setIdentifier] = useState('')

  const requestForm = useForm<RequestForm>({
    resolver: zodResolver(requestSchema),
    defaultValues: { identifier: 'info@hamstersoftware.com' },
  })

  const verifyForm = useForm<VerifyForm>({
    resolver: zodResolver(verifySchema),
    defaultValues: { code: '' },
  })

  const onRequestCode = async (data: RequestForm) => {
    setError('')
    try {
      await requestCode(data.identifier)
      setIdentifier(data.identifier)
      setStep(2)
      toast.success('Código enviado')
    } catch (err: unknown) {
      setError(getApiErrorMessage(err, 'Error al enviar código.'))
    }
  }

  const onVerifyCode = async (data: VerifyForm) => {
    setError('')
    try {
      await verifyCode(identifier, data.code)
      toast.success('¡Bienvenido de nuevo!')
      navigate('/app/dashboard')
    } catch (err: unknown) {
      setError(getApiErrorMessage(err, 'Código inválido o expirado.'))
    }
  }

  return (
    <div className="min-h-screen flex">
      {/* Left panel — branding */}
      <div className="hidden lg:flex flex-col w-1/2 relative bg-gradient-to-br from-sky-600 via-sky-500 to-blue-600 p-12 text-white">
        {/* Background pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-20 left-20 h-64 w-64 rounded-full bg-white blur-3xl" />
          <div className="absolute bottom-20 right-20 h-96 w-96 rounded-full bg-white blur-3xl" />
        </div>

        {/* Logo */}
        <div className="relative flex items-center gap-3 mb-auto">
          <div className="h-10 w-10 rounded-xl bg-white/20 backdrop-blur flex items-center justify-center">
            <Activity className="h-6 w-6 text-white" />
          </div>
          <span className="text-xl font-bold">TelemedApp</span>
        </div>

        {/* Hero text */}
        <div className="relative space-y-6">
          <h1 className="text-4xl font-bold leading-tight">
            Telemedicina del futuro,<br />
            <span className="text-white/80">hoy en tus manos</span>
          </h1>
          <p className="text-white/70 text-lg leading-relaxed">
            Gestiona pacientes, citas, consultas y más desde una sola plataforma moderna y segura. Acceso sin contraseñas.
          </p>
        </div>
      </div>

      {/* Right panel — form */}
      <div className="flex-1 flex items-center justify-center p-8 bg-background">
        <div className="w-full max-w-md space-y-8 animate-fade-in">
          {/* Mobile logo */}
          <div className="lg:hidden flex items-center gap-3 mb-8">
            <div className="h-9 w-9 rounded-xl gradient-primary flex items-center justify-center">
              <Activity className="h-5 w-5 text-white" />
            </div>
            <span className="text-xl font-bold">TelemedApp</span>
          </div>

          <div>
            <h2 className="text-2xl font-bold text-foreground">
              {step === 1 ? 'Iniciar sesión' : 'Verificar código'}
            </h2>
            <p className="text-muted-foreground mt-1 text-sm">
              {step === 1 
                ? 'Ingresa tu correo o teléfono para recibir un código de acceso.'
                : `Hemos enviado un código de 6 dígitos a ${identifier}`}
            </p>
          </div>

          {error && (
            <div className="flex items-start gap-3 p-4 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm" role="alert">
              <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {step === 1 ? (
            <form onSubmit={requestForm.handleSubmit(onRequestCode)} className="space-y-5" noValidate>
              <div className="space-y-1.5">
                <label htmlFor="identifier" className="text-sm font-medium text-foreground">
                  Correo electrónico o Teléfono
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" aria-hidden />
                  <Input
                    id="identifier"
                    type="text"
                    placeholder="ej. info@hamstersoftware.com o 3001234567"
                    className={cn('pl-9', requestForm.formState.errors.identifier && 'border-destructive focus-visible:ring-destructive')}
                    {...requestForm.register('identifier')}
                  />
                </div>
                {requestForm.formState.errors.identifier && (
                  <p className="text-xs text-destructive" role="alert">{requestForm.formState.errors.identifier.message}</p>
                )}
              </div>

              <Button
                type="submit"
                className="w-full h-10 text-sm font-semibold"
                loading={requestForm.formState.isSubmitting}
              >
                {requestForm.formState.isSubmitting ? 'Enviando...' : 'Enviar código'}
              </Button>
            </form>
          ) : (
            <form onSubmit={verifyForm.handleSubmit(onVerifyCode)} className="space-y-5" noValidate>
              <div className="space-y-1.5">
                <label htmlFor="code" className="text-sm font-medium text-foreground">
                  Código de 6 dígitos
                </label>
                <div className="relative">
                  <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" aria-hidden />
                  <Input
                    id="code"
                    type="text"
                    maxLength={6}
                    placeholder="123456"
                    className={cn('pl-9 text-center tracking-[0.5em] font-bold', verifyForm.formState.errors.code && 'border-destructive focus-visible:ring-destructive')}
                    {...verifyForm.register('code')}
                  />
                </div>
                {verifyForm.formState.errors.code && (
                  <p className="text-xs text-destructive" role="alert">{verifyForm.formState.errors.code.message}</p>
                )}
              </div>

              <Button
                type="submit"
                className="w-full h-10 text-sm font-semibold"
                loading={verifyForm.formState.isSubmitting}
              >
                {verifyForm.formState.isSubmitting ? 'Verificando...' : 'Verificar y Entrar'}
              </Button>
              
              <Button
                type="button"
                variant="ghost"
                className="w-full h-10 text-sm"
                onClick={() => setStep(1)}
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Volver
              </Button>
            </form>
          )}

          <div className="border-t pt-4 text-center">
            <p className="text-xs text-muted-foreground mb-2">¿No tienes cuenta?</p>
            <div className="flex justify-center gap-4">
              <a
                href="/register"
                className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
              >
                Crear cuenta →
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
