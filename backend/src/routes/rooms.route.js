import express from 'express';

import { authenticateToken, authorizeRole } from '../middleware/auth.middleware.js';
import { 
    getRoomScheduleToday,
    getAllRoom,
    getRoomDetail,
    createRoom, 
    getRoomQRCode,
    deleteRoom,
    editRoom,
    getAllRoomRepair
} 
from '../controllers/rooms.controller.js';

const router = express.Router();

// API สำหรับขอภาพ QR Code
// URL: GET http://localhost:3000/rooms/26504/qrcode
router.get('/:id/qrcode', getRoomQRCode);

// ไม่มี authenticateToken เพราะเป็น Public Access
router.get('/:room_id/schedule', getRoomScheduleToday);

router.get('/:id', getRoomDetail);

// ดึงรายชื่อห้องทั้งหมด (สำหรับแสดงในหน้าเลือกห้อง) ต้องเป็นสภาณะ ไม่งดใช้ห้อง
router.get('/', getAllRoom);

// ดึงห้องที่ งดให้บริการ
router.get('/noActive', getAllRoomRepair);

// การเพิ่มห้อง staff สามารถทำได้เท่านั้น
router.post('/', authenticateToken, authorizeRole('staff'), createRoom);

// เปลี่ยน status is_active = false เพื่อ
router.patch('/:room_id/delete', authenticateToken, authorizeRole('staff'), deleteRoom);

// แก้ไขข้อมูลในห้อง
router.put('/:room_id/edit', authenticateToken, authorizeRole('staff'), editRoom);


export default router;