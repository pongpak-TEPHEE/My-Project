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
 *         description: สร้างคำขอจองห้องสำเร็จ
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 bookingId:
 *                   type: bookingId
 *             examples:
 *               ExceedTimeLimit:
 *                 summary: กรณีเลือกห้องเกินเวลาที่กำหนด
 *                 value:
 *                   message: "ส่งคำขอจองสำเร็จ"
 *                   bookingId: bookingId
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
 *               Invalidbooking1:
 *                 summary: กรณีจองล่วงหน้าเกินกำหนด
 *                 value:
 *                   message: "สามารถจองล่วงหน้าได้ไม่เกิน 10 วันเท่านั้น"
 *               Invalidbooking2:
 *                 summary: กรณีเลือกวันย้อนหลัง
 *                 value:
 *                   message: "ไม่สามารถจองวันย้อนหลังได้"
 *               Invalidbooking3:
 *                 summary: กรณีเลือกเวลาย้อนหลัง
 *                 value:
 *                   message: "เวลาที่เลือกผ่านไปแล้ว"
 *               Invalidbooking4:
 *                 summary: กรณีเลือกเวลาย้อนหลัง
 *                 value:
 *                   message: "เวลาที่เลือกผ่านไปแล้ว"
 *               Invalidbooking5:
 *                 summary: กรณีเลือกเวลาย้อนหลัง
 *                 value:
 *                   message: "เวลาที่เลือกผ่านไปแล้ว"
 *                   status: "pending"
 *       401:
 *         description: ไม่มี Token
 *       403:
 *         description: ไม่มีสิทธิ์ (ไม่ใช่ อาจารย์)
 *       409:
 *         description: 
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
 *               Invalidbooking5:
 *                 summary: กรณีเลือกวันตรงกับในตารางเรียน
 *                 value:
 *                   message: "ไม่สามารถจองได้ เนื่องจากห้องนี้มีเรียนวิชา: NLP"
 *                   conflict_type: "schedule"
 *                   time: "12:00:00 - 15:00:00"
 *               Invalidbooking6:
 *                 summary: กรณีเลือกวันที่มีการจองที่ได้รับอณุญาติแล้ว
 *                 value:
 *                   message: "ไม่สามารถจองได้ เนื่องจากช่วงเวลานี้ได้รับการอนุมัติแล้ว"
 *                   status: "approve"
 *       500:
 *         description: ระบบขัดข้อง
 */ 
router.post('/teacher', authenticateToken, authorizeRole('teacher'), createBookingForTeacher);

// กฎ: ต้อง Login + เป็น  staff 
router.post('/staff', authenticateToken, authorizeRole('staff'), createBookingForStaff);

// ดูรายการรออนุมัติ
router.get('/pending', authenticateToken, authorizeRole('teacher', 'staff'), getPendingBookings);

// ดูรายการอนุมัติ
router.get('/approved', authenticateToken, authorizeRole('teacher', 'staff'), getApprovedBookings);

// ดูรายการที่ปัดตก
router.get('/rejected', authenticateToken, authorizeRole('teacher', 'staff'), getRejectedBookings);

// เปลี่ยนสถานะ (เฉพาะ Staff)
// :id คือตัวแปรที่จะรับ booking_id (เช่น /bookings/b123/status)
router.put('/:id/status', authenticateToken, authorizeRole('staff'), updateBookingStatus);

// เป็นการดึงรายการทั้งหมดของทุกห้องที่มี status approved
router.get('/allBooking', getAllBooking);

// เป็นการดึงรายการทั้งหมดของห้องนั้นๆ ที่มี status approved
router.get('/allBookingSpecific/:roomId', getAllBookingSpecific);

// API ดูประวัติการจองของฉัน
// GET http://localhost:3000/bookings/my-history
// ⚠️ ต้องวางไว้ "ก่อน" /:id นะครับ ไม่งั้นมันจะนึกว่า "my-history" คือ id
router.get('/my-history', authenticateToken, getMyBookings);

// API ยกเลิกการจอง
// PUT http://localhost:3000/bookings/15/cancel
router.put('/:id/cancel', authenticateToken, cancelBooking);

router.put('/:id', authenticateToken, authorizeRole('teacher', 'staff'), editBooking);

// ใช้เมื่อเราแสกน QR-Code จะเด้งไปหมายเลขห้องทีอยู่ใน QR code
router.get('/:id', getRoomStatus);

// ดึงรายการที่เวลาที่จองยังอยู่ในอนาคต และเป็น status approved, padding
router.get('/my-bookings/active', authenticateToken, authorizeRole('teacher'), getMyActiveBookings);

// ดึงรายการที่เวลาที่จองเป็นอดีตไปแล้ว และเป็น status approved, rejected, cancel
router.get('/my-bookings/history', authenticateToken, authorizeRole('teacher'), getMyBookingHistory);

export default router;