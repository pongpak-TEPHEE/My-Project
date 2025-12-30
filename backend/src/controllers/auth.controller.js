import { pool } from '../config/db.js';
import { randomUUID } from 'crypto';
export const requestOTP = async (req, res) => {
  const { email } = req.body;

  // 1. ตรวจ domain
  if (!email.endsWith('@ku.th')) {
    return res.status(400).json({ message: 'Only @ku.th email allowed' });
  }

  // 2. สร้าง OTP
  const otp = Math.floor(100000 + Math.random() * 900000);
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 นาที
  const requestId = "1234";
  // 3. บันทึก OTP
  await pool.query(
    `INSERT INTO public."OTP" (request_id, email, otp_code, expired_at)
   VALUES ($1, $2, $3, $4)`,
    [requestId, email, otp, expiresAt]
  );

  console.log('OTP:', otp); // 👈 ตอนนี้พอ

  res.json({ message: 'OTP sent' });
};
