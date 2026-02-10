import express from 'express';
import multer from 'multer';
import { importClassSchedules, getSchedule, confirmSchedules } from '../controllers/schedule.controller.js';
import { authenticateToken, authorizeRole } from '../middleware/auth.middleware.js';

const router = express.Router();

// ตั้งค่า Multer ให้เก็บไฟล์ไว้ใน RAM (MemoryStorage) ชั่วคราว เพื่อให้ Controller อ่านได้เลยไม่ต้องบันทึกลง Disk
const upload = multer({ storage: multer.memoryStorage() });

// POST http://localhost:3000/semesters/import
// key ที่ส่งไฟล์มาต้องชื่อว่า 'file'
// router.post('/import', upload.single('file'), importClassSchedules);

// 📤 Step 1: อัปโหลดไฟล์ Excel (เพื่อ Preview)
// POST /schedules/import
router.post('/import', 
    authenticateToken, 
    authorizeRole('staff'), 
    upload.single('file'), 
    importClassSchedules
);

// ✅ Step 2: ยืนยันการบันทึกข้อมูล (Confirm)
// POST /schedules/confirm
router.post('/confirm', 
    authenticateToken, 
    authorizeRole('admin', 'staff'), 
    confirmSchedules
);

router.get('/:room_id', getSchedule)

export default router;