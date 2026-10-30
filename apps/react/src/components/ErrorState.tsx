import RefreshIcon from '@mui/icons-material/Refresh'
import Alert from '@mui/material/Alert'
import AlertTitle from '@mui/material/AlertTitle'
import Button from '@mui/material/Button'
import { useTranslation } from 'react-i18next'

export function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  const { t } = useTranslation()
  return (
    <Alert
      severity="error"
      sx={{ my: 2 }}
      data-testid="error-state"
      action={
        <Button
          color="error"
          variant="outlined"
          size="small"
          startIcon={<RefreshIcon />}
          onClick={onRetry}
        >
          {t('app.retry')}
        </Button>
      }
    >
      <AlertTitle>{t('app.errorTitle')}</AlertTitle>
      {message}
    </Alert>
  )
}
