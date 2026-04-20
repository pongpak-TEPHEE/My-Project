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

// 1. GET: ดึงข้อมูลประวัติตารางเรียน (DetailSchedules) ไปแสดงผล
router.get('/allScheduleLog', authenticateToken, authorizeRole('staff'), getScheduleLog);

// 2. PUT: แก้ไขข้อมูล Header (ภาควิชา, ชั้นปี, โครงการ)
router.put('/:id', authenticateToken, authorizeRole('staff'), editScheduleLog);

// 3. DELETE: ลบข้อมูลตารางเรียน (แม่และลูก) ทิ้งทั้งหมด
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
/**
 * @swagger
 * /schedules/import:
 *   post:
 *     summary: อัปโหลดไฟล์ Excel เพื่อสร้างตารางสอนอัตโนมัติ
 *     tags:
 *       - Schedules
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *                 description: ไฟล์ Excel (.xlsx) ตารางสอน
 *     responses:
 *       200:
 *         description: ตรวจสอบและประมวลผลไฟล์ Excel สำเร็จ (Preview ข้อมูลและข้อผิดพลาด)
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "ตรวจสอบไฟล์เรียบร้อย (Generate 15 สัปดาห์)"
 *                 total_rows_excel:
 *                   type: integer
 *                   description: จำนวนแถวทั้งหมดในไฟล์ Excel (ไม่รวม Header)
 *                   example: 10
 *                 total_generated_slots:
 *                   type: integer
 *                   description: จำนวนคาบเรียนทั้งหมดที่คำนวณได้ (เช่น 10 วิชา x 15 สัปดาห์ = 150)
 *                   example: 150
 *                 valid_count:
 *                   type: integer
 *                   description: จำนวนคาบเรียนที่ข้อมูลถูกต้องและพร้อมบันทึก
 *                   example: 148
 *                 error_count:
 *                   type: integer
 *                   description: จำนวนคาบเรียนที่มีข้อผิดพลาด
 *                   example: 2
 *                 previewData:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       temp_id:
 *                         type: string
 *                         example: "1_w1"
 *                       week_number:
 *                         type: integer
 *                         example: 1
 *                       room_id:
 *                         type: string
 *                         example: "SC1-101"
 *                       subject_name:
 *                         type: string
 *                         example: "Software Engineering"
 *                       teacher_name:
 *                         type: string
 *                         example: "พงศ์ภัค"
 *                       teacher_surname:
 *                         type: string
 *                         example: "ใจดี"
 *                       start_time:
 *                         type: string
 *                         example: "09:00"
 *                       end_time:
 *                         type: string
 *                         example: "12:00"
 *                       semester_id:
 *                         type: string
 *                         example: "1/2569"
 *                       temporarily_closed:
 *                         type: boolean
 *                         example: false
 *                       teacher_id:
 *                         type: string
 *                         example: "65xxxxxx"
 *                       date:
 *                         type: string
 *                         format: date
 *                         example: "2026-06-01"
 *                 errors:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       row:
 *                         type: integer
 *                         example: 2
 *                       week:
 *                         type: integer
 *                         example: 1
 *                       date:
 *                         type: string
 *                         example: "2026-06-01"
 *                       room:
 *                         type: string
 *                         example: "SC1-101"
 *                       type:
 *                         type: string
 *                         example: "COLLISION"
 *                       message:
 *                         type: string
 *                         example: "(Week 1: 2026-06-01) เวลาชนกับวิชาที่มีอยู่แล้ว: Database (09:00-12:00)"
 *       400:
 *         description: ไม่ได้แนบไฟล์ หรือไฟล์ไม่มีข้อมูล
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *             example:
 *               message: "กรุณาอัปโหลดไฟล์ Excel"
 *       401:
 *         description: ไม่มี Token, ไม่พบผู้ใช้ หรือยืนยันตัวตนไม่สำเร็จ (Unauthorized)
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *             examples:
 *               NoToken:
 *                 summary: ไม่ได้แนบ Token
 *                 value:
 *                   message: "Access Denied: No Token Provided"
 *               UserNotFound:
 *                 summary: ไม่พบผู้ใช้งาน
 *                 value:
 *                   message: "ไม่พบผู้ใช้งานนี้ในระบบแล้ว"
 *               NotAuthenticated:
 *                 summary: ไม่ผ่านการยืนยันตัวตน
 *                 value:
 *                   message: "User not authenticated"
 *       403:
 *         description: สิทธิ์ไม่เพียงพอ, Token มีปัญหา หรือบัญชีถูกระงับ (Forbidden)
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *             examples:
 *               RoleDenied:
 *                 summary: สิทธิ์การเข้าถึงไม่เพียงพอ
 *                 value:
 *                   message: "Access Denied: Requires one of these roles: admin, staff"
 *               AccountSuspended:
 *                 summary: บัญชีถูกระงับ
 *                 value:
 *                   message: "บัญชีของคุณถูกระงับการใช้งาน กรุณาติดต่อเจ้าหน้าที่"
 *               TokenBlacklisted:
 *                 summary: Token ถูกยกเลิก (Logout ไปแล้ว)
 *                 value:
 *                   message: "Token นี้ถูกยกเลิกแล้ว (กรุณา Login ใหม่)"
 *               TokenExpired:
 *                 summary: Token หมดอายุ
 *                 value:
 *                   message: "Token หมดอายุแล้ว (Expired)"
 *               TokenInvalid:
 *                 summary: Token ไม่ถูกต้อง
 *                 value:
 *                   message: "Token ไม่ถูกต้อง (Invalid)"
 *       500:
 *         description: ระบบขัดข้อง
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *             example:
 *               message: "เกิดข้อผิดพลาดในการประมวลผลไฟล์ Excel"
 */
router.post('/import', authenticateToken, authorizeRole('staff'), handleExcelUpload, importClassSchedules);

// ยืนยันการบันทึกข้อมูล (Confirm)
// POST /schedules/confirm
/**
 * @swagger
 * /schedules/confirm:
 *   post:
 *     summary: ยืนยันการบันทึกตารางสอนลงฐานข้อมูล (หลังจากพรีวิว Excel)
 *     tags:
 *       - Schedules
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               schedules:
 *                 type: array
 *                 description: อาเรย์ของข้อมูลตารางสอนที่ผ่านการตรวจสอบแล้ว
 *                 items:
 *                   type: object
 *                   properties:
 *                     room_id:
 *                       type: string
 *                       example: "SC1-101"
 *                     subject_name:
 *                       type: string
 *                       example: "Software Engineering"
 *                     start_time:
 *                       type: string
 *                       example: "09:00"
 *                     end_time:
 *                       type: string
 *                       example: "12:00"
 *                     semester_id:
 *                       type: string
 *                       example: "1/2569"
 *                     teacher_id:
 *                       type: string
 *                       example: "65xxxxxx"
 *                     date:
 *                       type: string
 *                       format: date
 *                       example: "2026-06-01"
 *     responses:
 *       200:
 *         description: บันทึกข้อมูลทั้งหมดสำเร็จ
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "บันทึกข้อมูลทั้งหมดสำเร็จ"
 *                 totalSaved:
 *                   type: integer
 *                   example: 15
 *       400:
 *         description: ไม่มีข้อมูลที่จะบันทึก
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *             example:
 *               message: "ไม่มีข้อมูลที่จะบันทึก"
 *       401:
 *         description: ไม่มี Token, ไม่พบผู้ใช้ หรือยืนยันตัวตนไม่สำเร็จ (Unauthorized)
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *             examples:
 *               NoToken:
 *                 summary: ไม่ได้แนบ Token
 *                 value:
 *                   message: "Access Denied: No Token Provided"
 *               UserNotFound:
 *                 summary: ไม่พบผู้ใช้งาน
 *                 value:
 *                   message: "ไม่พบผู้ใช้งานนี้ในระบบแล้ว"
 *               NotAuthenticated:
 *                 summary: ไม่ผ่านการยืนยันตัวตน
 *                 value:
 *                   message: "User not authenticated"
 *       403:
 *         description: สิทธิ์ไม่เพียงพอ, Token มีปัญหา หรือบัญชีถูกระงับ (Forbidden)
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *             examples:
 *               RoleDenied:
 *                 summary: สิทธิ์การเข้าถึงไม่เพียงพอ
 *                 value:
 *                   message: "Access Denied: Requires one of these roles: admin, staff"
 *               AccountSuspended:
 *                 summary: บัญชีถูกระงับ
 *                 value:
 *                   message: "บัญชีของคุณถูกระงับการใช้งาน กรุณาติดต่อเจ้าหน้าที่"
 *               TokenBlacklisted:
 *                 summary: Token ถูกยกเลิก (Logout ไปแล้ว)
 *                 value:
 *                   message: "Token นี้ถูกยกเลิกแล้ว (กรุณา Login ใหม่)"
 *               TokenExpired:
 *                 summary: Token หมดอายุ
 *                 value:
 *                   message: "Token หมดอายุแล้ว (Expired)"
 *               TokenInvalid:
 *                 summary: Token ไม่ถูกต้อง
 *                 value:
 *                   message: "Token ไม่ถูกต้อง (Invalid)"
 *       500:
 *         description: เกิดข้อผิดพลาดในการบันทึกข้อมูล
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *             example:
 *               message: "เกิดข้อผิดพลาดในการบันทึกข้อมูล"
 *               error: "รายละเอียด error message จากระบบ"
 */
router.post('/confirm', authenticateToken, authorizeRole('staff'), confirmSchedules);


// ดึงข้อมูลที่เก็บไว้ใน table schedule ไปแสดงผลในตารางทุกห้อง
/**
 * @swagger
 * /schedules:
 *   get:
 *     summary: ดึงข้อมูลตารางเรียนทั้งหมดทุกห้อง (รองรับการกรองตามภาคการศึกษา)
 *     tags:
 *       - Schedules
 *     parameters:
 *       - in: query
 *         name: semester_id
 *         required: false
 *         schema:
 *           type: string
 *         description: รหัสภาคการศึกษาสำหรับใช้กรองข้อมูล (เช่น "1/2569" หรือเว้นว่างเพื่อดูทั้งหมด)
 *     responses:
 *       200:
 *         description: ดึงข้อมูลตารางเรียนทั้งหมดสำเร็จ
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "ดึงข้อมูลตารางเรียนทั้งหมดสำเร็จ"
 *                 semester:
 *                   type: string
 *                   example: "All"
 *                 total:
 *                   type: integer
 *                   example: 150
 *                 schedules:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       schedule_id:
 *                         type: string
 *                         example: "sch-1001"
 *                       room_id:
 *                         type: string
 *                         example: "SC1-101"
 *                       subject_name:
 *                         type: string
 *                         example: "Database Management"
 *                       teacher_name:
 *                         type: string
 *                         example: "พงศ์ภัค"
 *                       teacher_surname:
 *                         type: string
 *                         example: "ใจดี"
 *                       start_time:
 *                         type: string
 *                         example: "13:00"
 *                       end_time:
 *                         type: string
 *                         example: "16:00"
 *                       semester_id:
 *                         type: string
 *                         example: "1/2569"
 *                       date:
 *                         type: string
 *                         format: date
 *                         example: "2026-06-05"
 *                       temporarily_closed:
 *                         type: boolean
 *                         example: false
 *                       teacher_id:
 *                         type: string
 *                         example: "65xxxxxx"
 *                       status_text:
 *                         type: string
 *                         example: "เรียนปกติ"
 *       500:
 *         description: ระบบขัดข้อง
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *             example:
 *               message: "เกิดข้อผิดพลาดในการดึงข้อมูลทั้งหมด"
 */
router.get('/', getAllSchedules)

// เรียกใช้การ งดใช้ห้อง
// PATCH /schedules/:id/status
// :id คือ schedule_id
/**
 * @swagger
 * /schedules/{id}/status:
 *   patch:
 *     summary: เปลี่ยนสถานะงดใช้ห้อง/งดคลาสเรียนรายคาบ (Staff แก้ได้ทั้งหมด, Teacher แก้ได้เฉพาะของตัวเอง)
 *     tags:
 *       - Schedules
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: รหัสคาบเรียน (schedule_id) ที่ต้องการเปลี่ยนสถานะ (เช่น "sch-1001")
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - temporarily_closed
 *             properties:
 *               temporarily_closed:
 *                 type: boolean
 *                 description: สถานะการงดคลาส (true = งดใช้ห้อง/งดคลาส, false = เรียนปกติ)
 *                 example: true
 *     responses:
 *       200:
 *         description: อัปเดตสถานะสำเร็จ
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *             example:
 *               message: "อัปเดตสถานะสำเร็จ: งดใช้ห้อง (Closed)"
 *               schedule:
 *                 schedule_id: "sch-1001"
 *                 subject_name: "Software Engineering"
 *                 temporarily_closed: true
 *       400:
 *         description: ข้อมูลที่ส่งมาไม่ถูกต้อง (ไม่ได้ส่งเป็น Boolean)
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *             example:
 *               message: "ข้อมูลไม่ถูกต้อง (ต้องเป็น true หรือ false)"
 *       401:
 *         description: ไม่มี Token, ไม่พบผู้ใช้ หรือยืนยันตัวตนไม่สำเร็จ (Unauthorized)
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *             examples:
 *               NoToken:
 *                 summary: ไม่ได้แนบ Token
 *                 value:
 *                   message: "Access Denied: No Token Provided"
 *               UserNotFound:
 *                 summary: ไม่พบผู้ใช้งาน
 *                 value:
 *                   message: "ไม่พบผู้ใช้งานนี้ในระบบแล้ว"
 *               NotAuthenticated:
 *                 summary: ไม่ผ่านการยืนยันตัวตน
 *                 value:
 *                   message: "User not authenticated"
 *       403:
 *         description: สิทธิ์ไม่เพียงพอ, Token มีปัญหา หรือบัญชีถูกระงับ (Forbidden)
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *             examples:
 *               RoleDenied:
 *                 summary: สิทธิ์การเข้าถึงไม่เพียงพอ
 *                 value:
 *                   message: "Access Denied: Requires one of these roles: admin, staff"
 *               AccountSuspended:
 *                 summary: บัญชีถูกระงับ
 *                 value:
 *                   message: "บัญชีของคุณถูกระงับการใช้งาน กรุณาติดต่อเจ้าหน้าที่"
 *               TokenBlacklisted:
 *                 summary: Token ถูกยกเลิก (Logout ไปแล้ว)
 *                 value:
 *                   message: "Token นี้ถูกยกเลิกแล้ว (กรุณา Login ใหม่)"
 *               TokenExpired:
 *                 summary: Token หมดอายุ
 *                 value:
 *                   message: "Token หมดอายุแล้ว (Expired)"
 *               TokenInvalid:
 *                 summary: Token ไม่ถูกต้อง
 *                 value:
 *                   message: "Token ไม่ถูกต้อง (Invalid)"
 *       500:
 *         description: ระบบขัดข้อง
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *             example:
 *               message: "เกิดข้อผิดพลาดในการอัปเดตสถานะ"
 */
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

// 4. POST: อัปโหลดไฟล์ Excel ใหม่เพื่อ Preview (ใช้ข้อมูล Header เดิม)
// ⚠️ ต้องมี upload.single('file') ดักไว้ เพื่อรับไฟล์จาก Frontend ที่แนบมากับชื่อ 'file'
router.post('/reupload/:id', authenticateToken, authorizeRole('staff'), upload.single('file'), reuploadScheduleFile);

// 5. PUT: ยืนยันการบันทึก (ลบข้อมูลคาบเรียนเก่าทิ้ง และ Insert ของใหม่ลงไป)
router.put('/reconfirm/:id', authenticateToken, authorizeRole('staff'), confirmReuploadSchedules);

// ดึงข้อมูลที่เก็บไว้ใน table schedule ไปแสดงผลในตาราง
/**
 * @swagger
 * /schedules/{room_id}:
 *   get:
 *     summary: ดึงข้อมูลตารางเรียนของห้องที่ระบุ (รองรับการกรองตามภาคการศึกษา)
 *     tags:
 *       - Schedules
 *     parameters:
 *       - in: path
 *         name: room_id
 *         required: true
 *         schema:
 *           type: string
 *         description: รหัสห้องที่ต้องการดูตารางเรียน
 *       - in: query
 *         name: semester_id
 *         required: false
 *         schema:
 *           type: string
 *         description: รหัสภาคการศึกษาสำหรับใช้กรองข้อมูล (เช่น "1/2569" หรือเว้นว่างเพื่อดูทั้งหมด)
 *     responses:
 *       200:
 *         description: ดึงข้อมูลตารางเรียนสำเร็จ
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 room_id:
 *                   type: string
 *                   example: "SC1-101"
 *                 semester:
 *                   type: string
 *                   example: "1/2569"
 *                 total:
 *                   type: integer
 *                   example: 2
 *                 schedules:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       schedule_id:
 *                         type: string
 *                         example: "sch-1001"
 *                       room_id:
 *                         type: string
 *                         example: "SC1-101"
 *                       subject_name:
 *                         type: string
 *                         example: "Software Engineering"
 *                       teacher_name:
 *                         type: string
 *                         example: "พงศ์ภัค ใจดี"
 *                       start_time:
 *                         type: string
 *                         example: "09:00"
 *                       end_time:
 *                         type: string
 *                         example: "12:00"
 *                       semester_id:
 *                         type: string
 *                         example: "1/2569"
 *                       date:
 *                         type: string
 *                         format: date
 *                         example: "2026-06-01"
 *                       temporarily_closed:
 *                         type: boolean
 *                         example: false
 *                       teacher_id:
 *                         type: string
 *                         example: "65xxxxxx"
 *                       status_text:
 *                         type: string
 *                         example: "เรียนปกติ"
 *       500:
 *         description: ระบบขัดข้อง
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *             example:
 *               message: "เกิดข้อผิดพลาดในการดึงตารางเรียน"
 */
router.get('/:room_id', getSchedule)



export default router;