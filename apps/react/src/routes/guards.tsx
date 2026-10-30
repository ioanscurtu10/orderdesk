import type { ReactNode } from 'react'
import { Navigate, Outlet, useLocation } from 'react-router'
import { selectIsAdmin, selectIsAuthenticated, useAuthStore } from '@/stores/auth'

/** Redirects anonymous users to /login, remembering where they wanted to go. */
export function RequireAuth() {
  const isAuthenticated = useAuthStore(selectIsAuthenticated)
  const location = useLocation()
  if (!isAuthenticated) {
    return (
      <Navigate to="/login" replace state={{ redirect: location.pathname + location.search }} />
    )
  }
  return <Outlet />
}

export function RequireAdmin() {
  const isAdmin = useAuthStore(selectIsAdmin)
  return isAdmin ? <Outlet /> : <Navigate to="/forbidden" replace />
}

/**
 * Once signed in, leaves the login page for the location the user originally asked for
 * (remembered by <RequireAuth>) or the dashboard. This is the only post-login redirect:
 * the login page itself only stores the session.
 */
export function RedirectIfAuthenticated({ children }: { children: ReactNode }) {
  const isAuthenticated = useAuthStore(selectIsAuthenticated)
  const location = useLocation()
  const redirect = (location.state as { redirect?: string } | null)?.redirect
  if (!isAuthenticated) return <>{children}</>
  return <Navigate to={redirect && redirect.startsWith('/') ? redirect : '/dashboard'} replace />
}
