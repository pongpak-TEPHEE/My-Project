import express from 'express';
import { getUsers, createUser } from '../controllers/users.controller.js';

import { authenticateToken, authorizeRole } from '../middleware/auth.middleware.js';

const router = express.Router();

router.get('/', authenticateToken, getUsers);

// เพิ่ม ผู้ใช้ (teacher, staff) ผ่าน staff
router.post('/create', authenticateToken, authorizeRole('staff'), createUser);


export default router;  