<script setup lang="ts">
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute, useRouter } from 'vue-router'
import { loginSchema } from '@orderdesk/shared'
import { authApi } from '@/api'
import { errorMessage } from '@/api/client'
import { useAuthStore } from '@/stores/auth'
import { useUiStore } from '@/stores/ui'

const { t } = useI18n()
const auth = useAuthStore()
const ui = useUiStore()
const router = useRouter()
const route = useRoute()

const email = ref('')
const password = ref('')
const loading = ref(false)
const error = ref<string | null>(null)
const expired = computed(() => auth.logoutReason === 'expired')

const demoAccounts = [
  { labelKey: 'login.demoAdmin', email: 'admin@orderdesk.dev', password: 'admin123' },
  { labelKey: 'login.demoViewer', email: 'viewer@orderdesk.dev', password: 'viewer123' },
]

const rules = {
  email: [(v: string) => loginSchema.shape.email.safeParse(v).success || t('validation.email')],
  required: [(v: string) => !!v || t('validation.required')],
}

function useAccount(a: (typeof demoAccounts)[number]): void {
  email.value = a.email
  password.value = a.password
}

async function submit(): Promise<void> {
  const parsed = loginSchema.safeParse({ email: email.value, password: password.value })
  if (!parsed.success) return
  loading.value = true
  error.value = null
  try {
    const res = await authApi.login(parsed.data)
    auth.setSession(res)
    const redirect = typeof route.query.redirect === 'string' ? route.query.redirect : null
    await router.replace(redirect && redirect.startsWith('/') ? redirect : { name: 'dashboard' })
  } catch (e) {
    const status = (e as { response?: { status?: number } })?.response?.status
    error.value = status === 401 ? t('login.invalid') : errorMessage(e)
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <v-main class="d-flex align-center justify-center" style="min-height: 100vh">
    <v-container class="d-flex justify-center">
      <v-card class="pa-6 pa-sm-8" max-width="440" width="100%">
        <div class="d-flex align-center ga-3 mb-6">
          <v-avatar color="primary" size="40" rounded="lg">
            <v-icon icon="mdi-format-list-checks" />
          </v-avatar>
          <div>
            <div class="text-h6 font-weight-bold">{{ $t('app.name') }}</div>
            <div class="text-caption text-medium-emphasis">{{ $t('app.tagline') }} · Vue 3</div>
          </div>
          <v-spacer />
          <v-btn
            :icon="ui.theme === 'dark' ? 'mdi-weather-sunny' : 'mdi-weather-night'"
            variant="text"
            size="small"
            :aria-label="$t('app.theme')"
            @click="ui.toggleTheme()"
          />
        </div>

        <h1 class="text-h5 mb-1">{{ $t('login.title') }}</h1>
        <p class="text-body-2 text-medium-emphasis mb-4">{{ $t('login.subtitle') }}</p>

        <v-alert v-if="expired" type="warning" variant="tonal" density="compact" class="mb-4">
          {{ $t('app.sessionExpired') }}
        </v-alert>

        <v-form data-testid="login-form" @submit.prevent="submit">
          <v-text-field
            v-model="email"
            :label="$t('login.email')"
            type="email"
            autocomplete="username"
            :rules="rules.email"
            prepend-inner-icon="mdi-email-outline"
            class="mb-3"
            data-testid="login-email"
          />
          <v-text-field
            v-model="password"
            :label="$t('login.password')"
            type="password"
            autocomplete="current-password"
            :rules="rules.required"
            prepend-inner-icon="mdi-lock-outline"
            class="mb-4"
            data-testid="login-password"
          />
          <v-alert
            v-if="error"
            type="error"
            variant="tonal"
            density="compact"
            class="mb-4"
            data-testid="login-error"
          >
            {{ error }}
          </v-alert>
          <v-btn
            type="submit"
            color="primary"
            block
            size="large"
            :loading="loading"
            data-testid="login-submit"
          >
            {{ $t('login.submit') }}
          </v-btn>
        </v-form>

        <v-divider class="my-5" />
        <div class="d-flex flex-column ga-2">
          <div
            v-for="a in demoAccounts"
            :key="a.email"
            class="d-flex align-center justify-space-between ga-2 text-body-2"
          >
            <div>
              <div class="font-weight-medium">{{ $t(a.labelKey) }}</div>
              <div class="od-mono text-medium-emphasis">{{ a.email }} / {{ a.password }}</div>
            </div>
            <v-btn
              size="small"
              variant="tonal"
              :data-testid="`use-${a.email.split('@')[0]}`"
              @click="useAccount(a)"
            >
              {{ $t('login.useAccount') }}
            </v-btn>
          </div>
        </div>
      </v-card>
    </v-container>
  </v-main>
</template>
