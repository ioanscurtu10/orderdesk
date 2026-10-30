<script setup lang="ts">
import { useUiStore } from '@/stores/ui'

const ui = useUiStore()
</script>

<template>
  <!-- One snackbar at a time, oldest first. Vuetify stacks poorly, so we queue instead. -->
  <v-snackbar
    v-if="ui.toasts[0]"
    :key="ui.toasts[0].id"
    :model-value="true"
    :color="ui.toasts[0].color"
    :timeout="ui.toasts[0].timeout"
    location="bottom right"
    data-testid="toast"
    @update:model-value="(v) => !v && ui.dismiss(ui.toasts[0]!.id)"
  >
    {{ ui.toasts[0].message }}
    <template #actions>
      <v-btn
        variant="text"
        icon="mdi-close"
        :aria-label="$t('app.close')"
        @click="ui.dismiss(ui.toasts[0]!.id)"
      />
    </template>
  </v-snackbar>
</template>
