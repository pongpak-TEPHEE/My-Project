import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { globalLimiter } from './middleware/rateLimiter.js';
import { globalErrorHandler } from './middleware/errorHandler.js';

// All of routes 
import authRoutes from './routes/auth.routes.js';
import bookingsRoutes from './routes/bookings.route.js';
import roomsRoutes from './routes/rooms.route.js';
import usersRoutes from './routes/users.route.js';
import scheduleRoutes from './routes/schedule.routes.js';
import termRoutes from './routes/term.routes.js';

// 🚨 นำเข้า Swagger Libraries (เปลี่ยนจากการ import ไฟล์ YAML ตรงๆ)
import swaggerUi from 'swagger-ui-express';
import swaggerJsDoc from 'swagger-jsdoc';

const app = express();

// ให้ Express อ่าน IP จริงทะลุผ่าน Nginx/Docker Proxy
app.set('trust proxy', 1);

app.use(express.json());
app.use(helmet()); 

// ==========================================
// 🛡️ 1. ตั้งค่า CORS แบบดึงจาก .env
// ==========================================
const allowedOrigins = [
  process.env.FRONTEND_URL, // โดเมนจริง (ดึงจาก .env)
  'http://localhost:5173',  // เผื่อไว้เทส Frontend บนเครื่องตัวเอง
  'http://localhost:5174',
  'http://localhost:3000', // ทดสอบ Swagger หลัง implement จริงต้องเอาออก
  'https://kusrc-sci-bookings.netlify.app'
].filter(Boolean); // กรองค่า undefined ออก

app.use(cors({
  origin: function (origin, callback) {
    // ให้ผ่านถ้าอยู่ใน allowedOrigins หรือถ้าไม่มี origin (เช่น ใช้ Postman/Cron ยิงมา)
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('CORS Policy: Domain not allowed'));
    }
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'ngrok-skip-browser-warning'],
  credentials: true 
}));

app.use(globalLimiter);
app.use(cookieParser());

// Routes
app.use('/auth', authRoutes);
app.use('/users', usersRoutes);
app.use('/rooms', roomsRoutes);
app.use('/bookings', bookingsRoutes);
app.use('/schedules', scheduleRoutes);
app.use('/terms', termRoutes);

// ==========================================
// 📖 2. ตั้งค่า Swagger (Spec-First)
// ==========================================
const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'KUSRC Book a Room API',
      version: '1.0.0',
      description: 'API Documentation สำหรับระบบจองห้องเรียน KUSRC',
    },
    // ตั้งค่าระบบ Security พื้นฐานไว้ตรงนี้เลย
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
    },
    security: [{ bearerAuth: [] }],
  },
  // 🎯 สำคัญ: ให้ไปกวาดอ่านไฟล์ .yaml ทุกไฟล์ในโฟลเดอร์ docs แทน
  apis: ['./docs/**/*.yaml'], 
};

const specs = swaggerJsDoc(swaggerOptions);

// ==========================================
// 🔒 3. ซ่อน API Docs เมื่อรันบน Production
// ==========================================
// ไอเดียนี้ยอดเยี่ยมมากครับ! ป้องกันคนนอกเข้ามาดูโครงสร้าง API ของเรา
// if (process.env.NODE_ENV !== 'production') {
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(specs));
// }

// ดักจับ 404 Not Found
app.use((req, res, next) => {
  res.status(404).json({ 
    status: 'error',
    message: 'ไม่พบเส้นทาง API ที่ท่านเรียกใช้งาน (404 Not Found)' 
  });
});

// Global Error Handler
app.use(globalErrorHandler);

export default app;