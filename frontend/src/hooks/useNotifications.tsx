/**
 * useNotifications — Real-time notifications via polling
 * Polls every 30s, shows toast on new notifications, returns unread count
 */
import { useEffect, useRef } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Bell, Calendar, MessageSquare, AlertCircle, CheckCircle, Info } from 'lucide-react'
import api from '@/lib/api'
import { useAuthStore } from '@/store/auth'

interface Notification {
  id: number
  title: string
  body: string
  type: string
  is_read: number
  created_at: string
}

const TYPE_ICONS: Record<string, React.ElementType> = {
  appointment: Calendar,
  message: MessageSquare,
  warning: AlertCircle,
  error: AlertCircle,
  success: CheckCircle,
  info: Info,
}

export function useNotifications() {
  const { isAuthenticated } = useAuthStore()
  const queryClient = useQueryClient()
  const lastSeenIdRef = useRef<number | null>(null)
  const isFirstFetchRef = useRef(true)

  const { data, isLoading } = useQuery<{ data: Notification[]; unread_count: number }>({
    queryKey: ['notifications', 'live'],
    queryFn: async () => {
      const { data } = await api.get('/notifications?limit=20')
      return data
    },
    refetchInterval: 30000,
    enabled: isAuthenticated,
    staleTime: 20000,
  })

  const notifications = data?.data ?? []
  const unreadCount = data?.unread_count ?? notifications.filter(n => !n.is_read).length

  useEffect(() => {
    if (!notifications.length) return

    const latestId = notifications[0]?.id ?? 0

    // Skip toast on the very first fetch — just record the baseline
    if (isFirstFetchRef.current) {
      isFirstFetchRef.current = false
      lastSeenIdRef.current = latestId
      return
    }

    // Find notifications newer than what we last saw
    if (lastSeenIdRef.current !== null) {
      const newOnes = notifications.filter(n => n.id > lastSeenIdRef.current!)
      newOnes.slice(0, 3).forEach(n => {
        const Icon = TYPE_ICONS[n.type] ?? Bell
        toast(n.title, {
          description: n.body,
          icon: <Icon className="h-4 w-4" />,
          action: {
            label: 'Ver',
            onClick: () => { window.location.href = '/notificaciones' },
          },
        })
      })
    }

    lastSeenIdRef.current = latestId
    queryClient.invalidateQueries({ queryKey: ['notifications'] })
  }, [notifications, queryClient])

  return { notifications, unreadCount, isLoading }
}
