import express from 'express';
import { 
    createBookingForTeacher,
    createBookingForStaff,
    getPendingBookings,
    getRoomStatus, 
    updateBookingStatus, 
    getApprovedBookings, 
    getRejectedBookings, 
    getAllBooking,
    getMyBookings,
    cancelBooking,
    editBooking
 } 
 from '../controllers/bookings.controller.js';
 
import { authenticateToken, authorizeRole } from '../middleware/auth.middleware.js';

const router = express.Router();

// กฎ: ต้อง Login + เป็น teacher 
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


router.get('/:id', authenticateToken, getRoomStatus)

router.get('/allBooking/:roomId', getAllBooking);

// API ดูประวัติการจองของฉัน
// GET http://localhost:3000/bookings/my-history
// ⚠️ ต้องวางไว้ "ก่อน" /:id นะครับ ไม่งั้นมันจะนึกว่า "my-history" คือ id
router.get('/my-history', authenticateToken, getMyBookings);

// API ยกเลิกการจอง
// PUT http://localhost:3000/bookings/15/cancel
router.put('/:id/cancel', authenticateToken, cancelBooking);

router.put('/:id', authenticateToken, authorizeRole('teacher', 'staff'), editBooking);

export default router;