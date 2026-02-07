import jwt from 'jsonwebtoken';
import { pool } from '../config/db.js';

// ฟังก์ชันสำหรับ "ตรวจบัตรผ่าน" (Token)
export const authenticateToken = async (req, res, next) => {
  // 1. ดึง Token จาก Header
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ message: 'Access Denied: No Token Provided' });
  }

  try {
    const secretKey = process.env.JWT_SECRET || 'your_secret_key';

    // 2. ✅ (สำคัญ) ตรวจสอบ Signature และวันหมดอายุก่อน!
    // ถ้า Token มั่ว หรือหมดอายุ มันจะ Error เด้งไป catch ทันที (ไม่ต้องเสียเวลาเช็ค DB)
    const decoded = jwt.verify(token, secretKey);

    // 3. ✅ ค่อยเช็ค Blacklist (ถ้า Token ถูกต้องตามรูปแบบ ค่อยมาเช็คว่าโดนแบนไหม)
    const blacklistCheck = await pool.query(
      'SELECT token FROM public."TokenBlacklist" WHERE token = $1',
      [token]
    );

    if (blacklistCheck.rows.length > 0) {
      return res.status(403).json({ message: 'Token นี้ถูกยกเลิกแล้ว (กรุณา Login ใหม่)' });
    }

    // 4. แนบข้อมูลผู้ใช้
    // ⚠️ หมายเหตุ: ข้อมูลใน decoded จะมาจากตอนที่เรา jwt.sign
    // จากโค้ด verifyOTP ก่อนหน้านี้ เราใช้ 'user_id' ดังนั้นเรียกใช้ต้อง req.user.user_id นะครับ
    req.user = decoded;
    // console.log("req.user : ", req.user);
    
    next();

  } catch (error) {
    // แยก Error ให้ชัดเจนขึ้นนิดนึง
    if (error.name === 'TokenExpiredError') {
        return res.status(403).json({ message: 'Token หมดอายุแล้ว (Expired)' });
    }
    return res.status(403).json({ message: 'Token ไม่ถูกต้อง (Invalid)' });
  }
};

// ฟังก์ชันแถม: สำหรับ "ตรวจตำแหน่ง" (Role Check)
// ใช้คู่กับตัวบน เช่น: router.post('/approve', authenticateToken, authorizeRole('staff'), ...);
export const authorizeRole = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
        return res.status(401).json({ message: 'User not authenticated' });
    }

    // เช็คว่า role ของ user นี้ อยู่ในรายการที่อนุญาตไหม
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ 
        message: `Access Denied: Requires one of these roles: ${allowedRoles.join(', ')}` 
      });
    }

    next();
  };
};

