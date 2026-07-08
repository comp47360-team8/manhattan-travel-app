import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // Mirrors the /api rewrite used in production (see vercel.json) so the
    // frontend can always call relative /api/* paths in both environments.
    proxy: {
      '/api': 'http://localhost:8000',
    },
  },
})
