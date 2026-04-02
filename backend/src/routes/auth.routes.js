import express from 'express';
import { requestOTP, verifyOTP, logout, refreshToken } from '../controllers/auth.controller.js';
import { otpRateLimiter, loginRateLimiter } from '../middleware/rateLimiter.js';
import {  authenticateToken } from '../middleware/auth.middleware.js'

const router = express.Router();

/**
 * @swagger
 * /auth/request-otp:
 *   post:
 *     summary: ขอรหัส OTP สำหรับเข้าสู่ระบบ
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: string
 *                 description: อีเมลของมหาวิทยาลัย (@ku.th)
 *                 example: pongpak.te@ku.th
 *     responses:
 *       200:
 *         description: ส่ง OTP ไปยังอีเมลสำเร็จ
 *       500:
 *         description: ระบบขัดข้อง
 */
router.post('/request-otp', otpRateLimiter, requestOTP);

/**
 * @swagger
 * /auth/verify-otp:
 *   post:
 *     summary: ยืนยันรหัส OTP เพื่อเข้าสู่ระบบ
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: string
 *                 description: อีเมลของมหาวิทยาลัย (@ku.th)
 *                 example: pongpak.te@ku.th
 *               otp_code:
 *                 type: string
 *                 description: รหัส OTP 6 หลักที่ได้รับทางอีเมล
 *                 example: "123456"
 *     responses:
 *       200:
 *         description: ยืนยันสำเร็จ และได้รับ Token สำหรับเข้าใช้งาน
 *       400:
 *         description: รหัส OTP ไม่ถูกต้องหรือหมดอายุ
 *       500:
 *         description: ระบบขัดข้อง
 */
router.post('/verify-otp', loginRateLimiter, verifyOTP);

/**
 * @swagger
 * /auth/logout:
 *   post:
 *     summary: ออกจากระบบ (Logout)
 *     tags: [Authentication]
 *     security: 
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: ออกจากระบบสำเร็จ
 *       500:
 *         description: ระบบขัดข้อง
 */
router.post('/logout',authenticateToken, logout);


router.post('/refresh-token', refreshToken);

export default router;