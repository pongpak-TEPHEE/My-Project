import { createLogger, format, transports } from 'winston'; // library ที่เอาไว้สร้าง log
import 'winston-daily-rotate-file';

// ตั้งค่าให้สร้างไฟล์ใหม่ทุกวัน และเก็บย้อนหลัง 14 วัน
const fileRotateTransport = new transports.DailyRotateFile({
  filename: 'logs/security-%DATE%.log',
  datePattern: 'YYYY-MM-DD',
  maxFiles: '14d', // เก็บย้อนหลัง 14 วัน
});

export const logger = createLogger({
  level: 'info',
  format: format.combine(
    format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    format.printf(({ timestamp, level, message, ...meta }) => {
      // รูปแบบการเก็บ Log: [เวลา] [ระดับ] ข้อความ | ข้อมูลเพิ่มเติม (เช่น IP, UserID)
      return `[${timestamp}] ${level.toUpperCase()}: ${message} ${Object.keys(meta).length ? JSON.stringify(meta) : ''}`;
    })
  ),
  transports: [
    fileRotateTransport,
    new transports.Console() // ให้แสดงใน Terminal ด้วยเหมือน console.log ปกติ
  ],
});