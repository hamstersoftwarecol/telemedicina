/**
 * Messages Page — Internal messaging with conversation list + chat panel
 */
import { useState, useEffect, useRef, useCallback } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  MessageSquare, Plus, Search, Send, Users, User,
  Check, CheckCheck, MoreVertical, Hash,
} from 'lucide-react'
import { toast } from 'sonner'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog'
import api from '@/lib/api'
import { getApiErrorMessage } from '@/lib/errors'
import { cn, formatRelativeTime } from '@/lib/utils'

// ─── Types ────────────────────────────────────────────────────────────────────
interface Conversation {
  id: number
  title: string | null
  type: 'direct' | 'group'
  last_message: string | null
  last_message_at: string | null
  unread_count: number
}

interface Message {
  id: number
  conversation_id: number
  sender_id: number
  sender_name: string
  content: string
  message_type: string
  created_at: string
}

interface ChatUser {
  id: number
  first_name: string
  last_name: string
  email: string
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function getInitials(name: string) {
  return name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
}

function getAvatarColor(id: number) {
  const colors = [
    'from-sky-400 to-blue-600',
    'from-violet-400 to-purple-600',
    'from-emerald-400 to-teal-600',
    'from-rose-400 to-pink-600',
    'from-amber-400 to-orange-600',
    'from-cyan-400 to-sky-600',
  ]
  return colors[id % colors.length]
}

// ─── New Conversation Dialog ──────────────────────────────────────────────────
function NewConversationDialog({ open, onClose, onSuccess }: {
  open: boolean; onClose: () => void; onSuccess: (id: number) => void
}) {
  const [selectedIds, setSelectedIds] = useState<number[]>([])
  const [title, setTitle] = useState('')
  const [creating, setCreating] = useState(false)

  const { data } = useQuery({
    queryKey: ['messages-users'],
    queryFn: async () => { const { data } = await api.get('/messages/users'); return data },
    enabled: open,
  })
  const users: ChatUser[] = data?.data ?? []

  const toggleUser = (id: number) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])
  }

  const handleCreate = async () => {
    if (selectedIds.length === 0) { toast.error('Selecciona al menos un destinatario'); return }
    setCreating(true)
    try {
      const payload: Record<string, unknown> = { participant_ids: selectedIds }
      if (selectedIds.length > 1 && title) payload.title = title
      const { data } = await api.post('/messages/conversations', payload)
      onSuccess(data.id)
      onClose()
      setSelectedIds([])
      setTitle('')
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Error al crear conversación'))
    } finally { setCreating(false) }
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5 text-primary" /> Nueva conversación
          </DialogTitle>
          <DialogDescription>Selecciona uno o más usuarios para iniciar un chat</DialogDescription>
        </DialogHeader>

        {selectedIds.length > 1 && (
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Nombre del grupo</label>
            <Input placeholder="Ej: Equipo UCI, Cardiología..." value={title} onChange={e => setTitle(e.target.value)} />
          </div>
        )}

        <div className="space-y-1 max-h-64 overflow-y-auto">
          {users.map(u => {
            const selected = selectedIds.includes(u.id)
            return (
              <button key={u.id}
                onClick={() => toggleUser(u.id)}
                className={cn(
                  'flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-left transition-all',
                  selected ? 'bg-primary/10 border border-primary/30' : 'hover:bg-muted/50 border border-transparent'
                )}>
                <div className={cn('h-9 w-9 rounded-full bg-gradient-to-br flex items-center justify-center text-white text-xs font-bold shrink-0', getAvatarColor(u.id))}>
                  {getInitials(`${u.first_name} ${u.last_name}`)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">{u.first_name} {u.last_name}</p>
                  <p className="text-xs text-muted-foreground truncate">{u.email}</p>
                </div>
                {selected && <Check className="h-4 w-4 text-primary shrink-0" />}
              </button>
            )
          })}
        </div>

        {selectedIds.length > 0 && (
          <p className="text-xs text-muted-foreground text-center">
            {selectedIds.length} usuario{selectedIds.length > 1 ? 's' : ''} seleccionado{selectedIds.length > 1 ? 's' : ''}
            {selectedIds.length > 1 ? ' · Chat grupal' : ' · Chat directo'}
          </p>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={handleCreate} loading={creating} disabled={selectedIds.length === 0}>
            {selectedIds.length > 1 ? <><Users className="h-4 w-4 mr-1.5" /> Crear grupo</> : <><MessageSquare className="h-4 w-4 mr-1.5" /> Iniciar chat</>}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ─── Message Bubble ────────────────────────────────────────────────────────────
function MessageBubble({ msg, isMine, showName }: { msg: Message; isMine: boolean; showName: boolean }) {
  return (
    <div className={cn('flex gap-2 group', isMine ? 'flex-row-reverse' : 'flex-row')}>
      {!isMine && (
        <div className={cn('h-7 w-7 rounded-full bg-gradient-to-br flex items-center justify-center text-white text-[10px] font-bold shrink-0 mt-auto', getAvatarColor(msg.sender_id))}>
          {getInitials(msg.sender_name)}
        </div>
      )}
      <div className={cn('max-w-[72%] space-y-0.5', isMine && 'items-end flex flex-col')}>
        {showName && !isMine && (
          <p className="text-xs font-semibold text-muted-foreground px-1">{msg.sender_name}</p>
        )}
        <div className={cn(
          'px-3.5 py-2 rounded-2xl text-sm leading-relaxed',
          isMine
            ? 'bg-primary text-primary-foreground rounded-br-md'
            : 'bg-muted text-foreground rounded-bl-md'
        )}>
          {msg.content}
        </div>
        <div className={cn('flex items-center gap-1 px-1', isMine && 'flex-row-reverse')}>
          <span className="text-[10px] text-muted-foreground/60">
            {new Date(msg.created_at).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}
          </span>
          {isMine && <CheckCheck className="h-3 w-3 text-sky-400" />}
        </div>
      </div>
    </div>
  )
}

// ─── Main Page ─────────────────────────────────────────────────────────────────
export function MessagesPage() {
  const queryClient = useQueryClient()
  const [activeConvId, setActiveConvId] = useState<number | null>(null)
  const [newOpen, setNewOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [draft, setDraft] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Current user from localStorage token (we use user_id=1 as demo – admin)
  const currentUserId = 1

  // Conversations list
  const { data: convsData, isLoading: loadingConvs } = useQuery({
    queryKey: ['conversations'],
    queryFn: async () => { const { data } = await api.get('/messages/conversations'); return data },
    refetchInterval: 5000,
  })
  const conversations: Conversation[] = (convsData?.data ?? []).filter((c: Conversation) =>
    !search || (c.title ?? '').toLowerCase().includes(search.toLowerCase()) ||
    (c.last_message ?? '').toLowerCase().includes(search.toLowerCase())
  )

  // Messages for active conversation
  const { data: msgsData } = useQuery({
    queryKey: ['messages', activeConvId],
    queryFn: async () => {
      const { data } = await api.get(`/messages/conversations/${activeConvId}/messages?limit=100`)
      return data
    },
    enabled: activeConvId !== null,
    refetchInterval: 3000,
  })
  const messages: Message[] = msgsData?.data ?? []

  const sendMutation = useMutation({
    mutationFn: async (content: string) => api.post(`/messages/conversations/${activeConvId}/messages`, { content }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['messages', activeConvId] })
      queryClient.invalidateQueries({ queryKey: ['conversations'] })
    },
    onError: (err) => toast.error(getApiErrorMessage(err, 'Error al enviar')),
  })

  const handleSend = () => {
    const content = draft.trim()
    if (!content || !activeConvId) return
    setDraft('')
    sendMutation.mutate(content)
  }

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() }
  }

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages.length])

  // Focus input when switching conversation
  useEffect(() => {
    if (activeConvId) setTimeout(() => inputRef.current?.focus(), 100)
  }, [activeConvId])

  const activeConv = conversations.find(c => c.id === activeConvId)
  const totalUnread = conversations.reduce((acc, c) => acc + (c.unread_count ?? 0), 0)

  return (
    <div className="animate-fade-in" style={{ height: 'calc(100vh - 8rem)' }}>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="page-title flex items-center gap-2">
            <MessageSquare className="h-6 w-6 text-primary" /> Mensajes
            {totalUnread > 0 && <Badge className="ml-1">{totalUnread}</Badge>}
          </h1>
          <p className="page-subtitle">Sistema de mensajería interna</p>
        </div>
        <Button onClick={() => setNewOpen(true)} id="btn-nuevo-mensaje">
          <Plus className="h-4 w-4 mr-1" /> Nueva conversación
        </Button>
      </div>

      {/* Chat layout */}
      <div className="flex h-[calc(100%-5rem)] rounded-2xl border border-border overflow-hidden bg-background shadow-sm">

        {/* ── Sidebar ── */}
        <div className="w-72 shrink-0 border-r border-border flex flex-col bg-background">
          {/* Search */}
          <div className="p-3 border-b border-border">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input className="pl-9 h-8 text-sm" placeholder="Buscar..." value={search} onChange={e => setSearch(e.target.value)} />
            </div>
          </div>

          {/* Conversation list */}
          <div className="flex-1 overflow-y-auto">
            {loadingConvs ? (
              <div className="p-3 space-y-2">{[...Array(4)].map((_, i) => <div key={i} className="skeleton h-14 rounded-xl" />)}</div>
            ) : conversations.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center p-6">
                <MessageSquare className="h-10 w-10 text-muted-foreground/30 mb-2" />
                <p className="text-sm text-muted-foreground">Sin conversaciones</p>
                <Button size="sm" className="mt-3" onClick={() => setNewOpen(true)}>
                  <Plus className="h-3.5 w-3.5 mr-1" /> Iniciar chat
                </Button>
              </div>
            ) : (
              conversations.map((conv) => {
                const isActive = conv.id === activeConvId
                const isGroup = conv.type === 'group'
                const displayName = conv.title ?? (isGroup ? 'Grupo' : 'Conversación')
                return (
                  <button
                    key={conv.id}
                    onClick={() => { setActiveConvId(conv.id); queryClient.invalidateQueries({ queryKey: ['conversations'] }) }}
                    className={cn(
                      'flex items-center gap-3 w-full px-3 py-3 text-left transition-all border-b border-border/40',
                      isActive ? 'bg-primary/8 border-l-2 border-l-primary' : 'hover:bg-muted/40'
                    )}
                  >
                    {/* Avatar */}
                    <div className="relative shrink-0">
                      {isGroup ? (
                        <div className="h-10 w-10 rounded-full bg-gradient-to-br from-violet-400 to-purple-600 flex items-center justify-center">
                          <Users className="h-5 w-5 text-white" />
                        </div>
                      ) : (
                        <div className={cn('h-10 w-10 rounded-full bg-gradient-to-br flex items-center justify-center text-white text-xs font-bold', getAvatarColor(conv.id))}>
                          {getInitials(displayName)}
                        </div>
                      )}
                      <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full bg-emerald-500 border-2 border-background" />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-baseline justify-between gap-1">
                        <p className={cn('text-sm font-medium truncate', isActive && 'text-primary')}>{displayName}</p>
                        {conv.last_message_at && (
                          <span className="text-[10px] text-muted-foreground/60 shrink-0">
                            {formatRelativeTime(conv.last_message_at)}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center justify-between gap-1">
                        <p className="text-xs text-muted-foreground truncate">{conv.last_message ?? 'Sin mensajes'}</p>
                        {conv.unread_count > 0 && (
                          <span className="h-4.5 min-w-[1.1rem] px-1 rounded-full bg-primary text-primary-foreground text-[10px] font-bold flex items-center justify-center shrink-0">
                            {conv.unread_count}
                          </span>
                        )}
                      </div>
                    </div>
                  </button>
                )
              })
            )}
          </div>
        </div>

        {/* ── Chat panel ── */}
        {activeConvId && activeConv ? (
          <div className="flex-1 flex flex-col min-w-0">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-background/80 backdrop-blur-sm">
              <div className="flex items-center gap-3">
                {activeConv.type === 'group' ? (
                  <div className="h-9 w-9 rounded-full bg-gradient-to-br from-violet-400 to-purple-600 flex items-center justify-center">
                    <Users className="h-4 w-4 text-white" />
                  </div>
                ) : (
                  <div className={cn('h-9 w-9 rounded-full bg-gradient-to-br flex items-center justify-center text-white text-xs font-bold', getAvatarColor(activeConvId))}>
                    {getInitials(activeConv.title ?? 'Chat')}
                  </div>
                )}
                <div>
                  <p className="text-sm font-semibold">{activeConv.title ?? (activeConv.type === 'group' ? 'Grupo' : 'Conversación')}</p>
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 inline-block" />
                    {activeConv.type === 'group' ? 'Grupo' : 'Chat directo'}
                  </p>
                </div>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center">
                  <MessageSquare className="h-12 w-12 text-muted-foreground/20 mb-3" />
                  <p className="text-sm text-muted-foreground">Sé el primero en enviar un mensaje</p>
                </div>
              ) : (
                messages.map((msg, idx) => {
                  const isMine = msg.sender_id === currentUserId
                  const prevMsg = messages[idx - 1]
                  const showName = activeConv.type === 'group' && !isMine &&
                    (!prevMsg || prevMsg.sender_id !== msg.sender_id)
                  return <MessageBubble key={msg.id} msg={msg} isMine={isMine} showName={showName} />
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="px-4 py-3 border-t border-border bg-background">
              <div className="flex items-center gap-2">
                <Input
                  ref={inputRef}
                  className="flex-1 rounded-xl"
                  placeholder="Escribe un mensaje... (Enter para enviar)"
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  onKeyDown={handleKey}
                />
                <Button
                  size="icon"
                  disabled={!draft.trim() || sendMutation.isPending}
                  onClick={handleSend}
                  className="rounded-xl shrink-0"
                  aria-label="Enviar"
                >
                  <Send className={cn('h-4 w-4 transition-transform', draft.trim() && 'translate-x-0.5 -translate-y-0.5')} />
                </Button>
              </div>
            </div>
          </div>
        ) : (
          /* Empty state */
          <div className="flex-1 flex flex-col items-center justify-center text-center bg-muted/10 p-8">
            <div className="h-20 w-20 rounded-3xl bg-gradient-to-br from-sky-100 to-indigo-100 dark:from-sky-900/30 dark:to-indigo-900/30 flex items-center justify-center mb-5">
              <MessageSquare className="h-10 w-10 text-primary/60" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Tus mensajes</h3>
            <p className="text-sm text-muted-foreground max-w-xs">
              Selecciona una conversación del panel izquierdo o inicia una nueva
            </p>
            <Button className="mt-5" onClick={() => setNewOpen(true)}>
              <Plus className="h-4 w-4 mr-1.5" /> Nueva conversación
            </Button>
          </div>
        )}
      </div>

      <NewConversationDialog
        open={newOpen}
        onClose={() => setNewOpen(false)}
        onSuccess={(id) => { setActiveConvId(id); queryClient.invalidateQueries({ queryKey: ['conversations'] }) }}
      />
    </div>
  )
}
