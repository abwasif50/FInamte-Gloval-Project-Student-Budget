import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  // Vercel serves this app from the domain root. The old GitHub Pages URL
  // lives under a repository subpath and cannot host the Express API.
  base: '/',
  plugins: [react()],
  server: { proxy: { '/api': { target: 'http://127.0.0.1:3030', changeOrigin: true } } },
})
