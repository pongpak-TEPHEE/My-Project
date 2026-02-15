import express from 'express';

import { authenticateToken, authorizeRole } from '../middleware/auth.middleware.js';
import { 
    getRoomScheduleToday,
    getAllRoom,
    getRoomDetail,
    createRoom, 
    getRoomQRCode,
    deleteRoom,
    getAllRoomNoActive
} 
from '../controllers/rooms.controller.js';

const router = express.Router();

// API สำหรับขอภาพ QR Code
// URL: GET http://localhost:3000/rooms/26504/qrcode
router.get('/:id/qrcode', getRoomQRCode);

// ไม่มี authenticateToken เพราะเป็น Public Access
router.get('/:room_id/schedule', getRoomScheduleToday);

router.get('/:id', getRoomDetail);

// ดึงห้องทั้งหมด
router.get('/', getAllRoom);

// ดึงห้องที่ งดให้บริการ
router.get('/noActive', getAllRoomNoActive);

// การเพิ่มห้อง staff สามารถทำได้เท่านั้น
router.post('/', authenticateToken, authorizeRole('staff'), createRoom);


router.patch('/:room_id/delete', authenticateToken, authorizeRole('staff'), deleteRoom);


export default router;