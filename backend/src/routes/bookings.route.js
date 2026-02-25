import express from 'express';
import { 
    createBookingForTeacher,
    createBookingForStaff,
    getPendingBookings,
    getRoomStatus, 
    updateBookingStatus, 
    getApprovedBookings, 
    getRejectedBookings, 
    getAllBookingSpecific,
    getAllBooking,
    getMyBookings,
    cancelBooking,
    editBooking,
    getMyActiveBookings,
    getMyBookingHistory
 } 
 from '../controllers/bookings.controller.js';
import { authenticateToken, authorizeRole } from '../middleware/auth.middleware.js';

const router = express.Router();

// กฎ: ต้อง Login + เป็น teacher 
/**
 * @swagger
 * /bookings/teacher:
 *   post:
 *     summary: สร้างคำขอจองห้อง (สำหรับอาจารย์)
 *     tags: [Bookings]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               room_id:
 *                 type: string
 *                 description: รหัสห้องที่ต้องการจอง
 *                 example: "SC1-101"
 *               purpose:
 *                 type: string
 *                 description: วัตถุประสงค์การจอง
 *                 example: "สอนชดเชยวิชา Database Management"
 *               date:
 *                 type: string
 *                 format: date
 *                 description: วันที่ต้องการจอง (YYYY-MM-DD)
 *                 example: "2026-03-01"
 *               start_time:
 *                 type: string
 *                 format: time
 *                 description: เวลาเริ่ม (HH:MM)
 *                 example: "13:00"
 *               end_time:
 *                 type: string
 *                 format: time
 *                 description: เวลาสิ้นสุด (HH:MM)
 *                 example: "16:00"
 *     responses:
 *       201:
 *         description: จองห้องสำเร็จ
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               example:
 *                 message: "จองห้องสำเร็จ"
 *                 bookingId: "123e4567-e89b-12d3-a456-426614174000"
 *       400:
 *         description: ข้อมูลไม่ถูกต้อง หรือ เงื่อนไขการจองไม่ผ่าน
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 status:
 *                   type: string
 *             examples:
 *               ExceedTimeLimit:
 *                 summary: กรณีเลือกห้องเกินเวลาที่กำหนด
 *                 value:
 *                   message: "ไม่อนุญาตให้จองห้องเกิน 12 ชั่วโมงต่อครั้ง"
 *               ExceedAdvanceDays:
 *                 summary: กรณีจองล่วงหน้าเกินกำหนด
 *                 value:
 *                   message: "สามารถจองล่วงหน้าได้ไม่เกิน 10 วันเท่านั้น"
 *               PastDate:
 *                 summary: กรณีเลือกวันย้อนหลัง
 *                 value:
 *                   message: "ไม่สามารถจองวันย้อนหลังได้"
 *               PastTime:
 *                 summary: กรณีเลือกเวลาย้อนหลัง
 *                 value:
 *                   message: "เวลาที่เลือกผ่านไปแล้ว"
 *               PendingQueue:
 *                 summary: กรณีมีผู้รอคิวอนุมัติอยู่แล้ว
 *                 value:
 *                   message: "ช่วงเวลานี้มีผู้รอการอนุมัติอยู่ (กรุณาตรวจสอบรายการ Pending ก่อน)"
 *                   status: "pending"
 *       409:
 *         description: เวลาจองซ้อนทับกับตารางอื่น
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 conflict_type:
 *                   type: string
 *                 time:
 *                   type: string
 *                 status:
 *                   type: string
 *             examples:
 *               ScheduleConflict:
 *                 summary: กรณีเลือกวันตรงกับในตารางเรียน
 *                 value:
 *                   message: "ไม่สามารถจองได้ เนื่องจากห้องนี้มีเรียนวิชา: NLP"
 *                   conflict_type: "schedule"
 *                   time: "12:00:00 - 15:00:00"
 *               ApprovedConflict:
 *                 summary: กรณีเลือกวันที่มีการจองที่ได้รับอนุญาตแล้ว
 *                 value:
 *                   message: "ไม่สามารถจองได้ เนื่องจากช่วงเวลานี้ได้รับการอนุมัติแล้ว"
 *                   status: "approved"
 *       500:
 *         description: ระบบขัดข้อง
 */
router.post('/teacher', authenticateToken, authorizeRole('teacher'), createBookingForTeacher);

// กฎ: ต้อง Login + เป็น  staff
/**
 * @swagger
 * /bookings/staff:
 *   post:
 *     summary: สร้างการจองห้อง (สำหรับ Staff - อนุมัติทันที)
 *     tags: [Bookings]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               room_id:
 *                 type: string
 *                 description: รหัสห้องที่ต้องการจอง
 *                 example: "SC1-101"
 *               purpose:
 *                 type: string
 *                 description: วัตถุประสงค์การจอง
 *                 example: "เตรียมสถานที่ประชุมคณะ"
 *               date:
 *                 type: string
 *                 format: date
 *                 description: วันที่ต้องการจอง (YYYY-MM-DD)
 *                 example: "2026-03-01"
 *               start_time:
 *                 type: string
 *                 format: time
 *                 description: เวลาเริ่ม (HH:MM)
 *                 example: "09:00"
 *               end_time:
 *                 type: string
 *                 format: time
 *                 description: เวลาสิ้นสุด (HH:MM)
 *                 example: "12:00"
 *     responses:
 *       201:
 *         description: จองห้องสำเร็จ (อนุมัติทันที)
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               example:
 *                 message: "จองห้องสำเร็จ (อนุมัติทันที)"
 *                 bookingId: "123e4567-e89b-12d3-a456-426614174000"
 *                 status: "approved"
 *       400:
 *         description: ข้อมูลไม่ถูกต้อง หรือละเมิดเงื่อนไขการจอง
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *             examples:
 *               ExceedDuration:
 *                 summary: กรณีจองเกินเวลาที่กำหนด
 *                 value:
 *                   message: "ไม่อนุญาตให้จองห้องเกิน 12 ชั่วโมงต่อครั้ง (คุณเลือกไป 14 ชั่วโมง)"
 *               ExceedAdvanceDays:
 *                 summary: กรณีจองล่วงหน้าเกินกำหนด
 *                 value:
 *                   message: "สามารถจองล่วงหน้าได้ไม่เกิน 30 วันเท่านั้น"
 *               PastDate:
 *                 summary: กรณีจองเวลาย้อนหลัง
 *                 value:
 *                   message: "ไม่สามารถจองเวลาย้อนหลังได้"
 *               PastTime:
 *                 summary: กรณีเวลาที่เลือกผ่านไปแล้ว
 *                 value:
 *                   message: "เวลาที่เลือกผ่านไปแล้ว"
 *               RoomSuspended:
 *                 summary: กรณีห้องถูกระงับการใช้งาน
 *                 value:
 *                   success: false
 *                   message: "ไม่สามารถจองได้ เนื่องจากห้องนี้ถูกระงับการใช้งานชั่วคราวครับ"
 *               PendingQueue:
 *                 summary: กรณีมีคนอื่นรอคิวอนุมัติอยู่
 *                 value:
 *                   message: "ช่วงเวลานี้มีผู้รอการอนุมัติอยู่ (กรุณาตรวจสอบรายการ Pending ก่อน)"
 *                   status: "pending"
 *       404:
 *         description: ไม่พบข้อมูลห้องในระบบ
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               example:
 *                 success: false
 *                 message: "ไม่พบข้อมูลห้องนี้ในระบบครับ"
 *       409:
 *         description: เวลาจองซ้อนทับกับตารางอื่น
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *             examples:
 *               ScheduleConflict:
 *                 summary: กรณีชนกับตารางเรียน
 *                 value:
 *                   message: "ไม่สามารถจองได้ เนื่องจากห้องนี้มีเรียนวิชา: Database Systems"
 *                   conflict_type: "schedule"
 *                   time: "09:00 - 12:00"
 *               ApprovedConflict:
 *                 summary: กรณีชนกับการจองที่อนุมัติแล้ว
 *                 value:
 *                   message: "ไม่สามารถจองได้ เนื่องจากช่วงเวลานี้ได้รับการอนุมัติแล้ว"
 *                   status: "approved"
 *       500:
 *         description: ระบบขัดข้อง
 */
router.post('/staff', authenticateToken, authorizeRole('staff'), createBookingForStaff);

// ดูรายการรออนุมัติ
/**
 * @swagger
 * /bookings/pending:
 *   get:
 *     summary: ดึงรายการจองห้องที่รออนุมัติ (Pending Bookings)
 *     tags: [Bookings]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: ดึงข้อมูลรายการรออนุมัติสำเร็จ
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   booking_id:
 *                     type: string
 *                     example: "123e4567-e89b-12d3-a456-426614174000"
 *                   date:
 *                     type: string
 *                     format: date
 *                     example: "2026-03-01"
 *                   start_time:
 *                     type: string
 *                     example: "09:00"
 *                   end_time:
 *                     type: string
 *                     example: "12:00"
 *                   purpose:
 *                     type: string
 *                     example: "สอนชดเชยวิชา Database Management"
 *                   status:
 *                     type: string
 *                     example: "pending"
 *                   room_id:
 *                     type: string
 *                     example: "SC1-101"
 *                   name:
 *                     type: string
 *                     example: "พงศ์ภัค"
 *                   surname:
 *                     type: string
 *                     example: "ใจดี"
 *                   email:
 *                     type: string
 *                     example: "pongpak.te@ku.th"
 *       500:
 *         description: ระบบขัดข้อง
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "ไม่สามารถดึงข้อมูลรายการรออนุมัติได้"
 */
router.get('/pending', authenticateToken, authorizeRole('teacher', 'staff'), getPendingBookings);

// ดูรายการอนุมัติ
/**
 * @swagger
 * /bookings/approved:
 *   get:
 *     summary: ดึงรายการจองห้องที่ได้รับการอนุมัติแล้ว (Approved Bookings)
 *     tags: [Bookings]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: user_id
 *         schema:
 *           type: string
 *         description: "(สำหรับ Staff) ค้นหารายการอนุมัติของอาจารย์เฉพาะคน (หากเป็น Teacher ระบบจะบังคับดึงเฉพาะของตัวเองอัตโนมัติ)"
 *     responses:
 *       200:
 *         description: ดึงข้อมูลรายการที่อนุมัติแล้วสำเร็จ
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   booking_id:
 *                     type: string
 *                     example: "123e4567-e89b-12d3-a456-426614174000"
 *                   date:
 *                     type: string
 *                     format: date
 *                     example: "2026-03-01"
 *                   start_time:
 *                     type: string
 *                     example: "13:00"
 *                   end_time:
 *                     type: string
 *                     example: "16:00"
 *                   purpose:
 *                     type: string
 *                     example: "สอนชดเชยวิชา Database Management"
 *                   status:
 *                     type: string
 *                     example: "approved"
 *                   room_id:
 *                     type: string
 *                     example: "SC1-101"
 *                   name:
 *                     type: string
 *                     example: "พงศ์ภัค"
 *                   surname:
 *                     type: string
 *                     example: "ใจดี"
 *                   email:
 *                     type: string
 *                     example: "pongpak.te@ku.th"
 *       500:
 *         description: ระบบขัดข้อง
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "ไม่สามารถดึงข้อมูลรายการที่อนุมัติแล้วได้"
 */
router.get('/approved', authenticateToken, authorizeRole('teacher', 'staff'), getApprovedBookings);

// ดูรายการที่ปัดตก
/**
 * @swagger
 * /bookings/rejected:
 *   get:
 *     summary: ดึงรายการจองห้องที่ถูกปฏิเสธ (Rejected Bookings)
 *     tags: [Bookings]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: user_id
 *         schema:
 *           type: string
 *         description: "(สำหรับ Staff) ค้นหารายการที่ถูกปฏิเสธของอาจารย์เฉพาะคน (หากเป็น Teacher ระบบจะบังคับดึงเฉพาะของตัวเองอัตโนมัติ)"
 *     responses:
 *       200:
 *         description: ดึงข้อมูลรายการที่ถูกปฏิเสธสำเร็จ
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   booking_id:
 *                     type: string
 *                     example: "123e4567-e89b-12d3-a456-426614174000"
 *                   date:
 *                     type: string
 *                     format: date
 *                     example: "2026-03-01"
 *                   start_time:
 *                     type: string
 *                     example: "13:00"
 *                   end_time:
 *                     type: string
 *                     example: "16:00"
 *                   purpose:
 *                     type: string
 *                     example: "สอนชดเชยวิชา Database Management"
 *                   status:
 *                     type: string
 *                     example: "rejected"
 *                   room_id:
 *                     type: string
 *                     example: "SC1-101"
 *                   name:
 *                     type: string
 *                     example: "พงศ์ภัค"
 *                   surname:
 *                     type: string
 *                     example: "ใจดี"
 *                   email:
 *                     type: string
 *                     example: "pongpak.te@ku.th"
 *       500:
 *         description: ระบบขัดข้อง
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "ไม่สามารถดึงข้อมูลรายการที่ถูกปฏิเสธได้"
 */
router.get('/rejected', authenticateToken, authorizeRole('teacher', 'staff'), getRejectedBookings);

// เปลี่ยนสถานะ (เฉพาะ Staff)
// :id คือตัวแปรที่จะรับ booking_id (เช่น /bookings/b123/status)
/**
 * @swagger
 * /bookings/{id}/status:
 *   put:
 *     summary: อัปเดตสถานะการจองห้อง (สำหรับ Staff) พร้อมส่งอีเมลแจ้งเตือน
 *     tags: [Bookings]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: รหัสการจอง (booking_id) ที่ต้องการเปลี่ยนสถานะ
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - status
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [approved, rejected, pending]
 *                 description: สถานะการจองที่ต้องการเปลี่ยน
 *               reject_reason:
 *                 type: string
 *                 description: เหตุผลที่ปฏิเสธ (ควรใส่เมื่อสถานะเป็น rejected)
 *           examples:
 *             ApproveCase:
 *               summary: กรณีอนุมัติ
 *               value:
 *                 status: "approved"
 *             RejectCase:
 *               summary: กรณีปฏิเสธ
 *               value:
 *                 status: "rejected"
 *                 reject_reason: "ห้องมีการซ่อมแซมแอร์กะทันหัน"
 *     responses:
 *       200:
 *         description: อัปเดตสถานะและส่งอีเมลแจ้งเตือนสำเร็จ
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               example:
 *                 message: "อัปเดตสถานะเป็น approved เรียบร้อยแล้ว"
 *                 booking:
 *                   booking_id: "123e4567-e89b-12d3-a456-426614174000"
 *                   status: "approved"
 *       400:
 *         description: สถานะไม่ถูกต้อง (ต้องเป็น approved, rejected หรือ pending เท่านั้น)
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               example:
 *                 message: "สถานะไม่ถูกต้อง"
 *       404:
 *         description: ไม่พบรายการจองนี้
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               example:
 *                 message: "ไม่พบรายการจองนี้"
 *       500:
 *         description: เกิดข้อผิดพลาดในการอัปเดตสถานะ
 */
router.put('/:id/status', authenticateToken, authorizeRole('staff'), updateBookingStatus);

// เป็นการดึงรายการทั้งหมดของทุกห้องที่มี status approved
/**
 * @swagger
 * /bookings/allBooking:
 *   get:
 *     summary: ดึงรายการจองห้องทั้งหมดที่มี status approved
 *     tags:
 *       - Bookings
 *     responses:
 *       200:
 *         description: ดึงข้อมูลรายการจองที่อนุมัติแล้วสำเร็จ
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   booking_id:
 *                     type: string
 *                     example: "123e4567-e89b-12d3-a456-426614174000"
 *                   room_id:
 *                     type: string
 *                     example: "SC1-101"
 *                   date:
 *                     type: string
 *                     format: date
 *                     example: "2026-03-01"
 *                   start_time:
 *                     type: string
 *                     example: "13:00:00"
 *                   end_time:
 *                     type: string
 *                     example: "16:00:00"
 *                   purpose:
 *                     type: string
 *                     example: "สอนชดเชยวิชา Database Management"
 *                   status:
 *                     type: string
 *                     example: "approved"
 *                   teacher_name:
 *                     type: string
 *                     example: "พงศ์ภัค"
 *                   teacher_surname:
 *                     type: string
 *                     example: "ใจดี"
 *       500:
 *         description: ระบบขัดข้อง
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "Internal Server Error"
 */
router.get('/allBooking', getAllBooking);


// เป็นการดึงรายการทั้งหมดของห้องนั้นๆ ที่มี status approved
/**
 * @swagger
 * /bookings/allBookingSpecific/{roomId}:
 *   get:
 *     summary: ดึงรายการจองเฉพาะห้องที่ระบุ (สถานะ Approved สำหรับแสดงบนปฏิทินหน้าห้อง)
 *     tags:
 *       - Bookings
 *     parameters:
 *       - in: path
 *         name: roomId
 *         required: true
 *         schema:
 *           type: string
 *         description: รหัสห้องที่ต้องการดูตาราง (เช่น "26504")
 *     responses:
 *       200:
 *         description: ดึงข้อมูลรายการจองของห้องสำเร็จ
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   booking_id:
 *                     type: string
 *                     example: "123e4567-e89b-12d3-a456-426614174000"
 *                   date:
 *                     type: string
 *                     format: date
 *                     example: "2026-03-01"
 *                   start_time:
 *                     type: string
 *                     example: "13:00:00"
 *                   end_time:
 *                     type: string
 *                     example: "16:00:00"
 *                   purpose:
 *                     type: string
 *                     example: "สอนชดเชยวิชา Database Management"
 *                   teacher_name:
 *                     type: string
 *                     example: "พงศ์ภัค"
 *                   teacher_surname:
 *                     type: string
 *                     example: "ใจดี"
 *       500:
 *         description: ระบบขัดข้อง
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "Internal Server Error"
 */
router.get('/allBookingSpecific/:roomId', getAllBookingSpecific);

// API ดูประวัติการจองของฉัน
// GET http://localhost:3000/bookings/my-history
// ⚠️ ต้องวางไว้ "ก่อน" /:id นะครับ ไม่งั้นมันจะนึกว่า "my-history" คือ id
/**
 * @swagger
 * /bookings/my-history:
 *   get:
 *     summary: ดึงประวัติการจองห้องของฉัน (My Booking History)
 *     tags:
 *       - Bookings
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: ดึงข้อมูลประวัติการจองสำเร็จ
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   booking_id:
 *                     type: string
 *                     example: "123e4567-e89b-12d3-a456-426614174000"
 *                   date:
 *                     type: string
 *                     format: date
 *                     example: "2026-03-01"
 *                   start_time:
 *                     type: string
 *                     example: "13:00:00"
 *                   end_time:
 *                     type: string
 *                     example: "16:00:00"
 *                   purpose:
 *                     type: string
 *                     example: "สอนชดเชยวิชา Database Management"
 *                   status:
 *                     type: string
 *                     example: "approved"
 *                   reject_reason:
 *                     type: string
 *                     example: "ห้องมีการปรับปรุงแอร์กะทันหัน"
 *                   room_id:
 *                     type: string
 *                     example: "SC1-101"
 *       500:
 *         description: ระบบขัดข้อง
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "ไม่สามารถดึงประวัติการจองได้"
 */
router.get('/my-history', authenticateToken, getMyBookings);

// API ยกเลิกการจอง
// PUT http://localhost:3000/bookings/15/cancel
/**
 * @swagger
 * /bookings/{id}/cancel:
 *   put:
 *     summary: ยกเลิกการจองห้อง (สำหรับเจ้าของรายการ หรือ Staff)
 *     tags:
 *       - Bookings
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: รหัสการจอง (booking_id) ที่ต้องการยกเลิก
 *     responses:
 *       200:
 *         description: ยกเลิกการจองสำเร็จ
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "ยกเลิกการจองเรียบร้อยแล้ว"
 *       400:
 *         description: ไม่สามารถยกเลิกได้ (เงื่อนไขไม่ผ่าน)
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *               examples:
 *                 PastDate:
 *                   summary: กรณียกเลิกย้อนหลัง
 *                   value:
 *                     message: "ไม่สามารถยกเลิกรายการย้อนหลังได้"
 *                 AlreadyCancelled:
 *                   summary: กรณีถูกยกเลิกหรือปฏิเสธไปแล้ว
 *                   value:
 *                     message: "รายการนี้ถูกยกเลิกหรือปฏิเสธไปแล้ว"
 *       401:
 *         description: ไม่มี Token (Unauthorized)
 *       404:
 *         description: ไม่พบรายการจอง หรือไม่มีสิทธิ์ยกเลิก
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "ไม่พบรายการจอง หรือคุณไม่มีสิทธิ์ยกเลิกรายการนี้"
 *       500:
 *         description: ระบบขัดข้อง
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "เกิดข้อผิดพลาดในการยกเลิกการจอง"
 */
router.put('/:id/cancel', authenticateToken, cancelBooking);

/**
 * @swagger
 * /bookings/{id}:
 *   put:
 *     summary: แก้ไขข้อมูลการจองห้อง (สำหรับเจ้าของรายการ)
 *     tags:
 *       - Bookings
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: รหัสการจอง (booking_id) ที่ต้องการแก้ไข
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - purpose
 *               - date
 *               - start_time
 *               - end_time
 *             properties:
 *               purpose:
 *                 type: string
 *                 description: วัตถุประสงค์การจองใหม่
 *                 example: "สอนชดเชยวิชา Software Engineering (อัปเดตเนื้อหา)"
 *               date:
 *                 type: string
 *                 format: date
 *                 description: วันที่ต้องการจองใหม่ (YYYY-MM-DD)
 *                 example: "2026-03-05"
 *               start_time:
 *                 type: string
 *                 format: time
 *                 description: เวลาเริ่มใหม่ (HH:MM)
 *                 example: "09:00"
 *               end_time:
 *                 type: string
 *                 format: time
 *                 description: เวลาสิ้นสุดใหม่ (HH:MM)
 *                 example: "12:00"
 *     responses:
 *       200:
 *         description: แก้ไขการจองสำเร็จ
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 booking_id:
 *                   type: string
 *                 status:
 *                   type: string
 *               example:
 *                 message: "แก้ไขการจองสำเร็จ (สถานะถูกปรับเป็นรออนุมัติใหม่)"
 *                 booking_id: "123e4567-e89b-12d3-a456-426614174000"
 *                 status: "pending"
 *       400:
 *         description: ข้อมูลไม่ครบ หรือรายการถูกยกเลิกไปแล้ว
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *               examples:
 *                 MissingData:
 *                   summary: ข้อมูลไม่ครบ
 *                   value:
 *                     message: "กรุณากรอกข้อมูลให้ครบถ้วน"
 *                 AlreadyCancelled:
 *                   summary: แก้ไขรายการที่ยกเลิกแล้ว
 *                   value:
 *                     message: "รายการนี้ถูกยกเลิกไปแล้ว ไม่สามารถแก้ไขได้"
 *       403:
 *         description: ไม่มีสิทธิ์แก้ไขการจองของคนอื่น
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               example:
 *                 message: "คุณไม่มีสิทธิ์แก้ไขการจองของคนอื่น"
 *       404:
 *         description: ไม่พบรายการจองนี้
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               example:
 *                 message: "ไม่พบรายการจองนี้"
 *       409:
 *         description: เวลาจองซ้อนทับกับตารางเรียนหรือการจองอื่น
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *               examples:
 *                 ScheduleConflict:
 *                   summary: ชนกับตารางเรียน
 *                   value:
 *                     message: "แก้ไขไม่ได้ เนื่องจากเวลาชนกับวิชา: Software Engineering (09:00-12:00)"
 *                 BookingConflict:
 *                   summary: ชนกับการจองอื่น
 *                   value:
 *                     message: "แก้ไขไม่ได้ เนื่องจากช่วงเวลานี้มีคนอื่นจองแล้ว"
 *       500:
 *         description: ระบบขัดข้อง
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               example:
 *                 message: "เกิดข้อผิดพลาดในการแก้ไขข้อมูล"
 */
router.put('/:id', authenticateToken, authorizeRole('teacher', 'staff'), editBooking);

// ใช้เมื่อเราแสกน QR-Code จะเด้งไปหมายเลขห้องทีอยู่ใน QR code
/**
 * @swagger
 * /bookings/{id}:
 *   get:
 *     summary: ตรวจสอบสถานะห้องว่างวันนี้ (สำหรับสแกน QR Code หน้าห้อง)
 *     tags:
 *       - Bookings
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: รหัสห้องที่ต้องการตรวจสอบจาก QR Code (เช่น SC1-101)
 *     responses:
 *       200:
 *         description: ดึงข้อมูลสถานะห้องสำเร็จ
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *             example:
 *               room_info:
 *                 room_id: "SC1-101"
 *                 date: "2026-02-25"
 *                 status_label: "ไม่ว่าง"
 *                 total_bookings: 2
 *               schedule:
 *                 - booking_id: "123e4567-e89b-12d3-a456-426614174000"
 *                   start_time: "09:00"
 *                   end_time: "12:00"
 *                   purpose: "สอนชดเชยวิชา Database"
 *                   name: "พงศ์ภัค"
 *                   surname: "ใจดี"
 *                   full_name: "พงศ์ภัค ใจดี"
 *                 - booking_id: "987f6543-e21b-34c5-d678-123456789012"
 *                   start_time: "13:00"
 *                   end_time: "15:00"
 *                   purpose: "สอบเก็บคะแนน"
 *                   name: "สมชาย"
 *                   surname: "เรียนดี"
 *                   full_name: "สมชาย เรียนดี"
 *       404:
 *         description: ไม่พบห้องดังกล่าว
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *             example:
 *               message: "ไม่พบห้องดังกล่าว"
 *       500:
 *         description: ระบบขัดข้อง
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *             example:
 *               message: "เกิดข้อผิดพลาดในการดึงข้อมูลสถานะห้อง"
 */
router.get('/:id', getRoomStatus);

// ดึงรายการที่เวลาที่จองยังอยู่ในอนาคต และเป็น status approved, padding
/**
 * @swagger
 * /bookings/my-bookings/active:
 *   get:
 *     summary: ดึงรายการการจองของฉันที่ยังใช้งานอยู่ (Pending หรือ Approved และเป็นวันปัจจุบัน/อนาคต)
 *     tags:
 *       - Bookings
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: ดึงข้อมูลการจองที่ Active สำเร็จ
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   booking_id:
 *                     type: string
 *                     example: "123e4567-e89b-12d3-a456-426614174000"
 *                   room_id:
 *                     type: string
 *                     example: "SC1-101"
 *                   date:
 *                     type: string
 *                     format: date
 *                     example: "2026-03-01"
 *                   start_time:
 *                     type: string
 *                     example: "13:00"
 *                   end_time:
 *                     type: string
 *                     example: "16:00"
 *                   purpose:
 *                     type: string
 *                     example: "สอนชดเชยวิชา Database Management"
 *                   status:
 *                     type: string
 *                     example: "approved"
 *                   name:
 *                     type: string
 *                     example: "พงศ์ภัค"
 *                   surname:
 *                     type: string
 *                     example: "ใจดี"
 *                   can_edit_delete:
 *                     type: boolean
 *                     example: true
 *       500:
 *         description: ระบบขัดข้อง
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *               example:
 *                 message: "เกิดข้อผิดพลาดในการดึงข้อมูลการจอง"
 */
router.get('/my-bookings/active', authenticateToken, authorizeRole('teacher'), getMyActiveBookings);

// ดึงรายการที่เวลาที่จองเป็นอดีตไปแล้ว และเป็น status approved, rejected, cancel
/**
 * @swagger
 * /bookings/my-bookings/history:
 *   get:
 *     summary: ดึงประวัติการจองและคลาสเรียนที่สถานะที่จบไปแล้ว
 *     tags:
 *       - Bookings
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: ดึงข้อมูลประวัติการจองสำเร็จ
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *               example:
 *                 - id: "123e4567-e89b-12d3-a456-426614174000"
 *                   type: "booking"
 *                   teacher_id: "65xxxxxx"
 *                   teacher_name: "พงศ์ภัค ใจดี"
 *                   purpose: "สอบเก็บคะแนนกลางภาค"
 *                   room_id: "SC1-101"
 *                   date: "2026-01-15"
 *                   start_time: "09:00"
 *                   end_time: "12:00"
 *                   status: "approved"
 *                   can_edit_delete: false
 *                 - id: "987f6543-e21b-34c5-d678-000000000000"
 *                   type: "class_schedule"
 *                   purpose: "Database Management"
 *                   teacher_name: "พงศ์ภัค ใจดี"
 *                   room_id: "SC1-102"
 *                   date: "2026-02-20"
 *                   start_time: "13:00"
 *                   end_time: "16:00"
 *                   status: "class_cancelled"
 *                   can_edit_delete: false
 *       401:
 *         description: ไม่มี Token (Unauthorized)
 *       403:
 *         description: ไม่มีสิทธิ์การเข้าถึง (ไม่ใช่ อาจารย์)
 *       500:
 *         description: ระบบขัดข้อง
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *             example:
 *               message: "เกิดข้อผิดพลาดในการดึงประวัติการจอง"
 */
router.get('/my-bookings/history', authenticateToken, authorizeRole('teacher'), getMyBookingHistory);

export default router;