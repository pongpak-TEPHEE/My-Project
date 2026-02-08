import { pool } from '../config/db.js';
import QRCode from 'qrcode';

// ดึงตารางการใช้ห้อง "เฉพาะวันนี้" (สำหรับหน้า QR Code)
export const getRoomScheduleToday = async (req, res) => {
  const { room_id } = req.params;

  try {
    // 1. ดึงข้อมูลห้องก่อน (จะได้เอาชื่อห้องไปโชว์หัวเว็บ)
    const roomInfo = await pool.query(
      `SELECT room_name, capacity, location FROM public."Rooms" WHERE room_id = $1`,
      [room_id]
    );

    if (roomInfo.rows.length === 0) {
      return res.status(404).json({ message: 'ไม่พบห้องนี้ในระบบ' });
    }

    // 2. ดึงรายการจอง "ของวันนี้" ที่ "อนุมัติแล้ว"
    // เรียงตามเวลาเริ่ม (09:00, 13:00, ...)
    const schedule = await pool.query(
      `SELECT 
         start_time, 
         end_time, 
         purpose, 
         u.name as teacher_name 
       FROM public." " b
       JOIN public."Users" u ON b.teacher_id = u.user_id
       WHERE b.room_id = $1 
         AND b.date = CURRENT_DATE 
         AND b.status = 'approved'
       ORDER BY start_time ASC`,
      [room_id]
    );

    // 3. คำนวณสถานะปัจจุบัน (Real-time Status)
    // เช็คว่า "เวลานี้ (NOW)" ตรงกับช่วงเวลาจองไหนไหม?
    const now = new Date();
    const currentTimeString = now.toTimeString().split(' ')[0]; // ได้ค่าเช่น "14:30:00"

    let currentStatus = 'available'; // สมมติว่าว่างไว้ก่อน
    
    // วนลูปเช็คว่าตอนนี้ห้องถูกใช้อยู่ไหม
    for (const slot of schedule.rows) {
      if (currentTimeString >= slot.start_time && currentTimeString <= slot.end_time) {
        currentStatus = 'busy';
        break; 
      }
    }

    res.json({
      room: roomInfo.rows[0],
      status: currentStatus, // 'available' หรือ 'busy'
      schedule: schedule.rows // รายการจองทั้งหมดของวันนี้
    });

  } catch (error) {
    console.error('Room Schedule Error:', error);
    res.status(500).json({ message: 'เกิดข้อผิดพลาดในการดึงข้อมูล' });
  }
};

// ดึงรายชื่อห้องทั้งหมด (สำหรับแสดงในหน้าเลือกห้อง)
export const getAllRooms = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT room_id, room_type, capacity, location, room_characteristics 
       FROM public."Rooms" 
       ORDER BY room_id ASC`
    );

    // ส่งข้อมูลกลับไปเป็น JSON array
    res.json(result.rows);
  } catch (error) {
    console.error('Get All Rooms Error:', error);
    res.status(500).json({ message: 'ไม่สามารถดึงข้อมูลห้องได้' });
  }
};

export const getRoomDetail = async (req, res) => {
  const { id } = req.params; // รับค่า room_id (เช่น 26504)

  try {
    // 1. Query ข้อมูล โดย JOIN ตาราง Rooms กับ Equipments เข้าด้วยกัน
    // ใช้ LEFT JOIN เผื่อว่าห้องนั้นอาจจะไม่มีข้อมูลในตารางอุปกรณ์ ก็ยังให้ดึงข้อมูลห้องมาได้
    const result = await pool.query(
      `SELECT 
         r.room_id, 
         r.room_type, 
         r.location, 
         r.capacity, 
         r.room_characteristics,
         e.projector, 
         e.microphone, 
         e.computer, 
         e.whiteboard
       FROM public."Rooms" r
       LEFT JOIN public."Equipment" e ON r.room_id = e.room_id
       WHERE r.room_id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'ไม่พบข้อมูลห้องนี้' });
    }

    const data = result.rows[0];

    // 2. สร้างรายการอุปกรณ์ (Facilities List) ให้เป็นข้อความภาษาไทยตาม UI
    const facilitiesList = [];
    
    if (data.projector > 0) facilitiesList.push(`เครื่องโปรเจคเตอร์ : ${data.projector} เครื่อง`);
    if (data.microphone > 0) facilitiesList.push(`ไมค์ : ${data.microphone} ชุด`);
    if (data.computer > 0)  facilitiesList.push(`คอมพิวเตอร์ : ${data.computer} เครื่อง`);
    if (data.whiteboard > 0) facilitiesList.push(`กระดานไวท์บอร์ด : ${data.whiteboard} อัน`);

    // 3. ส่งข้อมูลกลับไปในรูปแบบที่ Frontend เอาไปโชว์ได้เลย
    res.json({
      id: data.room_id,
      name: data.room_type,            // เช่น "Computer Lab"
      capacity: data.capacity,         // เช่น 45
      location: data.location,         // เช่น "ตึก 26 ชั้น 5"
      description: data.room_characteristics, // "สำหรับการเรียนการสอน..."
      facilities: facilitiesList       // ส่งไปเป็น Array ข้อความเลย Frontend วนลูปแสดงง่าย
    });

  } catch (error) {
    console.error('Get Room Detail Error:', error);
    res.status(500).json({ message: 'เกิดข้อผิดพลาดในการดึงข้อมูล' });
  }
};

export const createRoom = async (req, res) => {
  // รับค่าทั้งหมดจาก Body ทั้งข้อมูลห้อง และ ข้อมูลอุปกรณ์
  const { 
    room_id, 
    room_type, 
    location, 
    capacity, 
    room_characteristics,
    // รับ object อุปกรณ์แยกออกมา (ถ้ามี)
    equipments 
  } = req.body;

  // เราต้องใช้ client เพื่อทำ Transaction (การันตีว่าถ้าบันทึกไม่ครบทั้ง 2 ตาราง ให้ยกเลิกทั้งหมด)
  const client = await pool.connect();

  try {
    await client.query('BEGIN'); // 🔴 เริ่มต้น Transaction

    // STEP 1: Insert ลงตาราง Rooms
    await client.query(
      `INSERT INTO public."Rooms" 
       (room_id, room_type, location, capacity, room_characteristics)
       VALUES ($1, $2, $3, $4, $5)`,
      [room_id, room_type, location, capacity, room_characteristics]
    );

    // ---------------------------------------------------------
    // STEP 2: Insert ลงตาราง Equipments (ถ้ามีข้อมูลส่งมา)
    // ---------------------------------------------------------
    if (equipments) {
      // สร้าง equipment_id อัตโนมัติ (เช่น eq-26504) เพื่อให้ง่ายและไม่ซ้ำ
      // หรือถ้าอยากรับจาก body ก็ใช้ req.body.equipment_id ได้ครับ
      const equipment_id = `eq-${room_id}`; 

      await client.query(
        `INSERT INTO public."Equipment" 
         (equipment_id, room_id, projector, microphone, computer, whiteboard, type_of_computer)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
          equipment_id,
          room_id, // Foreign Key เชื่อมกลับไปหาห้อง
          equipments.projector || 0,   // ถ้าไม่ส่งมา ให้เป็น 0
          equipments.microphone || 0,
          equipments.computer || 0,
          equipments.whiteboard || 0,
          equipments.type_of_computer || '-' // ถ้าไม่มีใส่ขีด
        ]
      );
    }

    await client.query('COMMIT'); // ✅ ยืนยันการบันทึก (Save ทั้งหมด)
    res.status(201).json({ message: 'เพิ่มห้องและอุปกรณ์สำเร็จเรียบร้อย' });

  } catch (error) {
    await client.query('ROLLBACK'); // ❌ ยกเลิกทั้งหมดถ้ามี Error
    console.error('Create Room Error:', error);

    if (error.code === '23505') {
      return res.status(409).json({ message: 'รหัสห้อง (room_id) นี้มีอยู่แล้ว' });
    }
    
    res.status(500).json({ message: 'เกิดข้อผิดพลาดในการเพิ่มห้อง' });
  } finally {
    client.release(); // คืน Connection กลับเข้า Pool
  }
};

// ฟังก์ชันสร้าง QR Code ของห้อง
export const getRoomQRCode = async (req, res) => {
  const { id } = req.params; // รับ room_id เช่น 26504

  try {
    // 1. ตรวจสอบก่อนว่าห้องมีจริงไหม
    const roomCheck = await pool.query('SELECT room_id FROM public."Rooms" WHERE room_id = $1', [id]);
    if (roomCheck.rows.length === 0) {
      return res.status(404).json({ message: 'ไม่พบห้องนี้ในระบบ' });
    }

    // 2. กำหนดข้อมูลที่จะใส่ใน QR (เช่น URL ไปหน้าจองห้องนั้น)
    // เวลา User สแกนปุ๊บ จะเด้งเข้าหน้าเว็บห้องนั้นเลย
    // หรือถ้าจะเอาแค่ Text "26504" ก็ใส่แค่ id
    const qrData = id.toString(); // ต้องแปลงเป็น String ก่อนนะครับ

    const qrImage = await QRCode.toDataURL(qrData);

    // 4. ส่งรูปกลับไป (Frontend เอาไปใส่ใน <img src="..."> ได้เลย)
    res.json({ 
      room_id: id, 
      qr_code: qrImage 
    });

  } catch (error) {
    console.error('QR Gen Error:', error);
    res.status(500).json({ message: 'สร้าง QR Code ไม่สำเร็จ' });
  }
};