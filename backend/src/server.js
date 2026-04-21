import app from './app.js';
import { startCleanupJob } from './services/cron.service.js';
import { pool } from './config/db.js';

const PORT = process.env.PORT || 3000;

// 1. เริ่มต้นการทำงานของ Cron Job
startCleanupJob();

// 2. สั่งรันเซิร์ฟเวอร์
const server = app.listen(PORT, async () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`⏰ Cron Job Service started`);

  // (Optional) เช็คว่า Database เชื่อมต่อติดไหมตั้งแต่ตอนเริ่มรัน
  try {
    const client = await pool.connect();
    console.log(`🗄️ Database Connected Successfully!`);
    client.release();
  } catch (error) {
    console.error(`❌ Database Connection Failed:`, error);
  }
});

// 3. ดักจับ Error ระดับ Node.js ป้องกันเซิร์ฟเวอร์ดับกะทันหัน
process.on('unhandledRejection', (err) => {
  console.log('🚨 UNHANDLED REJECTION! 💥 Shutting down...');
  console.log(err.name, err.message);
  server.close(() => {
    process.exit(1);
  });
});