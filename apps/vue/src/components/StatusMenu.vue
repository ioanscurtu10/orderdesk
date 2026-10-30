<script setup lang="ts">
import { ORDER_STATUSES, statusColors, type OrderStatus } from '@orderdesk/shared'

defineProps<{ label: string; disabled?: boolean; loading?: boolean; current?: OrderStatus }>()
const emit = defineEmits<{ select: [status: OrderStatus] }>()
</script>

<template>
  <v-menu>
    <template #activator="{ props }">
      <v-btn
        v-bind="props"
        variant="outlined"
        prepend-icon="mdi-swap-horizontal"
        :disabled="disabled"
        :loading="loading"
        data-testid="status-menu"
      >
        {{ label }}
      </v-btn>
    </template>
    <v-list density="compact">
      <v-list-item
        v-for="s in ORDER_STATUSES"
        :key="s"
        :disabled="s === current"
        :data-testid="`status-option-${s}`"
        @click="emit('select', s)"
      >
        <template #prepend>
          <v-icon icon="mdi-circle" size="12" :color="statusColors[s]" />
        </template>
        <v-list-item-title>{{ $t(`status.${s}`) }}</v-list-item-title>
      </v-list-item>
    </v-list>
  </v-menu>
</template>
