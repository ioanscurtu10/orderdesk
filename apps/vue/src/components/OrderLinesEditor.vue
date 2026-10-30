<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { lineTotal, type Product } from '@orderdesk/shared'
import { productsApi } from '@/api'
import { useDebounceFn } from '@/composables/useDebounceFn'
import { useFormat } from '@/composables/useFormat'

export interface LineDraft {
  key: number
  productId: string
  quantity: number
  unitPrice: number
  discountPct: number
}

const lines = defineModel<LineDraft[]>({ required: true })
const props = defineProps<{ initialProducts?: Product[]; readonly?: boolean }>()

const { t } = useI18n()
const fmt = useFormat()

let nextKey = Date.now()

/** Products we have seen, so a selected id always renders with its name even after a new search. */
const cache = reactive(
  new Map<string, Product>((props.initialProducts ?? []).map((p) => [p.id, p])),
)
const results = ref<Product[]>([])
const searching = ref(false)

const items = computed(() => {
  const map = new Map<string, Product>()
  for (const p of results.value) map.set(p.id, p)
  for (const p of cache.values()) map.set(p.id, p)
  return [...map.values()].map((p) => ({
    value: p.id,
    title: `${p.sku} · ${p.name}`,
    subtitle: fmt.money(p.unitPrice),
  }))
})

const search = useDebounceFn(async (q: string) => {
  searching.value = true
  try {
    results.value = await productsApi.search(q, 15)
    for (const p of results.value) cache.set(p.id, p)
  } finally {
    searching.value = false
  }
}, 250)

function onProductChange(line: LineDraft, productId: string | null): void {
  line.productId = productId ?? ''
  const p = productId ? cache.get(productId) : undefined
  // Prefill the catalogue price; the user can still override it.
  if (p) line.unitPrice = p.unitPrice
}

function add(): void {
  lines.value = [
    ...lines.value,
    { key: nextKey++, productId: '', quantity: 1, unitPrice: 0, discountPct: 0 },
  ]
}
function remove(key: number): void {
  lines.value = lines.value.filter((l) => l.key !== key)
}

const rules = {
  required: (v: unknown) => (v !== '' && v !== null && v !== undefined) || t('validation.required'),
  positiveInt: (v: unknown) => {
    const n = Number(v)
    return (Number.isInteger(n) && n > 0) || t('validation.positive')
  },
  nonNegative: (v: unknown) => Number(v) >= 0 || t('validation.nonNegative'),
  percent: (v: unknown) => {
    const n = Number(v)
    return (n >= 0 && n <= 100) || t('validation.percent')
  },
}

// Fetch a first page so the dropdown is not empty before typing.
void search('')
</script>

<template>
  <div data-testid="lines-editor">
    <v-table density="compact" class="od-tabular od-lines-table mb-2">
      <thead>
        <tr>
          <th>{{ $t('order.lines.product') }}</th>
          <th style="width: 90px">{{ $t('order.lines.quantity') }}</th>
          <th style="width: 130px">{{ $t('order.lines.unitPrice') }}</th>
          <th style="width: 110px">{{ $t('order.lines.discount') }}</th>
          <th class="text-end" style="width: 120px">{{ $t('order.lines.lineTotal') }}</th>
          <th style="width: 48px"></th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="(line, i) in lines" :key="line.key" :data-testid="`line-row-${i}`">
          <td class="py-2">
            <v-autocomplete
              :model-value="line.productId || null"
              :items="items"
              :loading="searching"
              :rules="[rules.required]"
              :placeholder="$t('order.lines.productSearch')"
              item-title="title"
              item-value="value"
              density="compact"
              no-filter
              :readonly="readonly"
              :data-testid="`line-product-${i}`"
              @update:search="search"
              @update:model-value="(v) => onProductChange(line, v)"
            >
              <template #item="{ item, props: itemProps }">
                <v-list-item v-bind="itemProps" :subtitle="item.raw.subtitle" />
              </template>
            </v-autocomplete>
          </td>
          <td class="py-2">
            <v-text-field
              v-model.number="line.quantity"
              type="number"
              min="1"
              step="1"
              density="compact"
              :rules="[rules.positiveInt]"
              :readonly="readonly"
              :data-testid="`line-qty-${i}`"
            />
          </td>
          <td class="py-2">
            <v-text-field
              v-model.number="line.unitPrice"
              type="number"
              min="0"
              step="0.01"
              density="compact"
              :rules="[rules.nonNegative]"
              :readonly="readonly"
              :data-testid="`line-price-${i}`"
            />
          </td>
          <td class="py-2">
            <v-text-field
              v-model.number="line.discountPct"
              type="number"
              min="0"
              max="100"
              step="1"
              density="compact"
              :rules="[rules.percent]"
              :readonly="readonly"
              :data-testid="`line-discount-${i}`"
            />
          </td>
          <td class="text-end font-weight-medium" :data-testid="`line-total-${i}`">
            {{
              fmt.money(
                lineTotal(
                  Number(line.quantity) || 0,
                  Number(line.unitPrice) || 0,
                  Number(line.discountPct) || 0,
                ),
              )
            }}
          </td>
          <td>
            <v-btn
              icon="mdi-delete-outline"
              size="small"
              variant="text"
              :disabled="readonly || lines.length === 1"
              :aria-label="$t('order.lines.remove')"
              :data-testid="`line-remove-${i}`"
              @click="remove(line.key)"
            />
          </td>
        </tr>
      </tbody>
    </v-table>
    <v-btn
      v-if="!readonly"
      variant="tonal"
      prepend-icon="mdi-plus"
      size="small"
      data-testid="add-line"
      @click="add"
    >
      {{ $t('order.lines.add') }}
    </v-btn>
  </div>
</template>

<style scoped>
.od-lines-table {
  overflow-x: auto;
}
.od-lines-table :deep(table) {
  min-width: 700px;
  table-layout: fixed;
}
.od-lines-table :deep(td) {
  vertical-align: top;
}
</style>
