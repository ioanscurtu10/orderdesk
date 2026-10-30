import AddIcon from '@mui/icons-material/Add'
import CloseIcon from '@mui/icons-material/Close'
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline'
import DownloadOutlinedIcon from '@mui/icons-material/DownloadOutlined'
import EditOutlinedIcon from '@mui/icons-material/EditOutlined'
import LinkIcon from '@mui/icons-material/Link'
import ViewColumnOutlinedIcon from '@mui/icons-material/ViewColumnOutlined'
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import Checkbox from '@mui/material/Checkbox'
import Collapse from '@mui/material/Collapse'
import IconButton from '@mui/material/IconButton'
import ListItemIcon from '@mui/material/ListItemIcon'
import ListItemText from '@mui/material/ListItemText'
import Menu from '@mui/material/Menu'
import Skeleton from '@mui/material/Skeleton'
import MenuItem from '@mui/material/MenuItem'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import { alpha } from '@mui/material/styles'
import {
  DataGrid,
  type GridColDef,
  type GridColumnVisibilityModel,
  type GridRowSelectionModel,
} from '@mui/x-data-grid'
import { roRO } from '@mui/x-data-grid/locales'
import { useCallback, useMemo, useState, type MouseEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useNavigate, useSearchParams } from 'react-router'
import {
  DEFAULT_ORDER_QUERY,
  orderQueryFromParams,
  orderQueryToParams,
  type OrderListItem,
  type OrderQuery,
  type OrderSortField,
  type OrderStatus,
} from '@orderdesk/shared'
import { downloadBlob, exportOrdersXlsx } from '@orderdesk/shared/browser'
import { errorMessage } from '@/api/client'
import { ordersApi } from '@/api/endpoints'
import { useBulkStatus, useDeleteOrders, useOrders } from '@/api/queries'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { EmptyState } from '@/components/EmptyState'
import { ErrorState } from '@/components/ErrorState'
import { OrdersFilters } from '@/components/OrdersFilters'
import { StatusChip } from '@/components/StatusChip'
import { StatusMenu } from '@/components/StatusMenu'
import { useFormat } from '@/hooks/useFormat'
import { selectIsAdmin, useAuthStore } from '@/stores/auth'
import { useUiStore } from '@/stores/ui'

const DEFAULT_VISIBILITY: GridColumnVisibilityModel = {
  subtotal: false,
  vatAmount: false,
  updatedAt: false,
}
const EMPTY_SELECTION: GridRowSelectionModel = { type: 'include', ids: new Set() }

export default function OrdersPage() {
  const { t } = useTranslation()
  const fmt = useFormat()
  const navigate = useNavigate()
  const isAdmin = useAuthStore(selectIsAdmin)
  const locale = useUiStore((s) => s.locale)
  const notify = useUiStore((s) => s.notify)
  const columnVisibility = useUiStore((s) => s.ordersColumns) ?? DEFAULT_VISIBILITY
  const setOrdersColumns = useUiStore((s) => s.setOrdersColumns)

  const [selection, setSelection] = useState<GridRowSelectionModel>(EMPTY_SELECTION)

  // ---- query state: the URL is the single source of truth ----------------------
  const [searchParams, setSearchParams] = useSearchParams()
  const query = useMemo<OrderQuery>(
    () => orderQueryFromParams(Object.fromEntries(searchParams)),
    [searchParams],
  )
  const update = useCallback(
    (patch: Partial<OrderQuery>, resetPage = true) => {
      const next: OrderQuery = { ...query, ...patch }
      if (resetPage) next.page = 1
      setSearchParams(orderQueryToParams(next), { replace: true })
      setSelection(EMPTY_SELECTION)
    },
    [query, setSearchParams],
  )

  const { data, isPending, isFetching, error, refetch } = useOrders(query)
  const bulkStatus = useBulkStatus(query)
  const bulkDelete = useDeleteOrders()

  // ---- selection ------------------------------------------------------------------
  const selectedIds = useMemo(() => {
    const rows = data?.items ?? []
    if (selection.type === 'include') return [...selection.ids].map(String)
    return rows.filter((r) => !selection.ids.has(r.id)).map((r) => r.id)
  }, [selection, data])

  // ---- columns -------------------------------------------------------------------------
  const columns = useMemo<GridColDef<OrderListItem>[]>(
    () => [
      {
        field: 'number',
        headerName: t('orders.columns.number'),
        width: 140,
        renderCell: (p) => (
          <span className="od-mono" style={{ fontWeight: 500 }}>
            {p.value as string}
          </span>
        ),
      },
      {
        field: 'customerName',
        headerName: t('orders.columns.customerName'),
        flex: 1,
        minWidth: 160,
      },
      {
        field: 'status',
        headerName: t('orders.columns.status'),
        width: 120,
        renderCell: (p) => <StatusChip status={p.value as OrderStatus} />,
      },
      {
        field: 'orderDate',
        headerName: t('orders.columns.orderDate'),
        width: 120,
        valueFormatter: (v: string) => fmt.date(v),
      },
      {
        field: 'dueDate',
        headerName: t('orders.columns.dueDate'),
        width: 120,
        valueFormatter: (v: string) => fmt.date(v),
      },
      {
        field: 'lineCount',
        headerName: t('orders.columns.lineCount'),
        width: 80,
        align: 'right',
        headerAlign: 'right',
      },
      {
        field: 'subtotal',
        headerName: t('orders.columns.subtotal'),
        width: 130,
        align: 'right',
        headerAlign: 'right',
        sortable: false,
        valueFormatter: (v: number) => fmt.money(v),
      },
      {
        field: 'vatAmount',
        headerName: t('orders.columns.vatAmount'),
        width: 120,
        align: 'right',
        headerAlign: 'right',
        sortable: false,
        valueFormatter: (v: number) => fmt.money(v),
      },
      {
        field: 'total',
        headerName: t('orders.columns.total'),
        width: 130,
        align: 'right',
        headerAlign: 'right',
        renderCell: (p) => <strong>{fmt.money(p.value as number)}</strong>,
      },
      {
        field: 'updatedAt',
        headerName: t('orders.columns.updatedAt'),
        width: 170,
        valueFormatter: (v: string) => fmt.dateTime(v),
      },
      {
        field: 'actions',
        headerName: '',
        width: 90,
        sortable: false,
        filterable: false,
        hideable: false,
        align: 'right',
        renderCell: (p) => (
          <Stack
            direction="row"
            alignItems="center"
            sx={{ height: '100%' }}
            onClick={(e) => e.stopPropagation()}
          >
            <IconButton
              size="small"
              component={Link}
              to={`/orders/${p.row.id}`}
              aria-label={t('order.tabs.details')}
            >
              <VisibilityOutlinedIcon fontSize="small" />
            </IconButton>
            {isAdmin && (
              <IconButton
                size="small"
                component={Link}
                to={`/orders/${p.row.id}/edit`}
                aria-label={t('app.edit')}
              >
                <EditOutlinedIcon fontSize="small" />
              </IconButton>
            )}
          </Stack>
        ),
      },
    ],
    [t, fmt, isAdmin],
  )

  // ---- menus ---------------------------------------------------------------------------
  const [columnsAnchor, setColumnsAnchor] = useState<HTMLElement | null>(null)
  const [exportAnchor, setExportAnchor] = useState<HTMLElement | null>(null)
  const [exporting, setExporting] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

  async function onBulkStatus(status: OrderStatus) {
    try {
      const res = await bulkStatus.mutateAsync({ ids: selectedIds, status })
      notify(t('orders.bulk.statusUpdated', { count: res.updated }), 'success')
      setSelection(EMPTY_SELECTION)
    } catch (e) {
      notify(errorMessage(e), 'error')
    }
  }

  async function onBulkDelete() {
    try {
      const res = await bulkDelete.mutateAsync(selectedIds)
      notify(t('orders.bulk.deleted', { count: res.deleted }), 'success')
      setSelection(EMPTY_SELECTION)
      setConfirmDelete(false)
    } catch (e) {
      notify(errorMessage(e), 'error')
    }
  }

  async function exportCsv() {
    setExportAnchor(null)
    setExporting(true)
    try {
      const blob = await ordersApi.exportCsv(query)
      downloadBlob(blob, `orders-${new Date().toISOString().slice(0, 10)}.csv`)
      notify(t('orders.exportDone'), 'success')
    } catch (e) {
      notify(errorMessage(e), 'error')
    } finally {
      setExporting(false)
    }
  }

  async function exportXlsx() {
    setExportAnchor(null)
    setExporting(true)
    try {
      const rows = await ordersApi.exportJson(query)
      const subset = selectedIds.length ? rows.filter((r) => selectedIds.includes(r.id)) : rows
      await exportOrdersXlsx(subset, `orders-${new Date().toISOString().slice(0, 10)}.xlsx`)
      notify(t('orders.exportDone'), 'success')
    } catch (e) {
      notify(errorMessage(e), 'error')
    } finally {
      setExporting(false)
    }
  }

  async function copyLink() {
    setExportAnchor(null)
    await navigator.clipboard.writeText(window.location.href)
    notify(t('app.copied'), 'info', 2000)
  }

  const openMenu = (set: (el: HTMLElement) => void) => (e: MouseEvent<HTMLElement>) =>
    set(e.currentTarget)

  return (
    <div data-testid="orders-page">
      <Stack direction="row" flexWrap="wrap" alignItems="center" gap={1} sx={{ mb: 2 }}>
        <Typography variant="h5">{t('orders.title')}</Typography>
        <Typography
          variant="body2"
          color="text.secondary"
          sx={{ mr: 'auto' }}
          data-testid="orders-count"
        >
          {t('orders.count', { count: fmt.number(data?.total ?? 0) })}
        </Typography>

        <Button
          variant="outlined"
          startIcon={<ViewColumnOutlinedIcon />}
          onClick={openMenu(setColumnsAnchor)}
          data-testid="columns-menu"
        >
          {t('app.columns')}
        </Button>
        <Menu
          anchorEl={columnsAnchor}
          open={!!columnsAnchor}
          onClose={() => setColumnsAnchor(null)}
        >
          {columns
            .filter((c) => c.field !== 'actions')
            .map((c) => (
              <MenuItem
                key={c.field}
                dense
                data-testid={`column-toggle-${c.field}`}
                onClick={() =>
                  setOrdersColumns({
                    ...columnVisibility,
                    [c.field]: columnVisibility[c.field] === false,
                  })
                }
              >
                <Checkbox
                  size="small"
                  checked={columnVisibility[c.field] !== false}
                  tabIndex={-1}
                  sx={{ p: 0.5, mr: 1 }}
                />
                <ListItemText>{c.headerName}</ListItemText>
              </MenuItem>
            ))}
        </Menu>

        <Button
          variant="outlined"
          startIcon={<DownloadOutlinedIcon />}
          onClick={openMenu(setExportAnchor)}
          disabled={exporting}
          data-testid="export-menu"
        >
          {t('app.export')}
        </Button>
        <Menu anchorEl={exportAnchor} open={!!exportAnchor} onClose={() => setExportAnchor(null)}>
          <MenuItem onClick={exportCsv} data-testid="export-csv">
            <ListItemText>{t('orders.exportCsv')}</ListItemText>
          </MenuItem>
          <MenuItem onClick={exportXlsx} data-testid="export-xlsx">
            <ListItemText>{t('orders.exportXlsx')}</ListItemText>
          </MenuItem>
          <MenuItem onClick={copyLink}>
            <ListItemIcon>
              <LinkIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText>{t('orders.copyLink')}</ListItemText>
          </MenuItem>
        </Menu>

        {isAdmin && (
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            component={Link}
            to="/orders/new"
            data-testid="new-order"
          >
            {t('orders.new')}
          </Button>
        )}
      </Stack>

      <Card sx={{ p: 2, mb: 2 }}>
        <OrdersFilters
          query={query}
          onChange={(p) => update(p)}
          onReset={() => setSearchParams({}, { replace: true })}
        />
      </Card>

      <Collapse in={selectedIds.length > 0}>
        <Card
          sx={{
            p: 1.5,
            mb: 2,
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            gap: 1.5,
            bgcolor: (th) => alpha(th.palette.primary.main, 0.08),
            borderColor: 'primary.main',
          }}
          data-testid="bulk-bar"
        >
          <Typography fontWeight={500} sx={{ mr: 'auto' }}>
            {t('orders.selected', { count: selectedIds.length })}
          </Typography>
          {isAdmin && (
            <>
              <StatusMenu
                label={t('orders.bulk.changeStatus')}
                disabled={bulkStatus.isPending}
                onSelect={(s) => void onBulkStatus(s)}
              />
              <Button
                color="error"
                variant="outlined"
                startIcon={<DeleteOutlineIcon />}
                onClick={() => setConfirmDelete(true)}
                data-testid="bulk-delete"
              >
                {t('orders.bulk.delete')}
              </Button>
            </>
          )}
          <IconButton
            size="small"
            onClick={() => setSelection(EMPTY_SELECTION)}
            aria-label={t('app.close')}
          >
            <CloseIcon fontSize="small" />
          </IconButton>
        </Card>
      </Collapse>

      {error ? (
        <ErrorState message={errorMessage(error)} onRetry={() => void refetch()} />
      ) : isPending ? (
        // Render the grid only once the first page is known: with rowCount still 0 the grid
        // would clamp a deep-linked page (e.g. ?page=3) back to the first page.
        <Card sx={{ p: 2 }} data-testid="orders-table-loading">
          <Skeleton variant="rounded" height={48} sx={{ mb: 1 }} />
          {Array.from({ length: 8 }, (_, i) => (
            <Skeleton key={i} variant="text" height={44} />
          ))}
        </Card>
      ) : (
        <Card data-testid="orders-table" className="od-tabular">
          <DataGrid
            rows={data?.items ?? []}
            columns={columns}
            rowCount={data?.total ?? 0}
            loading={isFetching}
            paginationMode="server"
            paginationModel={{ page: query.page - 1, pageSize: query.pageSize }}
            onPaginationModelChange={(m) =>
              update({ page: m.page + 1, pageSize: m.pageSize }, m.pageSize !== query.pageSize)
            }
            pageSizeOptions={[10, 25, 50, 100]}
            sortingMode="server"
            sortModel={[{ field: query.sortBy, sort: query.sortDir }]}
            onSortModelChange={(m) => {
              const first = m[0]
              if (!first || !first.sort)
                update({ sortBy: DEFAULT_ORDER_QUERY.sortBy, sortDir: DEFAULT_ORDER_QUERY.sortDir })
              else update({ sortBy: first.field as OrderSortField, sortDir: first.sort })
            }}
            checkboxSelection
            disableRowSelectionOnClick
            rowSelectionModel={selection}
            onRowSelectionModelChange={setSelection}
            columnVisibilityModel={columnVisibility}
            onColumnVisibilityModelChange={setOrdersColumns}
            onRowClick={(p) => void navigate(`/orders/${p.id}`)}
            disableColumnMenu
            autoHeight
            localeText={
              locale === 'ro' ? roRO.components.MuiDataGrid.defaultProps.localeText : undefined
            }
            slots={{
              noRowsOverlay: () => (
                <EmptyState title={t('app.noResults')}>
                  <Button
                    variant="outlined"
                    size="small"
                    onClick={() => setSearchParams({}, { replace: true })}
                  >
                    {t('app.reset')}
                  </Button>
                </EmptyState>
              ),
            }}
            sx={{
              border: 0,
              '& .MuiDataGrid-row': { cursor: 'pointer' },
              '& .MuiDataGrid-columnHeaderTitle': { fontWeight: 600 },
              '& .MuiDataGrid-overlayWrapper': { minHeight: 240 },
            }}
          />
        </Card>
      )}

      <ConfirmDialog
        open={confirmDelete}
        title={t('orders.bulk.deleteTitle', { count: selectedIds.length })}
        body={t('orders.bulk.deleteBody')}
        confirmText={t('app.delete')}
        danger
        loading={bulkDelete.isPending}
        onConfirm={() => void onBulkDelete()}
        onCancel={() => setConfirmDelete(false)}
      />
    </div>
  )
}
