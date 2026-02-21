import jwt from 'jsonwebtoken';
import { pool } from '../config/db.js';
import { logger } from '../utils/logger.js';

// ฟังก์ชันสำหรับ "ตรวจบัตรผ่าน" (Token)
export const authenticateToken = async (req, res, next) => {
  // 1. ดึง Token จาก Header
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ message: 'Access Denied: No Token Provided' });
  }

  try {
    
    // ถอดรหัส Token
    const decodedTK = jwt.verify(token, process.env.JWT_SECRET);

    // เช็คว่า User คนนี้ยัง "มีตัวตน" และ "ใช้งานได้" อยู่หรือไม่
    const userCheck = await pool.query(
      `SELECT is_active FROM public."Users" WHERE user_id = $1`,
      [decodedTK.user_id]
    );

    if (userCheck.rows.length === 0) {
      return res.status(401).json({ message: 'ไม่พบผู้ใช้งานนี้ในระบบแล้ว' });
    }

    if (userCheck.rows[0].is_active === false) {
      return res.status(403).json({ message: 'บัญชีของคุณถูกระงับการใช้งาน กรุณาติดต่อเจ้าหน้าที่' });
    }

    const secretKey = process.env.JWT_SECRET || 'your_secret_key';
    // ตรวจสอบ Signature และวันหมดอายุ
    // ถ้า Token มั่ว หรือหมดอายุ มันจะ Error เด้งไป catch ทันที (ไม่ต้องเสียเวลาเช็ค DB)
    const decoded = jwt.verify(token, secretKey);

    // เช็ค Blacklist (ถ้า Token ถูกต้องตามรูปแบบ ค่อยมาเช็คว่าโดนแบนไหม)
    const blacklistCheck = await pool.query(
      'SELECT token FROM public."TokenBlacklist" WHERE token = $1',
      [token]
    );

    if (blacklistCheck.rows.length > 0) {
      return res.status(403).json({ message: 'Token นี้ถูกยกเลิกแล้ว (กรุณา Login ใหม่)' });
    }

    // แนบข้อมูลผู้ใช้
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

      //  บันทึกว่ามีการพยายามละเมิดสิทธิ์ (Access Denied)
      logger.warn('Unauthorized Access Attempt', {
        user_id: req.user ? req.user.user_id : 'Guest',
        role: req.user ? req.user.role : 'None',
        attempted_url: req.originalUrl,
        method: req.method,
        ip: req.ip
      });
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

