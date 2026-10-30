import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline'
import DownloadOutlinedIcon from '@mui/icons-material/DownloadOutlined'
import UploadFileOutlinedIcon from '@mui/icons-material/UploadFileOutlined'
import UploadIcon from '@mui/icons-material/Upload'
import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import Chip from '@mui/material/Chip'
import Stack from '@mui/material/Stack'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableContainer from '@mui/material/TableContainer'
import TableHead from '@mui/material/TableHead'
import TablePagination from '@mui/material/TablePagination'
import TableRow from '@mui/material/TableRow'
import Typography from '@mui/material/Typography'
import Papa from 'papaparse'
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
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
import { errorMessage } from '@/api/client'
import { useImportOrders } from '@/api/queries'
import { StatusChip } from '@/components/StatusChip'
import { useUiStore } from '@/stores/ui'

const knownStatuses: readonly string[] = ORDER_STATUSES

export default function ImportPage() {
  const { t } = useTranslation()
  const notify = useUiStore((s) => s.notify)
  const importMutation = useImportOrders()

  const [fileName, setFileName] = useState<string | null>(null)
  const [rawRows, setRawRows] = useState<Array<Record<string, unknown>>>([])
  const [validated, setValidated] = useState<RowValidation[]>([])
  const [parseError, setParseError] = useState<string | null>(null)
  const [result, setResult] = useState<ImportResult | null>(null)
  const [page, setPage] = useState(0)

  const validRows = useMemo(() => validated.filter((v) => v.errors.length === 0), [validated])
  const invalidRows = useMemo(() => validated.filter((v) => v.errors.length > 0), [validated])
  const groups = useMemo(() => groupImportRows(validRows), [validRows])

  function onFile(file: File | undefined) {
    setResult(null)
    setParseError(null)
    setRawRows([])
    setValidated([])
    setPage(0)
    setFileName(file?.name ?? null)
    if (!file) return
    Papa.parse<Record<string, unknown>>(file, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (h) => h.trim(),
      complete: (res) => {
        if (res.errors.length && res.data.length === 0) {
          setParseError(res.errors[0]?.message ?? 'Parse error')
          return
        }
        setRawRows(res.data)
        // Client-side validation gives instant feedback; the server validates again on import.
        setValidated(validateImportRows(res.data))
      },
      error: (err) => setParseError(err.message),
    })
  }

  async function runImport() {
    try {
      // Send only rows that passed client validation; the server still re-checks everything.
      const rows = validRows.map((v) => rawRows[v.row - 1]!)
      const res = await importMutation.mutateAsync(rows)
      setResult(res)
      notify(
        t('import.result', { imported: res.imported, skipped: res.skipped }),
        res.imported ? 'success' : 'warning',
      )
    } catch (e) {
      notify(errorMessage(e), 'error')
    }
  }

  const pageRows = validated.slice(page * 25, page * 25 + 25)

  return (
    <div data-testid="import-page">
      <Stack direction="row" flexWrap="wrap" alignItems="center" gap={1.5} sx={{ mb: 2 }}>
        <Typography variant="h5" sx={{ mr: 'auto' }}>
          {t('import.title')}
        </Typography>
        <Button
          variant="outlined"
          startIcon={<DownloadOutlinedIcon />}
          onClick={() =>
            downloadText(
              importTemplateCsv(),
              'orderdesk-import-template.csv',
              'text/csv;charset=utf-8',
            )
          }
          data-testid="download-template"
        >
          {t('import.downloadTemplate')}
        </Button>
      </Stack>

      <Card sx={{ p: 2, mb: 2 }}>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          {t('import.intro')}
        </Typography>
        <Stack direction="row" alignItems="center" gap={2} flexWrap="wrap">
          <Button component="label" variant="contained" startIcon={<UploadFileOutlinedIcon />}>
            {t('import.chooseFile')}
            <input
              type="file"
              accept=".csv,text/csv"
              hidden
              data-testid="import-file"
              onChange={(e) => onFile(e.target.files?.[0])}
            />
          </Button>
          <Typography variant="body2" color="text.secondary">
            {fileName ?? t('import.noFile')}
          </Typography>
        </Stack>
        {parseError && (
          <Alert severity="error" sx={{ mt: 2 }}>
            {parseError}
          </Alert>
        )}
      </Card>

      {validated.length > 0 && (
        <>
          <Stack direction="row" flexWrap="wrap" alignItems="center" gap={1} sx={{ mb: 2 }}>
            <Chip
              color="success"
              variant="outlined"
              label={t('import.validRows', { count: validRows.length })}
              data-testid="valid-count"
            />
            <Chip
              color={invalidRows.length ? 'error' : 'default'}
              variant="outlined"
              label={t('import.invalidRows', { count: invalidRows.length })}
              data-testid="invalid-count"
            />
            <Chip
              color="primary"
              variant="outlined"
              label={t('import.ordersToCreate', { count: groups.length })}
              data-testid="orders-to-create"
            />
            <Box sx={{ flexGrow: 1 }} />
            <Button
              variant="contained"
              startIcon={<UploadIcon />}
              disabled={!groups.length || !!result || importMutation.isPending}
              onClick={() => void runImport()}
              data-testid="run-import"
            >
              {t('import.run', { count: groups.length })}
            </Button>
          </Stack>

          {result && (
            <Alert
              severity={result.errors.length ? 'warning' : 'success'}
              sx={{ mb: 2 }}
              data-testid="import-result"
            >
              <Typography fontWeight={500}>
                {t('import.result', { imported: result.imported, skipped: result.skipped })}
              </Typography>
              {result.errors.length > 0 && (
                <Box sx={{ mt: 1, fontSize: 14 }}>
                  <Typography variant="body2" fontWeight={500}>
                    {t('import.serverErrors')}
                  </Typography>
                  <ul style={{ margin: 0, paddingLeft: 16 }}>
                    {result.errors.map((e, i) => (
                      <li key={i}>
                        {t('import.row')} {e.row}: {e.message}
                      </li>
                    ))}
                  </ul>
                </Box>
              )}
            </Alert>
          )}

          <Card>
            <Typography variant="subtitle1" fontWeight={500} sx={{ px: 2, pt: 1.5 }}>
              {t('import.preview')}
            </Typography>
            <TableContainer>
              <Table size="small" className="od-tabular" data-testid="import-preview">
                <TableHead>
                  <TableRow>
                    <TableCell>{t('import.row')}</TableCell>
                    {IMPORT_COLUMNS.map((c) => (
                      <TableCell key={c}>{c}</TableCell>
                    ))}
                    <TableCell>{t('import.errors')}</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {pageRows.map((v) => {
                    const raw = rawRows[v.row - 1] ?? {}
                    return (
                      <TableRow key={v.row}>
                        <TableCell>{v.row}</TableCell>
                        {IMPORT_COLUMNS.map((c) => (
                          <TableCell key={c} sx={{ whiteSpace: 'nowrap' }}>
                            {c === 'status' ? (
                              knownStatuses.includes(String(raw.status)) ? (
                                <StatusChip status={raw.status as OrderStatus} />
                              ) : (
                                <Typography component="span" color="error" variant="body2">
                                  {String(raw.status ?? '')}
                                </Typography>
                              )
                            ) : (
                              String(raw[c] ?? '')
                            )}
                          </TableCell>
                        ))}
                        <TableCell>
                          {v.errors.length ? (
                            <Box sx={{ color: 'error.main', fontSize: 12 }}>
                              {v.errors.map((e) => (
                                <div key={e}>{e}</div>
                              ))}
                            </Box>
                          ) : (
                            <CheckCircleOutlineIcon color="success" fontSize="small" />
                          )}
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </TableContainer>
            <TablePagination
              component="div"
              count={validated.length}
              page={page}
              onPageChange={(_e, p) => setPage(p)}
              rowsPerPage={25}
              rowsPerPageOptions={[25]}
            />
          </Card>
        </>
      )}
    </div>
  )
}
