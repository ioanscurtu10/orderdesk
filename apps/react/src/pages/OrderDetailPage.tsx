import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline'
import CalendarMonthOutlinedIcon from '@mui/icons-material/CalendarMonthOutlined'
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline'
import DomainIcon from '@mui/icons-material/Domain'
import EditOutlinedIcon from '@mui/icons-material/EditOutlined'
import EventOutlinedIcon from '@mui/icons-material/EventOutlined'
import NavigateNextIcon from '@mui/icons-material/NavigateNext'
import NotesOutlinedIcon from '@mui/icons-material/NotesOutlined'
import PictureAsPdfOutlinedIcon from '@mui/icons-material/PictureAsPdfOutlined'
import PlaceOutlinedIcon from '@mui/icons-material/PlaceOutlined'
import SwapHorizIcon from '@mui/icons-material/SwapHoriz'
import UpdateOutlinedIcon from '@mui/icons-material/UpdateOutlined'
import UploadFileOutlinedIcon from '@mui/icons-material/UploadFileOutlined'
import Box from '@mui/material/Box'
import Breadcrumbs from '@mui/material/Breadcrumbs'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import Chip from '@mui/material/Chip'
import Divider from '@mui/material/Divider'
import Grid from '@mui/material/Grid'
import IconButton from '@mui/material/IconButton'
import List from '@mui/material/List'
import ListItem from '@mui/material/ListItem'
import ListItemIcon from '@mui/material/ListItemIcon'
import ListItemText from '@mui/material/ListItemText'
import MuiLink from '@mui/material/Link'
import Skeleton from '@mui/material/Skeleton'
import Stack from '@mui/material/Stack'
import Tab from '@mui/material/Tab'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableFooter from '@mui/material/TableFooter'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import Tabs from '@mui/material/Tabs'
import Typography from '@mui/material/Typography'
import { useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useNavigate, useParams } from 'react-router'
import type { OrderHistoryEntry, OrderStatus } from '@orderdesk/shared'
import { buildInvoicePdf, downloadBlob } from '@orderdesk/shared/browser'
import { errorMessage, httpStatus } from '@/api/client'
import {
  useBulkStatus,
  useCustomer,
  useDeleteOrders,
  useOrder,
  useOrderHistory,
} from '@/api/queries'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { ErrorState } from '@/components/ErrorState'
import { StatusChip } from '@/components/StatusChip'
import { StatusMenu } from '@/components/StatusMenu'
import { useFormat } from '@/hooks/useFormat'
import { selectIsAdmin, useAuthStore } from '@/stores/auth'
import { useUiStore } from '@/stores/ui'

const historyIcons: Record<OrderHistoryEntry['action'], ReactNode> = {
  created: <AddCircleOutlineIcon color="success" />,
  updated: <EditOutlinedIcon color="primary" />,
  status_changed: <SwapHorizIcon color="warning" />,
  imported: <UploadFileOutlinedIcon color="secondary" />,
}

export default function OrderDetailPage() {
  const { id = '' } = useParams()
  const { t } = useTranslation()
  const fmt = useFormat()
  const navigate = useNavigate()
  const isAdmin = useAuthStore(selectIsAdmin)
  const locale = useUiStore((s) => s.locale)
  const notify = useUiStore((s) => s.notify)
  const [tab, setTab] = useState('details')
  const [confirmDelete, setConfirmDelete] = useState(false)

  const order = useOrder(id)
  const history = useOrderHistory(id)
  const customer = useCustomer(order.data?.customerId)
  const setStatus = useBulkStatus()
  const remove = useDeleteOrders()

  async function changeStatus(status: OrderStatus) {
    try {
      await setStatus.mutateAsync({ ids: [id], status })
      notify(t('order.statusChanged', { status: t(`status.${status}`) }), 'success')
    } catch (e) {
      notify(errorMessage(e), 'error')
    }
  }

  async function onDelete() {
    try {
      await remove.mutateAsync([id])
      notify(t('order.deleted'), 'success')
      void navigate('/orders', { replace: true })
    } catch (e) {
      notify(errorMessage(e), 'error')
    }
  }

  async function downloadInvoice() {
    const o = order.data
    if (!o) return
    const blob = await buildInvoicePdf(
      o,
      customer.data ?? null,
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
      locale,
    )
    downloadBlob(blob, `${o.number}.pdf`)
  }

  const o = order.data

  return (
    <div data-testid="order-detail-page">
      <Breadcrumbs separator={<NavigateNextIcon fontSize="small" />} sx={{ mb: 1 }}>
        <MuiLink component={Link} to="/orders" underline="hover" color="inherit">
          {t('nav.orders')}
        </MuiLink>
        <Typography color="text.secondary">{o?.number ?? '…'}</Typography>
      </Breadcrumbs>

      {order.error ? (
        <ErrorState
          message={
            httpStatus(order.error) === 404 ? t('order.notFound') : errorMessage(order.error)
          }
          onRetry={() => void order.refetch()}
        />
      ) : (
        <>
          <Stack direction="row" flexWrap="wrap" alignItems="center" gap={1.5} sx={{ mb: 2 }}>
            <Box sx={{ mr: 'auto' }}>
              {order.isPending ? (
                <Skeleton variant="text" width={260} height={40} />
              ) : (
                o && (
                  <>
                    <Stack direction="row" alignItems="center" gap={1.5}>
                      <Typography variant="h5" data-testid="order-number">
                        {o.number}
                      </Typography>
                      <StatusChip status={o.status} size="medium" />
                    </Stack>
                    <Typography variant="body2" color="text.secondary">
                      {o.customerName} · {fmt.date(o.orderDate)}
                    </Typography>
                  </>
                )
              )}
            </Box>
            {o && (
              <>
                <Button
                  variant="outlined"
                  startIcon={<PictureAsPdfOutlinedIcon />}
                  onClick={() => void downloadInvoice()}
                  data-testid="download-invoice"
                >
                  {t('order.documents.download')} PDF
                </Button>
                {isAdmin && (
                  <>
                    <StatusMenu
                      label={t('order.changeStatus')}
                      current={o.status}
                      disabled={setStatus.isPending}
                      onSelect={(s) => void changeStatus(s)}
                    />
                    <Button
                      variant="contained"
                      startIcon={<EditOutlinedIcon />}
                      component={Link}
                      to={`/orders/${id}/edit`}
                      data-testid="edit-order"
                    >
                      {t('app.edit')}
                    </Button>
                    <IconButton
                      color="error"
                      onClick={() => setConfirmDelete(true)}
                      aria-label={t('app.delete')}
                      data-testid="delete-order"
                    >
                      <DeleteOutlineIcon />
                    </IconButton>
                  </>
                )}
              </>
            )}
          </Stack>

          <Card>
            <Tabs value={tab} onChange={(_e, v) => setTab(v as string)} sx={{ px: 1 }}>
              <Tab value="details" label={t('order.tabs.details')} data-testid="tab-details" />
              <Tab
                value="lines"
                label={
                  <Stack direction="row" alignItems="center" gap={1}>
                    {t('order.tabs.lines')}
                    {o && <Chip size="small" label={o.lineCount} sx={{ height: 20 }} />}
                  </Stack>
                }
                data-testid="tab-lines"
              />
              <Tab value="history" label={t('order.tabs.history')} data-testid="tab-history" />
              <Tab
                value="documents"
                label={t('order.tabs.documents')}
                data-testid="tab-documents"
              />
            </Tabs>
            <Divider />

            {order.isPending || !o ? (
              <Box sx={{ p: 2 }}>
                <Skeleton height={28} />
                <Skeleton height={28} />
                <Skeleton height={28} width="60%" />
              </Box>
            ) : (
              <>
                {tab === 'details' && (
                  <Grid container sx={{ p: 2 }} spacing={1}>
                    <Grid size={{ xs: 12, md: 6 }}>
                      <List dense>
                        <Row
                          icon={<DomainIcon />}
                          title={t('order.fields.customer')}
                          value={o.customerName}
                        />
                        {customer.data && (
                          <Row
                            icon={<DomainIcon />}
                            title="VAT / Email"
                            value={`${customer.data.vatId} · ${customer.data.email}`}
                          />
                        )}
                        {customer.data && (
                          <Row
                            icon={<PlaceOutlinedIcon />}
                            title={t('order.fields.location')}
                            value={`${customer.data.city}, ${customer.data.country}`}
                          />
                        )}
                        <Row
                          icon={<NotesOutlinedIcon />}
                          title={t('order.fields.notes')}
                          value={o.notes || '—'}
                        />
                      </List>
                    </Grid>
                    <Grid size={{ xs: 12, md: 6 }}>
                      <List dense>
                        <Row
                          icon={<CalendarMonthOutlinedIcon />}
                          title={t('order.fields.orderDate')}
                          value={fmt.date(o.orderDate)}
                        />
                        <Row
                          icon={<EventOutlinedIcon />}
                          title={t('order.fields.dueDate')}
                          value={fmt.date(o.dueDate)}
                        />
                        <Row
                          icon={<AddCircleOutlineIcon />}
                          title={t('order.fields.createdAt')}
                          value={fmt.dateTime(o.createdAt)}
                        />
                        <Row
                          icon={<UpdateOutlinedIcon />}
                          title={t('order.fields.updatedAt')}
                          value={fmt.dateTime(o.updatedAt)}
                        />
                      </List>
                    </Grid>
                  </Grid>
                )}

                {tab === 'lines' && (
                  <Table size="small" className="od-tabular" data-testid="lines-table">
                    <TableHead>
                      <TableRow>
                        <TableCell>{t('order.lines.sku')}</TableCell>
                        <TableCell>{t('order.lines.product')}</TableCell>
                        <TableCell align="right">{t('order.lines.quantity')}</TableCell>
                        <TableCell align="right">{t('order.lines.unitPrice')}</TableCell>
                        <TableCell align="right">{t('order.lines.discount')}</TableCell>
                        <TableCell align="right">{t('order.lines.lineTotal')}</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {o.lines.map((l) => (
                        <TableRow key={l.id}>
                          <TableCell className="od-mono">{l.sku}</TableCell>
                          <TableCell>{l.name}</TableCell>
                          <TableCell align="right">{l.quantity}</TableCell>
                          <TableCell align="right">{fmt.money(l.unitPrice)}</TableCell>
                          <TableCell align="right">{l.discountPct}%</TableCell>
                          <TableCell align="right" sx={{ fontWeight: 500 }}>
                            {fmt.money(l.lineTotal)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                    <TableFooter>
                      <TableRow>
                        <TableCell colSpan={5} align="right">
                          {t('order.totals.subtotal')}
                        </TableCell>
                        <TableCell align="right">{fmt.money(o.subtotal)}</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell colSpan={5} align="right">
                          {t('order.totals.vat', { rate: o.vatRate })}
                        </TableCell>
                        <TableCell align="right">{fmt.money(o.vatAmount)}</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell
                          colSpan={5}
                          align="right"
                          sx={{ fontWeight: 700, color: 'text.primary' }}
                        >
                          {t('order.totals.total')}
                        </TableCell>
                        <TableCell
                          align="right"
                          sx={{ fontWeight: 700, color: 'text.primary' }}
                          data-testid="order-total"
                        >
                          {fmt.money(o.total)}
                        </TableCell>
                      </TableRow>
                    </TableFooter>
                  </Table>
                )}

                {tab === 'history' && (
                  <List data-testid="history-timeline">
                    {history.isPending && <Skeleton sx={{ mx: 2 }} height={40} />}
                    {history.data?.map((h) => (
                      <ListItem key={h.id} alignItems="flex-start">
                        <ListItemIcon sx={{ mt: 0.5 }}>{historyIcons[h.action]}</ListItemIcon>
                        <ListItemText
                          primary={
                            <Stack direction="row" flexWrap="wrap" gap={1} alignItems="baseline">
                              <Typography fontWeight={500}>
                                {t(`order.history.${h.action}`)}
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                {fmt.dateTime(h.at)} · {t('order.history.by', { name: h.userName })}
                              </Typography>
                            </Stack>
                          }
                          secondary={h.details}
                        />
                      </ListItem>
                    ))}
                  </List>
                )}

                {tab === 'documents' && (
                  <List>
                    <ListItem
                      secondaryAction={
                        <Button
                          size="small"
                          variant="outlined"
                          onClick={() => void downloadInvoice()}
                        >
                          {t('order.documents.download')}
                        </Button>
                      }
                    >
                      <ListItemIcon>
                        <PictureAsPdfOutlinedIcon />
                      </ListItemIcon>
                      <ListItemText
                        primary={t('order.documents.invoice')}
                        secondary={t('order.documents.invoiceHint')}
                      />
                    </ListItem>
                  </List>
                )}
              </>
            )}
          </Card>
        </>
      )}

      <ConfirmDialog
        open={confirmDelete}
        title={t('order.deleteTitle')}
        body={t('orders.bulk.deleteBody')}
        confirmText={t('app.delete')}
        danger
        loading={remove.isPending}
        onConfirm={() => void onDelete()}
        onCancel={() => setConfirmDelete(false)}
      />
    </div>
  )
}

function Row({ icon, title, value }: { icon: ReactNode; title: string; value: string }) {
  return (
    <ListItem disableGutters>
      <ListItemIcon sx={{ minWidth: 40 }}>{icon}</ListItemIcon>
      <ListItemText primary={title} secondary={value} />
    </ListItem>
  )
}
