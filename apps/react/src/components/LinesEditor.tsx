import AddIcon from '@mui/icons-material/Add'
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline'
import Autocomplete from '@mui/material/Autocomplete'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import IconButton from '@mui/material/IconButton'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import TextField from '@mui/material/TextField'
import { useMemo, useState } from 'react'
import { Controller, useFieldArray, useFormContext, useWatch } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { lineTotal, type Product } from '@orderdesk/shared'
import { useProductSearch } from '@/api/queries'
import { useDebouncedValue } from '@/hooks/useDebouncedValue'
import { useFormat } from '@/hooks/useFormat'
import type { OrderFormValues } from '@/pages/orderFormSchema'

interface Props {
  /** Products already on the order (edit mode), so their names render before any search. */
  initialProducts: Product[]
}

/**
 * Dynamic order lines with react-hook-form's useFieldArray.
 * One product search is shared across rows; a small cache keeps labels for selected products.
 */
export function LinesEditor({ initialProducts }: Props) {
  const { t } = useTranslation()
  const fmt = useFormat()
  const { control, setValue, formState } = useFormContext<OrderFormValues>()
  const { fields, append, remove } = useFieldArray({ control, name: 'lines' })
  const lines = useWatch({ control, name: 'lines' })

  const [search, setSearch] = useState('')
  const debounced = useDebouncedValue(search, 250)
  const results = useProductSearch(debounced)
  const [cache, setCache] = useState<Map<string, Product>>(
    () => new Map(initialProducts.map((p) => [p.id, p])),
  )

  const options = useMemo(() => {
    const map = new Map<string, Product>()
    for (const p of results.data ?? []) map.set(p.id, p)
    for (const p of cache.values()) map.set(p.id, p)
    return [...map.values()]
  }, [results.data, cache])

  const lineErrors = formState.errors.lines

  return (
    <Box data-testid="lines-editor">
      <Box sx={{ overflowX: 'auto' }}>
        <Table
          size="small"
          className="od-tabular"
          sx={{ minWidth: 700, mb: 1, tableLayout: 'fixed' }}
        >
          <TableHead>
            <TableRow>
              <TableCell>{t('order.lines.product')}</TableCell>
              <TableCell sx={{ width: 90 }}>{t('order.lines.quantity')}</TableCell>
              <TableCell sx={{ width: 130 }}>{t('order.lines.unitPrice')}</TableCell>
              <TableCell sx={{ width: 110 }}>{t('order.lines.discount')}</TableCell>
              <TableCell align="right" sx={{ width: 120 }}>
                {t('order.lines.lineTotal')}
              </TableCell>
              <TableCell sx={{ width: 48 }} />
            </TableRow>
          </TableHead>
          <TableBody>
            {fields.map((field, i) => {
              const line = lines?.[i]
              const total = lineTotal(
                Number(line?.quantity) || 0,
                Number(line?.unitPrice) || 0,
                Number(line?.discountPct) || 0,
              )
              const err = lineErrors?.[i]
              return (
                <TableRow
                  key={field.id}
                  data-testid={`line-row-${i}`}
                  sx={{ '& td': { verticalAlign: 'top', py: 1 } }}
                >
                  <TableCell>
                    <Controller
                      control={control}
                      name={`lines.${i}.productId`}
                      render={({ field: f }) => (
                        <Autocomplete
                          options={options}
                          value={options.find((p) => p.id === f.value) ?? null}
                          getOptionLabel={(p) => `${p.sku} · ${p.name}`}
                          isOptionEqualToValue={(a, b) => a.id === b.id}
                          filterOptions={(x) => x}
                          loading={results.isFetching}
                          onInputChange={(_e, v, reason) => reason === 'input' && setSearch(v)}
                          onChange={(_e, p) => {
                            f.onChange(p?.id ?? '')
                            if (p) {
                              setCache((c) => new Map(c).set(p.id, p))
                              // Prefill the catalogue price; the user can still override it.
                              setValue(`lines.${i}.unitPrice`, p.unitPrice, { shouldDirty: true })
                            }
                          }}
                          renderOption={(props, p) => (
                            <li {...props} key={p.id}>
                              <Box>
                                <div>
                                  {p.sku} · {p.name}
                                </div>
                                <Box
                                  component="span"
                                  sx={{ color: 'text.secondary', fontSize: 12 }}
                                >
                                  {fmt.money(p.unitPrice)}
                                </Box>
                              </Box>
                            </li>
                          )}
                          renderInput={(params) => (
                            <TextField
                              {...params}
                              placeholder={t('order.lines.productSearch')}
                              error={!!err?.productId}
                              helperText={
                                err?.productId?.message ? t(err.productId.message) : undefined
                              }
                              slotProps={{
                                htmlInput: {
                                  ...params.inputProps,
                                  'data-testid': `line-product-${i}`,
                                },
                              }}
                            />
                          )}
                        />
                      )}
                    />
                  </TableCell>
                  <TableCell>
                    <Controller
                      control={control}
                      name={`lines.${i}.quantity`}
                      render={({ field: f }) => (
                        <TextField
                          {...f}
                          type="number"
                          fullWidth
                          error={!!err?.quantity}
                          helperText={err?.quantity?.message ? t(err.quantity.message) : undefined}
                          slotProps={{
                            htmlInput: { min: 1, step: 1, 'data-testid': `line-qty-${i}` },
                          }}
                        />
                      )}
                    />
                  </TableCell>
                  <TableCell>
                    <Controller
                      control={control}
                      name={`lines.${i}.unitPrice`}
                      render={({ field: f }) => (
                        <TextField
                          {...f}
                          type="number"
                          fullWidth
                          error={!!err?.unitPrice}
                          helperText={
                            err?.unitPrice?.message ? t(err.unitPrice.message) : undefined
                          }
                          slotProps={{
                            htmlInput: { min: 0, step: 0.01, 'data-testid': `line-price-${i}` },
                          }}
                        />
                      )}
                    />
                  </TableCell>
                  <TableCell>
                    <Controller
                      control={control}
                      name={`lines.${i}.discountPct`}
                      render={({ field: f }) => (
                        <TextField
                          {...f}
                          type="number"
                          fullWidth
                          error={!!err?.discountPct}
                          helperText={
                            err?.discountPct?.message ? t(err.discountPct.message) : undefined
                          }
                          slotProps={{
                            htmlInput: {
                              min: 0,
                              max: 100,
                              step: 1,
                              'data-testid': `line-discount-${i}`,
                            },
                          }}
                        />
                      )}
                    />
                  </TableCell>
                  <TableCell
                    align="right"
                    sx={{ fontWeight: 500, pt: 2 }}
                    data-testid={`line-total-${i}`}
                  >
                    {fmt.money(total)}
                  </TableCell>
                  <TableCell>
                    <IconButton
                      size="small"
                      onClick={() => remove(i)}
                      disabled={fields.length === 1}
                      aria-label={t('order.lines.remove')}
                      data-testid={`line-remove-${i}`}
                    >
                      <DeleteOutlineIcon fontSize="small" />
                    </IconButton>
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </Box>
      <Button
        size="small"
        variant="outlined"
        startIcon={<AddIcon />}
        onClick={() => append({ productId: '', quantity: 1, unitPrice: 0, discountPct: 0 })}
        data-testid="add-line"
      >
        {t('order.lines.add')}
      </Button>
    </Box>
  )
}
