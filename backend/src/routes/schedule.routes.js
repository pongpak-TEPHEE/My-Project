import express from 'express';
import { handleExcelUpload } from '../middleware/upload.js';
import multer from 'multer';
import { importClassSchedules, 
    getSchedule, 
    confirmSchedules, 
    updateScheduleStatus, 
    getAllSchedules, 
    getScheduleLog,
    editScheduleLog,
    deleteScheduleLog,
    reuploadScheduleFile,
    confirmReuploadSchedules,
    exportTermReport,
    showSubjectSchedule,
    editSubjectDataSchedule,
    deleteSubjectSchedule,
    showReport,
    showReportForStaff
    } 
    from '../controllers/schedule.controller.js';
import { authenticateToken, authorizeRole } from '../middleware/auth.middleware.js';


const router = express.Router();

// api สำหรับการสรัาง log ข้อมูลเพื่อดู
router.get('/export-excel', authenticateToken, authorizeRole('staff'), exportTermReport);

// ==========================================
// 🚏 Routes สำหรับจัดการประวัติตารางเรียน
// ==========================================

// GET: ดึงข้อมูลประวัติตารางเรียน (DetailSchedules) ไปแสดงผล
router.get('/allScheduleLog', authenticateToken, authorizeRole('staff'), getScheduleLog);

// PUT: แก้ไขข้อมูล Header (ภาควิชา, ชั้นปี, โครงการ)
router.put('/:id', authenticateToken, authorizeRole('staff'), editScheduleLog);

// DELETE: ลบข้อมูลตารางเรียน (แม่และลูก) ทิ้งทั้งหมด
router.delete('/:id', authenticateToken, authorizeRole('staff'), deleteScheduleLog);

router.get('/showReport', authenticateToken, authorizeRole('staff', 'teacher'), showReport);

router.get('/showReportForStaff', authenticateToken, authorizeRole('staff'), showReportForStaff);

// ==========================================
// 📦 ตั้งค่า Multer สำหรับรับไฟล์ Excel
// ==========================================

// เก็บไฟล์ไว้ใน Memory (Buffer) เพื่อส่งให้ ExcelJS อ่านได้ทันทีโดยไม่ต้องเซฟลงเครื่อง
const upload = multer({ storage: multer.memoryStorage() });

// อัปโหลดไฟล์ Excel (เพื่อ Preview)
// POST /schedules/import
router.post('/import', authenticateToken, authorizeRole('staff'), handleExcelUpload, importClassSchedules);

// ยืนยันการบันทึกข้อมูล (Confirm)
// POST /schedules/confirm
router.post('/confirm', authenticateToken, authorizeRole('staff'), confirmSchedules);


// ดึงข้อมูลที่เก็บไว้ใน table schedule ไปแสดงผลในตารางทุกห้อง
router.get('/', getAllSchedules)

// เรียกใช้การ งดใช้ห้อง
// PATCH /schedules/:id/status
// :id คือ schedule_id
router.patch('/:id/status', authenticateToken, authorizeRole('teacher', 'staff'), updateScheduleStatus);

// ดึงข้อมูลรายวิชาทั้งหมดในห้องนั้นๆ
router.get('/subjects/:room_id', authenticateToken, authorizeRole('staff'), showSubjectSchedule);

// แก้ไขข้อมูลรายวิชาในห้องนั้นๆ
router.patch('/editSubjects/:room_id', authenticateToken, authorizeRole('staff'), editSubjectDataSchedule);

// ลบข้อมูลรายวิชาออกจากห้องนั้นๆ
router.delete('/deleteSubjects/:room_id', authenticateToken, authorizeRole('staff'), deleteSubjectSchedule);

// ==========================================
// 🔄 Routes สำหรับอัปเดต/เขียนทับไฟล์ Excel
// ==========================================

// POST: อัปโหลดไฟล์ Excel ใหม่เพื่อ Preview (ใช้ข้อมูล Header เดิม)
router.post('/reupload/:id', authenticateToken, authorizeRole('staff'), upload.single('file'), reuploadScheduleFile);

// PUT: ยืนยันการบันทึก (ลบข้อมูลคาบเรียนเก่าทิ้ง และ Insert ของใหม่ลงไป)
router.put('/reconfirm/:id', authenticateToken, authorizeRole('staff'), confirmReuploadSchedules);

// ดึงข้อมูลที่เก็บไว้ใน table schedule ไปแสดงผลในตาราง
router.get('/:room_id', getSchedule)


export default router;