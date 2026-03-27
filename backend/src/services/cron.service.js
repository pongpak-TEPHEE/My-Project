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
           OR (date = CURRENT_DATE AND end_time < CURRENT_TIME
         )`
      );

      if (result.rowCount > 0) {
        console.log(`✅ Status Update: Marked ${result.rowCount} bookings as completed.`);
      }
    } catch (error) {
      console.error('❌ Status Update Error:', error);
    }
  });

  // ลบ Booking เก่าที่ผ่านไปแล้ว (รันทุกเที่ยงคืน 00:00 น.)
  cron.schedule('0 0 * * *', async () => {
    console.log('🧹 Running Booking Cleanup Job...');
    try {
      const result = await pool.query(
        `DELETE FROM public."Booking" 
         WHERE 
           (status = 'pending' AND date < CURRENT_DATE)
           OR 
           (status IN ('completed', 'rejected', 'cancelled') AND date < CURRENT_DATE - INTERVAL '30 days')`
      );

      if (result.rowCount > 0) {
        console.log(`✅ Booking Cleanup: Deleted ${result.rowCount} items.`);
      } else {
        console.log('✨ No bookings to cleanup.');
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