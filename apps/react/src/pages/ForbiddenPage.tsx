import ShieldOutlinedIcon from '@mui/icons-material/ShieldOutlined'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Typography from '@mui/material/Typography'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'

export default function ForbiddenPage() {
  const { t } = useTranslation()
  return (
    <Box sx={{ textAlign: 'center', py: 10 }} data-testid="forbidden-page">
      <ShieldOutlinedIcon sx={{ fontSize: 64, color: 'warning.main', mb: 2 }} />
      <Typography variant="h4" sx={{ mb: 1 }}>
        {t('errors.403')}
      </Typography>
      <Typography color="text.secondary" sx={{ mb: 3 }}>
        {t('errors.403Body')}
      </Typography>
      <Button variant="contained" component={Link} to="/dashboard">
        {t('errors.goHome')}
      </Button>
    </Box>
  )
}
