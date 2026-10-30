import DashboardOutlinedIcon from '@mui/icons-material/DashboardOutlined'
import DarkModeOutlinedIcon from '@mui/icons-material/DarkModeOutlined'
import LightModeOutlinedIcon from '@mui/icons-material/LightModeOutlined'
import ListAltOutlinedIcon from '@mui/icons-material/ListAltOutlined'
import LogoutIcon from '@mui/icons-material/Logout'
import MenuIcon from '@mui/icons-material/Menu'
import PlaylistAddCheckIcon from '@mui/icons-material/PlaylistAddCheck'
import UploadFileOutlinedIcon from '@mui/icons-material/UploadFileOutlined'
import AppBar from '@mui/material/AppBar'
import Avatar from '@mui/material/Avatar'
import Box from '@mui/material/Box'
import Container from '@mui/material/Container'
import Divider from '@mui/material/Divider'
import Drawer from '@mui/material/Drawer'
import IconButton from '@mui/material/IconButton'
import List from '@mui/material/List'
import ListItemButton from '@mui/material/ListItemButton'
import ListItemIcon from '@mui/material/ListItemIcon'
import ListItemText from '@mui/material/ListItemText'
import Menu from '@mui/material/Menu'
import MenuItem from '@mui/material/MenuItem'
import Stack from '@mui/material/Stack'
import ToggleButton from '@mui/material/ToggleButton'
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup'
import Toolbar from '@mui/material/Toolbar'
import Typography from '@mui/material/Typography'
import useMediaQuery from '@mui/material/useMediaQuery'
import { useTheme } from '@mui/material/styles'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router'
import { selectIsAdmin, useAuthStore } from '@/stores/auth'
import { useUiStore } from '@/stores/ui'

const DRAWER_WIDTH = 240

const titles: Array<[RegExp, string]> = [
  [/^\/dashboard/, 'nav.dashboard'],
  [/^\/orders\/new/, 'nav.newOrder'],
  [/^\/orders/, 'nav.orders'],
  [/^\/import/, 'nav.import'],
  [/^\/forbidden/, 'errors.403'],
]

export function AppShell() {
  const { t } = useTranslation()
  const theme = useTheme()
  const mobile = useMediaQuery(theme.breakpoints.down('md'))
  const [open, setOpen] = useState(false)
  const [userMenu, setUserMenu] = useState<HTMLElement | null>(null)
  const user = useAuthStore((s) => s.user)
  const isAdmin = useAuthStore(selectIsAdmin)
  const logout = useAuthStore((s) => s.logout)
  const mode = useUiStore((s) => s.theme)
  const toggleTheme = useUiStore((s) => s.toggleTheme)
  const locale = useUiStore((s) => s.locale)
  const setLocale = useUiStore((s) => s.setLocale)
  const navigate = useNavigate()
  const location = useLocation()
  const titleKey = titles.find(([re]) => re.test(location.pathname))?.[1] ?? 'app.name'

  const nav = [
    {
      to: '/dashboard',
      icon: <DashboardOutlinedIcon />,
      label: 'nav.dashboard',
      testid: 'nav-dashboard',
    },
    { to: '/orders', icon: <ListAltOutlinedIcon />, label: 'nav.orders', testid: 'nav-orders' },
    ...(isAdmin
      ? [
          {
            to: '/import',
            icon: <UploadFileOutlinedIcon />,
            label: 'nav.import',
            testid: 'nav-import',
          },
        ]
      : []),
  ]

  const drawer = (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <Stack direction="row" spacing={1.5} alignItems="center" sx={{ px: 2, py: 2 }}>
        <Avatar variant="rounded" sx={{ bgcolor: 'primary.main', width: 32, height: 32 }}>
          <PlaylistAddCheckIcon fontSize="small" />
        </Avatar>
        <Box>
          <Typography fontWeight={700}>{t('app.name')}</Typography>
          <Typography variant="caption" color="text.secondary">
            React · MUI
          </Typography>
        </Box>
      </Stack>
      <List sx={{ px: 1 }}>
        {nav.map((item) => (
          <ListItemButton
            key={item.to}
            component={NavLink}
            to={item.to}
            onClick={() => setOpen(false)}
            data-testid={item.testid}
            sx={{
              borderRadius: 2,
              mb: 0.5,
              '&.active': { bgcolor: 'action.selected', fontWeight: 600 },
            }}
          >
            <ListItemIcon sx={{ minWidth: 40 }}>{item.icon}</ListItemIcon>
            <ListItemText primary={t(item.label)} />
          </ListItemButton>
        ))}
      </List>
      <Box sx={{ mt: 'auto', p: 2 }}>
        <Typography variant="caption" color="text.secondary">
          {user?.name} · {user?.role}
        </Typography>
      </Box>
    </Box>
  )

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>
      <Drawer
        variant={mobile ? 'temporary' : 'permanent'}
        open={mobile ? open : true}
        onClose={() => setOpen(false)}
        sx={{
          width: DRAWER_WIDTH,
          flexShrink: 0,
          '& .MuiDrawer-paper': { width: DRAWER_WIDTH, boxSizing: 'border-box' },
        }}
      >
        {drawer}
      </Drawer>

      <Box sx={{ flexGrow: 1, minWidth: 0 }}>
        <AppBar
          position="sticky"
          sx={{ borderBottom: 1, borderColor: 'divider', bgcolor: 'background.paper' }}
        >
          <Toolbar variant="dense" sx={{ minHeight: 56, gap: 1 }}>
            {mobile && (
              <IconButton edge="start" onClick={() => setOpen(true)} aria-label={t('nav.menu')}>
                <MenuIcon />
              </IconButton>
            )}
            <Typography sx={{ flexGrow: 1, fontWeight: 500 }}>{t(titleKey)}</Typography>

            <ToggleButtonGroup
              size="small"
              exclusive
              value={locale}
              onChange={(_e, v) => v && setLocale(v)}
              aria-label={t('app.language')}
            >
              <ToggleButton value="ro" data-testid="lang-ro" sx={{ px: 1.5 }}>
                RO
              </ToggleButton>
              <ToggleButton value="en" data-testid="lang-en" sx={{ px: 1.5 }}>
                EN
              </ToggleButton>
            </ToggleButtonGroup>

            <IconButton
              onClick={toggleTheme}
              aria-label={mode === 'dark' ? t('app.lightMode') : t('app.darkMode')}
              data-testid="theme-toggle"
            >
              {mode === 'dark' ? <LightModeOutlinedIcon /> : <DarkModeOutlinedIcon />}
            </IconButton>

            <IconButton
              onClick={(e) => setUserMenu(e.currentTarget)}
              aria-label={user?.name ?? ''}
              data-testid="user-menu"
            >
              <Avatar
                sx={{
                  bgcolor: 'secondary.main',
                  width: 32,
                  height: 32,
                  fontSize: 14,
                  fontWeight: 700,
                }}
              >
                {user?.name?.slice(0, 1)}
              </Avatar>
            </IconButton>
            <Menu anchorEl={userMenu} open={!!userMenu} onClose={() => setUserMenu(null)}>
              <MenuItem disabled>
                <ListItemText primary={user?.name} secondary={user?.email} />
              </MenuItem>
              <Divider />
              <MenuItem
                data-testid="sign-out"
                onClick={() => {
                  setUserMenu(null)
                  logout()
                  void navigate('/login')
                }}
              >
                <ListItemIcon>
                  <LogoutIcon fontSize="small" />
                </ListItemIcon>
                {t('app.signOut')}
              </MenuItem>
            </Menu>
          </Toolbar>
        </AppBar>

        <Container maxWidth={false} sx={{ py: { xs: 2, md: 3 }, px: { xs: 2, md: 3 } }}>
          <Outlet />
        </Container>
      </Box>
    </Box>
  )
}
