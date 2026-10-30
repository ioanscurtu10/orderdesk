import FilterAltOffOutlinedIcon from '@mui/icons-material/FilterAltOffOutlined'
import SearchIcon from '@mui/icons-material/Search'
import Button from '@mui/material/Button'
import Chip from '@mui/material/Chip'
import FormControl from '@mui/material/FormControl'
import Grid from '@mui/material/Grid'
import InputAdornment from '@mui/material/InputAdornment'
import InputLabel from '@mui/material/InputLabel'
import MenuItem from '@mui/material/MenuItem'
import Select from '@mui/material/Select'
import TextField from '@mui/material/TextField'
import { alpha } from '@mui/material/styles'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ORDER_STATUSES, statusColors, type OrderQuery, type OrderStatus } from '@orderdesk/shared'
import { useDebouncedValue } from '@/hooks/useDebouncedValue'

interface Props {
  query: OrderQuery
  onChange: (patch: Partial<OrderQuery>) => void
  onReset: () => void
}

/**
 * Local input state that follows an external value whenever that value changes
 * (the "storing information from previous renders" pattern from the React docs).
 * Used so a Reset click or a pasted URL updates the text boxes without an effect.
 */
function useMirroredInput(external: string): [string, (v: string) => void] {
  const [value, setValue] = useState(external)
  const [seen, setSeen] = useState(external)
  if (seen !== external) {
    setSeen(external)
    setValue(external)
  }
  return [value, setValue]
}

/** Filter toolbar. Text inputs are debounced so typing does not hit the router on every keystroke. */
export function OrdersFilters({ query, onChange, onReset }: Props) {
  const { t } = useTranslation()
  const [q, setQ] = useMirroredInput(query.q ?? '')
  const [minTotal, setMinTotal] = useMirroredInput(query.minTotal?.toString() ?? '')
  const [maxTotal, setMaxTotal] = useMirroredInput(query.maxTotal?.toString() ?? '')
  const debouncedQ = useDebouncedValue(q, 350)
  const debouncedMin = useDebouncedValue(minTotal, 400)
  const debouncedMax = useDebouncedValue(maxTotal, 400)

  useEffect(() => {
    if ((debouncedQ || undefined) !== query.q) onChange({ q: debouncedQ || undefined })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedQ])

  useEffect(() => {
    const min = debouncedMin === '' ? undefined : Number(debouncedMin)
    const max = debouncedMax === '' ? undefined : Number(debouncedMax)
    const nextMin = Number.isFinite(min) ? min : undefined
    const nextMax = Number.isFinite(max) ? max : undefined
    if (nextMin !== query.minTotal || nextMax !== query.maxTotal)
      onChange({ minTotal: nextMin, maxTotal: nextMax })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedMin, debouncedMax])

  const statuses = query.status ?? []

  return (
    <Grid container spacing={1.5} alignItems="center">
      <Grid size={{ xs: 12, md: 6, lg: 4 }}>
        <TextField
          fullWidth
          placeholder={t('orders.searchPlaceholder')}
          value={q}
          onChange={(e) => setQ(e.target.value)}
          slotProps={{
            input: {
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon fontSize="small" />
                </InputAdornment>
              ),
            },
            htmlInput: { 'data-testid': 'filter-search' },
          }}
        />
      </Grid>
      <Grid size={{ xs: 12, md: 6, lg: 3 }}>
        <FormControl fullWidth>
          <InputLabel id="status-filter-label">{t('orders.filters.status')}</InputLabel>
          <Select
            labelId="status-filter-label"
            label={t('orders.filters.status')}
            multiple
            value={statuses}
            onChange={(e) => {
              const v = e.target.value as OrderStatus[]
              onChange({ status: v.length ? v : undefined })
            }}
            data-testid="filter-status"
            renderValue={(selected) => (
              <span style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                {(selected as OrderStatus[]).map((s) => (
                  <Chip
                    key={s}
                    label={t(`status.${s}`)}
                    size="small"
                    sx={{
                      bgcolor: alpha(statusColors[s], 0.14),
                      color: statusColors[s],
                      height: 22,
                    }}
                  />
                ))}
              </span>
            )}
          >
            {ORDER_STATUSES.map((s) => (
              <MenuItem key={s} value={s} data-testid={`filter-status-${s}`}>
                {t(`status.${s}`)}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Grid>
      <Grid size={{ xs: 6, md: 3, lg: 2 }}>
        <TextField
          fullWidth
          type="date"
          label={t('orders.filters.dateFrom')}
          value={query.dateFrom ?? ''}
          onChange={(e) => onChange({ dateFrom: e.target.value || undefined })}
          slotProps={{
            inputLabel: { shrink: true },
            htmlInput: { 'data-testid': 'filter-date-from' },
          }}
        />
      </Grid>
      <Grid size={{ xs: 6, md: 3, lg: 2 }}>
        <TextField
          fullWidth
          type="date"
          label={t('orders.filters.dateTo')}
          value={query.dateTo ?? ''}
          onChange={(e) => onChange({ dateTo: e.target.value || undefined })}
          slotProps={{
            inputLabel: { shrink: true },
            htmlInput: { 'data-testid': 'filter-date-to' },
          }}
        />
      </Grid>
      <Grid size={{ xs: 6, md: 3, lg: 2 }}>
        <TextField
          fullWidth
          type="number"
          label={t('orders.filters.minTotal')}
          value={minTotal}
          onChange={(e) => setMinTotal(e.target.value)}
          slotProps={{ htmlInput: { 'data-testid': 'filter-min-total' } }}
        />
      </Grid>
      <Grid size={{ xs: 6, md: 3, lg: 2 }}>
        <TextField
          fullWidth
          type="number"
          label={t('orders.filters.maxTotal')}
          value={maxTotal}
          onChange={(e) => setMaxTotal(e.target.value)}
          slotProps={{ htmlInput: { 'data-testid': 'filter-max-total' } }}
        />
      </Grid>
      <Grid
        size={{ xs: 12, lg: 'auto' }}
        sx={{ ml: 'auto', display: 'flex', justifyContent: 'flex-end' }}
      >
        <Button
          size="small"
          startIcon={<FilterAltOffOutlinedIcon />}
          onClick={onReset}
          data-testid="filter-reset"
        >
          {t('app.reset')}
        </Button>
      </Grid>
    </Grid>
  )
}
