import type { OrderStatus } from './types'

/**
 * Design tokens. Both apps build their framework theme (Vuetify / MUI) from these values,
 * so the two implementations look like one product.
 */
export const colors = {
  primary: '#2F5BEA',
  primaryDark: '#6B8BFF',
  secondary: '#0E9F8A',
  surfaceLight: '#F6F7FB',
  surfaceDark: '#0F1420',
  paperDark: '#171D2B',
  success: '#1E9E63',
  warning: '#E08A00',
  error: '#D64545',
  info: '#2A7FD5',
} as const

export const statusColors: Record<OrderStatus, string> = {
  draft: '#7A8599',
  confirmed: '#2A7FD5',
  shipped: '#E08A00',
  delivered: '#1E9E63',
  cancelled: '#D64545',
}

/** Categorical palette for charts (colour-blind friendly ordering). */
export const chartPalette = ['#2F5BEA', '#0E9F8A', '#E08A00', '#8E5BD6', '#D64545', '#2A7FD5']

export const fontFamily = `'Inter', system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif`
