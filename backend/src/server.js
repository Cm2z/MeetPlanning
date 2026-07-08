
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import { pingDatabase } from './config/db.js';
import authRoutes from './routes/auth.js';
import roomRoutes from './routes/rooms.js';
import bookingRoutes from './routes/bookings.js';
import dashboardRoutes from './routes/dashboard.js';
import notificationRoutes from './routes/notifications.js';
import settingRoutes from './routes/settings.js';
import backupRoutes from './routes/backup.js';
import statsRoutes from './routes/stats.js';
import kioskRoutes from './routes/kiosk.js';
import recurringRoutes from './routes/recurring.js';
import waitlistRoutes from './routes/waitlist.js';

dotenv.config();

const app = express();
const port = Number(process.env.PORT || 4000);

app.use(helmet());
app.use(cors({ 
    origin: process.env.CLIENT_ORIGIN || 'http://localhost:5173',
    credentials: true 
}));
app.use(express.json({ limit: '10mb' }));
app.use(morgan('dev'));

app.get('/health', (_req, res) => res.json({ ok: true, service: 'MeetPlanning API' }));
app.use('/api/auth', authRoutes);
app.use('/api/rooms', roomRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/settings', settingRoutes);
app.use('/api/backup', backupRoutes);
app.use('/api/stats', statsRoutes);
app.use('/api/kiosk', kioskRoutes);
app.use('/api/recurring', recurringRoutes);
app.use('/api/waitlist', waitlistRoutes);

app.use((req, res) => res.status(404).json({ message: 'ไม่พบเส้นทาง API' }));
app.use((error, _req, res, _next) => {
  console.error(error);
  res.status(error.status || 500).json({ message: error.message || 'เกิดข้อผิดพลาดในระบบ' });
});

pingDatabase().then(() => {
  app.listen(port, () => console.log('MeetPlanning API running on http://localhost:' + port));
}).catch((error) => {
  console.error('Cannot connect to MySQL:', error.message);
  process.exit(1);
});
