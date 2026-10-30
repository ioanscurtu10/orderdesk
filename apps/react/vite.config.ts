import { fileURLToPath, URL } from 'node:url'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  server: {
    proxy: {
      '/api': { target: process.env.VITE_API_PROXY ?? 'http://localhost:4000', changeOrigin: true },
    },
  },
  preview: {
    proxy: {
      '/api': { target: process.env.VITE_API_PROXY ?? 'http://localhost:4000', changeOrigin: true },
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          echarts: ['echarts', 'echarts-for-react'],
          grid: ['@mui/x-data-grid'],
        },
      },
    },
  },
})
