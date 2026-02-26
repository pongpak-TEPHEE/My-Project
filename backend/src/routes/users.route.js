import express from 'express';
import { getUsers, createUser, editUser, deleteUser } from '../controllers/users.controller.js';
import { authenticateToken, authorizeRole } from '../middleware/auth.middleware.js';

const router = express.Router();

// เพิ่ม ผู้ใช้ (teacher, staff) ผ่าน staff
/**
 * @swagger
 * /users/create:
 *   post:
 *     summary: เพิ่มผู้ใช้งานใหม่ (Teacher หรือ Staff) เข้าสู่ระบบ (เฉพาะ Staff)
 *     tags:
 *       - Users
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - user_id
 *               - name
 *               - role
 *               - email
 *             properties:
 *               user_id:
 *                 type: string
 *                 description: รหัสประจำตัวผู้ใช้งาน (เช่น รหัสพนักงาน หรือรหัสอาจารย์)
 *                 example: "t001"
 *               title:
 *                 type: string
 *                 description: คำนำหน้าชื่อ
 *                 example: "อ."
 *               name:
 *                 type: string
 *                 description: ชื่อจริง
 *                 example: "พงศ์ภัค"
 *               surname:
 *                 type: string
 *                 description: นามสกุล (สามารถเว้นว่างได้)
 *                 example: "ใจดี"
 *               role:
 *                 type: string
 *                 description: สิทธิ์การใช้งาน (เช่น 'teacher' หรือ 'staff')
 *                 example: "teacher"
 *               email:
 *                 type: string
 *                 description: อีเมลของมหาวิทยาลัย (ต้องลงท้ายด้วย @ku.th เท่านั้น)
 *                 example: "pongpak.j@ku.th"
 *     responses:
 *       201:
 *         description: เพิ่มผู้ใช้งานสำเร็จ
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *             example:
 *               message: "เพิ่มผู้ใช้งานสำเร็จ"
 *               user:
 *                 user_id: "t001"
 *                 title: "อ."
 *                 name: "พงศ์ภัค"
 *                 surname: "ใจดี"
 *                 email: "pongpak.j@ku.th"
 *                 role: "teacher"
 *                 created_at: "2026-02-26T12:00:00.000Z"
 *       400:
 *         description: ข้อมูลไม่ถูกต้อง หรือมีข้อมูลซ้ำในระบบ
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *             examples:
 *               InvalidEmail:
 *                 summary: อีเมลไม่ใช่โดเมนที่กำหนด
 *                 value:
 *                   message: "อนุญาตให้ใช้งานเฉพาะอีเมล @ku.th เท่านั้น"
 *               MissingData:
 *                 summary: ข้อมูลไม่ครบ
 *                 value:
 *                   message: "กรุณากรอกข้อมูลให้ครบถ้วน (รหัส, ชื่อ, อีเมล, ตำแหน่ง)"
 *               DuplicateID:
 *                 summary: รหัสผู้ใช้งานซ้ำ
 *                 value:
 *                   message: "รหัสผู้ใช้งานนี้มีอยู่ในระบบแล้ว"
 *               DuplicateEmail:
 *                 summary: อีเมลซ้ำ
 *                 value:
 *                   message: "อีเมลนี้ถูกใช้งานแล้ว"
 *               DuplicateName:
 *                 summary: ชื่อและนามสกุลซ้ำ
 *                 value:
 *                   message: "ชื่อและนามสกุล 'พงศ์ภัค ใจดี' มีอยู่ในระบบแล้ว"
 *       401:
 *         description: ไม่มี Token, ไม่พบผู้ใช้ หรือยืนยันตัวตนไม่สำเร็จ (Unauthorized)
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *             examples:
 *               NoToken:
 *                 summary: ไม่ได้แนบ Token
 *                 value:
 *                   message: "Access Denied: No Token Provided"
 *               UserNotFound:
 *                 summary: ไม่พบผู้ใช้งาน
 *                 value:
 *                   message: "ไม่พบผู้ใช้งานนี้ในระบบแล้ว"
 *               NotAuthenticated:
 *                 summary: ไม่ผ่านการยืนยันตัวตน
 *                 value:
 *                   message: "User not authenticated"
 *       403:
 *         description: สิทธิ์ไม่เพียงพอ, Token มีปัญหา หรือบัญชีถูกระงับ (Forbidden)
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *             examples:
 *               RoleDenied:
 *                 summary: สิทธิ์การเข้าถึงไม่เพียงพอ
 *                 value:
 *                   message: "Access Denied: Requires one of these roles: admin, staff"
 *               AccountSuspended:
 *                 summary: บัญชีถูกระงับ
 *                 value:
 *                   message: "บัญชีของคุณถูกระงับการใช้งาน กรุณาติดต่อเจ้าหน้าที่"
 *               TokenBlacklisted:
 *                 summary: Token ถูกยกเลิก (Logout ไปแล้ว)
 *                 value:
 *                   message: "Token นี้ถูกยกเลิกแล้ว (กรุณา Login ใหม่)"
 *               TokenExpired:
 *                 summary: Token หมดอายุ
 *                 value:
 *                   message: "Token หมดอายุแล้ว (Expired)"
 *               TokenInvalid:
 *                 summary: Token ไม่ถูกต้อง
 *                 value:
 *                   message: "Token ไม่ถูกต้อง (Invalid)"
 *       500:
 *         description: ระบบขัดข้อง
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *             example:
 *               message: "เกิดข้อผิดพลาดในการเพิ่มผู้ใช้งาน"
 */
router.post('/create', authenticateToken, authorizeRole('staff'), createUser);

/**
 * @swagger
 * /users/edit/{user_id}:
 *   put:
 *     summary: แก้ไขข้อมูลผู้ใช้งาน (สำหรับ Staff)
 *     tags:
 *       - Users
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: user_id
 *         required: true
 *         schema:
 *           type: string
 *         description: รหัสประจำตัวผู้ใช้งานที่ต้องการแก้ไขข้อมูล (เช่น "t001")
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *                 example: "ผศ.ดร."
 *               name:
 *                 type: string
 *                 example: "พงศ์ภัค"
 *               surname:
 *                 type: string
 *                 example: "ใจดี"
 *               role:
 *                 type: string
 *                 description: สิทธิ์การใช้งาน ('teacher', 'staff', 'admin')
 *                 example: "teacher"
 *               email:
 *                 type: string
 *                 example: "pongpak.j@ku.th"
 *     responses:
 *       200:
 *         description: แก้ไขข้อมูลผู้ใช้งานสำเร็จ
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *             example:
 *               message: "แก้ไขข้อมูลผู้ใช้งานสำเร็จ"
 *       401:
 *         description: ไม่มี Token, ไม่พบผู้ใช้ หรือยืนยันตัวตนไม่สำเร็จ (Unauthorized)
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *             examples:
 *               NoToken:
 *                 summary: ไม่ได้แนบ Token
 *                 value:
 *                   message: "Access Denied: No Token Provided"
 *               UserNotFound:
 *                 summary: ไม่พบผู้ใช้งาน
 *                 value:
 *                   message: "ไม่พบผู้ใช้งานนี้ในระบบแล้ว"
 *               NotAuthenticated:
 *                 summary: ไม่ผ่านการยืนยันตัวตน
 *                 value:
 *                   message: "User not authenticated"
 *       403:
 *         description: สิทธิ์ไม่เพียงพอ, Token มีปัญหา หรือบัญชีถูกระงับ (Forbidden)
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *             examples:
 *               RoleDenied:
 *                 summary: สิทธิ์การเข้าถึงไม่เพียงพอ
 *                 value:
 *                   message: "Access Denied: Requires one of these roles: admin, staff"
 *               AccountSuspended:
 *                 summary: บัญชีถูกระงับ
 *                 value:
 *                   message: "บัญชีของคุณถูกระงับการใช้งาน กรุณาติดต่อเจ้าหน้าที่"
 *               TokenBlacklisted:
 *                 summary: Token ถูกยกเลิก (Logout ไปแล้ว)
 *                 value:
 *                   message: "Token นี้ถูกยกเลิกแล้ว (กรุณา Login ใหม่)"
 *               TokenExpired:
 *                 summary: Token หมดอายุ
 *                 value:
 *                   message: "Token หมดอายุแล้ว (Expired)"
 *               TokenInvalid:
 *                 summary: Token ไม่ถูกต้อง
 *                 value:
 *                   message: "Token ไม่ถูกต้อง (Invalid)"
 *       500:
 *         description: ระบบขัดข้อง
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *             example:
 *               message: "เกิดข้อผิดพลาดในการแก้ไขข้อมูลผู้ใช้งาน"
 */
router.put('/edit/:user_id', authenticateToken, authorizeRole('staff'), editUser);

/**
 * @swagger
 * /users/delete/{user_id}:
 *   patch:
 *     summary: ลบหรือระงับบัญชีผู้ใช้งาน (ระบบเลือก Hard/Soft Delete อัตโนมัติ - เฉพาะ Staff)
 *     tags:
 *       - Users
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: user_id
 *         required: true
 *         schema:
 *           type: string
 *         description: รหัสประจำตัวผู้ใช้งานที่ต้องการลบ (เช่น "t001")
 *     responses:
 *       200:
 *         description: ลบหรือระงับบัญชีผู้ใช้งานสำเร็จ
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *             examples:
 *               SoftDelete:
 *                 summary: กรณีมีประวัติการใช้งาน (Soft Delete)
 *                 value:
 *                   message: "ระงับบัญชีผู้ใช้งาน t001 สำเร็จ (Soft Delete) และยกเลิกรายการจองล่วงหน้าแล้ว"
 *               HardDelete:
 *                 summary: กรณีไม่มีประวัติเลย (Hard Delete)
 *                 value:
 *                   message: "ลบผู้ใช้งาน t002 ถาวรเรียบร้อยแล้ว (Hard Delete) เนื่องจากไม่มีประวัติการทำรายการ"
 *       401:
 *         description: ไม่มี Token, ไม่พบผู้ใช้ หรือยืนยันตัวตนไม่สำเร็จ (Unauthorized)
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *             examples:
 *               NoToken:
 *                 summary: ไม่ได้แนบ Token
 *                 value:
 *                   message: "Access Denied: No Token Provided"
 *               UserNotFound:
 *                 summary: ไม่พบผู้ใช้งาน
 *                 value:
 *                   message: "ไม่พบผู้ใช้งานนี้ในระบบแล้ว"
 *               NotAuthenticated:
 *                 summary: ไม่ผ่านการยืนยันตัวตน
 *                 value:
 *                   message: "User not authenticated"
 *       403:
 *         description: สิทธิ์ไม่เพียงพอ, Token มีปัญหา หรือบัญชีถูกระงับ (Forbidden)
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *             examples:
 *               RoleDenied:
 *                 summary: สิทธิ์การเข้าถึงไม่เพียงพอ
 *                 value:
 *                   message: "Access Denied: Requires one of these roles: admin, staff"
 *               AccountSuspended:
 *                 summary: บัญชีถูกระงับ
 *                 value:
 *                   message: "บัญชีของคุณถูกระงับการใช้งาน กรุณาติดต่อเจ้าหน้าที่"
 *               TokenBlacklisted:
 *                 summary: Token ถูกยกเลิก (Logout ไปแล้ว)
 *                 value:
 *                   message: "Token นี้ถูกยกเลิกแล้ว (กรุณา Login ใหม่)"
 *               TokenExpired:
 *                 summary: Token หมดอายุ
 *                 value:
 *                   message: "Token หมดอายุแล้ว (Expired)"
 *               TokenInvalid:
 *                 summary: Token ไม่ถูกต้อง
 *                 value:
 *                   message: "Token ไม่ถูกต้อง (Invalid)"
 *       404:
 *         description: ไม่พบผู้ใช้งานที่ต้องการลบ
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *             example:
 *               message: "ไม่พบผู้ใช้งานที่ต้องการลบ"
 *       500:
 *         description: ระบบขัดข้อง
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *             example:
 *               message: "เกิดข้อผิดพลาดในการลบผู้ใช้งาน"
 */
router.patch('/delete/:user_id', authenticateToken, authorizeRole('staff'), deleteUser);

/**
 * @swagger
 * /users:
 *   get:
 *     summary: ดึงรายชื่อผู้ใช้งานทั้งหมดในระบบ
 *     tags:
 *       - Users
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: ดึงข้อมูลรายชื่อผู้ใช้งานสำเร็จ
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   user_id:
 *                     type: string
 *                     example: "65xxxxxx"
 *                   name:
 *                     type: string
 *                     example: "พงศ์ภัค"
 *                   surname:
 *                     type: string
 *                     example: "ใจดี"
 *                   email:
 *                     type: string
 *                     example: "pongpak.j@ku.th"
 *                   role:
 *                     type: string
 *                     example: "teacher"
 *       401:
 *         description: "ไม่มี Token หรือไม่พบผู้ใช้งานในระบบ (Unauthorized)"
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *             examples:
 *               NoToken:
 *                 summary: "ไม่ได้แนบ Token"
 *                 value:
 *                   message: "Access Denied: No Token Provided"
 *               UserNotFound:
 *                 summary: "ไม่พบผู้ใช้งาน"
 *                 value:
 *                   message: "ไม่พบผู้ใช้งานนี้ในระบบแล้ว"
 *       403:
 *         description: "Token มีปัญหา หรือบัญชีถูกระงับ (Forbidden)"
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *             examples:
 *               AccountSuspended:
 *                 summary: "บัญชีถูกระงับ"
 *                 value:
 *                   message: "บัญชีของคุณถูกระงับการใช้งาน กรุณาติดต่อเจ้าหน้าที่"
 *               TokenBlacklisted:
 *                 summary: "Token ถูกยกเลิก (Logout ไปแล้ว)"
 *                 value:
 *                   message: "Token นี้ถูกยกเลิกแล้ว (กรุณา Login ใหม่)"
 *               TokenExpired:
 *                 summary: "Token หมดอายุ"
 *                 value:
 *                   message: "Token หมดอายุแล้ว (Expired)"
 *               TokenInvalid:
 *                 summary: "Token ไม่ถูกต้อง"
 *                 value:
 *                   message: "Token ไม่ถูกต้อง (Invalid)"
 *       500:
 *         description: ระบบขัดข้อง
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *             example:
 *               message: "เกิดข้อผิดพลาดในการดึงข้อมูลผู้ใช้งาน"
 */
router.get('/', authenticateToken, getUsers);

export default router;  