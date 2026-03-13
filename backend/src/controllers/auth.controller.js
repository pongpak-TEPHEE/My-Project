import { pool } from '../config/db.js';
import jwt from 'jsonwebtoken'; // โมดูลสำหรับสร้างและตรวจสอบ JWT
import crypto from 'crypto'; // โมดูลสำหรับสร้างตัวเลขสุ่มและ UUID ของ Node.js
import { sendOTPEmail } from '../services/mailer.js';


// /auth/request-otp
// ขอ OTP ส่งไปยัง email.ku.th
export const requestOTP = async (req, res) => {
  const { email } = req.body;

  // ตรวจ domain (เฉพาะ @ku.th)
  if (!email.endsWith('@ku.th')) {
    return res.status(400).json({ message: 'อนุญาตให้ใช้งานเฉพาะอีเมล @ku.th เท่านั้น' });
  }

  try {
    // เช็คก่อนว่าเพิ่งขอไปหรือเปล่า ( Cooldown )
    const lastOtpCheck = await pool.query(
      `SELECT created_at FROM public."OTP"
       WHERE email = $1
       ORDER BY created_at DESC LIMIT 1`, // ดูอันล่าสุด
      [email]
    );

    if (lastOtpCheck.rows.length > 0) {
      const lastRequest = new Date(lastOtpCheck.rows[0].created_at);
      const now = new Date();

      // คำนวณความต่างเวลา (หน่วยวินาที)
      const diffSeconds = (now - lastRequest) / 1000;

      // ถ้าเพิ่งขอไปไม่ถึง 20 วินาที (1 นาที) ให้ไล่กลับไป
      if (diffSeconds < 20) {
        return res.status(429).json({
          message: `กรุณารออีก ${Math.ceil(60 - diffSeconds)} วินาที ก่อนขอรหัสใหม่`
        });
      }
    }
    //  สร้าง OTP 6 หลัก
    const otp = crypto.randomInt(100000, 1000000).toString();

    // กำหนดเวลาหมดอายุ (5 นาที จะดีกว่า 1 นาทีสำหรับการส่งเมลจริง เผื่อ delay)
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

    // สร้าง Request ID
    const requestId = crypto.randomUUID();

    // ลบ OTP เก่าของ Email นี้ทิ้งก่อน (Cleanup)
    await pool.query(`DELETE FROM public."OTP" WHERE email = $1`, [email]);

    // บันทึก OTP ลงฐานข้อมูล
    await pool.query(
      `INSERT INTO public."OTP"
        (request_id, email, otp_code, expired_at, created_at)
        VALUES ($1, $2, $3, $4, NOW())`,
      [requestId, email, otp, expiresAt]
    );

    // ส่งอีเมล
    const isSent = await sendOTPEmail(email, otp);
    if (!isSent) {
      // ถ้าส่งไม่ผ่าน ให้แจ้ง Error กลับไปเลย
      return res.status(500).json({ message: 'เกิดข้อผิดพลาดในการส่งอีเมล OTP' });
    }
    res.json({

      message: `ส่งรหัส OTP ไปที่ ${email} เรียบร้อยแล้ว`,

      requestId: requestId
    });
  } catch (error) {
    console.error('Request OTP Error:', error);
    res.status(500).json({ message: 'เกิดข้อผิดพลาดภายในเซิร์ฟเวอร์' });
  }
};


// /auth/verify-otp
// รับ OTP ที่ USER กรอกมาเพื่อ recheck กับ database
export const verifyOTP = async (req, res) => {
  const { email, otp_code } = req.body;

  try {
    //  ค้นหา OTP ที่ถูกต้องและยังไม่หมดอายุ
    const otpResult = await pool.query(
      `SELECT * FROM public."OTP" 
       WHERE email = $1 AND otp_code = $2 AND expired_at > NOW()`,
      [email, otp_code]
    );

    if (otpResult.rows.length === 0) {
      return res.status(400).json({ message: 'รหัส OTP ไม่ถูกต้องหรือหมดอายุ' });
    }

    // ดึงข้อมูล User
    const userResult = await pool.query(
      'SELECT user_id, title, name, surname, email, role, session_id FROM public."Users" WHERE email = $1',
      [email]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({ message: 'ไม่พบผู้ใช้งานในระบบ (กรุณาติดต่อเจ้าหน้าที่)' });
    }

    const user = userResult.rows[0];
    console.log("user = {}", user);


    // สร้าง session_id ใหม่ (ใช้ crypto.randomBytes จะได้ string ความยาว 20 ตัวอักษร พอดีกับโครงสร้าง DB)
    const sessionId = crypto.randomBytes(10).toString('hex');

    // สร้าง JWT Token โดยฝัง session_id ลงไปใน Payload
    const token = jwt.sign(
      {
        user_id: user.user_id,
        role: user.role,
        name: user.name,
        session_id: sessionId
      },
      process.env.JWT_SECRET,
      { expiresIn: '1d' }
    );

    // อัปเดตสถานะ is_verified และ session_id ในตาราง Users
    await pool.query(
      'UPDATE public."Users" SET is_verified = TRUE, session_id = $2 WHERE email = $1',
      [email, sessionId]
    );

    // ลบ OTP ทิ้งทันที (One-Time จริงๆ)
    await pool.query('DELETE FROM public."OTP" WHERE email = $1', [email]);

    //  ส่ง Response กลับไป
    res.json({
      message: 'เข้าสู่ระบบสำเร็จ',
      token, // ส่ง Token
      user: { 
        user_id: user.user_id,
        title: user.title,
        name: user.name,
        surname: user.surname,
        email: user.email,
        role: user.role
      }
    });

  } catch (error) {
    console.error('Verify OTP Error:', error);
    res.status(500).json({ message: 'เกิดข้อผิดพลาดที่เซิร์ฟเวอร์' });
  }
};


// /auth/logout
// เป็นการลบ token ของผู้ใช้ออก
export const logout = async (req, res) => {
  try {
    // ดึง Token จาก Header
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      return res.status(200).json({ message: 'Logout สำเร็จ (ไม่มี Token)' });
    }

    // ถอดรหัส Token เพื่อดูวันหมดอายุ (exp)
    // เราใช้ jwt.decode (ไม่ต้อง verify เพราะเราแค่อยากรู้วันหมดอายุ)
    const decoded = jwt.decode(token);

    // ถ้า Token มั่ว หรือไม่มีวันหมดอายุ ก็ไม่ต้องทำอะไร
    if (!decoded || !decoded.exp) {
      return res.status(200).json({ message: 'Logout สำเร็จ' });
    }

    // แปลง exp (seconds) เป็น Date Object ของ Javascript
    const expiresAt = new Date(decoded.exp * 1000);

    // บันทึกลง Blacklist
    await pool.query(
      `INSERT INTO public."TokenBlacklist" (token, expires_at) 
       VALUES ($1, $2) 
       ON CONFLICT (token) DO NOTHING`, // ถ้ามีอยู่แล้วก็ช่างมัน
      [token, expiresAt]
    );

    // ล้าง session_id ของผู้ใช้ออก (เฉพาะถ้า session_id ตรงกับใน Token) เพื่อเคลียร์ Single Active Session
    if (decoded.user_id && decoded.session_id) {
      await pool.query(
        'UPDATE public."Users" SET session_id = NULL WHERE user_id = $1 AND session_id = $2',
        [decoded.user_id, decoded.session_id]
      );
    }

    res.json({ message: 'Logout สำเร็จ Token ถูกยกเลิกและเคลียร์ Session แล้ว' });

  } catch (error) {
    console.error('Logout Error:', error);
    res.status(500).json({ message: 'เกิดข้อผิดพลาดในการ Logout' });
  }
};