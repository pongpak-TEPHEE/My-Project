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
    getAllRoomRepair,
    findAvailableRooms
} 
from '../controllers/rooms.controller.js';

const router = express.Router();

// API สำหรับขอภาพ QR Code
// URL: GET http://localhost:3000/rooms/26504/qrcode
/**
 * @swagger
 * /rooms/{id}/qrcode:
 *   get:
 *     summary: ขอภาพ QR Code ของห้อง (สำหรับนำไปแปะหน้าห้อง)
 *     tags:
 *       - Rooms
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: รหัสห้องที่ต้องการสร้าง QR Code (เช่น "SC1-101" หรือ "26504")
 *     responses:
 *       200:
 *         description: สร้าง QR Code สำเร็จ (นำไปใส่แท็ก img ได้เลย)
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 room_id:
 *                   type: string
 *                   example: "26504"
 *                 qr_code:
 *                   type: string
 *                   description: ข้อมูลรูปภาพในรูปแบบ Base64
 *                   example: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA..."
 *       404:
 *         description: ไม่พบห้องนี้ในระบบ
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *             example:
 *               message: "ไม่พบห้องนี้ในระบบ"
 *       500:
 *         description: ระบบขัดข้อง
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *             example:
 *               message: "สร้าง QR Code ไม่สำเร็จ"
 */
router.get('/:id/qrcode', getRoomQRCode);

// ไม่มี authenticateToken เพราะเป็น Public Access
/**
 * @swagger
 * /rooms/{room_id}/schedule:
 *   get:
 *     summary: ดึงตารางการใช้ห้อง "เฉพาะวันนี้"
 *     tags:
 *       - Rooms
 *     parameters:
 *       - in: path
 *         name: room_id
 *         required: true
 *         schema:
 *           type: string
 *         description: รหัสห้องที่ต้องการดูตาราง
 *     responses:
 *       200:
 *         description: ดึงข้อมูลสำเร็จ (โชว์สถานะ ว่าง/ไม่ว่าง/ปิดใช้งาน)
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *             examples:
 *               AvailableRoom:
 *                 summary: กรณีห้องเปิดให้บริการปกติ
 *                 value:
 *                   room:
 *                     room_id: "SC1-101"
 *                     room_type: "Lecture"
 *                     location: "ชั้น 1 อาคารวิทย์"
 *                     capacity: 50
 *                     is_active: true
 *                     status: "busy"
 *                     current_activity: "Software Engineering"
 *                   schedule:
 *                     - id: "123e4567-e89b-12d3-a456-426614174000"
 *                       start_time: "09:00"
 *                       end_time: "12:00"
 *                       title: "Software Engineering"
 *                       type: "class"
 *                     - id: "987f6543-e21b-34c5-d678-000000000000"
 *                       start_time: "13:00"
 *                       end_time: "16:00"
 *                       title: "สอนชดเชยวิชา Database Management"
 *                       type: "booking"
 *               ClosedRoom:
 *                 summary: กรณีห้องถูกปิดใช้งาน (is_active = false)
 *                 value:
 *                   room:
 *                     room_id: "SC1-102"
 *                     room_type: "Lab"
 *                     location: "ชั้น 1 อาคารวิทย์"
 *                     capacity: 30
 *                     is_active: false
 *                     status: "closed"
 *                     status_text: "งดให้บริการ ณ ขณะนี้"
 *                   schedule: []
 *       404:
 *         description: ไม่พบห้องนี้ในระบบ
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *             example:
 *               message: "ไม่พบห้องนี้ในระบบ"
 *       500:
 *         description: ระบบขัดข้อง
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *             example:
 *               message: "เกิดข้อผิดพลาดในการดึงข้อมูลห้อง"
 */
router.get('/:room_id/schedule', getRoomScheduleToday);

/**
 * @swagger
 * /rooms/{id}:
 *   get:
 *     summary: ดึงรายละเอียดของห้องและอุปกรณ์
 *     tags:
 *       - Rooms
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: รหัสห้องที่ต้องการดูรายละเอียด
 *     responses:
 *       200:
 *         description: ดึงข้อมูลรายละเอียดห้องสำเร็จ
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: string
 *                   example: "26504"
 *                 name:
 *                   type: string
 *                   example: "Computer Lab"
 *                 capacity:
 *                   type: integer
 *                   example: 45
 *                 location:
 *                   type: string
 *                   example: "ตึก 26 ชั้น 5"
 *                 description:
 *                   type: string
 *                   example: "สำหรับการเรียนการสอนที่ต้องใช้คอมพิวเตอร์เป็นหลัก"
 *                 repair:
 *                   type: string
 *                   nullable: true
 *                   example: "แอร์ตัวหลังห้องไม่เย็น รอช่างซ่อม"
 *                 facilities:
 *                   type: array
 *                   items:
 *                     type: string
 *                   example:
 *                     - "เครื่องโปรเจคเตอร์ : 1 เครื่อง"
 *                     - "ไมค์ : 2 ชุด"
 *                     - "คอมพิวเตอร์ : 45 เครื่อง"
 *       404:
 *         description: ไม่พบข้อมูลห้องนี้
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *             example:
 *               message: "ไม่พบข้อมูลห้องนี้"
 *       500:
 *         description: ระบบขัดข้อง
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *             example:
 *               message: "เกิดข้อผิดพลาดในการดึงข้อมูล"
 */
router.get('/:id', getRoomDetail);

// ดึงรายชื่อห้องทั้งหมด (สำหรับแสดงในหน้าเลือกห้อง) ต้องเป็นสภาณะ ไม่งดใช้ห้อง
/**
 * @swagger
 * /rooms:
 *   get:
 *     summary: ดึงรายชื่อห้องทั้งหมดที่เปิดใช้งาน (สำหรับแสดงในหน้าเลือกจองห้อง)
 *     tags:
 *       - Rooms
 *     responses:
 *       200:
 *         description: ดึงข้อมูลรายชื่อห้องสำเร็จ
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   room_id:
 *                     type: string
 *                     example: "26504"
 *                   room_type:
 *                     type: string
 *                     example: "Computer Lab"
 *                   capacity:
 *                     type: integer
 *                     example: 45
 *                   location:
 *                     type: string
 *                     example: "ตึก 26 ชั้น 5"
 *                   room_characteristics:
 *                     type: string
 *                     example: "สำหรับการเรียนการสอนที่ต้องใช้คอมพิวเตอร์"
 *                   repair:
 *                     type: string
 *                     nullable: true
 *                     example: null
 *                   is_active:
 *                     type: boolean
 *                     example: true
 *                   status_text:
 *                     type: string
 *                     example: "พร้อมใช้งาน"
 *                   status_color:
 *                     type: string
 *                     example: "green"
 *       500:
 *         description: ระบบขัดข้อง
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *             example:
 *               message: "ไม่สามารถดึงข้อมูลห้องได้"
 */
router.get('/', getAllRoom);

// ดึงห้องที่ งดให้บริการ
/**
 * @swagger
 * /rooms/noActive:
 *   get:
 *     summary: ดึงรายชื่อห้องที่งดให้บริการหรือปิดปรับปรุง
 *     tags:
 *       - Rooms
 *     responses:
 *       200:
 *         description: ดึงข้อมูลห้องที่งดให้บริการสำเร็จ
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "ดึงข้อมูลห้องที่ปิดปรับปรุง (Repair) สำเร็จ"
 *                 count:
 *                   type: integer
 *                   description: จำนวนห้องที่ปิดปรับปรุงทั้งหมด
 *                   example: 2
 *                 rooms:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       room_id:
 *                         type: string
 *                         example: "SC1-102"
 *                       room_type:
 *                         type: string
 *                         example: "Lab"
 *                       location:
 *                         type: string
 *                         example: "ตึก 26 ชั้น 5"
 *                       capacity:
 *                         type: integer
 *                         example: 30
 *                       room_characteristics:
 *                         type: string
 *                         example: "แอร์เสีย รออะไหล่จากช่าง"
 *                       repair:
 *                         type: boolean
 *                         example: false
 *       500:
 *         description: ระบบขัดข้อง
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *             example:
 *               message: "เกิดข้อผิดพลาดในการดึงข้อมูลห้องที่ปิดใช้งาน"
 */
router.get('/noActive', getAllRoomRepair);

// การเพิ่มห้อง staff สามารถทำได้เท่านั้น
/**
 * @swagger
 * /rooms:
 *   post:
 *     summary: เพิ่มข้อมูลห้องใหม่พร้อมอุปกรณ์ (สำหรับ Staff)
 *     tags:
 *       - Rooms
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - room_id
 *               - room_type
 *               - capacity
 *             properties:
 *               room_id:
 *                 type: string
 *                 description: รหัสห้อง (ต้องไม่ซ้ำกับที่มีอยู่)
 *                 example: "SC1-105"
 *               room_type:
 *                 type: string
 *                 description: ประเภทของห้อง
 *                 example: "Lecture Room"
 *               location:
 *                 type: string
 *                 description: สถานที่ตั้ง
 *                 example: "อาคารวิทยาศาสตร์ ชั้น 1"
 *               capacity:
 *                 type: integer
 *                 description: ความจุของห้อง (จำนวนคน)
 *                 example: 50
 *               room_characteristics:
 *                 type: string
 *                 description: ลักษณะหรือรายละเอียดเพิ่มเติมของห้อง
 *                 example: "ห้องบรรยายขนาดกลาง โต๊ะเลคเชอร์เดี่ยว"
 *               repair:
 *                 type: boolean
 *                 description: สถานะการปิดปรับปรุง (false = พร้อมใช้งาน, true = ปิดปรับปรุง)
 *                 example: false
 *               equipments:
 *                 type: object
 *                 description: ข้อมูลอุปกรณ์ในห้อง (สามารถเว้นว่างได้หากไม่มีอุปกรณ์)
 *                 properties:
 *                   projector:
 *                     type: integer
 *                     example: 1
 *                   microphone:
 *                     type: integer
 *                     example: 2
 *                   computer:
 *                     type: integer
 *                     example: 1
 *                   whiteboard:
 *                     type: integer
 *                     example: 1
 *                   type_of_computer:
 *                     type: string
 *                     example: "Intel Core i5, 8GB RAM"
 *     responses:
 *       201:
 *         description: เพิ่มห้องและอุปกรณ์สำเร็จเรียบร้อย
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *             example:
 *               message: "เพิ่มห้องและอุปกรณ์สำเร็จเรียบร้อย"
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
 *       409:
 *         description: รหัสห้องซ้ำ (มีห้องนี้ในระบบแล้ว)
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *             example:
 *               message: "รหัสห้อง (room_id) นี้มีอยู่แล้ว"
 *       500:
 *         description: ระบบขัดข้อง
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *             example:
 *               message: "เกิดข้อผิดพลาดในการเพิ่มห้อง"
 */
router.post('/', authenticateToken, authorizeRole('staff'), createRoom);

// เปลี่ยน status is_active = false เพื่อ
/**
 * @swagger
 * /rooms/{room_id}/delete:
 *   patch:
 *     summary: ลบห้อง (ระบบจะเลือก Hard/Soft Delete โดยดูว่าห้องที่ลบมีการอ้างอิงไหม)
 *     tags:
 *       - Rooms
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: room_id
 *         required: true
 *         schema:
 *           type: string
 *         description: รหัสห้องที่ต้องการลบ
 *     responses:
 *       200:
 *         description: ลบหรือปิดการใช้งานห้องสำเร็จ
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
 *                   message: "ปิดการใช้งานห้อง SC1-101 สำเร็จ (Soft Delete) และยกเลิกรายการจองล่วงหน้าแล้ว (เก็บประวัติเดิมไว้)"
 *               HardDelete:
 *                 summary: กรณีไม่มีประวัติเลย (Hard Delete)
 *                 value:
 *                   message: "ลบห้อง SC1-102 ถาวรเรียบร้อยแล้ว (Hard Delete) เนื่องจากไม่มีประวัติการใช้งาน"
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
 *         description: ไม่พบห้องที่ต้องการลบ
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *             example:
 *               message: "ไม่พบห้องที่ต้องการลบ"
 *       500:
 *         description: ระบบขัดข้อง
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *             example:
 *               message: "เกิดข้อผิดพลาดในการลบห้อง"
 */
router.patch('/:room_id/delete', authenticateToken, authorizeRole('staff'), deleteRoom);

// แก้ไขข้อมูลในห้อง
/**
 * @swagger
 * /rooms/{room_id}/edit:
 *   put:
 *     summary: แก้ไขข้อมูลห้องและอัปเดตอุปกรณ์ (สำหรับ Staff)
 *     tags:
 *       - Rooms
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: room_id
 *         required: true
 *         schema:
 *           type: string
 *         description: รหัสห้องที่ต้องการแก้ไขข้อมูล (เช่น "SC1-105")
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               room_type:
 *                 type: string
 *                 example: "Lecture Room"
 *               location:
 *                 type: string
 *                 example: "อาคารวิทยาศาสตร์ ชั้น 2"
 *               capacity:
 *                 type: integer
 *                 description: ความจุของห้อง (ต้องไม่น้อยกว่า 0)
 *                 example: 60
 *               room_characteristics:
 *                 type: string
 *                 example: "อัปเดตแอร์ใหม่ เย็นฉ่ำ โต๊ะเลคเชอร์เดี่ยว"
 *               repair:
 *                 type: boolean
 *                 description: สถานะแจ้งซ่อม (หากมีการเปลี่ยนแปลงสถานะเป็นปิดซ่อม ระบบควรจะยกเลิกการจองในอนาคต)
 *                 example: true
 *               equipments:
 *                 type: object
 *                 description: ข้อมูลอุปกรณ์ในห้อง (ระบบจะทำการ Update หรือ Insert อัตโนมัติ)
 *                 properties:
 *                   projector:
 *                     type: integer
 *                     example: 1
 *                   microphone:
 *                     type: integer
 *                     example: 2
 *                   computer:
 *                     type: integer
 *                     example: 1
 *                   whiteboard:
 *                     type: integer
 *                     example: 1
 *                   type_of_computer:
 *                     type: string
 *                     example: "Intel Core i5, 16GB RAM"
 *     responses:
 *       200:
 *         description: แก้ไขข้อมูลห้องและอัปเดตอุปกรณ์สำเร็จ
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *             example:
 *               message: "แก้ไขข้อมูลห้องและสถานะสำเร็จ"
 *       400:
 *         description: ข้อมูลที่ส่งมาไม่ถูกต้อง
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *             example:
 *               message: "กรุณาใส่ความจุที่มากกว่า 0"
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
 *         description: ไม่พบห้องที่ต้องการแก้ไข
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *             example:
 *               message: "ไม่พบห้องที่ต้องการแก้ไข"
 *       500:
 *         description: ระบบขัดข้อง
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *             example:
 *               message: "เกิดข้อผิดพลาดในการแก้ไขข้อมูลห้อง"
 */
router.put('/:room_id/edit', authenticateToken, authorizeRole('staff'), editRoom);

// POST /rooms/search
// ค้นหาห้องที่เลือกตามข้อมูลที่ user กรอก
/**
 * @swagger
 * /rooms/search:
 *   post:
 *     summary: ค้นหาห้องว่างตามวัน เวลา และความจุที่ต้องการ
 *     tags:
 *       - Rooms
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - date
 *               - start_time
 *               - end_time
 *             properties:
 *               date:
 *                 type: string
 *                 format: date
 *                 description: วันที่ต้องการใช้งาน (YYYY-MM-DD)
 *                 example: "2026-03-01"
 *               start_time:
 *                 type: string
 *                 format: time
 *                 description: เวลาเริ่มใช้งาน (HH:MM)
 *                 example: "09:00"
 *               end_time:
 *                 type: string
 *                 format: time
 *                 description: เวลาสิ้นสุดใช้งาน (HH:MM)
 *                 example: "12:00"
 *               capacity:
 *                 type: integer
 *                 description: จำนวนที่นั่งขั้นต่ำที่ต้องการ (ไม่บังคับ)
 *                 example: 40
 *     responses:
 *       200:
 *         description: ค้นพบห้องว่างสำเร็จ
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "ค้นพบห้องว่าง 3 ห้อง"
 *                 available_rooms:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       room_id:
 *                         type: string
 *                         example: "SC1-101"
 *                       room_type:
 *                         type: string
 *                         example: "Lecture"
 *                       capacity:
 *                         type: integer
 *                         example: 50
 *                       location:
 *                         type: string
 *                         example: "ชั้น 1 อาคารวิทย์"
 *                       room_characteristics:
 *                         type: string
 *                         example: "ห้องบรรยาย โต๊ะเลคเชอร์เดี่ยว"
 *                       projector:
 *                         type: integer
 *                         example: 1
 *                       computer:
 *                         type: integer
 *                         example: 1
 *                       microphone:
 *                         type: integer
 *                         example: 2
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
 *       400:
 *         description: ข้อมูลไม่ครบถ้วน หรือเวลาไม่ถูกต้อง
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *             examples:
 *               MissingData:
 *                 summary: ข้อมูลไม่ครบ
 *                 value:
 *                   message: "กรุณาระบุวันที่, เวลาเริ่ม และเวลาสิ้นสุด"
 *               InvalidTime:
 *                 summary: เวลาเริ่มมากกว่าเวลาสิ้นสุด
 *                 value:
 *                   message: "เวลาเริ่มต้องน้อยกว่าเวลาสิ้นสุด"
 *       500:
 *         description: ระบบขัดข้อง
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *             example:
 *               message: "เกิดข้อผิดพลาดในการค้นหาห้องว่าง"
 */
router.post('/search', authenticateToken, findAvailableRooms);


export default router;