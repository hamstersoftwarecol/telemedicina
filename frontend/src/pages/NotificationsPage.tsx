/**
 * Notifications Page
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Bell, CheckCheck, Trash2, Calendar, Info, AlertCircle, MessageSquare, CheckCircle } from 'lucide-react'
import { toast } from 'sonner'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import api from '@/lib/api'
import { cn, formatRelativeTime } from '@/lib/utils'

const TYPE_ICONS: Record<string, React.ElementType> = {
  info: Info, success: CheckCircle, warning: AlertCircle, error: AlertCircle,
  appointment: Calendar, message: MessageSquare,
}

const TYPE_COLORS: Record<string, string> = {
  info: 'text-blue-600 bg-blue-100 dark:bg-blue-900/20',
  success: 'text-green-600 bg-green-100 dark:bg-green-900/20',
  warning: 'text-amber-600 bg-amber-100 dark:bg-amber-900/20',
  error: 'text-red-600 bg-red-100 dark:bg-red-900/20',
  appointment: 'text-violet-600 bg-violet-100 dark:bg-violet-900/20',
  message: 'text-sky-600 bg-sky-100 dark:bg-sky-900/20',
}

export function NotificationsPage() {
  const queryClient = useQueryClient()

  const { data, isLoading } = useQuery({
    queryKey: ['notifications'],
    queryFn: async () => { const { data } = await api.get('/notifications?limit=50'); return data },
    refetchInterval: 30000,
  })

  const readMutation = useMutation({
    mutationFn: (id: number) => api.patch(`/notifications/${id}/read`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications'] }),
  })

  const readAllMutation = useMutation({
    mutationFn: () => api.patch('/notifications/read-all'),
    onSuccess: () => { toast.success('Todas marcadas como leídas'); queryClient.invalidateQueries({ queryKey: ['notifications'] }) },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: number) => api.delete(`/notifications/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications'] }),
  })

  const notifications = data?.data ?? []
  const unreadCount = data?.unread_count ?? 0

  return (
    <div className="space-y-6 animate-fade-in max-w-2xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title flex items-center gap-2">
            <Bell className="h-6 w-6 text-primary" />
            Notificaciones
            {unreadCount > 0 && <Badge variant="default" className="ml-1">{unreadCount}</Badge>}
          </h1>
          <p className="page-subtitle">Centro de notificaciones del sistema</p>
        </div>
        {unreadCount > 0 && (
          <Button variant="outline" size="sm" onClick={() => readAllMutation.mutate()} loading={readAllMutation.isPending}>
            <CheckCheck className="h-4 w-4 mr-1.5" />
            Marcar todas como leídas
          </Button>
        )}
      </div>

      <div className="space-y-2">
        {isLoading ? (
          [...Array(5)].map((_, i) => <div key={i} className="skeleton h-16 rounded-xl" />)
        ) : notifications.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Bell className="h-10 w-10 text-muted-foreground/30 mb-3" />
              <p className="text-muted-foreground text-sm">No tienes notificaciones</p>
            </CardContent>
          </Card>
        ) : (
          notifications.map((n: { id: number; title: string; body: string; type: string; is_read: number; created_at: string }) => {
            const Icon = TYPE_ICONS[n.type] ?? Info
            const colorClass = TYPE_COLORS[n.type] ?? 'text-gray-600 bg-gray-100'
            return (
              <div
                key={n.id}
                className={cn('flex items-start gap-3 p-4 rounded-xl border transition-colors cursor-pointer', n.is_read ? 'bg-background border-border' : 'bg-primary/5 border-primary/20')}
                onClick={() => !n.is_read && readMutation.mutate(n.id)}
              >
                <div className={cn('h-9 w-9 rounded-lg flex items-center justify-center shrink-0', colorClass)}>
                  <Icon className="h-4 w-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className={cn('text-sm font-medium', !n.is_read && 'text-foreground')}>{n.title}</p>
                    {!n.is_read && <div className="h-2 w-2 bg-primary rounded-full" />}
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">{n.body}</p>
                  <p className="text-xs text-muted-foreground/60 mt-1">{formatRelativeTime(n.created_at)}</p>
                </div>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  className="shrink-0 hover:text-destructive"
                  onClick={(e) => { e.stopPropagation(); deleteMutation.mutate(n.id) }}
                  aria-label="Eliminar notificación"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
