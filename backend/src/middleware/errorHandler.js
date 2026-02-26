import { logger } from '../utils/logger.js'; // เอา Logger ที่เราทำไว้มาใช้ให้คุ้มครับ!

export const globalErrorHandler = (err, req, res, next) => {
  // [Security Log] จดรายละเอียดเชิงลึกเก็บไว้ให้ทีม Dev ดู
  logger.error('Unhandled Exception Captured', {
    error_message: err.message,
    stack: err.stack,
    path: req.originalUrl,
    method: req.method,
    ip: req.ip,
    user_id: req.user ? req.user.user_id : 'Guest'
  });

  //  เช็คว่าเป็น Environment ไหน (Dev หรือ Production)
  const isProduction = process.env.NODE_ENV === 'production';

  // สร้างข้อความตอบกลับที่ "ปลอดภัย" สำหรับ User
  // ถ้าเป็น Production ต้องปิดบัง Error จริงโดยใช้เป็นแจ้งเตือนคล้าวๆ
  const responseMessage = isProduction 
    ? 'ระบบเกิดความขัดข้องชั่วคราว กรุณาลองใหม่อีกครั้ง หรือติดต่อผู้ดูแลระบบ' 
    : err.message; // แต่ถ้าเป็นตอนเราเขียนโค้ด (Dev) ให้โชว์ไปเลย จะได้แก้บัคง่ายๆ

  // ส่ง Error กลับเป็น JSON เสมอ (Frontend จะได้ไม่พังเวลาพยายาม parse JSON)
  res.status(err.status || 500).json({
    status: 'error',
    message: responseMessage,
    // ส่ง stack trace ไปเฉพาะตอน Dev เท่านั้น
    ...( !isProduction && { stack: err.stack } ) 
  });
};