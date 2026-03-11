import jwt from 'jsonwebtoken';
import { pool } from '../config/db.js';
import { logger } from '../utils/logger.js';


// ฟังก์ชันสำหรับ "ตรวจบัตรผ่าน" (Token)
export const authenticateToken = async (req, res, next) => {
  // ดึง Token จาก Header
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ message: 'Access Denied: No Token Provided' });
  }

  try {
    // ถอดรหัส Token แค่ "ครั้งเดียว"
    const secretKey = process.env.JWT_SECRET || 'your_secret_key';
    const decoded = jwt.verify(token, secretKey); 
    // ถ้า Token หมดอายุ หรือมั่ว มันจะ Error แล้วเด้งไป catch ทันที

    // เช็ค Blacklist ก่อน (ถ้า Token ถูกแบน จะได้ไม่ต้องไป Query ตาราง Users ให้เสียเวลา)
    const blacklistCheck = await pool.query(
      'SELECT token FROM public."TokenBlacklist" WHERE token = $1',
      [token]
    );

    if (blacklistCheck.rows.length > 0) {
      return res.status(401).json({ message: 'Token นี้ถูกยกเลิกแล้ว (กรุณา Login ใหม่)' });
    }

    // เช็คสถานะ User และ Session ID จาก DB
    const userCheck = await pool.query(
      `SELECT is_active, session_id FROM public."Users" WHERE user_id = $1`,
      [decoded.user_id]
    );

    // ถ้าหา User ไม่เจอ
    if (userCheck.rows.length === 0) {
      return res.status(401).json({ message: 'ไม่พบผู้ใช้งานนี้ในระบบแล้ว' });
    }

    // ถ้า User โดนระงับการใช้งาน
    if (userCheck.rows[0].is_active === false) {
      return res.status(403).json({ message: 'บัญชีของคุณถูกระงับการใช้งาน กรุณาติดต่อเจ้าหน้าที่' });
    }

    // เช็ค Session Override (เตะเครื่องเก่าออก)
    // ดักจับกรณี: ไม่มี session_id ใน Token (Token รุ่นเก่า) หรือ session_id ไม่ตรงกัน
    if (!decoded.session_id || userCheck.rows[0].session_id !== decoded.session_id) {
      return res.status(401).json({
        message: 'มีการเข้าสู่ระบบจากอุปกรณ์อื่น ระบบได้ทำการออกจากระบบให้คุณอัตโนมัติ',
        code: 'SESSION_SUPERSEDED' //ส่ง code พิเศษไปให้หน้าบ้านเช็ค
      });
    }

    // ผ่านทุกด่าน! แนบข้อมูลผู้ใช้แล้วไปต่อ
    req.user = decoded;
    next();

  } catch (error) {
    // แยก Error ให้ชัดเจน
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ 
          message: 'Token หมดอายุแล้ว (Expired)',
          code: 'TOKEN_EXPIRED'
      }); 
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

