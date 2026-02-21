import express from 'express';
import { getUsers, createUser, editUser, deleteUser } from '../controllers/users.controller.js';
import { authenticateToken, authorizeRole } from '../middleware/auth.middleware.js';

const router = express.Router();

router.get('/', authenticateToken, getUsers);

// เพิ่ม ผู้ใช้ (teacher, staff) ผ่าน staff
router.post('/create', authenticateToken, authorizeRole('staff'), createUser);

router.put('/edit/:user_id', authenticateToken, authorizeRole('staff'), editUser);

router.patch('/delete/:user_id', authenticateToken, authorizeRole('staff'), deleteUser);


export default router;  