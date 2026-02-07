import app from './app.js';
import { startCleanupJob } from './services/cron.service.js';

const PORT = process.env.PORT || 3000;

// เริ่มต้นการทำงานของ Cron Job
startCleanupJob();

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`⏰ Cron Job Service started`);
});