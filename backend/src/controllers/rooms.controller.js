import { pool } from '../config/db.js';
import QRCode from 'qrcode';


// /rooms/:room_id/schedule
// ดึงตารางการใช้ห้อง "เฉพาะวันนี้" (สำหรับหน้า QR Code)
export const getRoomScheduleToday = async (req, res) => {
  const { room_id } = req.params;

  try {

    // 1. ดึงข้อมูลห้อง และเช็ค is_active
    const roomResult = await pool.query(
      `SELECT room_id, room_type, location, capacity, is_active 
       FROM public."Rooms" 
       WHERE room_id = $1`,
      [room_id]
    );

    if (roomResult.rows.length === 0) {
      return res.status(404).json({ message: 'ไม่พบห้องนี้ในระบบ' });
    }

    const room = roomResult.rows[0];

    // 🛑 เช็คทันที: ถ้าห้องถูกปิดใช้งาน (Soft Deleted)
    if (room.is_active === false) {
      return res.json({
        room,
        status: 'closed',     // ส่งสถานะไปบอก Frontend
        status_text: 'งดให้บริการ ณ ขณะนี้',
        schedule: []          // ไม่ส่งตารางจองไป
      });
    }

    // 2. ดึงตารางการใช้ห้อง "วันนี้" (รวม Booking และ Class Schedule)
    // เราจะดึงข้อมูล 2 ตารางพร้อมกัน เพื่อความแม่นยำและได้ข้อมูลครบถ่วน

    // 2.1 ดึง Booking
    const bookingQuery = pool.query(
      `SELECT booking_id as id, start_time, end_time, purpose as title, 'booking' as type
       FROM public."Booking"
       WHERE room_id = $1 
       AND date = CURRENT_DATE 
       AND status = 'approved' -- เฉพาะที่อนุมัติแล้ว`,
      [room_id]
    );

    // 2.2 ดึง Schedules (ตารางเรียนปกติ) เพิ่มส่วนนี้เพื่อให้สมบูรณ์
    const classQuery = pool.query(
      `SELECT schedule_id as id, start_time, end_time, subject_name as title, 'class' as type, temporarily_closed
       FROM public."Schedules"
       WHERE room_id = $1 
       AND date = CURRENT_DATE
       AND (temporarily_closed IS FALSE OR temporarily_closed IS NULL) -- เฉพาะวิชาที่ไม่ได้งด`, 
      [room_id]
    );

    // รอให้เสร็จทั้งคู่
    const [bookingRes, classRes] = await Promise.all([bookingQuery, classQuery]);

    // รวมข้อมูลเป็น Array เดียว แล้วเรียงตามเวลา
    const allSchedules = [...bookingRes.rows, ...classRes.rows].sort((a, b) => {
        return a.start_time.localeCompare(b.start_time);
    });


    // 3. คำนวณสถานะ Real-time (ว่าง / ไม่ว่าง)
    const now = new Date();
    // แปลงเวลาปัจจุบันเป็น HH:MM:SS เพื่อเทียบกับ Database (Time type)
    const currentTimeString = now.toLocaleTimeString('th-TH', { hour12: false }); 

    let currentStatus = 'available'; 
    let currentActivity = null; // เก็บหัวข้อวิชาที่กำลังเรียนอยู่ (ถ้ามี)

    for (const slot of allSchedules) {
      // แปลงเวลา database เป็น string ที่เทียบง่ายๆ
      const start = String(slot.start_time); 
      const end = String(slot.end_time);

      // เช็คว่า "ตอนนี้" อยู่ในช่วงเวลานั้นไหม
      if (currentTimeString >= start && currentTimeString <= end) {
        currentStatus = 'busy';
        currentActivity = slot.title; // เอาชื่อวิชา/หัวข้อจอง ไปโชว์ด้วย
        break; // เจอแล้วหยุดเช็คเลย
      }
    }

    // 4. ส่งผลลัพธ์
    res.json({
      room,
      status: currentStatus,       // 'available', 'busy', 'closed'
      current_activity: currentActivity, // ชื่อวิชาที่เรียนอยู่ (ถ้ามี)
      schedule: allSchedules.map(s => ({
          ...s,
          start_time: String(s.start_time).substring(0, 5), // ตัดวินาทีออกให้สวยงาม
          end_time: String(s.end_time).substring(0, 5)
      }))
    });

  } catch (error) {
    console.error('Get Room Schedule Error:', error);
    res.status(500).json({ message: 'เกิดข้อผิดพลาดในการดึงข้อมูลห้อง' });
  }
};

// !!!!!!!!!!!!!!!!!!! ต้องปรับใหม่ คือแบ่งการแสดงผลออกเป็น สองส่วนคือ ส่วน staff จะเห็นทุกห้องรวมถึงห้องที่งดให้บริการด้วย ส่วน teacher, studen จะรับรู้แค่ห้องที่เปิดให้บริการเท่านั้น
// /rooms/
// ดึงรายชื่อห้องทั้งหมด (สำหรับแสดงในหน้าเลือกห้อง)
export const getAllRoom = async (req, res) => {
  // รับค่า query parameter มากรอง (เผื่ออยากได้แค่ห้องที่ Active)
  // ตัวอย่างเรียกใช้: /rooms?only_active=true
  const { only_active } = req.query; 

  try {
   let sql = `
      SELECT 
        room_id, 
        room_type, 
        capacity, 
        location, 
        room_characteristics,
        repair,
        is_active
      FROM public."Rooms"
      WHERE is_active = TRUE 
    `;
    const params = [];

    sql += ` ORDER BY room_id ASC`;

    const result = await pool.query(sql, params);

    // 3. ปรับแต่งข้อมูลก่อนส่ง (Optional)
    // เพิ่ม field ให้ Frontend เอาไปใช้ง่ายๆ เช่น status_color
    const formattedRooms = result.rows.map(room => ({
      ...room,
      // แปลง repair เป็น text หรือสี เพื่อให้ frontend เอาไปใช้ง่ายๆ
      status_text: room.repair ? 'พร้อมใช้งาน' : 'งดให้บริการ',
      status_color: room.repair ? 'green' : 'red' 
    }));

    res.json(formattedRooms);

  } catch (error) {
    console.error('Get All Rooms Error:', error);
    res.status(500).json({ message: 'ไม่สามารถดึงข้อมูลห้องได้' });
  }
};

/* เป็น function ที่เราจะดึงห้องที่ไม่เปิดทำการ (repair = false) 
### res.json มีการส่ง rowConut เอาไว้อยู่แล้ว ### */
export const getAllRoomRepair = async (req, res) => {
  try {
    // ดึงเฉพาะห้องที่ repair เป็น FALSE หรือ NULL (คือห้องที่เสีย หรือ ไม่พร้อม)
    const result = await pool.query(
      `SELECT 
         room_id, 
         room_type, 
         location, 
         capacity, 
         room_characteristics,
         repair  -- ดึงค่า repair ออกมาด้วยเผื่อ Frontend
       FROM public."Rooms" 
       WHERE repair IS FALSE OR repair IS NULL
       ORDER BY room_id ASC`
    );

    // ส่งกลับไปทั้ง "จำนวน (count)" และ "รายการห้อง (rooms)"
    res.json({
      message: 'ดึงข้อมูลห้องที่ปิดปรับปรุง (Repair) สำเร็จ',
      count: result.rowCount,
      rooms: result.rows
    });

  } catch (error) {
    console.error('Get Repair Rooms Error:', error);
    res.status(500).json({ message: 'เกิดข้อผิดพลาดในการดึงข้อมูลห้องที่ปิดใช้งาน' });
  }
};

// /rooms/:id
// ดึงรายระเอียดของห้องที่เราเลือก เช่น รายละเอียดของห้อง 26504
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

// (POST) rooms/
// เพิ่มห้องใหม่
// function นี้จะมีการตั้งค่า is_active ไว้แล้วดังนั้นไม่ต้องส่ง และ repair จะเป็นตัวบ่งบอกว่าห้องจะเปิดหรือปิด
export const createRoom = async (req, res) => {
  // รับค่าทั้งหมดจาก Body ทั้งข้อมูลห้อง และ ข้อมูลอุปกรณ์
  const { 
    room_id, 
    room_type, 
    location, 
    capacity, 
    room_characteristics,
    repair, 
    // รับ object อุปกรณ์แยกออกมา (ถ้ามี)
    equipments // เป็นชนิดข้อมูลแบบ object อยากต้องระวังหากมีการสร้าง form
  } = req.body;

  console.log("req.body : ", req.body);

  // เราต้องใช้ client เพื่อทำ Transaction (การันตีว่าถ้าบันทึกไม่ครบทั้ง 2 ตาราง ให้ยกเลิกทั้งหมด)
  const client = await pool.connect();

  try {
    await client.query('BEGIN'); // เริ่มต้น Transaction

    // STEP 1: Insert ลงตาราง Rooms
    await client.query(
      `INSERT INTO public."Rooms" 
       (room_id, room_type, location, capacity, room_characteristics, repair, is_active)
       VALUES ($1, $2, $3, $4, $5, $6, true)`,
      [room_id, room_type, location, capacity, room_characteristics, repair]
    );


    // STEP 2: Insert ลงตาราง Equipments (ถ้ามีข้อมูลส่งมา)
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
          room_id, //  F-Key เชื่อมกลับไปหาห้อง
          equipments.projector || 0,   // ถ้าไม่ส่งมา ให้เป็น 0
          equipments.microphone || 0,  // ถ้าไม่ส่งมา ให้เป็น 0
          equipments.computer || 0,    // ถ้าไม่ส่งมา ให้เป็น 0
          equipments.whiteboard || 0,  // ถ้าไม่ส่งมา ให้เป็น 0
          equipments.type_of_computer || '-' // ถ้าไม่มีใส่ขีด
        ]
      );
    }

    await client.query('COMMIT'); // ยืนยันการบันทึก (Save ทั้งหมด)
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

// rooms/:room_id/delete
/* ไม่ใช้การลดออกจาก database แต่เป็นการปรับให้อยู่ใน database !!!!!!!!!!!!!!!! 
(ข้อเสียคือ มีนจะค้างอยูาใน database ตลอดไป ควรหา cron 
ที่คอยสังเกตุการณ์ว่าตอนนี้ไม่มีการอ้างอิงห้องนี้แล้วจากนั้นค่อยเอาออกจาก database) */
export const deleteRoom = async (req, res) => {
  const { room_id } = req.params;
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // STEP 1: "ยกเลิก" การจองในอนาคตทั้งหมด
    // เปลี่ยนสถานะเป็น cancelled เฉพาะรายการที่ยังไม่จบ (pending/approved) และเป็นวันพรุ่งนี้เป็นต้นไป
    await client.query(
      `UPDATE public."Booking"
       SET status = 'cancelled'
       WHERE room_id = $1 
       AND date >= CURRENT_DATE 
       AND status IN ('pending', 'approved')`,
      [room_id]
    );

    // STEP 2: "Soft Delete" ห้อง (เปลี่ยน is_active เป็น false)
    const result = await client.query(
      `UPDATE public."Rooms" 
       SET is_active = FALSE 
       WHERE room_id = $1
       RETURNING room_id`, 
      [room_id]
    );

    if (result.rowCount === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ message: 'ไม่พบห้องที่ต้องการลบ' });
    }

    await client.query('COMMIT');
    res.json({ 
      message: `ลบห้อง ${room_id} สำเร็จ (Soft Delete) และยกเลิกการจองล่วงหน้าเรียบร้อยแล้ว` 
    });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Soft Delete Room Error:', error);
    res.status(500).json({ message: 'เกิดข้อผิดพลาดในการลบห้อง' });
  } finally {
    client.release();
  }
};

// rooms/:room_id/edit
// เป็นการ แก้ไขห้อง ข้อที่ห้ามลืมคือ fronend ต้องส่ง  มาเสมอ
export const editRoom = async (req, res) => {
  const { room_id } = req.params;

  const {
    room_type, 
    location, 
    capacity, 
    room_characteristics, 
    repair,
    equipments 
  } = req.body;

  console.log("equipments : ", equipments);

  const client = await pool.connect();

  try {
    await client.query('BEGIN'); // เริ่ม Transaction

    // 🛡️ Logic พิเศษ: ถ้าสั่งปิดห้อง
    // ต้องเคลียร์การจองในอนาคตออกให้หมด เพื่อไม่ให้ข้อมูลค้าง
    if (repair === false) {
       await client.query(
         `UPDATE public."Booking"
          SET status = 'cancelled'
          WHERE room_id = $1 
          AND date >= CURRENT_DATE 
          AND status IN ('pending', 'approved')`,
         [room_id]
       );
    }


    // STEP 1: อัปเดตข้อมูลห้อง
    const updateRoomResult = await client.query(
      `UPDATE public."Rooms" 
       SET room_type = $1, 
           location = $2, 
           capacity = $3, 
           room_characteristics = $4,
           repair = $5
       WHERE room_id = $6`,
      [
        room_type, 
        location, 
        capacity, 
        room_characteristics, 
        repair,
        room_id
      ]
    );

    if (updateRoomResult.rowCount === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ message: 'ไม่พบห้องที่ต้องการแก้ไข' });
    }


    // STEP 2: อัปเดตอุปกรณ์ (เหมือนเดิม)
    if (equipments) {
      // 2.1 ลอง Update ก่อน
      const updateEqResult = await client.query(
        `UPDATE public."Equipment"
         SET projector = $1, microphone = $2, computer = $3, whiteboard = $4, type_of_computer = $5
         WHERE room_id = $6`,
        [
          equipments.projector || 0,
          equipments.microphone || 0,
          equipments.computer || 0,
          equipments.whiteboard || 0,
          equipments.type_of_computer || '-',
          room_id
        ]
      );

      // 2.2 ถ้าไม่เจอ (ห้องเก่าอาจจะยังไม่มีอุปกรณ์) -> ให้ Insert ใหม่
      if (updateEqResult.rowCount === 0) {
        const equipment_id = `eq-${room_id}`;
        await client.query(
          `INSERT INTO public."Equipment"
           (equipment_id, room_id, projector, microphone, computer, whiteboard, type_of_computer)
           VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [
            equipment_id, room_id,
            equipments.projector || 0,
            equipments.microphone || 0,
            equipments.computer || 0,
            equipments.whiteboard || 0,
            equipments.type_of_computer || '-'
          ]
        );
      }
    }

    await client.query('COMMIT');
    res.json({ message: 'แก้ไขข้อมูลห้องและสถานะสำเร็จ' });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Edit Room Error:', error);
    res.status(500).json({ message: 'เกิดข้อผิดพลาดในการแก้ไขข้อมูลห้อง' });
  } finally {
    client.release();
  }
};

// /rooms/:id/qrcode
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