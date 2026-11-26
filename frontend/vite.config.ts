import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// The API lives on :8000 in development. Proxying it makes the site same-origin, so it works
// from any phone, LAN address or tunnel (trycloudflare, ngrok...) without VITE_API_URL tweaks.
const backend = process.env.VITE_PROXY_TARGET || 'http://localhost:8000'

export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    // Tunnel hostnames change on every run, so any Host header is accepted in dev.
    allowedHosts: true,
    proxy: {
      '/api': { target: backend, changeOrigin: true },
      '/uploads': { target: backend, changeOrigin: true },
    },
  },
})
