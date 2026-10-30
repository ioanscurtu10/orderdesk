<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useDisplay } from 'vuetify'
import { useAuthStore } from '@/stores/auth'
import { useUiStore } from '@/stores/ui'

const auth = useAuthStore()
const ui = useUiStore()
const router = useRouter()
const { mobile } = useDisplay()
const drawer = ref(!mobile.value)

const navItems = computed(() => [
  {
    to: { name: 'dashboard' },
    icon: 'mdi-view-dashboard-outline',
    title: 'nav.dashboard',
    testid: 'nav-dashboard',
  },
  {
    to: { name: 'orders' },
    icon: 'mdi-clipboard-list-outline',
    title: 'nav.orders',
    testid: 'nav-orders',
  },
  ...(auth.isAdmin
    ? [
        {
          to: { name: 'import' },
          icon: 'mdi-file-upload-outline',
          title: 'nav.import',
          testid: 'nav-import',
        },
      ]
    : []),
])

function signOut(): void {
  auth.logout()
  void router.push({ name: 'login' })
}
</script>

<template>
  <v-navigation-drawer v-model="drawer" :temporary="mobile" :rail="false" width="240">
    <div class="d-flex align-center ga-2 px-4 py-4">
      <v-avatar color="primary" size="32" rounded="lg">
        <v-icon icon="mdi-format-list-checks" size="20" />
      </v-avatar>
      <div>
        <div class="font-weight-bold">{{ $t('app.name') }}</div>
        <div class="text-caption text-medium-emphasis">Vue 3 · Vuetify</div>
      </div>
    </div>
    <v-list nav density="comfortable">
      <v-list-item
        v-for="item in navItems"
        :key="item.title"
        :to="item.to"
        :prepend-icon="item.icon"
        :title="$t(item.title)"
        :data-testid="item.testid"
        rounded="lg"
      />
    </v-list>
    <template #append>
      <div class="pa-3 text-caption text-medium-emphasis">
        {{ auth.user?.name }} · {{ auth.user?.role }}
      </div>
    </template>
  </v-navigation-drawer>

  <v-app-bar flat border="b" density="comfortable">
    <v-app-bar-nav-icon v-if="mobile" :aria-label="$t('nav.dashboard')" @click="drawer = !drawer" />
    <v-app-bar-title class="text-body-1 font-weight-medium">
      {{ $route.meta.titleKey ? $t($route.meta.titleKey) : $t('app.name') }}
    </v-app-bar-title>
    <v-spacer />

    <v-btn-toggle
      :model-value="ui.locale"
      density="compact"
      variant="outlined"
      divided
      mandatory
      class="mr-2"
      :aria-label="$t('app.language')"
      @update:model-value="(v) => v && ui.setLocale(v)"
    >
      <v-btn value="ro" size="small" data-testid="lang-ro">RO</v-btn>
      <v-btn value="en" size="small" data-testid="lang-en">EN</v-btn>
    </v-btn-toggle>

    <v-btn
      :icon="ui.theme === 'dark' ? 'mdi-weather-sunny' : 'mdi-weather-night'"
      :aria-label="ui.theme === 'dark' ? $t('app.lightMode') : $t('app.darkMode')"
      data-testid="theme-toggle"
      @click="ui.toggleTheme()"
    />

    <v-menu>
      <template #activator="{ props }">
        <v-btn v-bind="props" icon data-testid="user-menu" :aria-label="auth.user?.name ?? ''">
          <v-avatar color="secondary" size="32">
            <span class="text-caption font-weight-bold">{{ auth.user?.name?.slice(0, 1) }}</span>
          </v-avatar>
        </v-btn>
      </template>
      <v-list density="compact" min-width="200">
        <v-list-item :title="auth.user?.name" :subtitle="auth.user?.email" />
        <v-divider />
        <v-list-item
          prepend-icon="mdi-logout"
          :title="$t('app.signOut')"
          data-testid="sign-out"
          @click="signOut"
        />
      </v-list>
    </v-menu>
  </v-app-bar>

  <v-main>
    <v-container fluid class="od-page pa-4 pa-md-6">
      <router-view />
    </v-container>
  </v-main>
</template>
