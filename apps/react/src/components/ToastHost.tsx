import Alert from '@mui/material/Alert'
import Snackbar from '@mui/material/Snackbar'
import { useUiStore } from '@/stores/ui'

/** One snackbar at a time, oldest first. */
export function ToastHost() {
  const toast = useUiStore((s) => s.toasts[0])
  const dismiss = useUiStore((s) => s.dismiss)
  if (!toast) return null
  return (
    <Snackbar
      key={toast.id}
      open
      autoHideDuration={toast.timeout}
      onClose={(_e, reason) => reason !== 'clickaway' && dismiss(toast.id)}
      anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
    >
      <Alert
        severity={toast.severity}
        variant="filled"
        onClose={() => dismiss(toast.id)}
        data-testid="toast"
        sx={{ minWidth: 280 }}
      >
        {toast.message}
      </Alert>
    </Snackbar>
  )
}
