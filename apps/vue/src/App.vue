<script setup lang="ts">
import { watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useLocale } from 'vuetify'
import ToastHost from '@/components/ToastHost.vue'
import { useUiStore } from '@/stores/ui'

const ui = useUiStore()
const { locale } = useI18n()
const vuetifyLocale = useLocale()

// Keep vue-i18n, Vuetify and the <html lang> attribute in sync with the store.
watch(
  () => ui.locale,
  (l) => {
    locale.value = l
    vuetifyLocale.current.value = l
    document.documentElement.lang = l
  },
  { immediate: true },
)
</script>

<template>
  <v-app :theme="ui.theme">
    <router-view />
    <ToastHost />
  </v-app>
</template>
