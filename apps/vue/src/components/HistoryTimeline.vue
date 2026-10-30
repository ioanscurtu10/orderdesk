<script setup lang="ts">
import type { OrderHistoryEntry } from '@orderdesk/shared'
import { useFormat } from '@/composables/useFormat'

defineProps<{ entries: OrderHistoryEntry[] }>()
const fmt = useFormat()

const icons: Record<OrderHistoryEntry['action'], string> = {
  created: 'mdi-plus-circle-outline',
  updated: 'mdi-pencil-outline',
  status_changed: 'mdi-swap-horizontal',
  imported: 'mdi-file-upload-outline',
}
const colors: Record<OrderHistoryEntry['action'], string> = {
  created: 'success',
  updated: 'primary',
  status_changed: 'warning',
  imported: 'secondary',
}
</script>

<template>
  <v-timeline side="end" density="compact" align="start" data-testid="history-timeline">
    <v-timeline-item
      v-for="h in entries"
      :key="h.id"
      :dot-color="colors[h.action]"
      :icon="icons[h.action]"
      size="small"
    >
      <div class="d-flex flex-wrap ga-2 align-baseline">
        <span class="font-weight-medium">{{ $t(`order.history.${h.action}`) }}</span>
        <span class="text-caption text-medium-emphasis"
          >{{ fmt.dateTime(h.at) }} · {{ $t('order.history.by', { name: h.userName }) }}</span
        >
      </div>
      <div class="text-body-2">{{ h.details }}</div>
    </v-timeline-item>
  </v-timeline>
</template>
