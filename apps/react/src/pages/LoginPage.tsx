import DarkModeOutlinedIcon from '@mui/icons-material/DarkModeOutlined'
import LightModeOutlinedIcon from '@mui/icons-material/LightModeOutlined'
import PlaylistAddCheckIcon from '@mui/icons-material/PlaylistAddCheck'
import Alert from '@mui/material/Alert'
import Avatar from '@mui/material/Avatar'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import Divider from '@mui/material/Divider'
import IconButton from '@mui/material/IconButton'
import Stack from '@mui/material/Stack'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { loginSchema, type LoginInput } from '@orderdesk/shared'
import { errorMessage, httpStatus } from '@/api/client'
import { authApi } from '@/api/endpoints'
import { useAuthStore } from '@/stores/auth'
import { useUiStore } from '@/stores/ui'

const demoAccounts = [
  { labelKey: 'login.demoAdmin', email: 'admin@orderdesk.dev', password: 'admin123' },
  { labelKey: 'login.demoViewer', email: 'viewer@orderdesk.dev', password: 'viewer123' },
]

export default function LoginPage() {
  const { t } = useTranslation()
  const setSession = useAuthStore((s) => s.setSession)
  const expired = useAuthStore((s) => s.logoutReason === 'expired')
  const mode = useUiStore((s) => s.theme)
  const toggleTheme = useUiStore((s) => s.toggleTheme)
  const [error, setError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  })

  const onSubmit = handleSubmit(async (values) => {
    setError(null)
    try {
      // Storing the session re-renders the route wrapper, which performs the redirect.
      setSession(await authApi.login(values))
    } catch (e) {
      setError(httpStatus(e) === 401 ? t('login.invalid') : errorMessage(e))
    }
  })

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        p: 2,
      }}
    >
      <Card sx={{ p: { xs: 3, sm: 4 }, width: '100%', maxWidth: 440 }}>
        <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mb: 3 }}>
          <Avatar variant="rounded" sx={{ bgcolor: 'primary.main', width: 40, height: 40 }}>
            <PlaylistAddCheckIcon />
          </Avatar>
          <Box sx={{ flexGrow: 1 }}>
            <Typography variant="h6" fontWeight={700}>
              {t('app.name')}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {t('app.tagline')} · React
            </Typography>
          </Box>
          <IconButton size="small" onClick={toggleTheme} aria-label={t('app.theme')}>
            {mode === 'dark' ? <LightModeOutlinedIcon /> : <DarkModeOutlinedIcon />}
          </IconButton>
        </Stack>

        <Typography variant="h5" component="h1" sx={{ mb: 0.5 }}>
          {t('login.title')}
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          {t('login.subtitle')}
        </Typography>

        {expired && (
          <Alert severity="warning" sx={{ mb: 2 }}>
            {t('app.sessionExpired')}
          </Alert>
        )}

        <Box component="form" onSubmit={onSubmit} noValidate data-testid="login-form">
          <Stack spacing={2}>
            <TextField
              label={t('login.email')}
              type="email"
              autoComplete="username"
              fullWidth
              error={!!errors.email}
              helperText={errors.email?.message ? t(errors.email.message) : ' '}
              {...register('email')}
              slotProps={{ htmlInput: { 'data-testid': 'login-email' } }}
            />
            <TextField
              label={t('login.password')}
              type="password"
              autoComplete="current-password"
              fullWidth
              error={!!errors.password}
              helperText={errors.password?.message ? t(errors.password.message) : ' '}
              {...register('password')}
              slotProps={{ htmlInput: { 'data-testid': 'login-password' } }}
            />
            {error && (
              <Alert severity="error" data-testid="login-error">
                {error}
              </Alert>
            )}
            <Button
              type="submit"
              variant="contained"
              size="large"
              fullWidth
              disabled={isSubmitting}
              data-testid="login-submit"
            >
              {t('login.submit')}
            </Button>
          </Stack>
        </Box>

        <Divider sx={{ my: 3 }} />
        <Stack spacing={1.5}>
          {demoAccounts.map((a) => (
            <Stack
              key={a.email}
              direction="row"
              alignItems="center"
              justifyContent="space-between"
              spacing={1}
            >
              <Box>
                <Typography variant="body2" fontWeight={500}>
                  {t(a.labelKey)}
                </Typography>
                <Typography variant="caption" color="text.secondary" className="od-mono">
                  {a.email} / {a.password}
                </Typography>
              </Box>
              <Button
                size="small"
                variant="outlined"
                data-testid={`use-${a.email.split('@')[0]}`}
                onClick={() => {
                  setValue('email', a.email, { shouldValidate: true })
                  setValue('password', a.password, { shouldValidate: true })
                }}
              >
                {t('login.useAccount')}
              </Button>
            </Stack>
          ))}
        </Stack>
      </Card>
    </Box>
  )
}
