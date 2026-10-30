import Skeleton from '@mui/material/Skeleton'
import Stack from '@mui/material/Stack'

export function PageSkeleton() {
  return (
    <Stack spacing={2} sx={{ py: 1 }} data-testid="page-skeleton">
      <Skeleton variant="text" width={240} height={40} />
      <Skeleton variant="rounded" height={96} />
      <Skeleton variant="rounded" height={320} />
    </Stack>
  )
}
