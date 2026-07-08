import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react' 

export default defineConfig({
  plugins: [react()],
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