<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import {
  ORDER_STATUSES,
  addDays,
  computeTotals,
  orderInputSchema,
  todayIso,
  type Customer,
  type OrderStatus,
  type Product,
} from '@orderdesk/shared'
import { customersApi, ordersApi, productsApi } from '@/api'
import { errorMessage } from '@/api/client'
import ConfirmDialog from '@/components/ConfirmDialog.vue'
import ErrorState from '@/components/ErrorState.vue'
import OrderLinesEditor, { type LineDraft } from '@/components/OrderLinesEditor.vue'
import OrderTotals from '@/components/OrderTotals.vue'
import { useDebounceFn } from '@/composables/useDebounceFn'
import { useUnsavedChanges } from '@/composables/useUnsavedChanges'
import { useUiStore } from '@/stores/ui'

const props = defineProps<{ id?: string }>()
const { t } = useI18n()
const router = useRouter()
const ui = useUiStore()
const isEdit = computed(() => !!props.id)

// ---- form state --------------------------------------------------------------
interface FormState {
  customerId: string
  status: OrderStatus
  orderDate: string
  dueDate: string
  notes: string
  lines: LineDraft[]
}
const form = reactive<FormState>({
  customerId: '',
  status: 'draft',
  orderDate: todayIso(),
  dueDate: addDays(todayIso(), 30),
  notes: '',
  lines: [{ key: 1, productId: '', quantity: 1, unitPrice: 0, discountPct: 0 }],
})
const snapshot = ref(JSON.stringify(form))
const isDirty = computed(() => JSON.stringify(form) !== snapshot.value)
const { dialogOpen, answer, allowLeave } = useUnsavedChanges(isDirty)

const formRef = ref<{ validate: () => Promise<{ valid: boolean }> } | null>(null)
const loading = ref(false)
const loadError = ref<string | null>(null)
const saving = ref(false)
const orderNumber = ref('')
const initialProducts = ref<Product[]>([])
const serverErrors = ref<string[]>([])

// ---- customers ---------------------------------------------------------------
const customerItems = ref<Customer[]>([])
const customerSearching = ref(false)
const searchCustomers = useDebounceFn(async (q: string) => {
  customerSearching.value = true
  try {
    const hits = await customersApi.search(q, 15)
    const current = customerItems.value.find((c) => c.id === form.customerId)
    customerItems.value =
      current && !hits.some((h) => h.id === current.id) ? [current, ...hits] : hits
  } finally {
    customerSearching.value = false
  }
}, 250)

/** Async rule: the id must exist on the server (demonstrates async validation). */
async function customerExists(v: string): Promise<true | string> {
  if (!v) return t('validation.required')
  try {
    await customersApi.get(v)
    return true
  } catch {
    return t('validation.customerNotFound')
  }
}

const rules = {
  required: (v: unknown) => (!!v && v !== '') || t('validation.required'),
  date: (v: string) => /^\d{4}-\d{2}-\d{2}$/.test(v) || t('validation.date'),
  dueAfterOrder: (v: string) => v >= form.orderDate || t('validation.dueAfterOrder'),
  maxNotes: (v: string) => (v?.length ?? 0) <= 500 || t('validation.maxLength'),
}

const totals = computed(() =>
  computeTotals(
    form.lines.map((l) => ({
      quantity: Number(l.quantity) || 0,
      unitPrice: Number(l.unitPrice) || 0,
      discountPct: Number(l.discountPct) || 0,
    })),
  ),
)

// ---- load (edit mode) ----------------------------------------------------------
async function load(): Promise<void> {
  if (!props.id) {
    void searchCustomers('')
    return
  }
  loading.value = true
  loadError.value = null
  try {
    const o = await ordersApi.get(props.id)
    orderNumber.value = o.number
    form.customerId = o.customerId
    form.status = o.status
    form.orderDate = o.orderDate
    form.dueDate = o.dueDate
    form.notes = o.notes
    form.lines = o.lines.map((l, i) => ({
      key: i + 1,
      productId: l.productId,
      quantity: l.quantity,
      unitPrice: l.unitPrice,
      discountPct: l.discountPct,
    }))
    const [customer, products] = await Promise.all([
      customersApi.get(o.customerId),
      Promise.all(o.lines.map((l) => productsApi.get(l.productId).catch(() => null))),
    ])
    customerItems.value = [customer]
    initialProducts.value = products.filter((p): p is Product => !!p)
    snapshot.value = JSON.stringify(form)
  } catch (e) {
    loadError.value = errorMessage(e)
  } finally {
    loading.value = false
  }
}
onMounted(load)
watch(() => props.id, load)

// ---- submit ------------------------------------------------------------------------
async function submit(): Promise<void> {
  serverErrors.value = []
  const result = await formRef.value?.validate()
  if (!result?.valid) return
  const parsed = orderInputSchema.safeParse({
    customerId: form.customerId,
    status: form.status,
    orderDate: form.orderDate,
    dueDate: form.dueDate,
    notes: form.notes,
    lines: form.lines.map(({ productId, quantity, unitPrice, discountPct }) => ({
      productId,
      quantity,
      unitPrice,
      discountPct,
    })),
  })
  if (!parsed.success) {
    serverErrors.value = parsed.error.issues.map((i) => `${i.path.join('.')}: ${t(i.message)}`)
    return
  }
  saving.value = true
  try {
    const saved = isEdit.value
      ? await ordersApi.update(props.id!, parsed.data)
      : await ordersApi.create(parsed.data)
    ui.notify(
      isEdit.value ? t('order.saved') : t('order.created', { number: saved.number }),
      'success',
    )
    allowLeave()
    await router.push({ name: 'order-detail', params: { id: saved.id } })
  } catch (e) {
    const details = (
      e as { response?: { data?: { details?: Array<{ path: string[]; message: string }> } } }
    )?.response?.data?.details
    serverErrors.value = details?.map((d) => `${d.path.join('.')}: ${t(d.message)}`) ?? [
      errorMessage(e),
    ]
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <div data-testid="order-form-page">
    <v-breadcrumbs
      :items="[
        { title: $t('nav.orders'), to: { name: 'orders' } },
        {
          title: isEdit ? $t('order.editTitle', { number: orderNumber }) : $t('order.newTitle'),
          disabled: true,
        },
      ]"
      class="px-0 pt-0"
      density="compact"
    >
      <template #divider><v-icon icon="mdi-chevron-right" size="small" /></template>
    </v-breadcrumbs>

    <div class="d-flex align-center ga-3 mb-4">
      <h1 class="text-h5 font-weight-bold mr-auto">
        {{ isEdit ? $t('order.editTitle', { number: orderNumber }) : $t('order.newTitle') }}
      </h1>
      <v-chip
        v-if="isDirty"
        size="small"
        color="warning"
        variant="tonal"
        data-testid="dirty-indicator"
        >●</v-chip
      >
    </div>

    <ErrorState v-if="loadError" :message="loadError" @retry="load" />
    <v-skeleton-loader v-else-if="loading" type="article, table-row@3" />

    <v-form
      v-else
      ref="formRef"
      validate-on="blur lazy"
      data-testid="order-form"
      @submit.prevent="submit"
    >
      <v-row>
        <v-col cols="12" lg="8">
          <v-card class="pa-4 mb-4">
            <v-row dense>
              <v-col cols="12" md="6">
                <v-autocomplete
                  v-model="form.customerId"
                  :items="customerItems"
                  :loading="customerSearching"
                  :label="$t('order.fields.customer')"
                  :placeholder="$t('order.fields.customerSearch')"
                  item-title="name"
                  item-value="id"
                  no-filter
                  :rules="[rules.required, customerExists]"
                  data-testid="customer-select"
                  @update:search="searchCustomers"
                >
                  <template #item="{ item, props: itemProps }">
                    <v-list-item
                      v-bind="itemProps"
                      :subtitle="`${item.raw.code} · ${item.raw.city}, ${item.raw.country}`"
                    />
                  </template>
                </v-autocomplete>
              </v-col>
              <v-col cols="12" md="6">
                <v-select
                  v-model="form.status"
                  :items="ORDER_STATUSES.map((s) => ({ value: s, title: $t(`status.${s}`) }))"
                  :label="$t('order.fields.status')"
                  data-testid="status-select"
                />
              </v-col>
              <v-col cols="12" md="6">
                <v-text-field
                  v-model="form.orderDate"
                  type="date"
                  :label="$t('order.fields.orderDate')"
                  :rules="[rules.required, rules.date]"
                  data-testid="order-date"
                />
              </v-col>
              <v-col cols="12" md="6">
                <v-text-field
                  v-model="form.dueDate"
                  type="date"
                  :label="$t('order.fields.dueDate')"
                  :rules="[rules.required, rules.date, rules.dueAfterOrder]"
                  data-testid="due-date"
                />
              </v-col>
              <v-col cols="12">
                <v-textarea
                  v-model="form.notes"
                  :label="$t('order.fields.notes')"
                  rows="2"
                  auto-grow
                  counter="500"
                  :rules="[rules.maxNotes]"
                  data-testid="notes"
                />
              </v-col>
            </v-row>
          </v-card>

          <v-card class="pa-4">
            <div class="text-subtitle-1 font-weight-medium mb-2">{{ $t('order.lines.title') }}</div>
            <OrderLinesEditor v-model="form.lines" :initial-products="initialProducts" />
          </v-card>
        </v-col>

        <v-col cols="12" lg="4">
          <OrderTotals :totals="totals" class="mb-4" />
          <v-alert
            v-if="serverErrors.length"
            type="error"
            variant="tonal"
            class="mb-4"
            data-testid="form-errors"
          >
            <ul class="pl-4">
              <li v-for="e in serverErrors" :key="e">{{ e }}</li>
            </ul>
          </v-alert>
          <div class="d-flex ga-2">
            <v-btn
              type="submit"
              color="primary"
              size="large"
              :loading="saving"
              class="flex-grow-1"
              data-testid="save-order"
            >
              {{ $t('app.save') }}
            </v-btn>
            <v-btn
              variant="text"
              size="large"
              :to="isEdit ? { name: 'order-detail', params: { id } } : { name: 'orders' }"
              data-testid="cancel-order"
            >
              {{ $t('app.cancel') }}
            </v-btn>
          </div>
        </v-col>
      </v-row>
    </v-form>

    <ConfirmDialog
      :model-value="dialogOpen"
      :title="$t('app.unsavedTitle')"
      :body="$t('app.unsavedBody')"
      :confirm-text="$t('app.leave')"
      :cancel-text="$t('app.stay')"
      danger
      @update:model-value="(v) => !v && answer(false)"
      @confirm="answer(true)"
      @cancel="answer(false)"
    />
  </div>
</template>
