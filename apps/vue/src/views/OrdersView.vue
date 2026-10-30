<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute, useRouter } from 'vue-router'
import {
  DEFAULT_ORDER_QUERY,
  orderQueryFromParams,
  orderQueryToParams,
  type OrderListItem,
  type OrderQuery,
  type OrderSortField,
  type OrderStatus,
} from '@orderdesk/shared'
import { downloadBlob, exportOrdersXlsx } from '@orderdesk/shared/browser'
import { ordersApi } from '@/api'
import { errorMessage } from '@/api/client'
import ColumnsMenu from '@/components/ColumnsMenu.vue'
import ConfirmDialog from '@/components/ConfirmDialog.vue'
import EmptyState from '@/components/EmptyState.vue'
import ErrorState from '@/components/ErrorState.vue'
import OrdersFilters from '@/components/OrdersFilters.vue'
import StatusChip from '@/components/StatusChip.vue'
import StatusMenu from '@/components/StatusMenu.vue'
import { useFormat } from '@/composables/useFormat'
import { useAuthStore } from '@/stores/auth'
import { useOrdersStore } from '@/stores/orders'
import { useUiStore } from '@/stores/ui'

const { t } = useI18n()
const route = useRoute()
const router = useRouter()
const store = useOrdersStore()
const auth = useAuthStore()
const ui = useUiStore()
const fmt = useFormat()

// ---- query state: the URL is the single source of truth ----------------------
const query = computed<OrderQuery>(() =>
  orderQueryFromParams(route.query as Record<string, string | string[]>),
)

function update(patch: Partial<OrderQuery>, resetPage = true): void {
  const next: OrderQuery = { ...query.value, ...patch }
  if (resetPage) next.page = 1
  void router.replace({ query: orderQueryToParams(next) })
}

const selected = ref<string[]>([])

watch(
  query,
  (q) => {
    selected.value = []
    void store.fetch(q)
  },
  { immediate: true, deep: true },
)

// ---- columns -----------------------------------------------------------------
interface Column {
  key: OrderSortField | 'vatAmount' | 'subtotal' | 'actions'
  align?: 'start' | 'end'
  width?: number | string
  sortable?: boolean
}
const allColumns: Column[] = [
  { key: 'number', width: 150 },
  { key: 'customerName' },
  { key: 'status', width: 130 },
  { key: 'orderDate', width: 130 },
  { key: 'dueDate', width: 130 },
  { key: 'lineCount', align: 'end', width: 90 },
  { key: 'subtotal', align: 'end', width: 130, sortable: false },
  { key: 'vatAmount', align: 'end', width: 120, sortable: false },
  { key: 'total', align: 'end', width: 140 },
  { key: 'updatedAt', width: 160 },
  { key: 'actions', align: 'end', width: 90, sortable: false },
]
const defaultVisible = [
  'number',
  'customerName',
  'status',
  'orderDate',
  'dueDate',
  'lineCount',
  'total',
  'actions',
]
const visible = computed(() => ui.ordersColumns ?? defaultVisible)
const columnChoices = computed(() =>
  allColumns
    .filter((c) => c.key !== 'actions')
    .map((c) => ({ key: c.key, title: t(`orders.columns.${c.key}`) })),
)
function toggleColumn(key: string): void {
  const next = visible.value.includes(key)
    ? visible.value.filter((k) => k !== key)
    : [...visible.value, key]
  ui.setOrdersColumns(next)
}
const headers = computed(() =>
  allColumns
    .filter((c) => visible.value.includes(c.key))
    .map((c) => ({
      key: c.key,
      title: t(`orders.columns.${c.key}`),
      align: c.align ?? 'start',
      width: c.width,
      sortable: c.sortable ?? true,
    })),
)

// ---- table bindings -----------------------------------------------------------
const sortBy = computed(() => [{ key: query.value.sortBy, order: query.value.sortDir }])
function onSort(items: Array<{ key: string; order?: 'asc' | 'desc' | boolean }>): void {
  const first = items[0]
  if (!first)
    return update({ sortBy: DEFAULT_ORDER_QUERY.sortBy, sortDir: DEFAULT_ORDER_QUERY.sortDir })
  update({ sortBy: first.key as OrderSortField, sortDir: first.order === 'asc' ? 'asc' : 'desc' })
}

const itemsPerPageOptions = [10, 25, 50, 100].map((n) => ({ value: n, title: String(n) }))

function openOrder(item: OrderListItem): void {
  void router.push({ name: 'order-detail', params: { id: item.id } })
}

// ---- bulk actions --------------------------------------------------------------
const busy = ref(false)
const confirmDelete = ref(false)

async function bulkStatus(status: OrderStatus): Promise<void> {
  busy.value = true
  try {
    const n = await store.bulkStatus(selected.value, status)
    ui.notify(t('orders.bulk.statusUpdated', { count: n }), 'success')
    selected.value = []
    await store.refresh()
  } catch (e) {
    ui.notify(errorMessage(e), 'error')
  } finally {
    busy.value = false
  }
}

async function bulkDelete(): Promise<void> {
  busy.value = true
  try {
    const n = await store.bulkDelete(selected.value)
    ui.notify(t('orders.bulk.deleted', { count: n }), 'success')
    selected.value = []
    confirmDelete.value = false
  } catch (e) {
    ui.notify(errorMessage(e), 'error')
  } finally {
    busy.value = false
  }
}

// ---- export ----------------------------------------------------------------------
const exporting = ref(false)
async function exportCsv(): Promise<void> {
  exporting.value = true
  try {
    const blob = await ordersApi.exportCsv(query.value)
    downloadBlob(blob, `orders-${new Date().toISOString().slice(0, 10)}.csv`)
    ui.notify(t('orders.exportDone'), 'success')
  } catch (e) {
    ui.notify(errorMessage(e), 'error')
  } finally {
    exporting.value = false
  }
}
async function exportXlsx(): Promise<void> {
  exporting.value = true
  try {
    const rows = await ordersApi.exportJson(query.value)
    const subset = selected.value.length ? rows.filter((r) => selected.value.includes(r.id)) : rows
    await exportOrdersXlsx(subset, `orders-${new Date().toISOString().slice(0, 10)}.xlsx`)
    ui.notify(t('orders.exportDone'), 'success')
  } catch (e) {
    ui.notify(errorMessage(e), 'error')
  } finally {
    exporting.value = false
  }
}
async function copyLink(): Promise<void> {
  await navigator.clipboard.writeText(window.location.href)
  ui.notify(t('app.copied'), 'info', 2000)
}
</script>

<template>
  <div data-testid="orders-page">
    <div class="d-flex flex-wrap align-center ga-2 mb-4">
      <h1 class="text-h5 font-weight-bold">{{ $t('orders.title') }}</h1>
      <span class="text-medium-emphasis text-body-2 mr-auto" data-testid="orders-count">
        {{ $t('orders.count', { count: fmt.number(store.total) }) }}
      </span>

      <ColumnsMenu :columns="columnChoices" :visible="visible" @toggle="toggleColumn" />

      <v-menu>
        <template #activator="{ props }">
          <v-btn
            v-bind="props"
            variant="outlined"
            prepend-icon="mdi-download-outline"
            :loading="exporting"
            data-testid="export-menu"
          >
            {{ $t('app.export') }}
          </v-btn>
        </template>
        <v-list density="compact">
          <v-list-item
            prepend-icon="mdi-file-delimited-outline"
            :title="$t('orders.exportCsv')"
            data-testid="export-csv"
            @click="exportCsv"
          />
          <v-list-item
            prepend-icon="mdi-file-excel-outline"
            :title="$t('orders.exportXlsx')"
            data-testid="export-xlsx"
            @click="exportXlsx"
          />
          <v-divider />
          <v-list-item
            prepend-icon="mdi-link-variant"
            :title="$t('orders.copyLink')"
            @click="copyLink"
          />
        </v-list>
      </v-menu>

      <v-btn
        v-if="auth.isAdmin"
        color="primary"
        prepend-icon="mdi-plus"
        :to="{ name: 'order-new' }"
        data-testid="new-order"
      >
        {{ $t('orders.new') }}
      </v-btn>
    </div>

    <v-card class="pa-4 mb-4">
      <OrdersFilters
        :query="query"
        @change="(p) => update(p)"
        @reset="router.replace({ query: {} })"
      />
    </v-card>

    <v-expand-transition>
      <v-card
        v-if="selected.length"
        class="pa-3 mb-4 d-flex flex-wrap align-center ga-3"
        color="primary"
        variant="tonal"
        data-testid="bulk-bar"
      >
        <span class="font-weight-medium">{{
          $t('orders.selected', { count: selected.length })
        }}</span>
        <v-spacer />
        <template v-if="auth.isAdmin">
          <StatusMenu
            :label="$t('orders.bulk.changeStatus')"
            :loading="busy"
            @select="bulkStatus"
          />
          <v-btn
            color="error"
            variant="outlined"
            prepend-icon="mdi-delete-outline"
            :disabled="busy"
            data-testid="bulk-delete"
            @click="confirmDelete = true"
          >
            {{ $t('orders.bulk.delete') }}
          </v-btn>
        </template>
        <v-btn
          variant="text"
          icon="mdi-close"
          :aria-label="$t('app.close')"
          @click="selected = []"
        />
      </v-card>
    </v-expand-transition>

    <ErrorState v-if="store.error" :message="store.error" @retry="store.refresh()" />

    <v-card v-else>
      <v-data-table-server
        v-model="selected"
        :headers="headers"
        :items="store.items"
        :items-length="store.total"
        :loading="store.loading"
        :page="query.page"
        :items-per-page="query.pageSize"
        :items-per-page-options="itemsPerPageOptions"
        :sort-by="sortBy"
        :items-per-page-text="$t('orders.rowsPerPage')"
        item-value="id"
        show-select
        hover
        :multi-sort="false"
        density="comfortable"
        class="od-tabular"
        data-testid="orders-table"
        @update:page="(p: number) => update({ page: p }, false)"
        @update:items-per-page="(n: number) => update({ pageSize: n })"
        @update:sort-by="onSort"
        @click:row="(_e: Event, { item }: { item: OrderListItem }) => openOrder(item)"
      >
        <template #[`item.number`]="{ item }">
          <span class="od-mono font-weight-medium">{{ item.number }}</span>
        </template>
        <template #[`item.status`]="{ item }">
          <StatusChip :status="item.status" />
        </template>
        <template #[`item.orderDate`]="{ item }">{{ fmt.date(item.orderDate) }}</template>
        <template #[`item.dueDate`]="{ item }">{{ fmt.date(item.dueDate) }}</template>
        <template #[`item.subtotal`]="{ item }">{{ fmt.money(item.subtotal) }}</template>
        <template #[`item.vatAmount`]="{ item }">{{ fmt.money(item.vatAmount) }}</template>
        <template #[`item.total`]="{ item }">
          <span class="font-weight-medium">{{ fmt.money(item.total) }}</span>
        </template>
        <template #[`item.updatedAt`]="{ item }">{{ fmt.dateTime(item.updatedAt) }}</template>
        <template #[`item.actions`]="{ item }">
          <div class="d-flex justify-end" @click.stop>
            <v-btn
              icon="mdi-eye-outline"
              size="small"
              variant="text"
              :aria-label="$t('order.tabs.details')"
              :to="{ name: 'order-detail', params: { id: item.id } }"
            />
            <v-btn
              v-if="auth.isAdmin"
              icon="mdi-pencil-outline"
              size="small"
              variant="text"
              :aria-label="$t('app.edit')"
              :to="{ name: 'order-edit', params: { id: item.id } }"
            />
          </div>
        </template>
        <template #loading>
          <v-skeleton-loader type="table-row@10" />
        </template>
        <template #no-data>
          <EmptyState :title="$t('app.noResults')" icon="mdi-filter-off-outline">
            <v-btn variant="tonal" @click="router.replace({ query: {} })">{{
              $t('app.reset')
            }}</v-btn>
          </EmptyState>
        </template>
      </v-data-table-server>
    </v-card>

    <ConfirmDialog
      v-model="confirmDelete"
      :title="$t('orders.bulk.deleteTitle', { count: selected.length })"
      :body="$t('orders.bulk.deleteBody')"
      :confirm-text="$t('app.delete')"
      danger
      :loading="busy"
      @confirm="bulkDelete"
    />
  </div>
</template>
