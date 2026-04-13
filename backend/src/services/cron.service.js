import cron from 'node-cron';
import { pool } from '../config/db.js';

export const startCleanupJob = () => {
  
  // ลบ OTP ที่หมดอายุ (รันทุกชั่วโมง)
  cron.schedule('0 * * * *', async () => {
    console.log('🧹 Running OTP Cleanup Job...');
    try {
      const result = await pool.query(
        `DELETE FROM public."OTP" WHERE expired_at < NOW()`
      );
      if (result.rowCount > 0) {
        console.log(`✅ OTP Cleanup: Deleted ${result.rowCount} expired OTPs.`);
      }
    } catch (error) {
      console.error('❌ OTP Cleanup Error:', error);
    }
  });

  // อัปเดตสถานะการจองที่ "เรียนเสร็จแล้ว" ให้เป็น 'completed' (รันทุกชั่วโมง)
  // เหมาะสำหรับเช็คว่าห้องที่ใช้งานอยู่ หมดเวลาหรือยัง ถ้าหมดแล้วให้จบงาน
  cron.schedule('0 * * * *', async () => {
    console.log('🔄 Running Booking Status Update Job...');
    try {
      // Logic: เปลี่ยน status เป็น 'completed' ถ้าคิวนั้น 'approved' และ "หมดเวลาแล้ว"
      // เช็ค 2 กรณี: 1. วันที่ผ่านไปแล้ว (เมื่อวาน) หรือ 2. เป็นของวันนี้ แต่เวลา end_time ผ่านไปแล้ว
      const result = await pool.query(
        `UPDATE public."Booking"
        SET status = 'completed'
        WHERE status = 'approved'
        AND (
          date < CURRENT_DATE 
          OR (date = CURRENT_DATE AND end_time < CURRENT_TIME)
        )`
      );

      if (result.rowCount > 0) {
        console.log(`✅ Status Update: Marked ${result.rowCount} bookings as completed.`);
      }
    } catch (error) {
      console.error('❌ Status Update Error:', error);
    }
  });

  // ลบ Booking เก่าตามรอบเทอม (รันทุกวัน เวลา 00:00 น.)
  cron.schedule('0 0 * * *', async () => {
    console.log('🧹 Running Booking Cleanup Job (Term-based)...');
    try {
      // 1. หาว่าปัจจุบันอยู่ในเทอมไหน และหาวันที่เริ่มต้นของเทอมนั้น
      const now = new Date();
      const month = now.getMonth() + 1; // ใน JS เดือนเริ่มที่ 0 (ดังนั้นต้อง +1 ให้เป็น 1-12)
      const year = now.getFullYear();
      let termStartDateStr = '';

      if (month >= 5 && month <= 10) {
        // ภาคเรียนที่ 1: เดือน 5 ถึง 10
        // (วันเริ่มต้นเทอมคือ 1 พฤษภาคม ของปีปัจจุบัน)
        termStartDateStr = `${year}-05-01`;
      } else {
        // ภาคเรียนที่ 2: เดือน 11 ถึง 4
        if (month >= 11) {
          // ถ้าเป็นเดือน 11, 12 (วันเริ่มต้นเทอมคือ 1 พฤศจิกายน ของปีปัจจุบัน)
          termStartDateStr = `${year}-11-01`;
        } else {
          // ถ้าเป็นเดือน 1, 2, 3, 4 (วันเริ่มต้นเทอมคือ 1 พฤศจิกายน ของ "ปีที่แล้ว")
          termStartDateStr = `${year - 1}-11-01`;
        }
      }

      // 2. เริ่มลบข้อมูลใน Database
      const result = await pool.query(
        `DELETE FROM public."Booking" 
        WHERE 
          -- เงื่อนไขที่ 1: คำขอที่รออนุมัติ (pending) แต่เลยวันที่ขอมาแล้วให้ลบทิ้งเลย
          (status = 'pending' AND date < CURRENT_DATE)
          OR 
          -- เงื่อนไขที่ 2: ลบประวัติการจองของ "เทอมก่อนหน้า" ทั้งหมดทิ้ง (ขยะของเทอมเก่า)
          (date < $1)`,
        [termStartDateStr]
      );

      if (result.rowCount > 0) {
        console.log(`✅ Booking Cleanup: Deleted ${result.rowCount} items (Older than ${termStartDateStr}).`);
      } else {
        console.log(`✨ No bookings to cleanup. (Current term started on: ${termStartDateStr})`);
      }
    } catch (error) {
      console.error('❌ Booking Cleanup Error:', error);
    }
  });

  // ลบ Token เก่า (รันตอนตี 3 ทุกวัน)
  cron.schedule('0 3 * * *', async () => {
    console.log('🧹 Running Token Blacklist Cleanup...');
    try {
      const result = await pool.query(
        'DELETE FROM public."TokenBlacklist" WHERE expires_at < NOW()'
      );
      if (result.rowCount > 0) {
          console.log(`✅ Deleted ${result.rowCount} expired tokens.`);
      }
    } catch (error) {
      console.error('❌ Token Cleanup Error:', error);
    }
  });

};

// '*/5 * * * *' = ทำทุกๆ 5 นาที
// '0 * * * *' = ทำทุกต้นชั่วโมง 
// '0 0 * * *' = ทำทุกเที่ยงคืนตรง