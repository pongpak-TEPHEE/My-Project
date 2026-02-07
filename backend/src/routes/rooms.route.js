import express from 'express';

import { authenticateToken, authorizeRole } from '../middleware/auth.middleware.js';
import { getRoomScheduleToday, getAllRooms, getRoomDetail, createRoom, getRoomQRCode} from '../controllers/rooms.controller.js';

const router = express.Router();

// API สำหรับขอภาพ QR Code
// URL: GET http://localhost:3000/rooms/26504/qrcode
router.get('/:id/qrcode', getRoomQRCode);

// ไม่มี authenticateToken เพราะเป็น Public Access
router.get('/:room_id/schedule', getRoomScheduleToday);

router.get('/:id', getRoomDetail);

router.get('/', getAllRooms);

// การเพิ่มห้อง staff สามารถทำได้เท่านั้น
router.post('/', authenticateToken, authorizeRole('staff'), createRoom);



export default router;