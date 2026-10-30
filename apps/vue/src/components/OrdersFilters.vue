<script setup lang="ts">
import { ref, watch } from 'vue'
import { ORDER_STATUSES, statusColors, type OrderQuery, type OrderStatus } from '@orderdesk/shared'
import { useDebounceFn } from '@/composables/useDebounceFn'

const props = defineProps<{ query: OrderQuery }>()
const emit = defineEmits<{ change: [patch: Partial<OrderQuery>]; reset: [] }>()

// Local copies so typing does not hit the router on every keystroke.
const q = ref(props.query.q ?? '')
const status = ref<OrderStatus[]>(props.query.status ?? [])
const dateFrom = ref(props.query.dateFrom ?? '')
const dateTo = ref(props.query.dateTo ?? '')
const minTotal = ref(props.query.minTotal?.toString() ?? '')
const maxTotal = ref(props.query.maxTotal?.toString() ?? '')

watch(
  () => props.query,
  (nq) => {
    q.value = nq.q ?? ''
    status.value = nq.status ?? []
    dateFrom.value = nq.dateFrom ?? ''
    dateTo.value = nq.dateTo ?? ''
    minTotal.value = nq.minTotal?.toString() ?? ''
    maxTotal.value = nq.maxTotal?.toString() ?? ''
  },
  { deep: true },
)

// Every watcher compares against the URL-backed query first, so syncing local inputs from the
// URL (above) never bounces a redundant "change" back to the router.
const emitSearch = useDebounceFn((value: string) => {
  if ((value || undefined) !== props.query.q) emit('change', { q: value || undefined })
}, 350)
watch(q, (v) => emitSearch(v))

const emitTotals = useDebounceFn(() => {
  const min = minTotal.value === '' ? undefined : Number(minTotal.value)
  const max = maxTotal.value === '' ? undefined : Number(maxTotal.value)
  const nextMin = Number.isFinite(min) ? min : undefined
  const nextMax = Number.isFinite(max) ? max : undefined
  if (nextMin !== props.query.minTotal || nextMax !== props.query.maxTotal) {
    emit('change', { minTotal: nextMin, maxTotal: nextMax })
  }
}, 400)
watch([minTotal, maxTotal], () => emitTotals())

watch(status, (v) => {
  if (v.join(',') !== (props.query.status ?? []).join(','))
    emit('change', { status: v.length ? v : undefined })
})
watch(dateFrom, (v) => {
  if ((v || undefined) !== props.query.dateFrom) emit('change', { dateFrom: v || undefined })
})
watch(dateTo, (v) => {
  if ((v || undefined) !== props.query.dateTo) emit('change', { dateTo: v || undefined })
})
</script>

<template>
  <v-row dense align="center">
    <v-col cols="12" md="6" lg="4">
      <v-text-field
        v-model="q"
        :placeholder="$t('orders.searchPlaceholder')"
        prepend-inner-icon="mdi-magnify"
        clearable
        density="compact"
        data-testid="filter-search"
      />
    </v-col>
    <v-col cols="12" md="6" lg="3">
      <v-select
        v-model="status"
        :items="ORDER_STATUSES.map((s) => ({ value: s, title: $t(`status.${s}`) }))"
        :label="$t('orders.filters.status')"
        multiple
        chips
        closable-chips
        clearable
        density="compact"
        data-testid="filter-status"
      >
        <template #chip="{ item, props: chipProps }">
          <v-chip
            v-bind="chipProps"
            :color="statusColors[item.value as OrderStatus]"
            size="small"
            variant="tonal"
            label
          >
            {{ item.title }}
          </v-chip>
        </template>
      </v-select>
    </v-col>
    <v-col cols="6" md="3" lg="2">
      <v-text-field
        v-model="dateFrom"
        type="date"
        :label="$t('orders.filters.dateFrom')"
        density="compact"
        clearable
        data-testid="filter-date-from"
      />
    </v-col>
    <v-col cols="6" md="3" lg="2">
      <v-text-field
        v-model="dateTo"
        type="date"
        :label="$t('orders.filters.dateTo')"
        density="compact"
        clearable
        data-testid="filter-date-to"
      />
    </v-col>
    <v-col cols="6" md="3" lg="2">
      <v-text-field
        v-model="minTotal"
        type="number"
        :label="$t('orders.filters.minTotal')"
        density="compact"
        data-testid="filter-min-total"
      />
    </v-col>
    <v-col cols="6" md="3" lg="2">
      <v-text-field
        v-model="maxTotal"
        type="number"
        :label="$t('orders.filters.maxTotal')"
        density="compact"
        data-testid="filter-max-total"
      />
    </v-col>
    <v-col cols="12" lg="auto" class="d-flex justify-end ml-auto">
      <v-btn
        variant="text"
        size="small"
        prepend-icon="mdi-filter-remove-outline"
        data-testid="filter-reset"
        @click="emit('reset')"
      >
        {{ $t('app.reset') }}
      </v-btn>
    </v-col>
  </v-row>
</template>
