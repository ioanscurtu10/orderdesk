import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { RedirectIfAuthenticated } from '@/routes/guards'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { authApi } from '@/api/endpoints'
import { selectIsAuthenticated, useAuthStore } from '@/stores/auth'
import LoginPage from './LoginPage'

vi.mock('@/api/endpoints', () => ({
  authApi: { login: vi.fn() },
}))

function renderLogin() {
  const router = createMemoryRouter(
    [
      {
        path: '/login',
        element: (
          <RedirectIfAuthenticated>
            <LoginPage />
          </RedirectIfAuthenticated>
        ),
      },
      { path: '/dashboard', element: <div>dash</div> },
    ],
    { initialEntries: ['/login'] },
  )
  render(<RouterProvider router={router} />)
  return router
}

describe('LoginPage', () => {
  beforeEach(() => {
    vi.mocked(authApi.login).mockReset()
    useAuthStore.getState().logout()
  })

  it('fills the form from a demo account and signs in', async () => {
    vi.mocked(authApi.login).mockResolvedValue({
      token: 't',
      user: { id: 'u', email: 'admin@orderdesk.dev', name: 'Ana', role: 'admin' },
      expiresAt: Date.now() + 60_000,
    })
    const router = renderLogin()
    const user = userEvent.setup()

    await user.click(screen.getByTestId('use-admin'))
    expect(screen.getByTestId('login-email')).toHaveValue('admin@orderdesk.dev')

    await user.click(screen.getByTestId('login-submit'))

    await waitFor(() =>
      expect(authApi.login).toHaveBeenCalledWith({
        email: 'admin@orderdesk.dev',
        password: 'admin123',
      }),
    )
    await waitFor(() => expect(router.state.location.pathname).toBe('/dashboard'))
    expect(selectIsAuthenticated(useAuthStore.getState())).toBe(true)
  })

  it('shows an error on invalid credentials', async () => {
    vi.mocked(authApi.login).mockRejectedValue({ isAxiosError: true, response: { status: 401 } })
    renderLogin()
    const user = userEvent.setup()

    await user.click(screen.getByTestId('use-viewer'))
    await user.click(screen.getByTestId('login-submit'))

    expect(await screen.findByTestId('login-error')).toHaveTextContent('Invalid email or password.')
    expect(selectIsAuthenticated(useAuthStore.getState())).toBe(false)
  })
})
