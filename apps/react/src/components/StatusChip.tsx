import Chip from '@mui/material/Chip'
import { alpha } from '@mui/material/styles'
import { useTranslation } from 'react-i18next'
import { statusColors, type OrderStatus } from '@orderdesk/shared'

export function StatusChip({
  status,
  size = 'small',
}: {
  status: OrderStatus
  size?: 'small' | 'medium'
}) {
  const { t } = useTranslation()
  const color = statusColors[status]
  return (
    <Chip
      label={t(`status.${status}`)}
      size={size}
      data-testid={`status-chip-${status}`}
      sx={{ bgcolor: alpha(color, 0.14), color, fontWeight: 600, borderRadius: 1.5 }}
    />
  )
}
