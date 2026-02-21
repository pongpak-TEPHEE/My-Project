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
      // ถ้าไม่มีอะไรให้ลบ ไม่ต้อง log ก็ได้ครับ จะได้ไม่รก Terminal
    
    } catch (error) {
      console.error('❌ OTP Cleanup Error:', error);
    }
  });


  // ลบ Booking เก่าที่ผ่านไปแล้ว (รันทุกเที่ยงคืน 00:00 น.)
  cron.schedule('0 0 * * *', async () => {
    console.log('🧹 Running Booking Cleanup Job...');

    try {
      // Logic:
      // 1. ถ้าสถานะเป็น 'pending' และวันที่ผ่านไปแล้ว (date < วันนี้) -> ลบทิ้งทันที
      // 2. ถ้าสถานะอื่น (approved, rejected) ให้เก็บไว้ 30 วัน (date < วันนี้ - 30 วัน) ถึงค่อยลบ
      
      const result = await pool.query(
        `DELETE FROM public."Booking" 
         WHERE 
           (status = 'pending' AND date < CURRENT_DATE)
           OR 
           (status IN ('approved', 'rejected', 'cancelled') AND date < CURRENT_DATE - INTERVAL '30 days')`
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


