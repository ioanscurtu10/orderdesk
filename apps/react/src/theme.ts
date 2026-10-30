import { createTheme, type Theme } from '@mui/material/styles'
import { colors, fontFamily } from '@orderdesk/shared'
import type { ThemeName } from '@/stores/ui'

/** MUI theme built from the shared design tokens, so it matches the Vuetify app. */
export function buildTheme(mode: ThemeName): Theme {
  const dark = mode === 'dark'
  return createTheme({
    palette: {
      mode,
      primary: { main: dark ? colors.primaryDark : colors.primary },
      secondary: { main: colors.secondary },
      success: { main: colors.success },
      warning: { main: colors.warning },
      error: { main: colors.error },
      info: { main: colors.info },
      background: {
        default: dark ? colors.surfaceDark : colors.surfaceLight,
        paper: dark ? colors.paperDark : '#FFFFFF',
      },
    },
    typography: {
      fontFamily,
      h5: { fontWeight: 700 },
      h6: { fontWeight: 600 },
      button: { textTransform: 'none', fontWeight: 600 },
    },
    shape: { borderRadius: 10 },
    components: {
      MuiButton: { defaultProps: { disableElevation: true } },
      MuiCard: { defaultProps: { variant: 'outlined' } },
      MuiPaper: { styleOverrides: { root: { backgroundImage: 'none' } } },
      MuiTextField: { defaultProps: { size: 'small' } },
      MuiFormControl: { defaultProps: { size: 'small' } },
      MuiChip: { styleOverrides: { root: { fontWeight: 500 } } },
      MuiAppBar: { defaultProps: { color: 'inherit', elevation: 0 } },
    },
  })
}
