import { defineConfig } from 'vite'
import react from '@vitejs/react-refresh' // หรือสคริปต์ react ตัวที่คุณใช้อยู่

export default defineConfig({
  // ... โค้ดเดิมของคุณ ...
  preview: {
    host: true,
    allowedHosts: ['aware-insight-production-34a7.up.railway.app'],
    port: 4173
  },
  server: {
    host: true,
    port: 5173,
    // เพิ่มคำสั่ง proxy ตัวนี้เข้าไปครับ 👇
    proxy: {
      '/api': {
        target: 'https://meetplanning-production.up.railway.app',
        changeOrigin: true,
        secure: false,
      },
      '/auth': {
        target: 'https://meetplanning-production.up.railway.app/api',
        changeOrigin: true,
        secure: false,
      }
    }
  }
})