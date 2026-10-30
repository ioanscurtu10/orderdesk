import CssBaseline from '@mui/material/CssBaseline'
import { ThemeProvider } from '@mui/material/styles'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useMemo } from 'react'
import { RouterProvider } from 'react-router'
import { ToastHost } from '@/components/ToastHost'
import { router } from '@/router'
import { useUiStore } from '@/stores/ui'
import { buildTheme } from '@/theme'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // The API is local and fast; one retry is enough and keeps error states quick to appear.
      retry: 1,
      staleTime: 10_000,
      refetchOnWindowFocus: false,
    },
  },
})

export function App() {
  const mode = useUiStore((s) => s.theme)
  const theme = useMemo(() => buildTheme(mode), [mode])
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <RouterProvider router={router} />
        <ToastHost />
      </ThemeProvider>
    </QueryClientProvider>
  )
}
