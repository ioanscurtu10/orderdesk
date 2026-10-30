import InsightsOutlinedIcon from '@mui/icons-material/InsightsOutlined'
import ListAltOutlinedIcon from '@mui/icons-material/ListAltOutlined'
import LocalShippingOutlinedIcon from '@mui/icons-material/LocalShippingOutlined'
import PaymentsOutlinedIcon from '@mui/icons-material/PaymentsOutlined'
import Card from '@mui/material/Card'
import Chip from '@mui/material/Chip'
import Grid from '@mui/material/Grid'
import Skeleton from '@mui/material/Skeleton'
import Stack from '@mui/material/Stack'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import { BarChart, LineChart, PieChart } from 'echarts/charts'
import { GridComponent, LegendComponent, TooltipComponent } from 'echarts/components'
import * as echarts from 'echarts/core'
import { CanvasRenderer } from 'echarts/renderers'
import ReactEChartsCore from 'echarts-for-react/lib/core'
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  chartPalette,
  DASHBOARD_PRESETS,
  presetRange,
  statusColors,
  type DashboardPreset,
  type DashboardRange,
} from '@orderdesk/shared'
import { useDashboard } from '@/api/queries'
import { errorMessage } from '@/api/client'
import { ErrorState } from '@/components/ErrorState'
import { KpiCard } from '@/components/KpiCard'
import { useFormat } from '@/hooks/useFormat'
import { useUiStore } from '@/stores/ui'

echarts.use([
  CanvasRenderer,
  LineChart,
  BarChart,
  PieChart,
  GridComponent,
  TooltipComponent,
  LegendComponent,
])

const presets = DASHBOARD_PRESETS

export default function DashboardPage() {
  const { t } = useTranslation()
  const fmt = useFormat()
  const isDark = useUiStore((s) => s.theme === 'dark')
  const [preset, setPreset] = useState<DashboardPreset>('last12m')
  const [range, setRange] = useState<DashboardRange>(() => presetRange('last12m'))
  const { data, isPending, isFetching, error, refetch } = useDashboard(range)

  const textColor = isDark ? '#C9D1E3' : '#3A4256'
  const gridLine = useMemo(
    () => ({ lineStyle: { color: isDark ? '#2A3245' : '#E6E9F2' } }),
    [isDark],
  )
  const base = useMemo(
    () => ({
      backgroundColor: 'transparent',
      textStyle: { fontFamily: 'Inter, system-ui, sans-serif', color: textColor },
      color: chartPalette,
      tooltip: { trigger: 'axis' as const },
      grid: { left: 56, right: 40, top: 32, bottom: 32 },
    }),
    [textColor],
  )

  const revenueOption = useMemo(
    () => ({
      ...base,
      legend: { top: 0, textStyle: { color: textColor } },
      xAxis: { type: 'category' as const, data: data?.revenueByMonth.map((m) => m.month) ?? [] },
      yAxis: [
        {
          type: 'value' as const,
          splitLine: gridLine,
          axisLabel: { formatter: (v: number) => `${fmt.number(v / 1000)}k` },
        },
        { type: 'value' as const, splitLine: { show: false } },
      ],
      series: [
        {
          name: t('dashboard.charts.revenue'),
          type: 'bar' as const,
          data: data?.revenueByMonth.map((m) => m.revenue) ?? [],
          itemStyle: { borderRadius: [4, 4, 0, 0] },
        },
        {
          name: t('dashboard.charts.orders'),
          type: 'line' as const,
          yAxisIndex: 1,
          smooth: true,
          data: data?.revenueByMonth.map((m) => m.orders) ?? [],
        },
      ],
    }),
    [base, data, fmt, gridLine, t, textColor],
  )

  const customersOption = useMemo(() => {
    const rows = [...(data?.topCustomers ?? [])].reverse()
    return {
      ...base,
      grid: { left: 160, right: 110, top: 8, bottom: 24 },
      xAxis: {
        type: 'value' as const,
        splitLine: gridLine,
        axisLabel: { formatter: (v: number) => `${fmt.number(v / 1000)}k` },
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
            color: textColor,
          },
        },
      ],
    }
  }, [base, data, fmt, gridLine, textColor])

  const statusOption = useMemo(
    () => ({
      ...base,
      tooltip: { trigger: 'item' as const },
      legend: { bottom: 0, textStyle: { color: textColor } },
      series: [
        {
          type: 'pie' as const,
          radius: ['45%', '70%'],
          center: ['50%', '45%'],
          itemStyle: { borderRadius: 6, borderColor: isDark ? '#171D2B' : '#fff', borderWidth: 2 },
          label: { show: false },
          data:
            data?.statusBreakdown.map((s) => ({
              name: t(`status.${s.status}`),
              value: s.count,
              itemStyle: { color: statusColors[s.status] },
            })) ?? [],
        },
      ],
    }),
    [base, data, isDark, t, textColor],
  )

  const chart = (option: object, testid: string) =>
    isPending ? (
      <Skeleton variant="rounded" height={320} />
    ) : (
      <div data-testid={testid}>
        <ReactEChartsCore
          echarts={echarts}
          option={option}
          notMerge
          className="od-chart"
          style={{ height: 320 }}
          showLoading={isFetching && !isPending}
        />
      </div>
    )

  return (
    <div data-testid="dashboard-page">
      <Stack direction="row" flexWrap="wrap" alignItems="center" gap={1.5} sx={{ mb: 2 }}>
        <Typography variant="h5" sx={{ mr: 'auto' }}>
          {t('dashboard.title')}
        </Typography>
        <Stack direction="row" gap={1} flexWrap="wrap" data-testid="dashboard-presets">
          {presets.map((p) => (
            <Chip
              key={p}
              label={t(`dashboard.presets.${p}`)}
              color={preset === p ? 'primary' : 'default'}
              variant={preset === p ? 'filled' : 'outlined'}
              onClick={() => {
                setPreset(p)
                setRange(presetRange(p))
              }}
            />
          ))}
        </Stack>
        {/* 170px fields on wide screens; they shrink together on narrow phones. */}
        <Stack direction="row" gap={1} sx={{ flex: '0 1 348px', minWidth: 0 }}>
          <TextField
            type="date"
            label={t('dashboard.from')}
            value={range.dateFrom}
            onChange={(e) => setRange({ ...range, dateFrom: e.target.value })}
            slotProps={{ inputLabel: { shrink: true } }}
            sx={{ flex: '1 1 0', minWidth: 0 }}
          />
          <TextField
            type="date"
            label={t('dashboard.to')}
            value={range.dateTo}
            onChange={(e) => setRange({ ...range, dateTo: e.target.value })}
            slotProps={{ inputLabel: { shrink: true } }}
            sx={{ flex: '1 1 0', minWidth: 0 }}
          />
        </Stack>
      </Stack>

      {error ? (
        <ErrorState message={errorMessage(error)} onRetry={() => void refetch()} />
      ) : (
        <Grid container spacing={1.5}>
          <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
            <KpiCard
              title={t('dashboard.kpi.revenue')}
              value={fmt.money(data?.kpis.revenue ?? 0)}
              icon={<PaymentsOutlinedIcon fontSize="small" />}
              loading={isPending}
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
            <KpiCard
              title={t('dashboard.kpi.orders')}
              value={fmt.number(data?.kpis.orders ?? 0)}
              icon={<ListAltOutlinedIcon fontSize="small" />}
              loading={isPending}
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
            <KpiCard
              title={t('dashboard.kpi.avgOrderValue')}
              value={fmt.money(data?.kpis.avgOrderValue ?? 0)}
              icon={<InsightsOutlinedIcon fontSize="small" />}
              loading={isPending}
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
            <KpiCard
              title={t('dashboard.kpi.openOrders')}
              value={fmt.number(data?.kpis.openOrders ?? 0)}
              icon={<LocalShippingOutlinedIcon fontSize="small" />}
              loading={isPending}
            />
          </Grid>
          <Grid size={{ xs: 12, lg: 8 }}>
            <Card sx={{ p: 2 }}>
              <Typography variant="subtitle1" fontWeight={500} sx={{ mb: 1 }}>
                {t('dashboard.charts.revenueByMonth')}
              </Typography>
              {chart(revenueOption, 'chart-revenue')}
            </Card>
          </Grid>
          <Grid size={{ xs: 12, lg: 4 }}>
            <Card sx={{ p: 2 }}>
              <Typography variant="subtitle1" fontWeight={500} sx={{ mb: 1 }}>
                {t('dashboard.charts.statusBreakdown')}
              </Typography>
              {chart(statusOption, 'chart-status')}
            </Card>
          </Grid>
          <Grid size={{ xs: 12 }}>
            <Card sx={{ p: 2 }}>
              <Typography variant="subtitle1" fontWeight={500} sx={{ mb: 1 }}>
                {t('dashboard.charts.topCustomers')}
              </Typography>
              {chart(customersOption, 'chart-customers')}
            </Card>
          </Grid>
        </Grid>
      )}
    </div>
  )
}
