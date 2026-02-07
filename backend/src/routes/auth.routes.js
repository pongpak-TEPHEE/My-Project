import express from 'express';
import { requestOTP, verifyOTP, register, logout } from '../controllers/auth.controller.js';
import rateLimit from 'express-rate-limit';

const router = express.Router();

const otpLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // กำหนดเวลา: 15 นาที
  max: 3, // จำกัดจำนวน: ให้ยิงได้แค่ 3 ครั้ง ต่อ IP (ภายใน 15 นาที)
  message: { 
    message: 'คุณขอรหัส OTP บ่อยเกินไป กรุณารอ 15 นาทีแล้วลองใหม่' 
  },
  standardHeaders: true, // ส่งข้อมูล Rate Limit กลับไปใน Header
  legacyHeaders: false,
});

router.post('/request-otp', otpLimiter, requestOTP);
router.post('/verify-otp', verifyOTP);
router.post('/register', register);
router.post('/logout', logout);

export default router;