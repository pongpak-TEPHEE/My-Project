import multer from 'multer';
import { logger } from '../utils/logger.js';

const fileFilter = (req, file, cb) => {
  // อนุญาตเฉพาะไฟล์ Excel (.xlsx หรือ .xls) เท่านั้น
  const allowedMimeTypes = [
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
    'application/vnd.ms-excel' // .xls
  ];

  if (allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true); // ไฟล์ถูกต้อง ให้ผ่าน
  } else {
    // บันทึกความพยายามในการอัปโหลดไฟล์ผิดประเภท (อาจเป็นไฟล์อันตราย)
    logger.warn('Invalid File Upload Attempt (Potential Malicious File)', {
      ip: req.ip,
      user_id: req.user ? req.user.user_id : 'Unknown', // รู้ตัวคนทำ เพราะผ่านด่าน authenticateToken มาแล้ว
      attempted_filename: file.originalname,            // ชื่อไฟล์ที่พยายามอัปโหลด
      attempted_mimetype: file.mimetype,                // ประเภทไฟล์จริงที่แอบแฝงมา
      path: req.originalUrl
    });

    cb(new Error('INVALID_FILE_TYPE'), false); // ไฟล์ผิดประเภท เตะออก!
  }
};

const uploadExcelConfig = multer({ 
  storage: multer.memoryStorage(), // สั่ง storage กำหนดให้อยู่ใน RAM
  fileFilter: fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // จำกัดขนาดไฟล์ห้ามเกิน 10 MB ป้องกันเซิร์ฟเวอร์ค้าง
  }
});

// สร้าง Middleware หลักที่เราจะส่งออกไปให้ Route ใช้งาน
export const handleExcelUpload = (req, res, next) => {
  // ดึงคำสั่ง single('file') มาเตรียมไว้
  const upload = uploadExcelConfig.single('file');

  upload(req, res, function (err) {
    if (err) {
      // ดัก Log กรณีไฟล์ผิดประเภท (มาจาก fileFilter)
      if (err.message === 'INVALID_FILE_TYPE') {
        logger.warn('Invalid File Upload Attempt (Potential Malicious File)', {
          ip: req.ip,
          user_id: req.user ? req.user.user_id : 'Unknown',
          path: req.originalUrl
        });
        return res.status(400).json({ message: 'รูปแบบไฟล์ไม่ถูกต้อง กรุณาอัปโหลดไฟล์ Excel (.xlsx, .xls) เท่านั้น' });
      }

      // ดัก Log กรณีไฟล์ใหญ่เกิน (มาจาก limits.fileSize)
      if (err.code === 'LIMIT_FILE_SIZE') {
        logger.warn('Large File Upload Attempt Blocked (DoS Protection)', {
          ip: req.ip,
          user_id: req.user ? req.user.user_id : 'Unknown',
          path: req.originalUrl
        });
        return res.status(400).json({ message: 'ไฟล์มีขนาดใหญ่เกินไป (จำกัดไม่เกิน 10MB)' });
      }

      // ดัก Error ปริศนาอื่นๆ
      logger.error('Unexpected Upload Error', { error: err.message });
      return res.status(500).json({ message: 'เกิดข้อผิดพลาดในการอัปโหลดไฟล์' });
    }

    // ถ้าไฟล์ถูกต้อง ไม่มี Error ให้เดินทางไป function ทัดไป ------>
    next();
  });
};