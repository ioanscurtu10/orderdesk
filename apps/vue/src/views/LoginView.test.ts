import { flushPromises, mount } from '@vue/test-utils'
import { defineComponent, h } from 'vue'
import { VApp } from 'vuetify/components'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createRouter, createMemoryHistory } from 'vue-router'
import { authApi } from '@/api'
import { useAuthStore } from '@/stores/auth'
import LoginView from './LoginView.vue'

vi.mock('@/api', () => ({
  authApi: { login: vi.fn() },
}))

// VMain needs the layout that VApp provides, so wrap the view the same way the app does.
const Host = defineComponent({ render: () => h(VApp, () => h(LoginView)) })

function makeRouter() {
  return createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/login', name: 'login', component: LoginView },
      { path: '/dashboard', name: 'dashboard', component: { template: '<div>dash</div>' } },
    ],
  })
}

describe('LoginView', () => {
  beforeEach(() => {
    vi.mocked(authApi.login).mockReset()
  })

  it('fills the form from a demo account and signs in', async () => {
    const router = makeRouter()
    await router.push('/login')
    vi.mocked(authApi.login).mockResolvedValue({
      token: 't',
      user: { id: 'u', email: 'admin@orderdesk.dev', name: 'Ana', role: 'admin' },
      expiresAt: Date.now() + 60_000,
    })
    const w = mount(Host, { global: { plugins: [router] } })

    await w.find('[data-testid="use-admin"]').trigger('click')
    expect((w.find('[data-testid="login-email"] input').element as HTMLInputElement).value).toBe(
      'admin@orderdesk.dev',
    )

    await w.find('form').trigger('submit')
    await flushPromises()

    expect(authApi.login).toHaveBeenCalledWith({
      email: 'admin@orderdesk.dev',
      password: 'admin123',
    })
    expect(useAuthStore().isAuthenticated).toBe(true)
    expect(router.currentRoute.value.name).toBe('dashboard')
  })

  it('shows an error on invalid credentials', async () => {
    const router = makeRouter()
    await router.push('/login')
    vi.mocked(authApi.login).mockRejectedValue({ response: { status: 401 } })
    const w = mount(Host, { global: { plugins: [router] } })

    await w.find('[data-testid="use-viewer"]').trigger('click')
    await w.find('form').trigger('submit')
    await flushPromises()

    expect(w.find('[data-testid="login-error"]').text()).toBe('Invalid email or password.')
    expect(useAuthStore().isAuthenticated).toBe(false)
  })
})
