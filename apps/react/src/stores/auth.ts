import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { AuthResponse, User } from '@orderdesk/shared'

interface AuthState {
  token: string | null
  user: User | null
  expiresAt: number
  /** Set when the API answered 401 so the login page can explain why. */
  logoutReason: 'expired' | null
  setSession: (res: AuthResponse) => void
  logout: (reason?: 'expired' | null) => void
}

/**
 * Who is signed in. Persisted with zustand/middleware so a refresh keeps the session.
 * Token expiry is enforced server-side; the client only pre-checks to avoid a useless request.
 */
export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      user: null,
      expiresAt: 0,
      logoutReason: null,
      setSession: (res) =>
        set({ token: res.token, user: res.user, expiresAt: res.expiresAt, logoutReason: null }),
      logout: (reason = null) =>
        set({ token: null, user: null, expiresAt: 0, logoutReason: reason }),
    }),
    {
      name: 'orderdesk.auth',
      partialize: (s) => ({ token: s.token, user: s.user, expiresAt: s.expiresAt }),
    },
  ),
)

/** Derived selectors, kept outside the store so components subscribe to the minimum. */
export const selectIsAuthenticated = (s: AuthState): boolean =>
  !!s.token && s.expiresAt > Date.now()
export const selectIsAdmin = (s: AuthState): boolean => s.user?.role === 'admin'
