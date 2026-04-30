import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    // Standard Vite proxy for local development
    proxy: {
      '/api/proxy': {
        target: 'https://fasih-survey.bps.go.id',
        changeOrigin: true,
        rewrite: (path) => {
          // This allows you to call /api/proxy/designer/api/...
          // instead of /api/proxy?url=https://...
          return path.replace(/^\/api\/proxy/, '')
        },
      }
    }
  }
})
