import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue()],
  preview: {
    host: true,
    allowedHosts: ['aware-insight-production-34a7.up.railway.app'],
    port: 4173
  },
  server: {
    host: true,
    port: 5173
  }
})