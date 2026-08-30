/**
 * Settings Page
 */
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { DomainSettings } from '@/components/DomainSettings'
import { Settings, Building2, Palette, Bell, Shield, Database, Save, User, Globe } from 'lucide-react'
import { toast } from 'sonner'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import api from '@/lib/api'

const tabs = [
  { id: 'profile', label: 'Mi Perfil', icon: User },
  { id: 'hospital', label: 'Hospital/Clínica', icon: Building2 },
  { id: 'appearance', label: 'Apariencia', icon: Palette },
  { id: 'notifications', label: 'Notificaciones', icon: Bell },
  { id: 'security', label: 'Seguridad', icon: Shield },
  { id: 'domain', label: 'Dominio', icon: Globe },
  { id: 'system', label: 'Sistema', icon: Database },
]

export function SettingsPage() {
  const [activeTab, setActiveTab] = useState('profile')
  const queryClient = useQueryClient()

  const { data } = useQuery({
    queryKey: ['settings'],
    queryFn: async () => { const { data } = await api.get('/settings'); return data },
  })

  const [form, setForm] = useState<Record<string, string>>({})
  const settings = data?.data ?? {}

  const saveMutation = useMutation({
    mutationFn: (settings: Record<string, string>) => api.put('/settings', settings),
    onSuccess: () => { toast.success('Configuración guardada'); queryClient.invalidateQueries({ queryKey: ['settings'] }) },
    onError: () => toast.error('Error al guardar la configuración'),
  })

  // Profile data
  const { data: profileData } = useQuery({
    queryKey: ['profile'],
    queryFn: async () => { const { data } = await api.get('/profile'); return data },
  })
  
  const [profileForm, setProfileForm] = useState<Record<string, string>>({})
  const profile = profileData?.data ?? {}

  const saveProfileMutation = useMutation({
    mutationFn: (profile: Record<string, string>) => api.put('/profile', profile),
    onSuccess: () => { toast.success('Perfil guardado'); queryClient.invalidateQueries({ queryKey: ['profile'] }) },
    onError: () => toast.error('Error al guardar el perfil'),
  })

  const handleSaveProfile = () => {
    saveProfileMutation.mutate(profileForm)
  }

  const handleSave = () => {
    saveMutation.mutate(form)
  }

  const Field = ({ label, settingKey, type = 'text', placeholder }: { label: string; settingKey: string; type?: string; placeholder?: string }) => (
    <div className="space-y-1.5">
      <label className="text-sm font-medium">{label}</label>
      <Input
        type={type}
        placeholder={placeholder}
        defaultValue={settings[settingKey] ?? ''}
        onChange={(e) => setForm({ ...form, [settingKey]: e.target.value })}
      />
    </div>
  )

  const ProfileField = ({ label, settingKey, type = 'text', placeholder }: { label: string; settingKey: string; type?: string; placeholder?: string }) => (
    <div className="space-y-1.5">
      <label className="text-sm font-medium">{label}</label>
      <Input
        type={type}
        placeholder={placeholder}
        defaultValue={profile[settingKey] ?? ''}
        onChange={(e) => setProfileForm({ ...profileForm, [settingKey]: e.target.value })}
      />
    </div>
  )

  return (
    <div className="space-y-6 animate-fade-in max-w-4xl">
      <div>
        <h1 className="page-title flex items-center gap-2"><Settings className="h-6 w-6 text-primary" />Configuración</h1>
        <p className="page-subtitle">Personaliza tu plataforma de telemedicina</p>
      </div>

      <div className="flex gap-6">
        {/* Sidebar tabs */}
        <div className="w-52 space-y-1 shrink-0">
          {tabs.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                activeTab === id ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'
              }`}
            >
              <Icon className="h-4 w-4" />
              {label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 space-y-4">
          {activeTab === 'profile' && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Mi Perfil</CardTitle>
                <CardDescription>Información personal y médica (si aplica)</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <ProfileField label="Nombres" settingKey="first_name" />
                  <ProfileField label="Apellidos" settingKey="last_name" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <ProfileField label="Teléfono" settingKey="phone" />
                  <ProfileField label="Dirección" settingKey="address" />
                </div>
                {/* For Patients specifically */}
                {profile.document_number !== undefined && (
                  <>
                    <h3 className="text-sm font-semibold mt-4 mb-2">Información Clínica</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <ProfileField label="Tipo de Sangre" settingKey="blood_type" placeholder="O+" />
                      <ProfileField label="Alergias" settingKey="allergies" placeholder="Ej: Penicilina" />
                    </div>
                    <ProfileField label="Condiciones Médicas" settingKey="medical_conditions" placeholder="Ej: Hipertensión" />
                    <div className="grid grid-cols-2 gap-4">
                      <ProfileField label="Contacto Emergencia" settingKey="emergency_contact_name" />
                      <ProfileField label="Teléfono Emergencia" settingKey="emergency_contact_phone" />
                    </div>
                  </>
                )}
                {/* For Doctors specifically */}
                {profile.consultation_fee !== undefined && (
                  <>
                    <h3 className="text-sm font-semibold mt-4 mb-2">Información Profesional</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <ProfileField label="Oficina/Consultorio" settingKey="office_number" />
                      <ProfileField label="Tarifa Consulta ($)" settingKey="consultation_fee" type="number" />
                    </div>
                    <ProfileField label="Biografía" settingKey="bio" />
                  </>
                )}
                
                <div className="flex justify-end pt-4">
                  <Button onClick={handleSaveProfile} loading={saveProfileMutation.isPending}>
                    <Save className="h-4 w-4 mr-1.5" />
                    Actualizar perfil
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {activeTab === 'hospital' && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Información del Hospital / Clínica</CardTitle>
                <CardDescription>Datos que aparecerán en facturas y documentos oficiales</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Field label="Nombre del centro médico" settingKey="hospital.name" placeholder="Centro Médico TelemedApp" />
                <Field label="NIT / RUT" settingKey="hospital.nit" placeholder="900.123.456-7" />
                <Field label="Dirección" settingKey="hospital.address" placeholder="Calle 123 #45-67, Bogotá" />
                <Field label="Teléfono" settingKey="hospital.phone" placeholder="+57 1 234 5678" />
                <Field label="Email institucional" settingKey="hospital.email" type="email" placeholder="info@clinica.com" />
                <Field label="Nombre de la aplicación" settingKey="app.name" placeholder="TelemedApp" />
              </CardContent>
            </Card>
          )}

          {activeTab === 'appearance' && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Apariencia</CardTitle>
                <CardDescription>Personaliza el aspecto visual del sistema</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Color primario</label>
                  <div className="flex items-center gap-3">
                    <input type="color" defaultValue={settings['app.primary_color'] ?? '#0ea5e9'} className="h-9 w-20 rounded-lg border cursor-pointer" />
                    <span className="text-sm text-muted-foreground">Color de la marca</span>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Idioma</label>
                  <select className="flex h-9 w-48 rounded-lg border border-input bg-background px-3 py-1 text-sm">
                    <option value="es">Español</option>
                    <option value="en">English</option>
                    <option value="pt">Português</option>
                  </select>
                </div>
              </CardContent>
            </Card>
          )}

          {activeTab === 'notifications' && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Notificaciones</CardTitle>
                <CardDescription>Configura cuándo y cómo recibir alertas</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {[
                  { label: 'Recordatorio de cita (horas antes)', key: 'appointment.reminder_hours', type: 'number' },
                  { label: 'Duración por defecto de cita (minutos)', key: 'appointment.duration_default', type: 'number' },
                ].map(({ label, key, type }) => (
                  <Field key={key} label={label} settingKey={key} type={type} />
                ))}
              </CardContent>
            </Card>
          )}

          {activeTab === 'domain' && (
            <DomainSettings />
          )}

          {activeTab === 'security' && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Seguridad</CardTitle>
                <CardDescription>Configuraciones de autenticación y acceso</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="p-4 rounded-lg bg-green-50 border border-green-200 dark:bg-green-900/20 dark:border-green-800">
                  <div className="flex items-center gap-2 mb-2">
                    <Shield className="h-4 w-4 text-green-600" />
                    <p className="text-sm font-semibold text-green-800 dark:text-green-300">Seguridad activa</p>
                  </div>
                  <ul className="space-y-1 text-xs text-green-700 dark:text-green-400">
                    <li>✓ JWT con tokens de 15 minutos</li>
                    <li>✓ Refresh tokens en D1</li>
                    <li>✓ Rate limiting (300 req/min)</li>
                    <li>✓ PBKDF2 password hashing</li>
                    <li>✓ Validación con Zod</li>
                    <li>✓ Audit logs habilitados</li>
                  </ul>
                </div>
              </CardContent>
            </Card>
          )}

          {activeTab === 'system' && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Sistema</CardTitle>
                <CardDescription>Configuración de facturación e idioma</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Field label="Moneda" settingKey="invoice.currency" placeholder="COP" />
                <Field label="Tasa de impuesto (%)" settingKey="invoice.tax_rate" type="number" placeholder="0" />
              </CardContent>
            </Card>
          )}

          {activeTab !== 'profile' && activeTab !== 'domain' && (
            <div className="flex justify-end">
              <Button onClick={handleSave} loading={saveMutation.isPending}>
                <Save className="h-4 w-4 mr-1.5" />
                Guardar configuración
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
