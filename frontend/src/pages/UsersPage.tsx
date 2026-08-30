import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { Users, Search, Mail, Phone, UserCheck, UserX, Edit, Plus } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { toast } from 'sonner'
import { getInitials } from '@/lib/utils'

interface UserItem {
  id: number
  email: string
  first_name: string
  last_name: string
  phone: string | null
  avatar_url: string | null
  is_active: number
  is_verified: number
  last_login_at: string | null
  created_at: string
  role_name: string
  role_display_name: string
  role_id?: number // Mapped below if possible, or we will just use role_name in the form mapping
}

const userSchema = z.object({
  first_name: z.string().min(2, 'El nombre es requerido'),
  last_name: z.string().min(2, 'El apellido es requerido'),
  email: z.string().email('Correo inválido'),
  phone: z.string().optional(),
  role_id: z.coerce.number().min(1, 'El rol es requerido')
})

type UserFormData = z.infer<typeof userSchema>

function UserFormDialog({ open, onClose, user, onSuccess }: { open: boolean, onClose: () => void, user: UserItem | null, onSuccess: () => void }) {
  const isEditing = !!user
  
  const { register, handleSubmit, formState: { errors }, reset } = useForm<UserFormData>({
    resolver: zodResolver(userSchema),
    defaultValues: {
      first_name: '',
      last_name: '',
      email: '',
      phone: '',
      role_id: 4 // default patient
    }
  })

  // Map role_name back to role_id for editing
  useEffect(() => {
    if (user) {
      let role_id = 4
      if (user.role_name === 'admin') role_id = 1
      else if (user.role_name === 'doctor') role_id = 2
      else if (user.role_name === 'receptionist') role_id = 3
      
      reset({
        first_name: user.first_name,
        last_name: user.last_name,
        email: user.email,
        phone: user.phone || '',
        role_id
      })
    } else {
      reset({ first_name: '', last_name: '', email: '', phone: '', role_id: 4 })
    }
  }, [user, reset])

  const mutation = useMutation({
    mutationFn: async (data: UserFormData) => {
      if (isEditing) {
        const { data: res } = await api.patch(`/users/${user.id}`, data)
        return res
      } else {
        const { data: res } = await api.post('/users', data)
        return res
      }
    },
    onSuccess: (data) => {
      toast.success(isEditing ? 'Usuario actualizado exitosamente' : 'Usuario invitado exitosamente')
      if (!isEditing && data.temp_password) {
        toast.info(`Contraseña temporal generada: ${data.temp_password}`, { duration: 10000 })
      }
      onSuccess()
      onClose()
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Error al procesar la solicitud')
    }
  })

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Editar Usuario' : 'Invitar Usuario'}</DialogTitle>
          <DialogDescription>
            {isEditing ? 'Modifica los datos y rol del usuario.' : 'Se enviará un correo con una contraseña temporal para que ingrese al sistema.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit((d) => mutation.mutate(d))} className="space-y-4 mt-2">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground">Nombres *</label>
              <Input placeholder="Ej: Juan" {...register('first_name')} />
              {errors.first_name && <p className="text-xs text-destructive">{errors.first_name.message}</p>}
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Apellidos *</label>
              <Input placeholder="Ej: Pérez" {...register('last_name')} />
              {errors.last_name && <p className="text-xs text-destructive">{errors.last_name.message}</p>}
            </div>
          </div>
          
          <div>
            <label className="text-xs font-medium text-muted-foreground">Correo electrónico *</label>
            <Input type="email" placeholder="juan.perez@ejemplo.com" {...register('email')} disabled={isEditing} />
            {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground">Teléfono</label>
              <Input placeholder="+57 300 123 4567" {...register('phone')} />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Rol en el sistema *</label>
              <select 
                {...register('role_id')} 
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                <option value={1}>Administrador</option>
                <option value={2}>Médico</option>
                <option value={3}>Recepcionista</option>
                <option value={4}>Paciente</option>
              </select>
              {errors.role_id && <p className="text-xs text-destructive">{errors.role_id.message}</p>}
            </div>
          </div>

          <DialogFooter className="mt-6">
            <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? 'Guardando...' : (isEditing ? 'Guardar Cambios' : 'Enviar Invitación')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export function UsersPage() {
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [formOpen, setFormOpen] = useState(false)
  const [selectedUser, setSelectedUser] = useState<UserItem | null>(null)

  const { data: usersData, isLoading } = useQuery({
    queryKey: ['users', search],
    queryFn: async () => {
      const params = new URLSearchParams({ limit: '100' })
      if (search) params.set('search', search)
      const { data } = await api.get(`/users?${params}`)
      return data
    },
  })

  const users: UserItem[] = usersData?.data ?? []

  const toggleActiveMutation = useMutation({
    mutationFn: ({ id, is_active }: { id: number, is_active: number }) => 
      api.patch(`/users/${id}`, { is_active }),
    onSuccess: (_, variables) => { 
      toast.success(variables.is_active ? 'Usuario activado' : 'Usuario desactivado')
      queryClient.invalidateQueries({ queryKey: ['users'] }) 
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Error al cambiar estado')
    }
  })

  const getRoleColor = (role: string) => {
    switch(role) {
      case 'admin': return 'bg-purple-100 text-purple-700'
      case 'doctor': return 'bg-blue-100 text-blue-700'
      case 'receptionist': return 'bg-orange-100 text-orange-700'
      case 'patient': return 'bg-emerald-100 text-emerald-700'
      default: return 'bg-gray-100 text-gray-700'
    }
  }

  const handleCreate = () => {
    setSelectedUser(null)
    setFormOpen(true)
  }

  const handleEdit = (user: UserItem) => {
    setSelectedUser(user)
    setFormOpen(true)
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title flex items-center gap-2"><Users className="h-6 w-6 text-primary" />Usuarios</h1>
          <p className="page-subtitle">{users.length} usuarios registrados en el sistema</p>
        </div>
        <Button onClick={handleCreate}>
          <Plus className="h-4 w-4 mr-1.5" />
          Invitar Usuario
        </Button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input className="pl-9 max-w-md" placeholder="Buscar por nombre o email..." value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 space-y-3">{[...Array(5)].map((_, i) => <div key={i} className="skeleton h-16 rounded-lg" />)}</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Usuario</TableHead>
                  <TableHead>Rol</TableHead>
                  <TableHead className="hidden md:table-cell">Contacto</TableHead>
                  <TableHead className="hidden lg:table-cell">Último Ingreso</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-9 w-9">
                          {user.avatar_url && <AvatarImage src={user.avatar_url} />}
                          <AvatarFallback className="text-xs bg-primary/10 text-primary">
                            {getInitials(`${user.first_name} ${user.last_name}`)}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium text-sm">{user.first_name} {user.last_name}</p>
                          <p className="text-xs text-muted-foreground md:hidden">{user.email}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className={`text-xs px-2 py-1 rounded-full font-medium ${getRoleColor(user.role_name)}`}>
                        {user.role_display_name}
                      </span>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-1 text-xs text-muted-foreground"><Mail className="h-3 w-3" />{user.email}</div>
                        {user.phone && <div className="flex items-center gap-1 text-xs text-muted-foreground"><Phone className="h-3 w-3" />{user.phone}</div>}
                      </div>
                    </TableCell>
                    <TableCell className="hidden lg:table-cell text-xs text-muted-foreground">
                      {user.last_login_at ? new Date(user.last_login_at).toLocaleString() : 'Nunca'}
                    </TableCell>
                    <TableCell>
                      <Badge variant={user.is_active ? 'success' : 'secondary'}>{user.is_active ? 'Activo' : 'Inactivo'}</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button 
                          variant="ghost" 
                          size="icon-sm" 
                          onClick={() => handleEdit(user)}
                          title="Editar usuario"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon-sm" 
                          className={user.is_active ? "text-destructive hover:text-destructive/80" : "text-success hover:text-success/80"} 
                          onClick={() => toggleActiveMutation.mutate({ id: user.id, is_active: user.is_active ? 0 : 1 })}
                          title={user.is_active ? "Desactivar usuario" : "Activar usuario"}
                        >
                          {user.is_active ? <UserX className="h-4 w-4" /> : <UserCheck className="h-4 w-4" />}
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {formOpen && (
        <UserFormDialog
          open={formOpen}
          onClose={() => setFormOpen(false)}
          user={selectedUser}
          onSuccess={() => queryClient.invalidateQueries({ queryKey: ['users'] })}
        />
      )}
    </div>
  )
}
