<script setup lang="ts">
import { BarChart, LineChart, PieChart } from 'echarts/charts'
import { GridComponent, LegendComponent, TooltipComponent } from 'echarts/components'
import { use } from 'echarts/core'
import { CanvasRenderer } from 'echarts/renderers'
import { computed, onMounted, ref, watch } from 'vue'
import VChart from 'vue-echarts'
import { useI18n } from 'vue-i18n'
import {
  chartPalette,
  DASHBOARD_PRESETS,
  presetRange,
  statusColors,
  type DashboardPreset,
  type DashboardRange,
} from '@orderdesk/shared'
import { statsApi } from '@/api'
import ErrorState from '@/components/ErrorState.vue'
import KpiCard from '@/components/KpiCard.vue'
import { useAsync } from '@/composables/useAsync'
import { useFormat } from '@/composables/useFormat'
import { useUiStore } from '@/stores/ui'

use([
  CanvasRenderer,
  LineChart,
  BarChart,
  PieChart,
  GridComponent,
  TooltipComponent,
  LegendComponent,
])

const { t } = useI18n()
const ui = useUiStore()
const fmt = useFormat()

const presets = DASHBOARD_PRESETS
const preset = ref<DashboardPreset>('last12m')

const range = ref<DashboardRange>(presetRange(preset.value))
const { data, loading, error, run } = useAsync(() => statsApi.dashboard(range.value))

watch(preset, (p) => (range.value = presetRange(p)))
watch(range, () => void run(), { deep: true })
onMounted(() => void run())

const isDark = computed(() => ui.theme === 'dark')
const textColor = computed(() => (isDark.value ? '#C9D1E3' : '#3A4256'))
const gridLine = computed(() => ({ lineStyle: { color: isDark.value ? '#2A3245' : '#E6E9F2' } }))
const baseChart = computed(() => ({
  backgroundColor: 'transparent',
  textStyle: { fontFamily: 'Inter, system-ui, sans-serif', color: textColor.value },
  color: chartPalette,
  tooltip: { trigger: 'axis' as const },
  grid: { left: 56, right: 40, top: 32, bottom: 32 },
}))

const revenueOption = computed(() => ({
  ...baseChart.value,
  legend: { top: 0, textStyle: { color: textColor.value } },
  xAxis: { type: 'category' as const, data: data.value?.revenueByMonth.map((m) => m.month) ?? [] },
  yAxis: [
    {
      type: 'value' as const,
      splitLine: gridLine.value,
      axisLabel: { formatter: (v: number) => fmt.number(v / 1000) + 'k' },
    },
    { type: 'value' as const, splitLine: { show: false } },
  ],
  series: [
    {
      name: t('dashboard.charts.revenue'),
      type: 'bar' as const,
      data: data.value?.revenueByMonth.map((m) => m.revenue) ?? [],
      itemStyle: { borderRadius: [4, 4, 0, 0] },
    },
    {
      name: t('dashboard.charts.orders'),
      type: 'line' as const,
      yAxisIndex: 1,
      smooth: true,
      data: data.value?.revenueByMonth.map((m) => m.orders) ?? [],
    },
  ],
}))

const customersOption = computed(() => {
  const rows = [...(data.value?.topCustomers ?? [])].reverse()
  return {
    ...baseChart.value,
    grid: { left: 160, right: 110, top: 8, bottom: 24 },
    xAxis: {
      type: 'value' as const,
      splitLine: gridLine.value,
      axisLabel: { formatter: (v: number) => fmt.number(v / 1000) + 'k' },
    },
    yAxis: {
      type: 'category' as const,
      data: rows.map((c) => (c.name.length > 22 ? `${c.name.slice(0, 21)}…` : c.name)),
    },
    series: [
      {
        type: 'bar' as const,
        data: rows.map((c) => c.revenue),
        itemStyle: { borderRadius: [0, 4, 4, 0] },
        label: {
          show: true,
          position: 'right' as const,
          formatter: (p: { value: number }) => fmt.money(p.value),
          color: textColor.value,
        },
      },
    ],
  }
})

const statusOption = computed(() => ({
  ...baseChart.value,
  tooltip: { trigger: 'item' as const },
  legend: { bottom: 0, textStyle: { color: textColor.value } },
  series: [
    {
      type: 'pie' as const,
      radius: ['45%', '70%'],
      center: ['50%', '45%'],
      itemStyle: {
        borderRadius: 6,
        borderColor: isDark.value ? '#171D2B' : '#fff',
        borderWidth: 2,
      },
      label: { show: false },
      data:
        data.value?.statusBreakdown.map((s) => ({
          name: t(`status.${s.status}`),
          value: s.count,
          itemStyle: { color: statusColors[s.status] },
        })) ?? [],
    },
  ],
}))
</script>

<template>
  <div data-testid="dashboard-page">
    <div class="d-flex flex-wrap align-center ga-3 mb-4">
      <h1 class="text-h5 font-weight-bold mr-auto">{{ $t('dashboard.title') }}</h1>
      <v-chip-group
        v-model="preset"
        mandatory
        color="primary"
        selected-class="text-primary"
        data-testid="dashboard-presets"
      >
        <v-chip v-for="p in presets" :key="p" :value="p" variant="outlined" filter>{{
          $t(`dashboard.presets.${p}`)
        }}</v-chip>
      </v-chip-group>
      <!-- 170px fields on wide screens; they shrink together on narrow phones. -->
      <div class="d-flex ga-2" style="flex: 0 1 348px; min-width: 0">
        <v-text-field
          v-model="range.dateFrom"
          type="date"
          :label="$t('dashboard.from')"
          density="compact"
          style="flex: 1 1 0; min-width: 0"
        />
        <v-text-field
          v-model="range.dateTo"
          type="date"
          :label="$t('dashboard.to')"
          density="compact"
          style="flex: 1 1 0; min-width: 0"
        />
      </div>
    </div>

    <ErrorState v-if="error" :message="error" @retry="run" />

    <v-row v-else dense>
      <v-col cols="12" sm="6" lg="3">
        <KpiCard
          :title="$t('dashboard.kpi.revenue')"
          :value="fmt.money(data?.kpis.revenue ?? 0)"
          icon="mdi-cash-multiple"
          :loading="loading && !data"
        />
      </v-col>
      <v-col cols="12" sm="6" lg="3">
        <KpiCard
          :title="$t('dashboard.kpi.orders')"
          :value="fmt.number(data?.kpis.orders ?? 0)"
          icon="mdi-clipboard-list-outline"
          :loading="loading && !data"
        />
      </v-col>
      <v-col cols="12" sm="6" lg="3">
        <KpiCard
          :title="$t('dashboard.kpi.avgOrderValue')"
          :value="fmt.money(data?.kpis.avgOrderValue ?? 0)"
          icon="mdi-chart-line"
          :loading="loading && !data"
        />
      </v-col>
      <v-col cols="12" sm="6" lg="3">
        <KpiCard
          :title="$t('dashboard.kpi.openOrders')"
          :value="fmt.number(data?.kpis.openOrders ?? 0)"
          icon="mdi-truck-fast-outline"
          :loading="loading && !data"
        />
      </v-col>

      <v-col cols="12" lg="8">
        <v-card class="pa-4">
          <div class="text-subtitle-1 font-weight-medium mb-2">
            {{ $t('dashboard.charts.revenueByMonth') }}
          </div>
          <v-skeleton-loader v-if="loading && !data" type="image" height="320" />
          <VChart v-else class="od-chart" :option="revenueOption" autoresize :loading="loading" />
        </v-card>
      </v-col>
      <v-col cols="12" lg="4">
        <v-card class="pa-4">
          <div class="text-subtitle-1 font-weight-medium mb-2">
            {{ $t('dashboard.charts.statusBreakdown') }}
          </div>
          <v-skeleton-loader v-if="loading && !data" type="image" height="320" />
          <VChart v-else class="od-chart" :option="statusOption" autoresize :loading="loading" />
        </v-card>
      </v-col>
      <v-col cols="12">
        <v-card class="pa-4">
          <div class="text-subtitle-1 font-weight-medium mb-2">
            {{ $t('dashboard.charts.topCustomers') }}
          </div>
          <v-skeleton-loader v-if="loading && !data" type="image" height="320" />
          <VChart v-else class="od-chart" :option="customersOption" autoresize :loading="loading" />
        </v-card>
      </v-col>
    </v-row>
  </div>
</template>
