import { pool } from '../config/db.js';
import jwt from 'jsonwebtoken'; // โมดูลสำหรับสร้างและตรวจสอบ JWT
import crypto from 'crypto'; // โมดูลสำหรับสร้างตัวเลขสุ่มและ UUID ของ Node.js
import { sendOTPEmail } from '../services/mailer.js';


// /auth/request-otp
// ขอ OTP ส่งไปยัง email.ku.th
export const requestOTP = async (req, res) => {
  const { email } = req.body;

  // 1. ตรวจ domain (เฉพาะ @ku.th)
  if (!email.endsWith('@ku.th')) {
    return res.status(400).json({ message: 'อนุญาตให้ใช้งานเฉพาะอีเมล @ku.th เท่านั้น' });
  }

  try {
    // -----------------------------------------------------
    // 🛑 STEP 1: เช็คก่อนว่าเพิ่งขอไปหรือเปล่า (Cooldown)
    // -----------------------------------------------------
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
      // 2. สร้าง OTP 6 หลัก
    const otp = crypto.randomInt(100000, 1000000).toString();

    // 3. กำหนดเวลาหมดอายุ (5 นาที จะดีกว่า 1 นาทีสำหรับการส่งเมลจริง เผื่อ delay)
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); 

    // 4. สร้าง Request ID
    const requestId = crypto.randomUUID();

    // 5. ลบ OTP เก่าของ Email นี้ทิ้งก่อน (Cleanup)
    await pool.query(`DELETE FROM public."OTP" WHERE email = $1`, [email]);

    // 6. บันทึก OTP ลงฐานข้อมูล
    await pool.query(
      `INSERT INTO public."OTP" 
        (request_id, email, otp_code, expired_at, created_at)
        VALUES ($1, $2, $3, $4, NOW())`,
      [requestId, email, otp, expiresAt]
    );

    // 7. ส่งอีเมล
    const isSent = await sendOTPEmail(email, otp);

    if (!isSent) {
      // ถ้าส่งไม่ผ่าน ให้แจ้ง Error กลับไปเลย
      return res.status(500).json({ message: 'เกิดข้อผิดพลาดในการส่งอีเมล OTP' });
    }

    // ถ้าส่งผ่าน ก็ตอบกลับ Frontend
    console.log(`[LOG] OTP sent to ${email} successfully`);
    
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
  
  // ⚠️ DEBUG: เอาไว้เช็คตอน dev เท่านั้น (ลบออกตอนขึ้นงานจริง)
  // console.log("Input Debug:", { email, otp_code }); 

  try {
    // 1. ค้นหา OTP ที่ถูกต้องและยังไม่หมดอายุ
    const otpResult = await pool.query(
      `SELECT * FROM public."OTP" 
       WHERE email = $1 AND otp_code = $2 AND expired_at > NOW()`,
      [email, otp_code]
    );

    if (otpResult.rows.length === 0) {
      return res.status(400).json({ message: 'รหัส OTP ไม่ถูกต้องหรือหมดอายุ' });
    }

    // 2. ดึงข้อมูล User
    const userResult = await pool.query(
      'SELECT user_id, name, surname, role FROM public."Users" WHERE email = $1',
      [email]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({ message: 'ไม่พบผู้ใช้งานในระบบ (กรุณาติดต่อเจ้าหน้าที่)' });
    }

    const user = userResult.rows[0];

    // 3. ✅ สร้าง JWT Token 
    // (แก้ไขชื่อ key ให้เป็น 'user_id' เพื่อให้ตรงกับ Middleware)
    const token = jwt.sign(
      { 
        user_id: user.user_id,
        role: user.role,
        name: user.name // แถมชื่อไปด้วย Frontend จะได้ใช้ง่ายๆ
      },
      process.env.JWT_SECRET, 
      { expiresIn: '1d' } // อายุ 1 วัน
    );

    // 4. อัปเดตสถานะว่ายืนยันตัวตนแล้ว
    await pool.query(
        'UPDATE public."Users" SET is_verified = TRUE WHERE email = $1',
        [email]
    );

    // 5. ลบ OTP ทิ้งทันที (One-Time จริงๆ)
    await pool.query('DELETE FROM public."OTP" WHERE email = $1', [email]);

    // 6. ส่ง Response กลับไป
    res.json({
      message: 'เข้าสู่ระบบสำเร็จ',
      token, // ส่ง Token
      user: { // ส่งข้อมูล User ให้ Frontend ไปแสดงผล
        user_id: user.user_id,
        name: user.name,
        surname: user.surname,
        role: user.role
      }
    });

  } catch (error) {
    console.error('Verify OTP Error:', error);
    res.status(500).json({ message: 'เกิดข้อผิดพลาดที่เซิร์ฟเวอร์' });
  }
};

// /auth/register
// ยังไม่เรียกใช้ !!!!
export const register = async (req, res) => {

  const { email, otp_code, name, surname} = req.body; 
  // *หมายเหตุ: ในระบบเราไม่ได้เก็บข้อมูล nisit_id Ex. b6630200403

  try {
    // 1. ตรวจ OTP (เหมือนเดิม)
    const otpResult = await pool.query(
      `SELECT * FROM public."OTP" 
       WHERE email = $1 AND otp_code = $2 AND expired_at > NOW()`,
      [email, otp_code]
    );

    if (otpResult.rows.length === 0) {
      return res.status(400).json({ message: 'OTP ไม่ถูกต้องหรือหมดอายุ' });
    }

    // 2. เช็คว่าอีเมลซ้ำไหม (ตัดการเช็ค user_id ออก เพราะเดี๋ยวเราจะเจนใหม่เอง)
    const userCheck = await pool.query(
      `SELECT * FROM public."Users" WHERE email = $1`,
      [email]
    );

    if (userCheck.rows.length > 0) {
      return res.status(409).json({ message: 'อีเมลนี้ลงทะเบียนไปแล้ว' });
    }

    // 3. สร้าง Running ID แบบเรียงลำดับ (u0001, u0002, ...)

    let newUserId = 'u0001'; // ค่าเริ่มต้น (ถ้ายังไม่มีใครในระบบ)

    // ดึง user คนล่าสุดออกมา (เรียงจาก user_id มากไปน้อย)
    const latestUserResult = await pool.query(
      `SELECT user_id FROM public."Users" ORDER BY user_id DESC LIMIT 1`
    );

    if (latestUserResult.rows.length > 0) {
      const latestId = latestUserResult.rows[0].user_id; // เช่น 'u0015'
      
      // ตัดตัว 'u' ออก แล้วแปลงเป็นตัวเลข (u0015 -> 15)
      const currentNumber = parseInt(latestId.substring(1)); 
      
      // บวก 1
      const nextNumber = currentNumber + 1; 

      // แปลงกลับเป็น String และเติม 0 ข้างหน้าให้ครบ 4 หลัก (16 -> 'u0016')
      newUserId = 'u' + nextNumber.toString().padStart(4, '0');
    }
    
-
    // STEP 4: บันทึก (ใช้ newUserId ที่เราสร้างขึ้น)

    await pool.query(
      `INSERT INTO public."Users" 
       (user_id, email, name, surname, role, is_verified, created_at)
       VALUES ($1, $2, $3, $4, 'student', TRUE, NOW())`,
      [newUserId, email, name, surname] 
    );


    // STEP 5: สร้าง Token (ใช้ newUserId)

    const token = jwt.sign(
      { userId: newUserId, role: 'student', email: email },
      process.env.JWT_SECRET || 'your_secret_key',
      { expiresIn: '1d' }
    );

    await pool.query(`DELETE FROM public."OTP" WHERE email = $1`, [email]);

    res.status(201).json({
      message: 'ลงทะเบียนสำเร็จ',
      token,
      user: {
        id: newUserId, // ส่ง ID ใหม่กลับไปให้ดู
        name: `${name} ${surname}`,
        role: 'student'
      }
    });

  } catch (error) {
    console.error('Register Error:', error);
    res.status(500).json({ message: 'เกิดข้อผิดพลาดในการลงทะเบียน' });
  }
};

// /auth/logout
// เป็นการลบ token ของผู้ใช้ออก
export const logout = async (req, res) => {
  try {
    // 1. ดึง Token จาก Header
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      return res.status(200).json({ message: 'Logout สำเร็จ (ไม่มี Token)' }); 
    }

    // 2. ถอดรหัส Token เพื่อดูวันหมดอายุ (exp)
    // เราใช้ jwt.decode (ไม่ต้อง verify เพราะเราแค่อยากรู้วันหมดอายุ)
    const decoded = jwt.decode(token);
    
    // ถ้า Token มั่ว หรือไม่มีวันหมดอายุ ก็ไม่ต้องทำอะไร
    if (!decoded || !decoded.exp) {
        return res.status(200).json({ message: 'Logout สำเร็จ' });
    }

    // แปลง exp (seconds) เป็น Date Object ของ Javascript
    const expiresAt = new Date(decoded.exp * 1000);

    // 3. บันทึกลง Blacklist
    await pool.query(
      `INSERT INTO public."TokenBlacklist" (token, expires_at) 
       VALUES ($1, $2) 
       ON CONFLICT (token) DO NOTHING`, // ถ้ามีอยู่แล้วก็ช่างมัน
      [token, expiresAt]
    );

    res.json({ message: 'Logout สำเร็จ Token ถูกยกเลิกแล้ว' });

  } catch (error) {
    console.error('Logout Error:', error);
    res.status(500).json({ message: 'เกิดข้อผิดพลาดในการ Logout' });
  }
};