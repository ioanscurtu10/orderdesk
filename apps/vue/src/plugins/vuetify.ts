import '@mdi/font/css/materialdesignicons.css'
import 'vuetify/styles'
import { createVuetify } from 'vuetify'
import { en, ro } from 'vuetify/locale'
import { colors } from '@orderdesk/shared'

// Components and directives are registered on demand by vite-plugin-vuetify (autoImport),
// which keeps the bundle to what the templates actually use.
export const vuetify = createVuetify({
  display: { mobileBreakpoint: 'md' },
  locale: {
    locale: 'en',
    fallback: 'en',
    messages: { en, ro },
  },
  theme: {
    defaultTheme: 'light',
    themes: {
      light: {
        dark: false,
        colors: {
          primary: colors.primary,
          secondary: colors.secondary,
          background: colors.surfaceLight,
          surface: '#FFFFFF',
          success: colors.success,
          warning: colors.warning,
          error: colors.error,
          info: colors.info,
        },
      },
      dark: {
        dark: true,
        colors: {
          primary: colors.primaryDark,
          secondary: colors.secondary,
          background: colors.surfaceDark,
          surface: colors.paperDark,
          success: colors.success,
          warning: colors.warning,
          error: colors.error,
          info: colors.info,
        },
      },
    },
  },
  defaults: {
    VCard: { rounded: 'lg', elevation: 0, border: true },
    VTextField: { variant: 'outlined', density: 'comfortable', hideDetails: 'auto' },
    VTextarea: { variant: 'outlined', density: 'comfortable', hideDetails: 'auto' },
    VSelect: { variant: 'outlined', density: 'comfortable', hideDetails: 'auto' },
    VAutocomplete: { variant: 'outlined', density: 'comfortable', hideDetails: 'auto' },
    VFileInput: { variant: 'outlined', density: 'comfortable', hideDetails: 'auto' },
    VBtn: { rounded: 'lg' },
    VChip: { rounded: 'lg' },
  },
})
