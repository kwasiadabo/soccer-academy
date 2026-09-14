import path from 'node:path'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, './src'),
    },
  },
  server: {
    port: 5173,
    // *.lvh.me resolves to 127.0.0.1 (see the backend's tenant-resolution
    // middleware) — allowed here so real academy subdomains can be exercised
    // in local dev, e.g. http://kapikids.lvh.me:5173.
    allowedHosts: ['.lvh.me'],
    proxy: {
      // The app itself now sends X-Academy-Slug on every request (see
      // src/lib/tenant.ts) — no need for the proxy to inject it too.
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },
})
