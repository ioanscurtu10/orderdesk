<script setup lang="ts">
import Papa from 'papaparse'
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import {
  IMPORT_COLUMNS,
  ORDER_STATUSES,
  groupImportRows,
  validateImportRows,
  type ImportResult,
  type OrderStatus,
  type RowValidation,
} from '@orderdesk/shared'
import { downloadText, importTemplateCsv } from '@orderdesk/shared/browser'
import { ordersApi } from '@/api'
import { errorMessage } from '@/api/client'
import StatusChip from '@/components/StatusChip.vue'
import { useUiStore } from '@/stores/ui'

const { t } = useI18n()
const ui = useUiStore()

const file = ref<File | null>(null)
const rawRows = ref<Array<Record<string, unknown>>>([])
const validated = ref<RowValidation[]>([])
const parseError = ref<string | null>(null)
const importing = ref(false)
const result = ref<ImportResult | null>(null)

const validRows = computed(() => validated.value.filter((v) => v.errors.length === 0))
const invalidRows = computed(() => validated.value.filter((v) => v.errors.length > 0))
const groups = computed(() => groupImportRows(validRows.value))

function onFile(f: File | File[] | null): void {
  const picked = Array.isArray(f) ? (f[0] ?? null) : f
  file.value = picked
  result.value = null
  parseError.value = null
  rawRows.value = []
  validated.value = []
  if (!picked) return
  Papa.parse<Record<string, unknown>>(picked, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (h) => h.trim(),
    complete: (res) => {
      if (res.errors.length && res.data.length === 0) {
        parseError.value = res.errors[0]?.message ?? 'Parse error'
        return
      }
      rawRows.value = res.data
      // Client-side validation gives instant feedback; the server validates again on import.
      validated.value = validateImportRows(res.data)
    },
    error: (err) => {
      parseError.value = err.message
    },
  })
}

async function runImport(): Promise<void> {
  importing.value = true
  try {
    // Send only rows that passed client validation; the server still re-checks everything.
    const rows = validRows.value.map((v) => rawRows.value[v.row - 1]!)
    result.value = await ordersApi.import(rows)
    ui.notify(
      t('import.result', { imported: result.value.imported, skipped: result.value.skipped }),
      result.value.imported ? 'success' : 'warning',
    )
  } catch (e) {
    ui.notify(errorMessage(e), 'error')
  } finally {
    importing.value = false
  }
}

function downloadTemplate(): void {
  downloadText(importTemplateCsv(), 'orderdesk-import-template.csv', 'text/csv;charset=utf-8')
}

const previewHeaders = computed(() => [
  { title: t('import.row'), key: 'row', width: 70 },
  ...IMPORT_COLUMNS.map((c) => ({ title: c, key: c })),
  { title: t('import.errors'), key: 'errors' },
])
interface PreviewRow extends Record<string, unknown> {
  row: number
  errors: string[]
  status?: unknown
}
const previewItems = computed<PreviewRow[]>(() =>
  validated.value.map((v) => ({
    ...(rawRows.value[v.row - 1] ?? {}),
    row: v.row,
    errors: v.errors,
  })),
)
const knownStatuses: readonly string[] = ORDER_STATUSES
</script>

<template>
  <div data-testid="import-page">
    <div class="d-flex flex-wrap align-center ga-3 mb-4">
      <h1 class="text-h5 font-weight-bold mr-auto">{{ $t('import.title') }}</h1>
      <v-btn
        variant="outlined"
        prepend-icon="mdi-download-outline"
        data-testid="download-template"
        @click="downloadTemplate"
      >
        {{ $t('import.downloadTemplate') }}
      </v-btn>
    </div>

    <v-card class="pa-4 mb-4">
      <p class="text-body-2 text-medium-emphasis mb-3">{{ $t('import.intro') }}</p>
      <v-file-input
        :label="$t('import.chooseFile')"
        accept=".csv,text/csv"
        prepend-icon="mdi-file-delimited-outline"
        show-size
        data-testid="import-file"
        @update:model-value="onFile"
      />
      <v-alert v-if="parseError" type="error" variant="tonal" class="mt-3">{{
        parseError
      }}</v-alert>
    </v-card>

    <template v-if="validated.length">
      <div class="d-flex flex-wrap align-center ga-2 mb-3">
        <v-chip color="success" variant="tonal" label data-testid="valid-count">{{
          $t('import.validRows', { count: validRows.length })
        }}</v-chip>
        <v-chip
          :color="invalidRows.length ? 'error' : undefined"
          variant="tonal"
          label
          data-testid="invalid-count"
          >{{ $t('import.invalidRows', { count: invalidRows.length }) }}</v-chip
        >
        <v-chip color="primary" variant="tonal" label data-testid="orders-to-create">{{
          $t('import.ordersToCreate', { count: groups.length })
        }}</v-chip>
        <v-spacer />
        <v-btn
          color="primary"
          :disabled="!groups.length || !!result"
          :loading="importing"
          prepend-icon="mdi-upload"
          data-testid="run-import"
          @click="runImport"
        >
          {{ $t('import.run', { count: groups.length }) }}
        </v-btn>
      </div>

      <v-alert
        v-if="result"
        :type="result.errors.length ? 'warning' : 'success'"
        variant="tonal"
        class="mb-4"
        data-testid="import-result"
      >
        <div class="font-weight-medium">
          {{ $t('import.result', { imported: result.imported, skipped: result.skipped }) }}
        </div>
        <div v-if="result.errors.length" class="mt-2 text-body-2">
          <div class="font-weight-medium">{{ $t('import.serverErrors') }}</div>
          <ul class="pl-4">
            <li v-for="(e, i) in result.errors" :key="i">
              {{ $t('import.row') }} {{ e.row }}: {{ e.message }}
            </li>
          </ul>
        </div>
      </v-alert>

      <v-card>
        <div class="px-4 pt-3 text-subtitle-1 font-weight-medium">{{ $t('import.preview') }}</div>
        <v-data-table
          :headers="previewHeaders"
          :items="previewItems"
          :items-per-page="25"
          density="compact"
          class="od-tabular"
          data-testid="import-preview"
        >
          <template #[`item.status`]="{ item }">
            <StatusChip
              v-if="knownStatuses.includes(String(item.status))"
              :status="item.status as OrderStatus"
              size="x-small"
            />
            <span v-else class="text-error">{{ String(item.status ?? '') }}</span>
          </template>
          <template #[`item.errors`]="{ item }">
            <div v-if="item.errors.length" class="text-error text-caption">
              <div v-for="e in item.errors" :key="e">{{ e }}</div>
            </div>
            <v-icon v-else icon="mdi-check-circle-outline" color="success" size="18" />
          </template>
        </v-data-table>
      </v-card>
    </template>
    <v-card v-else-if="!file" class="pa-8 text-center text-medium-emphasis">
      <v-icon icon="mdi-file-upload-outline" size="40" class="mb-2" />
      <div>{{ $t('import.noFile') }}</div>
    </v-card>
  </div>
</template>
