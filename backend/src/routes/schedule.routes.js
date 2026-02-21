import express from 'express';
import { handleExcelUpload } from '../middleware/upload.js';
import { importClassSchedules, getSchedule, confirmSchedules, updateScheduleStatus, getAllSchedules } from '../controllers/schedule.controller.js';
import { authenticateToken, authorizeRole } from '../middleware/auth.middleware.js';

const router = express.Router();

// ตั้งค่า Multer ให้เก็บไฟล์ไว้ใน RAM (MemoryStorage) ชั่วคราว เพื่อให้ Controller อ่านได้เลยไม่ต้องบันทึกลง Disk



// อัปโหลดไฟล์ Excel (เพื่อ Preview)
// POST /schedules/import
router.post('/import', 
    authenticateToken, 
    authorizeRole('staff'), 
    handleExcelUpload, 
    importClassSchedules
);

// ยืนยันการบันทึกข้อมูล (Confirm)
// POST /schedules/confirm
router.post('/confirm', 
    authenticateToken, 
    authorizeRole('admin', 'staff'), 
    confirmSchedules
);

// ดึงข้อมูลที่เก็บไว้ใน table schedule ไปแสดงผลในตาราง
router.get('/:room_id', getSchedule)

// ดึงข้อมูลที่เก็บไว้ใน table schedule ไปแสดงผลในตารางทุกห้อง
router.get('/', getAllSchedules)

// เรียกใช้การ งดใช้ห้อง
// PATCH /schedules/:id/status
// :id คือ schedule_id
router.patch('/:id/status', 
  authenticateToken, 
  authorizeRole('teacher', 'staff'), 
  updateScheduleStatus
);

export default router;