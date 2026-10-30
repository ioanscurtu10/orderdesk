import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import type { AuthResponse, User } from '@orderdesk/shared'
import { loadJson, removeKey, saveJson } from '@/utils/storage'

const KEY = 'orderdesk.auth'

interface Persisted {
  token: string
  user: User
  expiresAt: number
}

/**
 * Who is signed in. Persisted so a refresh keeps the session.
 * Token expiry is enforced server-side; the client only pre-checks to avoid a useless request.
 */
export const useAuthStore = defineStore('auth', () => {
  const persisted = loadJson<Persisted | null>(KEY, null)
  const token = ref<string | null>(persisted?.token ?? null)
  const user = ref<User | null>(persisted?.user ?? null)
  const expiresAt = ref<number>(persisted?.expiresAt ?? 0)
  /** Set when the API answered 401 so the login page can explain why. */
  const logoutReason = ref<'expired' | null>(null)

  const isAuthenticated = computed(() => !!token.value && expiresAt.value > Date.now())
  const isAdmin = computed(() => user.value?.role === 'admin')

  function setSession(res: AuthResponse): void {
    token.value = res.token
    user.value = res.user
    expiresAt.value = res.expiresAt
    logoutReason.value = null
    saveJson(KEY, {
      token: res.token,
      user: res.user,
      expiresAt: res.expiresAt,
    } satisfies Persisted)
  }

  function logout(reason: 'expired' | null = null): void {
    token.value = null
    user.value = null
    expiresAt.value = 0
    logoutReason.value = reason
    removeKey(KEY)
  }

  return { token, user, expiresAt, logoutReason, isAuthenticated, isAdmin, setSession, logout }
})
