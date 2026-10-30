import NavigateNextIcon from '@mui/icons-material/NavigateNext'
import Alert from '@mui/material/Alert'
import Autocomplete from '@mui/material/Autocomplete'
import Box from '@mui/material/Box'
import Breadcrumbs from '@mui/material/Breadcrumbs'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import Chip from '@mui/material/Chip'
import Divider from '@mui/material/Divider'
import Grid from '@mui/material/Grid'
import MuiLink from '@mui/material/Link'
import MenuItem from '@mui/material/MenuItem'
import Skeleton from '@mui/material/Skeleton'
import Stack from '@mui/material/Stack'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import { zodResolver } from '@hookform/resolvers/zod'
import { useQueries } from '@tanstack/react-query'
import { useEffect, useMemo, useState } from 'react'
import { Controller, FormProvider, useForm, useWatch } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { Link, useNavigate, useParams } from 'react-router'
import {
  ORDER_STATUSES,
  addDays,
  computeTotals,
  todayIso,
  type Customer,
  type Order,
  type Product,
} from '@orderdesk/shared'
import { errorMessage } from '@/api/client'
import { customersApi, productsApi } from '@/api/endpoints'
import {
  useCreateOrder,
  useCustomer,
  useCustomerSearch,
  useOrder,
  useUpdateOrder,
} from '@/api/queries'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { ErrorState } from '@/components/ErrorState'
import { LinesEditor } from '@/components/LinesEditor'
import { useDebouncedValue } from '@/hooks/useDebouncedValue'
import { useFormat } from '@/hooks/useFormat'
import { useUnsavedChanges } from '@/hooks/useUnsavedChanges'
import { useUiStore } from '@/stores/ui'
import { orderFormSchema, type OrderFormOutput, type OrderFormValues } from './orderFormSchema'

/**
 * Page = loader. In edit mode it fetches the order, its customer and its products,
 * then mounts <OrderEditor> with ready default values, so the form never has to be reset.
 */
export default function OrderFormPage() {
  const { id } = useParams()
  const existing = useOrder(id)
  const customer = useCustomer(existing.data?.customerId)
  const products = useQueries({
    queries: (existing.data?.lines ?? []).map((l) => ({
      queryKey: ['products', 'detail', l.productId],
      queryFn: () => productsApi.get(l.productId),
      staleTime: 60_000,
    })),
  })
  const productsReady = products.every((q) => !q.isPending)
  const initialProducts = useMemo(
    () => products.map((q) => q.data).filter((p): p is Product => !!p),
    [products],
  )

  if (!id) {
    return (
      <OrderEditor
        key="new"
        defaultValues={emptyValues()}
        initialProducts={[]}
        initialCustomer={null}
      />
    )
  }
  if (existing.error) {
    return (
      <ErrorState message={errorMessage(existing.error)} onRetry={() => void existing.refetch()} />
    )
  }
  if (!existing.data || !productsReady || customer.isPending) {
    return (
      <Stack spacing={2} data-testid="order-form-loading">
        <Skeleton variant="text" width={260} height={40} />
        <Skeleton variant="rounded" height={200} />
        <Skeleton variant="rounded" height={160} />
      </Stack>
    )
  }
  return (
    <OrderEditor
      key={id}
      order={existing.data}
      defaultValues={valuesFromOrder(existing.data)}
      initialProducts={initialProducts}
      initialCustomer={customer.data ?? null}
    />
  )

  function emptyValues(): OrderFormValues {
    return {
      customerId: '',
      status: 'draft',
      orderDate: todayIso(),
      dueDate: addDays(todayIso(), 30),
      notes: '',
      lines: [{ productId: '', quantity: 1, unitPrice: 0, discountPct: 0 }],
    }
  }
  function valuesFromOrder(o: Order): OrderFormValues {
    return {
      customerId: o.customerId,
      status: o.status,
      orderDate: o.orderDate,
      dueDate: o.dueDate,
      notes: o.notes,
      lines: o.lines.map((l) => ({
        productId: l.productId,
        quantity: l.quantity,
        unitPrice: l.unitPrice,
        discountPct: l.discountPct,
      })),
    }
  }
}

interface EditorProps {
  order?: Order
  defaultValues: OrderFormValues
  initialProducts: Product[]
  initialCustomer: Customer | null
}

function OrderEditor({ order, defaultValues, initialProducts, initialCustomer }: EditorProps) {
  const isEdit = !!order
  const { t } = useTranslation()
  const fmt = useFormat()
  const navigate = useNavigate()
  const notify = useUiStore((s) => s.notify)
  const [serverErrors, setServerErrors] = useState<string[]>([])
  const create = useCreateOrder()
  const update = useUpdateOrder(order?.id ?? '')

  const form = useForm<OrderFormValues, unknown, OrderFormOutput>({
    resolver: zodResolver(orderFormSchema),
    mode: 'onBlur',
    defaultValues,
  })
  const { control, handleSubmit, setError, clearErrors, formState } = form

  // ---- customers (async search + async existence check) ---------------------------
  const [customerSearch, setCustomerSearch] = useState('')
  const debouncedSearch = useDebouncedValue(customerSearch, 250)
  const customers = useCustomerSearch(debouncedSearch)
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(initialCustomer)
  const customerOptions = useMemo(() => {
    const list = customers.data ?? []
    return selectedCustomer && !list.some((c) => c.id === selectedCustomer.id)
      ? [selectedCustomer, ...list]
      : list
  }, [customers.data, selectedCustomer])

  const customerId = useWatch({ control, name: 'customerId' })
  useEffect(() => {
    if (!customerId) return
    let cancelled = false
    // Demonstrates async validation: the id must still exist on the server.
    customersApi
      .get(customerId)
      .then(() => !cancelled && clearErrors('customerId'))
      .catch(() => !cancelled && setError('customerId', { message: 'validation.customerNotFound' }))
    return () => {
      cancelled = true
    }
  }, [customerId, clearErrors, setError])

  // ---- totals + unsaved changes ---------------------------------------------------------
  const lines = useWatch({ control, name: 'lines' })
  const totals = useMemo(
    () =>
      computeTotals(
        (lines ?? []).map((l) => ({
          quantity: Number(l.quantity) || 0,
          unitPrice: Number(l.unitPrice) || 0,
          discountPct: Number(l.discountPct) || 0,
        })),
      ),
    [lines],
  )
  const { isBlocked, proceed, stay, allowLeave } = useUnsavedChanges(
    formState.isDirty && !formState.isSubmitSuccessful,
  )

  const onSubmit = handleSubmit(async (values) => {
    setServerErrors([])
    try {
      await customersApi.get(values.customerId)
    } catch {
      setError('customerId', { message: 'validation.customerNotFound' })
      return
    }
    try {
      const saved = isEdit ? await update.mutateAsync(values) : await create.mutateAsync(values)
      notify(isEdit ? t('order.saved') : t('order.created', { number: saved.number }), 'success')
      allowLeave()
      void navigate(`/orders/${saved.id}`)
    } catch (e) {
      const details = (
        e as { response?: { data?: { details?: Array<{ path: string[]; message: string }> } } }
      )?.response?.data?.details
      setServerErrors(
        details?.map((d) => `${d.path.join('.')}: ${t(d.message)}`) ?? [errorMessage(e)],
      )
    }
  })

  const title = isEdit ? t('order.editTitle', { number: order.number }) : t('order.newTitle')
  const saving = create.isPending || update.isPending
  const errors = formState.errors

  return (
    <div data-testid="order-form-page">
      <Breadcrumbs separator={<NavigateNextIcon fontSize="small" />} sx={{ mb: 1 }}>
        <MuiLink component={Link} to="/orders" underline="hover" color="inherit">
          {t('nav.orders')}
        </MuiLink>
        <Typography color="text.secondary">{title}</Typography>
      </Breadcrumbs>

      <Stack direction="row" alignItems="center" gap={1.5} sx={{ mb: 2 }}>
        <Typography variant="h5" sx={{ mr: 'auto' }}>
          {title}
        </Typography>
        {formState.isDirty && (
          <Chip size="small" color="warning" label="●" data-testid="dirty-indicator" />
        )}
      </Stack>

      <FormProvider {...form}>
        <Box component="form" onSubmit={onSubmit} noValidate data-testid="order-form">
          <Grid container spacing={2}>
            <Grid size={{ xs: 12, lg: 8 }}>
              <Card sx={{ p: 2, mb: 2 }}>
                <Grid container spacing={2}>
                  <Grid size={{ xs: 12, md: 6 }}>
                    <Controller
                      control={control}
                      name="customerId"
                      render={({ field }) => (
                        <Autocomplete
                          options={customerOptions}
                          value={customerOptions.find((c) => c.id === field.value) ?? null}
                          getOptionLabel={(c) => c.name}
                          isOptionEqualToValue={(a, b) => a.id === b.id}
                          filterOptions={(x) => x}
                          loading={customers.isFetching}
                          onInputChange={(_e, v, reason) =>
                            reason === 'input' && setCustomerSearch(v)
                          }
                          onChange={(_e, c) => {
                            setSelectedCustomer(c)
                            field.onChange(c?.id ?? '')
                          }}
                          onBlur={field.onBlur}
                          renderOption={(props, c) => (
                            <li {...props} key={c.id}>
                              <Box>
                                <div>{c.name}</div>
                                <Box
                                  component="span"
                                  sx={{ color: 'text.secondary', fontSize: 12 }}
                                >
                                  {c.code} · {c.city}, {c.country}
                                </Box>
                              </Box>
                            </li>
                          )}
                          renderInput={(params) => (
                            <TextField
                              {...params}
                              label={t('order.fields.customer')}
                              placeholder={t('order.fields.customerSearch')}
                              error={!!errors.customerId}
                              helperText={
                                errors.customerId?.message ? t(errors.customerId.message) : ' '
                              }
                              slotProps={{
                                htmlInput: {
                                  ...params.inputProps,
                                  'data-testid': 'customer-select',
                                },
                              }}
                            />
                          )}
                        />
                      )}
                    />
                  </Grid>
                  <Grid size={{ xs: 12, md: 6 }}>
                    <Controller
                      control={control}
                      name="status"
                      render={({ field }) => (
                        <TextField
                          {...field}
                          select
                          fullWidth
                          label={t('order.fields.status')}
                          helperText=" "
                          slotProps={{ select: { 'data-testid': 'status-select' } as never }}
                        >
                          {ORDER_STATUSES.map((s) => (
                            <MenuItem key={s} value={s}>
                              {t(`status.${s}`)}
                            </MenuItem>
                          ))}
                        </TextField>
                      )}
                    />
                  </Grid>
                  <Grid size={{ xs: 12, md: 6 }}>
                    <Controller
                      control={control}
                      name="orderDate"
                      render={({ field }) => (
                        <TextField
                          {...field}
                          type="date"
                          fullWidth
                          label={t('order.fields.orderDate')}
                          error={!!errors.orderDate}
                          helperText={errors.orderDate?.message ? t(errors.orderDate.message) : ' '}
                          slotProps={{
                            inputLabel: { shrink: true },
                            htmlInput: { 'data-testid': 'order-date' },
                          }}
                        />
                      )}
                    />
                  </Grid>
                  <Grid size={{ xs: 12, md: 6 }}>
                    <Controller
                      control={control}
                      name="dueDate"
                      render={({ field }) => (
                        <TextField
                          {...field}
                          type="date"
                          fullWidth
                          label={t('order.fields.dueDate')}
                          error={!!errors.dueDate}
                          helperText={errors.dueDate?.message ? t(errors.dueDate.message) : ' '}
                          slotProps={{
                            inputLabel: { shrink: true },
                            htmlInput: { 'data-testid': 'due-date' },
                          }}
                        />
                      )}
                    />
                  </Grid>
                  <Grid size={{ xs: 12 }}>
                    <Controller
                      control={control}
                      name="notes"
                      render={({ field }) => (
                        <TextField
                          {...field}
                          multiline
                          minRows={2}
                          fullWidth
                          label={t('order.fields.notes')}
                          error={!!errors.notes}
                          helperText={
                            errors.notes?.message
                              ? t(errors.notes.message)
                              : `${field.value?.length ?? 0} / 500`
                          }
                          slotProps={{ htmlInput: { maxLength: 500, 'data-testid': 'notes' } }}
                        />
                      )}
                    />
                  </Grid>
                </Grid>
              </Card>

              <Card sx={{ p: 2 }}>
                <Typography variant="subtitle1" fontWeight={500} sx={{ mb: 1 }}>
                  {t('order.lines.title')}
                </Typography>
                <LinesEditor initialProducts={initialProducts} />
                {errors.lines?.root?.message && (
                  <Typography color="error" variant="body2" sx={{ mt: 1 }}>
                    {t(errors.lines.root.message)}
                  </Typography>
                )}
              </Card>
            </Grid>

            <Grid size={{ xs: 12, lg: 4 }}>
              <Card sx={{ p: 2, mb: 2 }} className="od-tabular" data-testid="order-totals">
                <Stack direction="row" justifyContent="space-between" sx={{ mb: 0.5 }}>
                  <Typography variant="body2" color="text.secondary">
                    {t('order.totals.subtotal')}
                  </Typography>
                  <Typography variant="body2">{fmt.money(totals.subtotal)}</Typography>
                </Stack>
                <Stack direction="row" justifyContent="space-between" sx={{ mb: 1 }}>
                  <Typography variant="body2" color="text.secondary">
                    {t('order.totals.vat', { rate: totals.vatRate })}
                  </Typography>
                  <Typography variant="body2">{fmt.money(totals.vatAmount)}</Typography>
                </Stack>
                <Divider sx={{ mb: 1 }} />
                <Stack direction="row" justifyContent="space-between">
                  <Typography variant="h6">{t('order.totals.total')}</Typography>
                  <Typography variant="h6" data-testid="totals-total">
                    {fmt.money(totals.total)}
                  </Typography>
                </Stack>
              </Card>
              {serverErrors.length > 0 && (
                <Alert severity="error" sx={{ mb: 2 }} data-testid="form-errors">
                  <ul style={{ margin: 0, paddingLeft: 16 }}>
                    {serverErrors.map((e) => (
                      <li key={e}>{e}</li>
                    ))}
                  </ul>
                </Alert>
              )}
              <Stack direction="row" gap={1}>
                <Button
                  type="submit"
                  variant="contained"
                  size="large"
                  disabled={saving}
                  sx={{ flexGrow: 1 }}
                  data-testid="save-order"
                >
                  {t('app.save')}
                </Button>
                <Button
                  size="large"
                  component={Link}
                  to={isEdit ? `/orders/${order.id}` : '/orders'}
                  data-testid="cancel-order"
                >
                  {t('app.cancel')}
                </Button>
              </Stack>
            </Grid>
          </Grid>
        </Box>
      </FormProvider>

      <ConfirmDialog
        open={isBlocked}
        title={t('app.unsavedTitle')}
        body={t('app.unsavedBody')}
        confirmText={t('app.leave')}
        cancelText={t('app.stay')}
        danger
        onConfirm={proceed}
        onCancel={stay}
      />
    </div>
  )
}
