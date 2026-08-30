import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useNavigate } from 'react-router-dom'
import { Activity, Eye, EyeOff, Lock, Mail, AlertCircle, User, Phone } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useAuthStore } from '@/store/auth'
import { getApiErrorMessage } from '@/lib/errors'
import { toast } from 'sonner'

const registerSchema = z.object({
  first_name: z.string().min(2, 'Mínimo 2 caracteres'),
  last_name: z.string().min(2, 'Mínimo 2 caracteres'),
  phone: z.string().optional().or(z.literal('')),
  email: z.string().email('Email inválido').optional().or(z.literal('')),
  role_id: z.literal(4) // Paciente
}).refine(data => data.email || data.phone, {
  message: "Debe proveer un correo o un teléfono",
  path: ["email"]
})

type RegisterForm = z.infer<typeof registerSchema>

export function RegisterPage() {
  const navigate = useNavigate()
  const { registerUser } = useAuthStore()
  const [error, setError] = useState('')

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegisterForm>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      role_id: 4
    },
  })

  const onSubmit = async (data: RegisterForm) => {
    setError('')
    try {
      await registerUser(data)
      toast.success('¡Registro exitoso! Hemos enviado un código a tu correo/teléfono.')
      navigate('/login') // Va a login para verificar el código
    } catch (err: unknown) {
      setError(getApiErrorMessage(err, 'Ocurrió un error al registrarse.'))
    }
  }

  return (
    <div className="min-h-screen flex">
      {/* Left panel — branding */}
      <div className="hidden lg:flex flex-col w-1/2 relative bg-gradient-to-br from-indigo-600 via-indigo-500 to-purple-600 p-12 text-white">
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
            Tu salud en<br />
            <span className="text-white/80">buenas manos</span>
          </h1>
          <p className="text-white/70 text-lg leading-relaxed">
            Regístrate ahora y accede a cientos de especialistas médicos desde cualquier lugar.
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
            <h2 className="text-2xl font-bold text-foreground">Crear cuenta</h2>
            <p className="text-muted-foreground mt-1 text-sm">
              Regístrate como paciente
            </p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
            {error && (
              <div className="flex items-start gap-3 p-4 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm" role="alert">
                <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label htmlFor="first_name" className="text-sm font-medium text-foreground">Nombre</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input id="first_name" placeholder="Ej. Juan" className="pl-9" {...register('first_name')} />
                </div>
                {errors.first_name && <p className="text-xs text-destructive">{errors.first_name.message}</p>}
              </div>
              <div className="space-y-1.5">
                <label htmlFor="last_name" className="text-sm font-medium text-foreground">Apellido</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input id="last_name" placeholder="Ej. Pérez" className="pl-9" {...register('last_name')} />
                </div>
                {errors.last_name && <p className="text-xs text-destructive">{errors.last_name.message}</p>}
              </div>
            </div>

            <div className="space-y-1.5">
              <label htmlFor="email" className="text-sm font-medium text-foreground">Correo electrónico (Opcional si provee teléfono)</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input id="email" type="email" placeholder="correo@ejemplo.com" className="pl-9" {...register('email')} />
              </div>
              {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
            </div>

            <div className="space-y-1.5">
              <label htmlFor="phone" className="text-sm font-medium text-foreground">Teléfono (Opcional si provee correo)</label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input id="phone" placeholder="+57 300 0000000" className="pl-9" {...register('phone')} />
              </div>
              {errors.phone && <p className="text-xs text-destructive">{errors.phone.message}</p>}
            </div>

            <Button type="submit" className="w-full h-10 mt-2 font-semibold" loading={isSubmitting}>
              {isSubmitting ? 'Registrando...' : 'Registrarme gratis'}
            </Button>
          </form>

          <div className="border-t pt-4 text-center">
            <p className="text-xs text-muted-foreground mb-2">¿Ya tienes cuenta?</p>
            <a href="/login" className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline">
              Ir a iniciar sesión →
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}
