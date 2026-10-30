import Card from '@mui/material/Card'
import Skeleton from '@mui/material/Skeleton'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import type { ReactNode } from 'react'

export function KpiCard({
  title,
  value,
  icon,
  loading,
}: {
  title: string
  value: string
  icon: ReactNode
  loading?: boolean
}) {
  return (
    <Card sx={{ p: 2, height: '100%' }}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
        <Typography variant="body2" color="text.secondary">
          {title}
        </Typography>
        <Stack sx={{ color: 'primary.main' }}>{icon}</Stack>
      </Stack>
      {loading ? (
        <Skeleton variant="text" width={140} height={38} />
      ) : (
        <Typography
          className="od-tabular"
          sx={{ fontSize: '1.6rem', fontWeight: 600, letterSpacing: '-0.01em' }}
          data-testid="kpi-value"
        >
          {value}
        </Typography>
      )}
    </Card>
  )
}
