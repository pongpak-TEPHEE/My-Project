import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { globalLimiter } from './middleware/rateLimiter.js'
import { globalErrorHandler } from './middleware/errorHandler.js'

const app = express();
app.use(helmet()); // ปิดบัง Server Info และกัน XSS เบื้องต้น

app.use(cors({
  // ⚠️⚠️⚠️⚠️⚠️⚠️ เราต้องตั้งค่าให้แค่ frontend เท่านั้นที่จะสามมารถ ⚠️⚠️⚠️⚠️⚠️⚠️
    origin: "*", // '*' อนุญาตให้ทุกคนเข้าถึงได้ (เหมาะสำหรับช่วง Dev/Test/ngrok) ตอน implement ต้องใช้ domain เช่น origin: ['https://your-frontend-domain.com']
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'], // อนุญาต Method อะไรบ้าง
    allowedHeaders: ['Content-Type', 'Authorization', 'ngrok-skip-browser-warning'], // อนุญาต Header อะไรบ้าง (สำคัญสำหรับ Token)
    credentials: true // อนุญาตให้ส่ง Token/Cookie มาได้
}));




app.set('trust proxy', 1);
app.use(globalLimiter);
app.use(express.json());

app.use((err, req, res, next) => {
  const statusCode = err.statusCode || 500;
  res.status(statusCode).json({
    status: 'error',
    message: err.message || "Someting is wrong. ⚠️⚠️⚠️⚠️", 
    stack: process.env.NODE_ENV === 'production' ? '🥞' : err.stack // ซ่อน stack trace
  });
});

// All of routes 
import authRoutes from './routes/auth.routes.js';           // requestOTP, verifyOTP, register
import bookingsRoutes from './routes/bookings.route.js';    // createBooking, getPendingBookings, updateBookingStatus
import roomsRoutes from './routes/rooms.route.js';          // getRoomScheduleToday, getAllRooms
import usersRoutes from './routes/users.route.js';          // getUsers
import scheduleRoutes from './routes/schedule.routes.js';


app.use('/auth', authRoutes);
app.use('/users', usersRoutes);
app.use('/rooms', roomsRoutes);
app.use('/bookings', bookingsRoutes);
app.use('/schedules', scheduleRoutes);

// ดักจับ 404 Not Found (ถ้าไม่เข้า Route ด้านบนเลย จะมาตกตรงนี้)
app.use((req, res, next) => {
  res.status(404).json({ 
    status: 'error',
    message: 'ไม่พบเส้นทาง API ที่ท่านเรียกใช้งาน (404 Not Found)' 
  });
});

// Global Error Handler (ต้องอยู่ล่างสุดเสมอ!)
app.use(globalErrorHandler);

export default app; // ส่งออก app เพื่อให้ main.js ใช้งานต่อ
