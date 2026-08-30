/**
 * Auth store using Zustand
 */
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import api from '@/lib/api'

interface AuthUser {
  id: number
  email: string
  first_name: string
  last_name: string
  role: string
  role_id: number
  avatar_url?: string | null
}

interface AuthState {
  user: AuthUser | null
  isAuthenticated: boolean
  isLoading: boolean
  requestCode: (identifier: string) => Promise<void>
  verifyCode: (identifier: string, code: string) => Promise<void>
  registerUser: (data: any) => Promise<void>
  logout: () => Promise<void>
  setUser: (user: AuthUser) => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      isAuthenticated: false,
      isLoading: false,

      requestCode: async (identifier) => {
        set({ isLoading: true })
        try {
          await api.post('/auth/request-code', { identifier })
          set({ isLoading: false })
        } catch (err) {
          set({ isLoading: false })
          throw err
        }
      },

      verifyCode: async (identifier, code) => {
        set({ isLoading: true })
        try {
          const { data } = await api.post('/auth/verify-code', { identifier, code })
          localStorage.setItem('access_token', data.access_token)
          localStorage.setItem('refresh_token', data.refresh_token)
          set({ user: data.user, isAuthenticated: true, isLoading: false })
        } catch (err) {
          set({ isLoading: false })
          throw err
        }
      },

      registerUser: async (userData) => {
        set({ isLoading: true })
        try {
          await api.post('/auth/register', userData)
          // The backend automatically sends an OTP code after registration.
          // The UI will transition to the verify code screen.
          set({ isLoading: false })
        } catch (err) {
          set({ isLoading: false })
          throw err
        }
      },

      logout: async () => {
        try {
          await api.post('/auth/logout')
        } catch { /* ignore */ }
        localStorage.removeItem('access_token')
        localStorage.removeItem('refresh_token')
        set({ user: null, isAuthenticated: false })
      },

      setUser: (user) => set({ user, isAuthenticated: true }),
    }),
    {
      name: 'telemedicina-auth',
      partialize: (state) => ({ user: state.user, isAuthenticated: state.isAuthenticated }),
    }
  )
)
