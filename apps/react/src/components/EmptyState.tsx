import InboxOutlinedIcon from '@mui/icons-material/InboxOutlined'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import type { ReactNode } from 'react'

export function EmptyState({
  title,
  body,
  icon,
  children,
}: {
  title: string
  body?: string
  icon?: ReactNode
  children?: ReactNode
}) {
  return (
    <Box sx={{ textAlign: 'center', py: 6, px: 2 }} data-testid="empty-state">
      <Box sx={{ color: 'text.secondary', mb: 1, '& svg': { fontSize: 48 } }}>
        {icon ?? <InboxOutlinedIcon />}
      </Box>
      <Typography variant="h6">{title}</Typography>
      {body && (
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
          {body}
        </Typography>
      )}
      <Box sx={{ mt: 2 }}>{children}</Box>
    </Box>
  )
}
