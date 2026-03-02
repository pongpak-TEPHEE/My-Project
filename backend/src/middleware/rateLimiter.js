import rateLimit from 'express-rate-limit';
import { logger } from '../utils/logger.js'

export const globalLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 นาที
  max: 60, // อนุญาตให้ยิง API ได้ 60 ครั้งต่อนาที (ต่อ IP)
  message: { message: 'คุณยิง API เกินกำหนด' },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res, next, options) => {
    logger.warn('Global Rate Limit Exceeded (API Spam)', {
      ip: req.ip,
      path: req.originalUrl,
      method: req.method
    });
    res.status(options.statusCode).json(options.message);
  }
});

export const otpRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 นาที
  max: 3, // จำกัดสูงสุด 3 ครั้งต่อ IP ภายใน windowMs
  message: {
    message: 'คุณขอรหัส OTP บ่อยเกินไป กรุณารอ 15 นาทีแล้วลองใหม่อีกครั้ง'
  },
  standardHeaders: true, 
  legacyHeaders: false, 
  handler: (req, res, next, options) => {
    logger.warn('OTP Request Rate Limit Exceeded (Potential Email Spam)', {
      ip: req.ip,
      attempted_email: req.body.email || 'Unknown', 
      path: req.originalUrl
    });
    res.status(options.statusCode).json(options.message);
  }
});

export const loginRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 นาที
  max: 5, // อนุญาตให้พยายามกรอกรหัส/OTP ผิดได้สูงสุด 5 ครั้ง
  skipSuccessfulRequests: true, // ถ้ายืนยันสำเร็จ (Status < 400) จะไม่นับโควต้า
  message: {
    message: 'คุณพยายามเข้าสู่ระบบล้มเหลวหลายครั้งเกินไป กรุณารอ 15 นาทีแล้วลองใหม่'
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res, next, options) => {
    logger.error('Brute-force Attack Detected (Login/Verify OTP)', {
      ip: req.ip,
      attempted_email: req.body.email || 'Unknown', 
      path: req.originalUrl,
      method: req.method
    });
    res.status(options.statusCode).json(options.message);
  }
});