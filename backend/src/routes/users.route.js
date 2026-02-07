import express from 'express';
import { getUsers } from '../controllers/users.controller.js';
// 1. นำเข้า Middleware
import { authenticateToken, authorizeRole } from '../middleware/auth.middleware.js';

const router = express.Router();

// 2. เอา Middleware ไปคั่นไว้ตรงกลาง
// แปลว่า: "ก่อนจะไปทำ getUsers ช่วยตรวจ Token ให้ก่อนนะ"
router.get('/', authenticateToken, getUsers);

// หรือถ้าอยากให้เฉพาะ Staff ดูได้เท่านั้น (Advance)
// router.get('/', authenticateToken, authorizeRole('staff'), getUsers);

export default router;  