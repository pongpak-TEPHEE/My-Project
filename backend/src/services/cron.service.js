import cron from 'node-cron';
import { pool } from '../config/db.js';

export const startCleanupJob = () => {
  
  // 1. ลบ OTP ที่หมดอายุ (รันทุกชั่วโมง)
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
  }, {
    scheduled: true,
    timezone: "Asia/Bangkok"
  });

  // 2. อัปเดตสถานะการจองที่ "เรียนเสร็จแล้ว" ให้เป็น 'completed' (รันทุกชั่วโมง)
  cron.schedule('0 * * * *', async () => {
    console.log('🔄 Running Booking Status Update Job...');
    try {
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
  }, {
    scheduled: true,
    timezone: "Asia/Bangkok"
  });

  // 3. ลบ Booking เก่าตามรอบเทอม (รันทุกวัน เวลา 00:00 น.)
  cron.schedule('0 0 * * *', async () => {
    console.log('⏳ [Daily Maintenance] เริ่มทำงาน...');
    
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // 🔄 3.1 ปรับคำขอจองที่ pending และเลยกำหนดวัน ให้เป็น cancelled
      const autoCancelResult = await client.query(`
        UPDATE public."Booking" 
        SET status = 'cancelled'
        WHERE status = 'pending' AND date < CURRENT_DATE
      `);
      
      if (autoCancelResult.rowCount > 0) {
        console.log(`🚫 [Auto-Cancel] เปลี่ยนสถานะคำขอที่หมดอายุเป็น cancelled จำนวน ${autoCancelResult.rowCount} รายการ`);
      }

      // 🔄 3.2 จัดการสถานะปีการศึกษา (Active -> Past)
      const activeExpired = await client.query(`
        SELECT academic_year 
        FROM public."Terms" 
        WHERE status = 'active' AND term = 'summer' AND end_date < CURRENT_DATE
        LIMIT 1
      `);

      if (activeExpired.rowCount > 0) {
        const expiredYear = activeExpired.rows[0].academic_year;
        
        await client.query(`DELETE FROM public."Terms" WHERE status = 'past'`);
        console.log(`🧹 [Term Update] ล้างข้อมูลเทอม past ของปีก่อนหน้าออกจากระบบเรียบร้อย`);

        await client.query(`
          UPDATE public."Terms" 
          SET status = 'past' 
          WHERE status = 'active'
        `);
        console.log(`✅ [Term Update] สิ้นสุดปีการศึกษา ${expiredYear} ปรับสถานะเป็น 'past' สำเร็จ`);
      }

      // 🧹 3.3 กวาดล้างข้อมูลการจองเก่า (หน่วงเวลา 7 วัน)
      const pastSummer = await client.query(`
        SELECT end_date 
        FROM public."Terms" 
        WHERE status = 'past' AND term = 'summer'
        LIMIT 1
      `);

      if (pastSummer.rowCount > 0 && pastSummer.rows[0].end_date) {
        const summerEndDateStr = pastSummer.rows[0].end_date;
        const summerEndDate = new Date(summerEndDateStr);
        
        const targetCleanupDate = new Date(summerEndDate);
        targetCleanupDate.setDate(targetCleanupDate.getDate() + 7);

        const today = new Date();
        today.setHours(0, 0, 0, 0); 

        if (today >= targetCleanupDate) {
          const pastRange = await client.query(`
            SELECT MIN(start_date) as start_year, MAX(end_date) as end_year
            FROM public."Terms"
            WHERE status = 'past'
          `);

          if (pastRange.rowCount > 0 && pastRange.rows[0].start_year) {
            const { start_year, end_year } = pastRange.rows[0];
            
            const historyDel = await client.query(`
              DELETE FROM public."Booking"
              WHERE date >= $1 AND date <= $2
              AND status IN ('rejected', 'completed', 'cancelled')
            `, [start_year, end_year]);

            if (historyDel.rowCount > 0) {
              console.log(`✅ [Booking Cleanup] ครบ 7 วัน: ลบประวัติการจองเก่าจำนวน ${historyDel.rowCount} รายการ`);
            } else {
              console.log(`✨ [Booking Cleanup] ไม่มีประวัติการจองเก่าที่ตรงเงื่อนไขให้ลบ`);
            }
          }
        } else {
          const diffTime = Math.abs(targetCleanupDate - today);
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
          console.log(`⏳ [Booking Cleanup] อยู่ในช่วง Grace Period (รออีก ${diffDays} วัน)`);
        }
      }

      await client.query('COMMIT');
      console.log('✨ [Daily Maintenance] ทำงานเสร็จสมบูรณ์');

    } catch (error) {
      await client.query('ROLLBACK');
      console.error('❌ [Daily Maintenance] เกิดข้อผิดพลาด:', error);
    } finally {
      client.release();
    }
  }, {
    scheduled: true,
    timezone: "Asia/Bangkok"
  });

  // 4. ลบ Token เก่า (รันตอนตี 3 ทุกวัน)
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
  }, {
    scheduled: true,
    timezone: "Asia/Bangkok"
  });
};