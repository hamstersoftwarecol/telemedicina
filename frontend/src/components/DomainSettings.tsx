import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { AlertCircle, CheckCircle2, Globe, Loader2 } from 'lucide-react'
import { registerDomain, getDomainStatus, DomainStatusResponse } from '@/api/domain'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'

export function DomainSettings() {
  const queryClient = useQueryClient()
  const [domainInput, setDomainInput] = useState('')

  const { data: statusData, isLoading } = useQuery<DomainStatusResponse>({
    queryKey: ['domain-status'],
    queryFn: getDomainStatus,
    refetchInterval: (query) => {
      // Refresh every 10 seconds if it's pending
      return query.state.data?.status === 'pending' ? 10000 : false
    }
  })

  const registerMutation = useMutation({
    mutationFn: registerDomain,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['domain-status'] })
    }
  })

  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault()
    if (!domainInput.trim()) return
    registerMutation.mutate(domainInput.trim())
  }

  if (isLoading) {
    return <div className="flex items-center justify-center p-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
  }

  const isConfigured = statusData && statusData.status !== 'unconfigured'

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Globe className="h-5 w-5" />
          Dominio Personalizado
        </CardTitle>
        <CardDescription>
          Configura tu propio dominio (ej. app.miclinica.com) para acceder a la plataforma.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        
        {!isConfigured ? (
          <form onSubmit={handleRegister} className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Ingresa tu dominio</label>
              <div className="flex gap-2">
                <Input 
                  placeholder="ej. consultas.midominio.com" 
                  value={domainInput}
                  onChange={(e) => setDomainInput(e.target.value)}
                  className="max-w-md"
                />
                <Button type="submit" disabled={registerMutation.isPending || !domainInput}>
                  {registerMutation.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                  Vincular Dominio
                </Button>
              </div>
            </div>
            {registerMutation.isError && (
              <div className="text-sm text-red-500 bg-red-50 p-3 rounded-md">
                Error: No se pudo registrar el dominio. {(registerMutation.error as any).response?.data?.error || 'Error interno'}
              </div>
            )}
          </form>
        ) : (
          <div className="space-y-6">
            <div className="flex items-center gap-3 p-4 border rounded-lg bg-slate-50">
              {statusData.status === 'active' ? (
                <CheckCircle2 className="h-6 w-6 text-green-500" />
              ) : (
                <Loader2 className="h-6 w-6 text-amber-500 animate-spin" />
              )}
              <div>
                <h3 className="font-medium text-slate-900">{statusData.hostname}</h3>
                <p className="text-sm text-slate-500 capitalize">Estado: {statusData.status}</p>
              </div>
            </div>

            {statusData.status !== 'active' && statusData.ownership_verification && (
              <div className="p-4 border rounded-lg bg-amber-50 border-amber-200">
                <div className="flex gap-2 mb-2 text-amber-800">
                  <AlertCircle className="h-5 w-5" />
                  <h4 className="font-medium">Configuración DNS Pendiente</h4>
                </div>
                <p className="text-sm text-amber-700 mb-4">
                  Por favor, agrega este registro TXT en la configuración DNS de tu dominio para verificar la propiedad:
                </p>
                <div className="bg-white p-4 rounded border font-mono text-sm space-y-2">
                  <div className="grid grid-cols-[100px_1fr] gap-2 border-b pb-2">
                    <span className="text-slate-500">Tipo:</span>
                    <span className="font-medium">{statusData.ownership_verification.type}</span>
                  </div>
                  <div className="grid grid-cols-[100px_1fr] gap-2 border-b pb-2">
                    <span className="text-slate-500">Nombre/Host:</span>
                    <span className="font-medium break-all">{statusData.ownership_verification.name}</span>
                  </div>
                  <div className="grid grid-cols-[100px_1fr] gap-2">
                    <span className="text-slate-500">Valor/Destino:</span>
                    <span className="font-medium break-all">{statusData.ownership_verification.value}</span>
                  </div>
                </div>
                <p className="text-xs text-amber-600 mt-4">
                  (La propagación de los DNS puede tardar algunas horas. Esta página se actualizará automáticamente).
                </p>
              </div>
            )}

            {statusData.status === 'active' && (
              <div className="p-4 border rounded-lg bg-green-50 border-green-200">
                <div className="flex gap-2 mb-2 text-green-800">
                  <CheckCircle2 className="h-5 w-5" />
                  <h4 className="font-medium">¡Dominio conectado exitosamente!</h4>
                </div>
                <p className="text-sm text-green-700">
                  Tu dominio ya está protegido con SSL y enrutando a la plataforma. Ya puedes acceder mediante <strong>https://{statusData.hostname}</strong>.
                </p>
              </div>
            )}
          </div>
        )}

      </CardContent>
    </Card>
  )
}
