import express from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';

const app = express();
app.use(helmet()); // ปิดบัง Server Info และกัน XSS เบื้องต้น

app.use(cors({
  // ⚠️⚠️⚠️⚠️⚠️⚠️ เราต้องตั้งค่าให้แค่ frontend เท่านั้นที่จะสามมารถ ⚠️⚠️⚠️⚠️⚠️⚠️
  
    origin: "*", // '*' :  อนุญาตให้ทุกคนเข้าถึงได้ (เหมาะสำหรับช่วง Dev/Test/ngrok)  
    methods: ['GET', 'POST', 'PUT', 'DELETE'], // อนุญาต Method อะไรบ้าง
    allowedHeaders: ['Content-Type', 'Authorization', 'ngrok-skip-browser-warning'], // อนุญาต Header อะไรบ้าง (สำคัญสำหรับ Token)
    credentials: true // อนุญาตให้ส่ง Token/Cookie มาได้
}));

const globalLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 นาที
  max: 100, // อนุญาตให้ยิง API ได้ 100 ครั้งต่อนาที (ต่อ IP)
  message: { message: 'Too many requests, please try again later.' }
});

app.set('trust proxy', 1);

app.use(globalLimiter);
app.use(express.json());



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
app.use('/schedule', scheduleRoutes)

export default app; // ส่งออก app เพื่อให้ main.js ใช้งานต่อ
