import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { format, formatDistanceToNow, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(date: string | Date, fmt = 'dd/MM/yyyy') {
  const d = typeof date === 'string' ? parseISO(date) : date
  return format(d, fmt, { locale: es })
}

export function formatDateTime(date: string | Date) {
  const d = typeof date === 'string' ? parseISO(date) : date
  return format(d, "dd/MM/yyyy 'a las' HH:mm", { locale: es })
}

export function formatRelativeTime(date: string | Date) {
  const d = typeof date === 'string' ? parseISO(date) : date
  return formatDistanceToNow(d, { addSuffix: true, locale: es })
}

export function formatCurrency(amount: number, currency = 'COP') {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

export function formatNumber(n: number) {
  return new Intl.NumberFormat('es-CO').format(n)
}

export function getInitials(name: string) {
  return name
    .split(' ')
    .slice(0, 2)
    .map((n) => n[0])
    .join('')
    .toUpperCase()
}

export function getStatusColor(status: string): string {
  const map: Record<string, string> = {
    pending: 'text-yellow-600 bg-yellow-50 border-yellow-200 dark:bg-yellow-900/20 dark:text-yellow-400',
    confirmed: 'text-blue-600 bg-blue-50 border-blue-200 dark:bg-blue-900/20 dark:text-blue-400',
    in_progress: 'text-purple-600 bg-purple-50 border-purple-200 dark:bg-purple-900/20 dark:text-purple-400',
    completed: 'text-green-600 bg-green-50 border-green-200 dark:bg-green-900/20 dark:text-green-400',
    cancelled: 'text-red-600 bg-red-50 border-red-200 dark:bg-red-900/20 dark:text-red-400',
    no_show: 'text-gray-600 bg-gray-50 border-gray-200 dark:bg-gray-900/20 dark:text-gray-400',
    active: 'text-green-600 bg-green-50 border-green-200 dark:bg-green-900/20 dark:text-green-400',
    inactive: 'text-gray-600 bg-gray-50 border-gray-200',
    paid: 'text-green-600 bg-green-50 border-green-200 dark:bg-green-900/20 dark:text-green-400',
    draft: 'text-gray-600 bg-gray-50 border-gray-200',
    sent: 'text-blue-600 bg-blue-50 border-blue-200 dark:bg-blue-900/20 dark:text-blue-400',
    overdue: 'text-red-600 bg-red-50 border-red-200 dark:bg-red-900/20 dark:text-red-400',
    open: 'text-blue-600 bg-blue-50 border-blue-200',
    closed: 'text-green-600 bg-green-50 border-green-200',
    scheduled: 'text-sky-600 bg-sky-50 border-sky-200 dark:bg-sky-900/20 dark:text-sky-400',
  }
  return map[status] ?? 'text-gray-600 bg-gray-50 border-gray-200'
}

export function getStatusLabel(status: string): string {
  const map: Record<string, string> = {
    pending: 'Pendiente',
    confirmed: 'Confirmada',
    in_progress: 'En progreso',
    completed: 'Completada',
    cancelled: 'Cancelada',
    no_show: 'No asistió',
    active: 'Activo',
    inactive: 'Inactivo',
    paid: 'Pagado',
    draft: 'Borrador',
    sent: 'Enviado',
    overdue: 'Vencido',
    open: 'Abierta',
    closed: 'Cerrada',
    presencial: 'Presencial',
    virtual: 'Virtual',
    scheduled: 'Programada',
    dispensed: 'Dispensada',
    expired: 'Expirada',
  }
  return map[status] ?? status
}

export function getGenderLabel(gender: string) {
  const map: Record<string, string> = { M: 'Masculino', F: 'Femenino', O: 'Otro' }
  return map[gender] ?? gender
}

export function truncate(str: string, length = 50) {
  return str.length > length ? str.slice(0, length) + '…' : str
}

export function calculateAge(dob: string) {
  const birth = new Date(dob)
  const today = new Date()
  let age = today.getFullYear() - birth.getFullYear()
  const m = today.getMonth() - birth.getMonth()
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--
  return age
}
