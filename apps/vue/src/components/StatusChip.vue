<script setup lang="ts">
import { statusColors, type OrderStatus } from '@orderdesk/shared'

defineProps<{ status: OrderStatus; size?: 'x-small' | 'small' | 'default' }>()
</script>

<template>
  <v-chip
    :color="statusColors[status]"
    :size="size ?? 'small'"
    variant="tonal"
    label
    class="font-weight-medium"
    :data-testid="`status-chip-${status}`"
  >
    {{ $t(`status.${status}`) }}
  </v-chip>
</template>
