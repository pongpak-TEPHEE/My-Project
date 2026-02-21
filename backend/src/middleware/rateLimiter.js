import rateLimit from 'express-rate-limit';

export const globalLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 นาที
  max: 60, // อนุญาตให้ยิง API ได้ 100 ครั้งต่อนาที (ต่อ IP)
  message: { message: 'คุณยิง API เกินกำหนด' }
});

export const otpRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 นาที
  max: 3, // จำกัดสูงสุด 3 ครั้งต่อ IP ภายใน windowMs
  message: {
    message: 'คุณขอรหัส OTP บ่อยเกินไป กรุณารอ 15 นาทีแล้วลองใหม่อีกครั้ง'
  },
  standardHeaders: true, // ส่งข้อมูล Rate limit กลับไปใน Header
  legacyHeaders: false, // ปิดการใช้ Header เก่า
});

