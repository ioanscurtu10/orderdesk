import Button from '@mui/material/Button'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogContentText from '@mui/material/DialogContentText'
import DialogTitle from '@mui/material/DialogTitle'
import { useTranslation } from 'react-i18next'

interface Props {
  open: boolean
  title: string
  body?: string
  confirmText?: string
  cancelText?: string
  danger?: boolean
  loading?: boolean
  onConfirm: () => void
  onCancel: () => void
}

export function ConfirmDialog({
  open,
  title,
  body,
  confirmText,
  cancelText,
  danger,
  loading,
  onConfirm,
  onCancel,
}: Props) {
  const { t } = useTranslation()
  return (
    <Dialog open={open} onClose={onCancel} maxWidth="xs" fullWidth data-testid="confirm-dialog">
      <DialogTitle>{title}</DialogTitle>
      {body && (
        <DialogContent>
          <DialogContentText>{body}</DialogContentText>
        </DialogContent>
      )}
      <DialogActions>
        <Button onClick={onCancel} data-testid="confirm-cancel">
          {cancelText ?? t('app.cancel')}
        </Button>
        <Button
          variant="contained"
          color={danger ? 'error' : 'primary'}
          onClick={onConfirm}
          disabled={loading}
          data-testid="confirm-ok"
        >
          {confirmText ?? t('app.confirm')}
        </Button>
      </DialogActions>
    </Dialog>
  )
}
