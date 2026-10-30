<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import type { Customer, OrderStatus } from '@orderdesk/shared'
import { buildInvoicePdf, downloadBlob } from '@orderdesk/shared/browser'
import { customersApi, ordersApi } from '@/api'
import { errorMessage } from '@/api/client'
import ConfirmDialog from '@/components/ConfirmDialog.vue'
import ErrorState from '@/components/ErrorState.vue'
import HistoryTimeline from '@/components/HistoryTimeline.vue'
import StatusChip from '@/components/StatusChip.vue'
import StatusMenu from '@/components/StatusMenu.vue'
import { useAsync } from '@/composables/useAsync'
import { useFormat } from '@/composables/useFormat'
import { useAuthStore } from '@/stores/auth'
import { useUiStore } from '@/stores/ui'

const props = defineProps<{ id: string }>()
const { t } = useI18n()
const router = useRouter()
const auth = useAuthStore()
const ui = useUiStore()
const fmt = useFormat()

const order = useAsync(() => ordersApi.get(props.id))
const history = useAsync(() => ordersApi.history(props.id))
const customer = ref<Customer | null>(null)
const tab = ref('details')

async function load(): Promise<void> {
  await Promise.all([order.run(), history.run()])
  if (order.data.value) {
    customer.value = await customersApi.get(order.data.value.customerId).catch(() => null)
  }
}
onMounted(load)
watch(() => props.id, load)

const breadcrumbs = computed(() => [
  { title: t('nav.orders'), to: { name: 'orders' } },
  { title: order.data.value?.number ?? '…', disabled: true },
])

const busy = ref(false)
async function changeStatus(status: OrderStatus): Promise<void> {
  if (!order.data.value) return
  busy.value = true
  try {
    await ordersApi.bulkStatus([order.data.value.id], status)
    ui.notify(t('order.statusChanged', { status: t(`status.${status}`) }), 'success')
    await load()
  } catch (e) {
    ui.notify(errorMessage(e), 'error')
  } finally {
    busy.value = false
  }
}

const confirmDelete = ref(false)
async function remove(): Promise<void> {
  busy.value = true
  try {
    await ordersApi.remove(props.id)
    ui.notify(t('order.deleted'), 'success')
    await router.replace({ name: 'orders' })
  } catch (e) {
    ui.notify(errorMessage(e), 'error')
  } finally {
    busy.value = false
  }
}

async function downloadInvoice(): Promise<void> {
  const o = order.data.value
  if (!o) return
  const blob = await buildInvoicePdf(
    o,
    customer.value,
    {
      title: t('order.documents.invoice').replace(' (PDF)', ''),
      number: t('order.fields.number'),
      orderDate: t('order.fields.orderDate'),
      dueDate: t('order.fields.dueDate'),
      customer: t('order.fields.customer'),
      sku: t('order.lines.sku'),
      product: t('order.lines.product'),
      qty: t('order.lines.quantity'),
      unitPrice: t('order.lines.unitPrice'),
      discount: t('order.lines.discount'),
      lineTotal: t('order.lines.lineTotal'),
      subtotal: t('order.totals.subtotal'),
      vat: 'VAT',
      total: t('order.totals.total'),
    },
    ui.locale,
  )
  downloadBlob(blob, `${o.number}.pdf`)
}
</script>

<template>
  <div data-testid="order-detail-page">
    <v-breadcrumbs :items="breadcrumbs" class="px-0 pt-0" density="compact">
      <template #divider><v-icon icon="mdi-chevron-right" size="small" /></template>
    </v-breadcrumbs>

    <ErrorState
      v-if="order.error.value"
      :message="order.status.value === 404 ? $t('order.notFound') : order.error.value"
      @retry="load"
    />

    <template v-else>
      <div class="d-flex flex-wrap align-center ga-3 mb-4">
        <div class="mr-auto">
          <v-skeleton-loader
            v-if="order.loading.value && !order.data.value"
            type="heading"
            width="260"
          />
          <template v-else-if="order.data.value">
            <div class="d-flex align-center ga-3">
              <h1 class="text-h5 font-weight-bold" data-testid="order-number">
                {{ order.data.value.number }}
              </h1>
              <StatusChip :status="order.data.value.status" size="default" />
            </div>
            <div class="text-body-2 text-medium-emphasis">
              {{ order.data.value.customerName }} · {{ fmt.date(order.data.value.orderDate) }}
            </div>
          </template>
        </div>
        <template v-if="order.data.value">
          <v-btn
            variant="outlined"
            prepend-icon="mdi-file-pdf-box"
            data-testid="download-invoice"
            @click="downloadInvoice"
          >
            {{ $t('order.documents.download') }} PDF
          </v-btn>
          <template v-if="auth.isAdmin">
            <StatusMenu
              :label="$t('order.changeStatus')"
              :current="order.data.value.status"
              :loading="busy"
              @select="changeStatus"
            />
            <v-btn
              color="primary"
              prepend-icon="mdi-pencil-outline"
              :to="{ name: 'order-edit', params: { id } }"
              data-testid="edit-order"
            >
              {{ $t('app.edit') }}
            </v-btn>
            <v-btn
              icon="mdi-delete-outline"
              variant="text"
              color="error"
              :aria-label="$t('app.delete')"
              data-testid="delete-order"
              @click="confirmDelete = true"
            />
          </template>
        </template>
      </div>

      <v-card>
        <v-tabs v-model="tab" color="primary">
          <v-tab value="details" data-testid="tab-details">{{ $t('order.tabs.details') }}</v-tab>
          <v-tab value="lines" data-testid="tab-lines"
            >{{ $t('order.tabs.lines') }}
            <v-chip size="x-small" class="ml-2" v-if="order.data.value">{{
              order.data.value.lineCount
            }}</v-chip></v-tab
          >
          <v-tab value="history" data-testid="tab-history">{{ $t('order.tabs.history') }}</v-tab>
          <v-tab value="documents" data-testid="tab-documents">{{
            $t('order.tabs.documents')
          }}</v-tab>
        </v-tabs>
        <v-divider />

        <v-skeleton-loader
          v-if="order.loading.value && !order.data.value"
          type="article, table-row@4"
          class="pa-4"
        />

        <v-tabs-window v-else-if="order.data.value" v-model="tab">
          <v-tabs-window-item value="details">
            <v-row class="pa-4" dense>
              <v-col cols="12" md="6">
                <v-list density="compact" class="bg-transparent">
                  <v-list-item
                    :title="$t('order.fields.customer')"
                    :subtitle="order.data.value.customerName"
                    prepend-icon="mdi-domain"
                  />
                  <v-list-item
                    v-if="customer"
                    title="VAT / Email"
                    :subtitle="`${customer.vatId} · ${customer.email}`"
                    prepend-icon="mdi-card-account-details-outline"
                  />
                  <v-list-item
                    v-if="customer"
                    :title="$t('order.fields.location')"
                    :subtitle="`${customer.city}, ${customer.country}`"
                    prepend-icon="mdi-map-marker-outline"
                  />
                  <v-list-item
                    :title="$t('order.fields.notes')"
                    :subtitle="order.data.value.notes || '—'"
                    prepend-icon="mdi-note-text-outline"
                  />
                </v-list>
              </v-col>
              <v-col cols="12" md="6">
                <v-list density="compact" class="bg-transparent">
                  <v-list-item
                    :title="$t('order.fields.orderDate')"
                    :subtitle="fmt.date(order.data.value.orderDate)"
                    prepend-icon="mdi-calendar"
                  />
                  <v-list-item
                    :title="$t('order.fields.dueDate')"
                    :subtitle="fmt.date(order.data.value.dueDate)"
                    prepend-icon="mdi-calendar-clock"
                  />
                  <v-list-item
                    :title="$t('order.fields.createdAt')"
                    :subtitle="fmt.dateTime(order.data.value.createdAt)"
                    prepend-icon="mdi-clock-plus-outline"
                  />
                  <v-list-item
                    :title="$t('order.fields.updatedAt')"
                    :subtitle="fmt.dateTime(order.data.value.updatedAt)"
                    prepend-icon="mdi-clock-edit-outline"
                  />
                </v-list>
              </v-col>
            </v-row>
          </v-tabs-window-item>

          <v-tabs-window-item value="lines">
            <v-table density="comfortable" class="od-tabular" data-testid="lines-table">
              <thead>
                <tr>
                  <th>{{ $t('order.lines.sku') }}</th>
                  <th>{{ $t('order.lines.product') }}</th>
                  <th class="text-end">{{ $t('order.lines.quantity') }}</th>
                  <th class="text-end">{{ $t('order.lines.unitPrice') }}</th>
                  <th class="text-end">{{ $t('order.lines.discount') }}</th>
                  <th class="text-end">{{ $t('order.lines.lineTotal') }}</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="l in order.data.value.lines" :key="l.id">
                  <td class="od-mono">{{ l.sku }}</td>
                  <td>{{ l.name }}</td>
                  <td class="text-end">{{ l.quantity }}</td>
                  <td class="text-end">{{ fmt.money(l.unitPrice) }}</td>
                  <td class="text-end">{{ l.discountPct }}%</td>
                  <td class="text-end font-weight-medium">{{ fmt.money(l.lineTotal) }}</td>
                </tr>
              </tbody>
              <tfoot>
                <tr>
                  <td colspan="5" class="text-end text-medium-emphasis">
                    {{ $t('order.totals.subtotal') }}
                  </td>
                  <td class="text-end">{{ fmt.money(order.data.value.subtotal) }}</td>
                </tr>
                <tr>
                  <td colspan="5" class="text-end text-medium-emphasis">
                    {{ $t('order.totals.vat', { rate: order.data.value.vatRate }) }}
                  </td>
                  <td class="text-end">{{ fmt.money(order.data.value.vatAmount) }}</td>
                </tr>
                <tr>
                  <td colspan="5" class="text-end font-weight-bold">
                    {{ $t('order.totals.total') }}
                  </td>
                  <td class="text-end font-weight-bold" data-testid="order-total">
                    {{ fmt.money(order.data.value.total) }}
                  </td>
                </tr>
              </tfoot>
            </v-table>
          </v-tabs-window-item>

          <v-tabs-window-item value="history">
            <div class="pa-4">
              <v-skeleton-loader v-if="history.loading.value" type="list-item-two-line@3" />
              <HistoryTimeline v-else :entries="history.data.value ?? []" />
            </div>
          </v-tabs-window-item>

          <v-tabs-window-item value="documents">
            <v-list lines="two" class="pa-2">
              <v-list-item
                prepend-icon="mdi-file-pdf-box"
                :title="$t('order.documents.invoice')"
                :subtitle="$t('order.documents.invoiceHint')"
              >
                <template #append>
                  <v-btn variant="tonal" size="small" @click="downloadInvoice">{{
                    $t('order.documents.download')
                  }}</v-btn>
                </template>
              </v-list-item>
            </v-list>
          </v-tabs-window-item>
        </v-tabs-window>
      </v-card>
    </template>

    <ConfirmDialog
      v-model="confirmDelete"
      :title="$t('order.deleteTitle')"
      :body="$t('orders.bulk.deleteBody')"
      :confirm-text="$t('app.delete')"
      danger
      :loading="busy"
      @confirm="remove"
    />
  </div>
</template>
