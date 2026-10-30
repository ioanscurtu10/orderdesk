<script setup lang="ts">
import type { OrderTotals } from '@orderdesk/shared'
import { useFormat } from '@/composables/useFormat'

defineProps<{ totals: OrderTotals }>()
const fmt = useFormat()
</script>

<template>
  <v-card class="pa-4 od-tabular" data-testid="order-totals">
    <div class="d-flex justify-space-between text-body-2 mb-1">
      <span class="text-medium-emphasis">{{ $t('order.totals.subtotal') }}</span>
      <span>{{ fmt.money(totals.subtotal) }}</span>
    </div>
    <div class="d-flex justify-space-between text-body-2 mb-2">
      <span class="text-medium-emphasis">{{
        $t('order.totals.vat', { rate: totals.vatRate })
      }}</span>
      <span>{{ fmt.money(totals.vatAmount) }}</span>
    </div>
    <v-divider class="mb-2" />
    <div class="d-flex justify-space-between text-h6">
      <span>{{ $t('order.totals.total') }}</span>
      <span data-testid="totals-total">{{ fmt.money(totals.total) }}</span>
    </div>
  </v-card>
</template>
