import { pool } from '../config/db.js';
import { sendBookingStatusEmail, sendBookingCancelledEmail, sendTeacherCancelledRoomEmailToStaff } from '../services/mailer.js';
import crypto from 'crypto'; // ใช้ในการเ้ขารหัส booking_id
import { logger } from '../utils/logger.js';


// /bookings/pending
// ดึงรายการที่ "รออนุมัติ"
export const getPendingBookings = async (req, res) => {
  try {
    // ดึงข้อมูล User คนที่เรียก API นี้มาจาก Token
    const requester = req.user;

    // ตั้งค่า Default SQL 
    // 🚨 เพิ่ม b.additional_notes เข้ามาใน SELECT แล้ว
    let sql = `
      SELECT 
         b.booking_id, b.date, b.start_time, b.end_time, b.purpose, b.status, b.additional_notes,
         r.room_id,
         u.name, u.surname, u.email
      FROM public."Booking" b
      JOIN public."Rooms" r ON b.room_id = r.room_id
      JOIN public."Users" u ON b.user_id = u.user_id
      WHERE b.status = 'pending'
    `;

    const params = [];

    if (requester.role === 'teacher') {
      // ถ้าเป็น Teacher: บังคับ กรองเฉพาะของตัวเอง
      sql += ` AND b.user_id = $1`;
      params.push(requester.user_id);

    } else if (requester.role === 'staff') {
      // กรณีส่ง
      if (req.query.user_id) {
        sql += ` AND b.user_id = $1`;
        params.push(req.query.user_id);
      }
    }

    sql += ` ORDER BY b.date ASC, b.start_time ASC`;

    const result = await pool.query(sql, params);

    // Format ข้อมูล
    const formattedBookings = result.rows.map(row => ({
      ...row,
      //  teacher_name: `${row.name} ${row.surname}`,
      start_time: String(row.start_time).substring(0, 5),
      end_time: String(row.end_time).substring(0, 5)
    }));

    res.json(formattedBookings);

  } catch (error) {
    console.error('Get Pending Error:', error);
    res.status(500).json({ message: 'ไม่สามารถดึงข้อมูลรายการรออนุมัติได้' });
  }
};

// /bookings/rejected
// ดึงรายการที่ "ถูกปฏิเสธ"
export const getRejectedBookings = async (req, res) => {
  try {
    // รับข้อมูลผู้เรียก (Requester) และ Query Parameter
    const requester = req.user;
    const { user_id } = req.query; // (Optional) สำหรับ Staff ใช้กรองดูเฉพาะคน

    // 🚨 เพิ่ม b.additional_notes เข้ามาใน SELECT
    let sql = `
      SELECT 
         b.booking_id, 
         TO_CHAR(b.date, 'YYYY-MM-DD') AS date, -- 1. แปลงเป็น String ป้องกัน Timezone Trap
         b.start_time, 
         b.end_time, 
         b.purpose,
         b.status,
         b.cancel_reason,
         b.additional_notes, 
         r.room_id,
         u.name, 
         u.surname,
         u.email
      FROM public."Booking" b
      JOIN public."Rooms" r ON b.room_id = r.room_id
      JOIN public."Users" u ON b.user_id = u.user_id
      WHERE b.status = 'rejected'
      AND b.date >= CURRENT_DATE --  2. กรองเอาเฉพาะวันที่ปัจจุบันและอนาคต
    `;

    const params = [];

    // Logic การกรองสิทธิ์ (Role-based Logic)
    if (requester.role === 'teacher') {
      // Teacher: บังคับกรองเฉพาะของตัวเอง (User ID จาก Token)
      // 🚨 3. เปลี่ยนจาก $1 เป็น $${params.length + 1} เพื่อความปลอดภัยและยืดหยุ่น
      sql += ` AND b.user_id = $${params.length + 1}`;
      params.push(requester.user_id);

    } else if (requester.role === 'staff' || requester.role === 'admin') {
      // Staff: ถ้าส่ง user_id มา ก็กรองตามนั้น ถ้าไม่ส่งก็เอาทั้งหมด
      if (user_id) {
        sql += ` AND b.user_id = $${params.length + 1}`;
        params.push(user_id);
      }
    }

    // 👈 4. ปรับการเรียงลำดับเป็น ASC (วันที่ใกล้จะถึงที่สุดขึ้นก่อน)
    sql += ` ORDER BY b.date ASC, b.start_time ASC`;

    // รัน Query
    const result = await pool.query(sql, params);

    // จัด Format ข้อมูล
    const formattedBookings = result.rows.map(row => ({
      ...row,
      start_time: String(row.start_time).substring(0, 5), // ตัดวินาทีออก
      end_time: String(row.end_time).substring(0, 5)
    }));

    res.json(formattedBookings);

  } catch (error) {
    console.error('Get Rejected Error:', error);
    res.status(500).json({ message: 'ไม่สามารถดึงข้อมูลรายการที่ถูกปฏิเสธได้' });
  }
};

// /bookings/approved
// ดึงรายการที่ "อนุมัติแล้ว"
export const getApprovedBookings = async (req, res) => {
  try {
    // รับข้อมูลผู้เรียก (Requester) และ Query Parameter
    const requester = req.user;
    const { user_id } = req.query; // สำหรับ Staff ใช้กรองดูเฉพาะคน

    // สร้าง SQL พื้นฐาน
    // 🚨 เพิ่ม b.additional_notes เข้ามาใน SELECT แล้ว
    let sql = `
      SELECT 
         b.booking_id, 
         TO_CHAR(b.date, 'YYYY-MM-DD') AS date, -- 👈 แปลงเป็น String ป้องกันปัญหาวันที่เพี้ยน
         b.start_time, 
         b.end_time, 
         b.purpose, 
         b.status,
         b.additional_notes, 
         r.room_id,
         u.name, 
         u.surname, 
         u.email
      FROM public."Booking" b
      JOIN public."Rooms" r ON b.room_id = r.room_id
      JOIN public."Users" u ON b.user_id = u.user_id
      WHERE b.status = 'approved'
      AND b.date >= CURRENT_DATE -- 👈 เพิ่มเงื่อนไข: ดึงแค่วันนี้ และวันในอนาคต
    `;

    const params = [];

    // Logic การกรองสิทธิ์ (Role-based Logic)
    if (requester.role === 'teacher') {
      // Teacher: เห็นเฉพาะของตัวเองเท่านั้น
      sql += ` AND b.user_id = $${params.length + 1}`;
      params.push(requester.user_id);

    } else if (requester.role === 'staff') {
      // Staff: ดูทั้งหมดได้ หรือเลือกดูรายคนได้
      if (user_id) {
        sql += ` AND b.user_id = $${params.length + 1}`;
        params.push(user_id);
      }
    }

    // 👈 ปรับการเรียงลำดับเป็น ASC เพื่อให้คิวที่ใกล้ถึงที่สุดขึ้นมาก่อน
    sql += ` ORDER BY b.date ASC, b.start_time ASC`;

    // รัน Query
    const result = await pool.query(sql, params);

    // จัด Format ข้อมูล
    const formattedBookings = result.rows.map(row => ({
      ...row,
      start_time: String(row.start_time).substring(0, 5), // ตัดวินาที (HH:mm)
      end_time: String(row.end_time).substring(0, 5)
    }));

    res.json(formattedBookings);

  } catch (error) {
    console.error('Get Approved Error:', error);
    res.status(500).json({ message: 'ไม่สามารถดึงข้อมูลรายการที่อนุมัติแล้วได้' });
  }
};


// /bookings/:id
// ใช้เมื่อแสกน QR code ห้องระบบ frontend จะส่ง room_id มาตรวจสอบหลังบ้านว่าห้องนี้เวลานี้ห้องว่างไหม ณ ขณะ ที่เราแสกน
export const getRoomStatus = async (req, res) => {
  const { id } = req.params;

  // ถ้าไม่ส่งวันที่มา ให้ใช้วันปัจจุบัน
  const queryDate = new Date().toISOString().split('T')[0];

  try {
    // ดึงข้อมูลห้อง
    const roomResult = await pool.query(
      `SELECT room_id FROM public."Rooms" WHERE room_id = $1`,
      [id]
    );

    if (roomResult.rows.length === 0) {
      return res.status(404).json({ message: 'ไม่พบห้องดังกล่าว' });
    }

    // ดึงรายการจองที่ "อนุมัติแล้ว" (Approved) ของห้องนั้น ในวันนั้น
    const bookingsResult = await pool.query(
      `SELECT 
         b.booking_id,
         b.start_time, 
         b.end_time, 
         b.purpose, 
         u.name, 
         u.surname
       FROM public."Booking" b
       JOIN public."Users" u ON b.user_id = u.user_id
       WHERE b.room_id = $1 
       AND b.date = $2 
       AND b.status = 'approved' 
       ORDER BY b.start_time ASC`,
      [id, queryDate]
    );

    // เตรียมข้อมูลส่งกลับ (คำนวณว่าห้อง "ว่าง" หรือ "ไม่ว่าง")
    const bookings = bookingsResult.rows;
    const isBusy = bookings.length > 0; // ถ้ามีรายการจอง > 0 แปลว่า "ไม่ว่าง"

    res.json({
      room_info: roomResult.rows[0],
      date: queryDate,
      status_label: isBusy ? 'ไม่ว่าง' : 'ว่าง', // เอาไปทำป้ายสีแดง /เขียว
      total_bookings: bookings.length,
      schedule: bookings.map(b => ({
        ...b,
        // จัด Format เวลาให้สวยงาม (ตัดวินาทีออก) เช่น 13:00:00 -> 13:00
        start_time: b.start_time.substring(0, 5),
        end_time: b.end_time.substring(0, 5),
        full_name: `${b.name} ${b.surname}`
      }))
    });

  } catch (error) {
    console.error('Get Room Status Error:', error);
    res.status(500).json({ message: 'เกิดข้อผิดพลาดในการดึงข้อมูลสถานะห้อง' });
  }
};

// ฟังก์ชันแปลงเวลา "HH:mm" เป็นจำนวนนาทีรวม
const timeToMinutes = (timeStr) => {
  const [hours, minutes] = timeStr.split(':').map(Number);
  return (hours * 60) + (minutes || 0); // เผื่อกรณีส่งมาแค่ "10"
};

// /bookings/teacher
// สร้างการจองห้องสำหรับ teacher โดยรับข้อมูลจาก form, filter ของเว็บ
export const createBookingForTeacher = async (req, res) => {
  const { room_id, purpose, date, start_time, end_time, additional_notes } = req.body;
  const user_id = req.user.user_id;

  // แปลงเวลาเป็นนาที (ฟังก์ชันเดิมที่คุณมีอยู่)
  const startMins = timeToMinutes(start_time);
  const endMins = timeToMinutes(end_time);

  try {
    // ==========================================
    // ⚙️ 1. ดึงการตั้งค่าจากตาราง BookingScope
    // ==========================================
    const scopeResult = await pool.query(`SELECT * FROM public."BookingScope" LIMIT 1`);
    
    // ตั้งค่า Default เผื่อกรณีที่เพิ่งเปิดระบบและยังไม่ได้ตั้งค่า
    let scope = {
      opening_mins: '08:00:00',
      closing_mins: '20:00:00',
      max_duration_hours: 12,
      max_advance_days: 10,
      min_advance_hours: 0 // Default ไม่บังคับจองล่วงหน้า
    };

    if (scopeResult.rowCount > 0) {
      scope = scopeResult.rows[0];
    }

    // ==========================================
    // 🛡️ 2. Business Logic (Dynamic จาก Database)
    // ==========================================

    // แปลงเวลาเปิด-ปิดจาก DB (เช่น '08:00:00' -> '08:00') เพื่อส่งเข้าฟังก์ชัน timeToMinutes
    const OPENING_MINS = timeToMinutes(String(scope.opening_mins).substring(0, 5)); 
    const CLOSING_MINS = timeToMinutes(String(scope.closing_mins).substring(0, 5)); 

    // เช็คว่าเวลาที่กรอกเข้ามา อยู่นอกเหนือเวลาทำการหรือไม่
    if (startMins < OPENING_MINS || endMins > CLOSING_MINS) {
      return res.status(400).json({
        success: false,
        message: `ไม่อนุญาตให้จองห้องนอกเวลาทำการ (ระบบเปิดให้จองตั้งแต่ ${String(scope.opening_mins).substring(0, 5)} น. ถึง ${String(scope.closing_mins).substring(0, 5)} น.)`
      });
    }

    // จำกัดเวลาจองสูงสุด (Max Duration)
    const MAX_DURATION_MINUTES = scope.max_duration_hours * 60;
    const bookingDuration = endMins - startMins;

    if (bookingDuration > MAX_DURATION_MINUTES) {
      return res.status(400).json({
        success: false,
        message: `ไม่อนุญาตให้จองห้องเกิน ${scope.max_duration_hours} ชั่วโมงต่อครั้ง (คุณเลือกไป ${bookingDuration / 60} ชั่วโมง)`
      });
    }

    // วันที่และเวลาปัจจุบันสำหรับใช้คำนวณ
    const now = new Date();
    const bookingDate = new Date(date);
    const bookingStart = new Date(`${date}T${start_time}`);
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    bookingDate.setHours(0, 0, 0, 0);

    // ห้ามจองย้อนหลัง
    if (bookingDate < today) {
      return res.status(400).json({ message: 'ไม่สามารถจองวันย้อนหลังได้' });
    }

    // เช็คเวลาละเอียด (กรณีจองวันนี้ แต่เวลาผ่านไปแล้ว)
    if (bookingStart < now) {
      return res.status(400).json({ message: 'เวลาที่เลือกผ่านไปแล้ว' });
    }

    // เช็คจองล่วงหน้าสูงสุด (Max Advance Days)
    const diffTimeDays = bookingDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTimeDays / (1000 * 60 * 60 * 24));

    if (diffDays > scope.max_advance_days) {
      return res.status(400).json({ 
        message: `สามารถจองล่วงหน้าได้ไม่เกิน ${scope.max_advance_days} วันเท่านั้น` 
      });
    }

    // 🚨 เช็คจองล่วงหน้าขั้นต่ำ (Min Advance Hours) - เพื่อให้ Staff มีเวลาตรวจสอบ
    const diffTimeHours = (bookingStart.getTime() - now.getTime()) / (1000 * 60 * 60);
    
    if (diffTimeHours < scope.min_advance_hours) {
      return res.status(400).json({
        success: false,
        message: `ต้องทำการจองล่วงหน้าอย่างน้อย ${scope.min_advance_hours} ชั่วโมง เพื่อให้เจ้าหน้าที่มีเวลาพิจารณา`
      });
    }

    // ==========================================
    // 📅 3. ตรวจสอบว่าห้องว่างไหม? (ชนกับ Schedule / Booking)
    // ==========================================

    // เช็คว่าชนกับ "ตารางเรียน (Schedule)" ไหม?
    const scheduleConflict = await pool.query(
      `SELECT subject_name, start_time, end_time
       FROM public."Schedules"
       WHERE room_id = $1
       AND date = $2
       AND (start_time < $4 AND end_time > $3)
       AND (temporarily_closed IS FALSE OR temporarily_closed IS NULL)
       FOR UPDATE`,
      [room_id, date, start_time, end_time]
    );

    if (scheduleConflict.rows.length > 0) {
      const conflict = scheduleConflict.rows[0];
      return res.status(409).json({
        message: `ไม่สามารถจองได้ เนื่องจากห้องนี้มีเรียนวิชา: ${conflict.subject_name}`,
        conflict_type: 'schedule',
        time: `${conflict.start_time} - ${conflict.end_time}`
      });
    }

    // เช็คว่าชนกับ "การจองของคนอื่น (Booking)" ไหม?
    const bookingConflict = await pool.query(
      `SELECT booking_id, status FROM public."Booking"
       WHERE room_id = $1 
       AND date = $2 
       AND (start_time < $4 AND end_time > $3)
       AND status IN ('approved', 'pending')
       FOR UPDATE`,
      [room_id, date, start_time, end_time]
    );

    if (bookingConflict.rows.length > 0) {
      const approvedBooking = bookingConflict.rows.find(b => b.status === 'approved');

      if (approvedBooking) {
        return res.status(409).json({
          message: 'ไม่สามารถจองได้ เนื่องจากช่วงเวลานี้ได้รับการอนุมัติแล้ว',
          status: 'approved'
        });
      }

      return res.status(400).json({
        message: 'ช่วงเวลานี้มีผู้รอการอนุมัติอยู่ (กรุณาเลือกเวลาอื่น)',
        status: 'pending'
      });
    }

    // ==========================================
    // 💾 4. บันทึกข้อมูลลง Database
    // ==========================================
    
    const bookingId = crypto.randomUUID();
    const finalNotes = additional_notes ? additional_notes : null;

    await pool.query(
      `INSERT INTO public."Booking" 
       (booking_id, room_id, user_id, purpose, date, start_time, end_time, status, additional_notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7, 'pending', $8)`,
      [bookingId, room_id, user_id, purpose, date, start_time, end_time, finalNotes]
    );

    res.status(201).json({
      message: 'ส่งคำขอจองสำเร็จ',
      bookingId: bookingId
    });

  } catch (error) {
    console.error('Booking Error:', error);
    res.status(500).json({ message: 'เกิดข้อผิดพลาดในการจอง' });
  }
};

// /bookings/staff
// สร้างการจองห้องสำหรับ staff โดยรับข้อมูลจาก form, filter ของเว็บ
export const createBookingForStaff = async (req, res) => {
  const { room_id, purpose, date, start_time, end_time, additional_notes } = req.body;
  const staff_id = req.user.user_id;

  // แปลงเวลาเป็นนาที
  const startMins = timeToMinutes(start_time);
  const endMins = timeToMinutes(end_time);

  try {
    // ==========================================
    // ⚙️ 1. ดึงการตั้งค่าจากตาราง BookingScope
    // ==========================================
    const scopeResult = await pool.query(`SELECT * FROM public."BookingScope" LIMIT 1`);
    
    // ตั้งค่า Default เผื่อกรณีที่เพิ่งเปิดระบบและยังไม่ได้ตั้งค่า
    let scope = {
      opening_mins: '08:00:00',
      closing_mins: '20:00:00',
      max_duration_hours: 12
    };

    if (scopeResult.rowCount > 0) {
      scope = scopeResult.rows[0];
    }

    // ==========================================
    // 🛡️ 2. Business Logic (Dynamic จาก Database)
    // ==========================================

    const OPENING_MINS = timeToMinutes(String(scope.opening_mins).substring(0, 5)); 
    const CLOSING_MINS = timeToMinutes(String(scope.closing_mins).substring(0, 5)); 

    // เช็คว่าเวลาที่กรอกเข้ามา อยู่นอกเหนือเวลาทำการหรือไม่
    if (startMins < OPENING_MINS || endMins > CLOSING_MINS) {
      return res.status(400).json({
        success: false,
        message: `ไม่อนุญาตให้จองห้องนอกเวลาทำการ (ระบบเปิดให้จองตั้งแต่ ${String(scope.opening_mins).substring(0, 5)} น. ถึง ${String(scope.closing_mins).substring(0, 5)} น.)`
      });
    }

    // จำกัดเวลาจองสูงสุด (Max Duration)
    const MAX_DURATION_MINUTES = scope.max_duration_hours * 60;
    const bookingDuration = endMins - startMins;

    if (bookingDuration > MAX_DURATION_MINUTES) {
      return res.status(400).json({
        success: false,
        message: `ไม่อนุญาตให้จองห้องเกิน ${scope.max_duration_hours} ชั่วโมงต่อครั้ง (คุณเลือกไป ${bookingDuration / 60} ชั่วโมง)`
      });
    }

    // (หมายเหตุ: Staff ไม่โดนบังคับเรื่องจองล่วงหน้าขั้นต่ำ/สูงสุด เพราะเป็นคนดูแลระบบ)

    // ==========================================
    // 📅 3. ตรวจสอบเรื่องเวลาและสถานะห้อง
    // ==========================================

    const now = new Date();
    const bookingDate = new Date(date);
    const bookingStart = new Date(`${date}T${start_time}`);

    // Set เวลาให้เป็น 00:00:00 เพื่อเทียบแค่วันที่
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    bookingDate.setHours(0, 0, 0, 0);

    // ห้ามจองย้อนหลัง
    if (bookingDate < today) {
      return res.status(400).json({ message: 'ไม่สามารถจองเวลาย้อนหลังได้' });
    }

    // เช็คเวลาละเอียด (กรณีจองวันนี้ แต่เวลาผ่านไปแล้ว)
    if (bookingStart < now) {
      return res.status(400).json({ message: 'เวลาที่เลือกผ่านไปแล้ว' });
    }

    // ให้ยามไปเช็คสถานะห้องก่อนว่าเปิดให้ใช้ไหม?
    const checkRoomQuery = `
      SELECT is_active, repair 
      FROM public."Rooms" 
      WHERE room_id = $1
    `;
    const roomResult = await pool.query(checkRoomQuery, [room_id]);

    // ดักกรณีพิมพ์รหัสห้องผิด แล้วหาห้องไม่เจอ
    if (roomResult.rowCount === 0) {
      return res.status(404).json({
        success: false,
        message: "ไม่พบข้อมูลห้องนี้ในระบบ"
      });
    }

    const room = roomResult.rows[0];

    // ดักจับห้องที่ถูกปิด (is_active = false) หรือ กำลังซ่อม (repair = true)
    if (room.repair === true) {
      return res.status(400).json({
        success: false,
        message: "ไม่สามารถจองได้ เนื่องจากห้องนี้ถูกระงับการใช้งานชั่วคราว"
      });
    }

    // ตรวจสอบว่าห้องว่างไหม?
    // เช็ค "ตารางเรียน (Schedule)" (รวมถึงวิชาที่งดสอน)
    const scheduleConflict = await pool.query(
      `SELECT subject_name, start_time, end_time
       FROM public."Schedules"
       WHERE room_id = $1
       AND date = $2
       AND (start_time < $4 AND end_time > $3)
       AND (temporarily_closed IS FALSE OR temporarily_closed IS NULL)`, 
      [room_id, date, start_time, end_time]
    );

    if (scheduleConflict.rows.length > 0) {
      const conflict = scheduleConflict.rows[0];
      return res.status(409).json({
        message: `ไม่สามารถจองได้ เนื่องจากห้องนี้มีเรียนวิชา: ${conflict.subject_name}`,
        conflict_type: 'schedule',
        time: `${conflict.start_time} - ${conflict.end_time}`
      });
    }

    // เช็ค "การจองของคนอื่น (Booking)"
    const bookingConflict = await pool.query(
      `SELECT booking_id, status FROM public."Booking"
       WHERE room_id = $1 
       AND date = $2 
       AND (start_time < $4 AND end_time > $3)
       AND status IN ('approved', 'pending')`,
      [room_id, date, start_time, end_time]
    );

    if (bookingConflict.rows.length > 0) {
      const approvedBooking = bookingConflict.rows.find(b => b.status === 'approved');

      // ถ้ามีคนได้ Approved แล้ว -> จองไม่ได้แน่นอน
      if (approvedBooking) {
        return res.status(409).json({
          message: 'ไม่สามารถจองได้ เนื่องจากช่วงเวลานี้ได้รับการอนุมัติแล้ว',
          status: 'approved'
        });
      }

      // ถ้ามีคน Pending อยู่ -> Staff มีสิทธิ์เลือกว่าจะทำยังไง
      // แต่ในที่นี้เราจะ Block ไว้ก่อนเพื่อกันการจองซ้อน
      return res.status(400).json({
        message: 'ช่วงเวลานี้มีผู้รอการอนุมัติอยู่ (กรุณาตรวจสอบรายการ Pending ก่อน)',
        status: 'pending'
      });
    }

    // ==========================================
    // 💾 4. บันทึกข้อมูล (Status = approved)
    // ==========================================

    const bookingId = crypto.randomUUID();
    const finalNotes = additional_notes ? additional_notes : null;

    await pool.query(
      `INSERT INTO public."Booking" 
       (booking_id, room_id, user_id, purpose, date, start_time, end_time, status, approved_by, additional_notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7, 'approved', $8, $9)`,
      [bookingId, room_id, staff_id, purpose, date, start_time, end_time, staff_id, finalNotes]
    );

    // ส่ง response
    res.status(201).json({
      message: 'จองห้องสำเร็จ (อนุมัติทันที)',
      bookingId: bookingId,
      status: 'approved'
    });

  } catch (error) {
    console.error('Staff Booking Error:', error);
    res.status(500).json({ message: 'เกิดข้อผิดพลาดในการจอง' });
  }
};


// ประกาศตัวแปร Map ไว้ด้านบนสุดของไฟล์ (นอกฟังก์ชัน Controller)
// เพื่อให้มันจำค่าไว้ใน RAM ของ Server ตลอดเวลาที่ Server รันอยู่
const emailCooldowns = new Map();

// /bookings/:id/status
// อัปเดตสถานะการจอง (Approve / Reject) for role staff only !!!!!!
export const updateBookingStatus = async (req, res) => {
  const { id } = req.params;
  const { status, cancel_reason } = req.body;
  console.log("body:", req.body);

  if (!['approved', 'rejected', 'pending'].includes(status)) {
    return res.status(400).json({ message: 'สถานะไม่ถูกต้อง' });
  }

  try {
    // 🚨 1. เตรียมข้อมูลเหตุผลการยกเลิก: ถ้าไม่ได้กด reject ให้บังคับเป็น null
    const finalCancelReason = status === 'rejected' ? (cancel_reason || null) : null;
    
    // 🚨 2. เตรียมข้อมูลคนอนุมัติ: ถ้ากด approved ค่อยใส่ user_id ถ้าไม่ใช่ให้เป็น null
    const finalApprovedBy = status === 'approved' ? req.user.user_id : null;

    // 🚨 3. อัปเดตข้อมูลลงฐานข้อมูลโดยใช้ตัวแปรที่กรองแล้ว
    const updateResult = await pool.query(
      `UPDATE public."Booking" 
       SET status = $1, approved_by = $2, cancel_reason = $4
       WHERE booking_id = $3 
       RETURNING *`,
      [status, finalApprovedBy, id, finalCancelReason]
    );

    if (updateResult.rowCount === 0) {
      return res.status(404).json({ message: 'ไม่พบรายการจองนี้' });
    }

    const booking = updateResult.rows[0];

    const details = await pool.query(
      `SELECT u.email, u.name, u.surname, r.room_id, r.room_type 
       FROM public."Booking" b
       JOIN public."Users" u ON b.user_id = u.user_id
       JOIN public."Rooms" r ON b.room_id = r.room_id
       WHERE b.booking_id = $1`,
      [id]
    );

    if (details.rows.length > 0) {
      const { email, name, surname, room_id, room_type } = details.rows[0];
      const teacherFullName = `${name} ${surname}`;
      const displayRoomName = room_id || room_type;

      // ระบบ Rate Limit สำหรับการส่งอีเมล (Anti-Spam)
      const cooldownKey = `booking_${id}_${status}`;
      const COOLDOWN_MINUTES = 5;

      let shouldSendEmail = true;

      if (typeof emailCooldowns !== 'undefined' && emailCooldowns.has(cooldownKey)) {
        const lastSentTime = emailCooldowns.get(cooldownKey);
        const diffMinutes = (Date.now() - lastSentTime) / (1000 * 60);

        if (diffMinutes < COOLDOWN_MINUTES) {
          shouldSendEmail = false;
          console.log(`Rate Limit ป้องกันการ Spam: ข้ามการส่งเมลสถานะ ${status} ให้ ${email} (เพิ่งส่งไปเมื่อ ${diffMinutes.toFixed(1)} นาทีที่แล้ว)`);
        }
      }

      // สั่งส่งอีเมล (ถ้าผ่านเงื่อนไข)
      if (shouldSendEmail) {
        if (typeof emailCooldowns !== 'undefined') {
            emailCooldowns.set(cooldownKey, Date.now());
        }

        const formattedDate = new Date(booking.date).toLocaleDateString('th-TH', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        });

        const formattedStartTime = String(booking.start_time).substring(0, 5);
        const formattedEndTime = String(booking.end_time).substring(0, 5);

        sendBookingStatusEmail(email, {
          teacher_name: teacherFullName,
          status: status,
          room_name: displayRoomName,
          room_type: room_type,
          date: formattedDate,
          start_time: formattedStartTime,
          end_time: formattedEndTime,
          cancel_reason: finalCancelReason || '' 
        });
      }
    }

    res.json({
      message: `อัปเดตสถานะเป็น ${status} เรียบร้อยแล้ว`,
      booking: booking
    });

    // บันทึกการกระทำที่สำคัญ (ถึงแม้ rejected จะไม่ได้ลง approved_by ใน DB แต่ Log จะยังเก็บข้อมูลคนทำรายการไว้อยู่ครับ)
    if (typeof logger !== 'undefined') {
        logger.info('Booking Status Changed', {
        action_by_user_id: req.user.user_id,
        target_booking_id: id,
        new_status: status,
        ip: req.ip
        });
    }

  } catch (error) {
    console.error('Update Status Error:', error);
    res.status(500).json({ message: 'เกิดข้อผิดพลาดในการอัปเดตสถานะ' });
  }
};

// /bookings/allBookingSpecific/:roomId
// สร้าง function เพื่อจะส่งข้อมูลการจองห้องที่ "อณุมัติแล้ว" ในห้องที่ต้องการ เช่นในห้อง 26504 -> ดึงรายการที่ approved ทั้งหมดมา เพื่อใช้ในปฐิทิน
export const getAllBookingSpecific = async (req, res) => {
  const { roomId } = req.params;
  const { status } = req.query;

  try {
    const statusArray = status ? status.split(',') : ['approved'];

    const query = `
            SELECT 
                b.booking_id,
                b.room_id,
                b.status,
                b.date,
                b.start_time,
                b.end_time,
                b.purpose,
                u.name as teacher_name,
                u.surname as teacher_surname
            FROM public."Booking" b
            JOIN public."Users" u ON b.user_id = u.user_id
            WHERE b.room_id = $1 AND b.status = ANY($2::text[])
        `;

    // ส่ง Array เข้าไปให้ PostgreSQL
    const result = await pool.query(query, [roomId, statusArray]);

    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

// /bookings/allBooking
// สร้าง function เพื่อจะส่งข้อมูลการจองห้องที่ "อณุมัติแล้ว" หรือ "ยกเลิกแล้ว" ในทุกห้อง
export const getAllBooking = async (req, res) => {
  const { status } = req.query;
  try {
    // แปลง status เป็น array รองรับทั้ง string เดียวและหลายค่า
    const statusList = status
      ? Array.isArray(status) ? status : status.split(',')
      : ['approved', 'cancel'];

    const placeholders = statusList.map((_, i) => `$${i + 1}`).join(', ');

    const query = `
            SELECT 
                b.booking_id,
                b.room_id, 
                b.date,
                b.start_time,
                b.end_time,
                b.purpose,
                b.status,
                u.name as teacher_name,
                u.surname as teacher_surname
            FROM public."Booking" b
            JOIN public."Users" u ON b.user_id = u.user_id
            WHERE b.status = ANY(ARRAY[${placeholders}])
            ORDER BY b.date DESC, b.start_time ASC
        `;

    const result = await pool.query(query, statusList);

    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

// /bookings/my-history
// ดึงรายการที่เราเคยจอง เช่น ผมนาย A มี userId = 001 : จองห้องอะไรบ้างก็ดึงมาทั้งหมด
export const getMyBookings = async (req, res) => {
  const user_id = req.user.userId;

  try {
    const result = await pool.query(
      `SELECT 
         b.booking_id, 
         b.date, 
         b.start_time, 
         b.end_time, 
         b.purpose, 
         b.status,
         b.cancel_reason,
         r.room_id
       FROM public."Booking" b
       JOIN public."Rooms" r ON b.room_id = r.room_id
       WHERE b.user_id = $1
       ORDER BY b.date DESC, b.start_time ASC`,
      [user_id]
    );

    res.json(result.rows);

  } catch (error) {
    console.error('Get My History Error:', error);
    res.status(500).json({ message: 'ไม่สามารถดึงประวัติการจองได้' });
  }
};

// /bookings/:id/cancel
// ยกเลิกการจอง (Cancel Booking)
export const cancelBooking = async (req, res) => {
  const { id } = req.params; // Booking ID ที่จะยกเลิก
  const { cancel_reason } = req.body || {};
  const actionUserId = req.user.user_id;
  const userRole = req.user.role;

  try {
    const checkQuery = await pool.query(
      `SELECT b.*, u.email, u.name, u.surname 
       FROM public."Booking" b
       JOIN public."Users" u ON b.user_id = u.user_id
       WHERE b.booking_id = $1 
       AND (b.user_id = $2 OR $3 = 'staff')`,
      [id, actionUserId, userRole]
    );

    if (checkQuery.rows.length === 0) {
      return res.status(404).json({ message: 'ไม่พบรายการจอง หรือคุณไม่มีสิทธิ์ยกเลิกรายการนี้' });
    }

    const booking = checkQuery.rows[0];

    const bookingDate = new Date(booking.date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (bookingDate < today) {
      return res.status(400).json({ message: 'ไม่สามารถยกเลิกรายการย้อนหลังได้' });
    }

    if (['rejected', 'cancelled'].includes(booking.status)) {
      return res.status(400).json({ message: 'รายการนี้ถูกยกเลิกหรือปฏิเสธไปแล้ว' });
    }

    // อัปเดตสถานะใน Database
    await pool.query(
      `UPDATE public."Booking" 
      SET status = 'cancelled', cancel_reason = $2 
      WHERE booking_id = $1`,
      [id, cancel_reason || null]
    );

    // 📧 โซนส่งอีเมลแจ้งเตือน (แยกตามบริบท)
    // จัดฟอร์แมตข้อมูลเตรียมส่งอีเมล (ใช้ร่วมกันทั้ง 2 กรณี)
    const formattedDate = new Date(booking.date).toLocaleDateString('th-TH', {
      year: 'numeric', month: 'long', day: 'numeric'
    });
    const timeSlot = `${booking.start_time.substring(0, 5)} - ${booking.end_time.substring(0, 5)} น.`;
    const teacherFullName = `${booking.name} ${booking.surname}`;

    // กรณีที่ 1: Staff เป็นคนกดยกเลิกการจองของ Teacher
    if (actionUserId !== booking.user_id) {
      sendBookingCancelledEmail(
        booking.email,
        teacherFullName,
        booking.room_id,
        formattedDate,
        timeSlot,
        cancel_reason || 'เจ้าหน้าที่ได้ทำการยกเลิกการจองนี้'
      );
      console.log(`[System] สั่งส่งอีเมลแจ้งยกเลิกการจองให้ ${booking.email} เรียบร้อยแล้ว`);
    }

    // กรณีที่ 2: Teacher เป็นคนกดยกเลิกการจองของตัวเอง
    else if (actionUserId === booking.user_id && userRole !== 'staff') {
      // ดึงอีเมลของ Staff ทั้งหมดจาก Database
      const staffQuery = await pool.query(
        `SELECT email FROM public."Users" WHERE role = 'staff'`
      );

      // แปลงผลลัพธ์ให้เป็น Array ของอีเมล (เช่น ['staff1@ku.th', 'staff2@ku.th'])
      const staffEmails = staffQuery.rows.map(row => row.email);

      if (staffEmails.length > 0) {
        sendTeacherCancelledRoomEmailToStaff(
          staffEmails,
          teacherFullName,
          booking.room_id,
          formattedDate,
          timeSlot,
          cancel_reason || 'อาจารย์ผู้จองได้ทำการยกเลิก/งดใช้ห้องด้วยตนเอง'
        );
        console.log(`[System] สั่งส่งอีเมลแจ้งเตือน Staff เรื่องอาจารย์ ${teacherFullName} งดใช้ห้องเรียบร้อยแล้ว`);
      }
    }

    res.json({ message: 'ยกเลิกการจองเรียบร้อยแล้ว' });

  } catch (error) {
    console.error('Cancel Booking Error:', error);
    res.status(500).json({ message: 'เกิดข้อผิดพลาดในการยกเลิกการจอง' });
  }
};

// /bookings/:id  (POST method)
// แก้ไขการจอง
export const editBooking = async (req, res) => {
  // โดยข้อมูลที่ frontend เอาเข้ามามี purpose, date, start_time, end_time
  const { id } = req.params; // booking_id ที่จะแก้
  const { purpose, date, start_time, end_time } = req.body;
  const { user_id, role } = req.user; // จาก Token

  if (!purpose || !date || !start_time || !end_time) {
    return res.status(400).json({ message: 'กรุณากรอกข้อมูลให้ครบถ้วน' });
  }


  // เช็คว่าเวลาสิ้นสุด ต้องมากกว่าเวลาเริ่มต้น
  if (start_time >= end_time) {
    return res.status(400).json({ message: 'เวลาสิ้นสุดต้องอยู่หลังเวลาเริ่มต้น' });
  }

  // เช็คการจองย้อนหลัง (ห้ามเลือกวันที่/เวลาในอดีต)
  const currentDateTime = new Date(); // เวลาปัจจุบันของระบบ
  const requestedDateTime = new Date(`${date}T${start_time}`); // เวลาที่ผู้ใช้ขอแก้

  // ถ้าเวลาที่ขอแก้ไข น้อยกว่าเวลาปัจจุบัน = ย้อนหลัง
  if (requestedDateTime < currentDateTime) {
    return res.status(400).json({ message: 'ไม่สามารถแก้ไขการจองไปเป็นวันและเวลาย้อนหลังได้' });
  }
  // ==========================================

  try {
    // ดึงข้อมูลเก่ามาก่อน เพื่อเช็คสิทธิ์ และเอา room_id
    const oldBookingResult = await pool.query(
      `SELECT * FROM public."Booking" WHERE booking_id = $1`,
      [id]
    );

    if (oldBookingResult.rows.length === 0) {
      return res.status(404).json({ message: 'ไม่พบรายการจองนี้' });
    }

    const oldBooking = oldBookingResult.rows[0];
    const roomId = oldBooking.room_id; // ต้องใช้ room_id จาก database

    // ตรวจสอบสิทธิ์ (เจ้าของ หรือ staff เท่านั้น)
    // user_id ของคนที่จองและ user_id ของคนที่แก้ไขต้องตรงกัน
    if (oldBooking.user_id !== user_id) {
      return res.status(403).json({ message: 'คุณไม่มีสิทธิ์แก้ไขการจองของคนอื่น' });
    }

    // ห้ามแก้รายการที่ถูกยกเลิกไปแล้ว
    if (oldBooking.status === 'cancelled') {
      return res.status(400).json({ message: 'รายการนี้ถูกยกเลิกไปแล้ว ไม่สามารถแก้ไขได้' });
    }

    // ตรวจสอบเวลาชน
    // เช็คชนกับ "ตารางเรียน (Schedule)"
    const scheduleConflict = await pool.query(
      `SELECT subject_name, start_time, end_time
       FROM public."Schedules"
       WHERE room_id = $1
       AND date = $2
       AND (start_time < $4 AND end_time > $3)`,
      [roomId, date, start_time, end_time]
    );

    if (scheduleConflict.rows.length > 0) {
      const conflict = scheduleConflict.rows[0];
      return res.status(409).json({
        message: `แก้ไขไม่ได้ เนื่องจากเวลาชนกับวิชา: ${conflict.subject_name} (${conflict.start_time}-${conflict.end_time})`
      });
    }

    // เช็คชนกับ "Booking อื่นไหม"
    const bookingConflict = await pool.query(
      `SELECT booking_id, status FROM public."Booking"
       WHERE room_id = $1 
       AND date = $2 
       AND (start_time < $4 AND end_time > $3)
       AND status IN ('approved', 'pending')
       AND booking_id != $5`, // ห้ามเช็คเจอกับตัวเอง (Exclude current ID)
      [roomId, date, start_time, end_time, id]
    );

    if (bookingConflict.rows.length > 0) {
      // ถ้าเจอ แสดงว่าเป็นของคนอื่นแน่นอน (เพราะกันตัวเองออกไปแล้ว)
      return res.status(409).json({
        message: 'แก้ไขไม่ได้ เนื่องจากช่วงเวลานี้มีคนอื่นจองแล้ว'
      });
    }

    // อัปเดตข้อมูล (Update)
    // ต้องรีเซ็ตสถานะเป็น 'pending' เสมอ เพราะมีการเปลี่ยนเวลา/จุดประสงค์
    // (ยกเว้น Admin แก้เอง อาจจะให้ Approved เลยก็ได้ แล้วแต่ Logic)

    let newStatus = 'pending';
    if (role === 'admin') newStatus = 'approved'; // ถ้า Admin แก้ ให้ผ่านเลย (Optional)

    await pool.query(
      `UPDATE public."Booking" 
       SET purpose = $1, 
           date = $2, 
           start_time = $3, 
           end_time = $4, 
           status = $5
       WHERE booking_id = $6`,
      [purpose, date, start_time, end_time, newStatus, id]
    );

    res.json({
      message: 'แก้ไขการจองสำเร็จ (สถานะถูกปรับเป็นรออนุมัติใหม่)',
      booking_id: id,
      status: newStatus
    });

  } catch (error) {
    console.error('Edit Booking Error:', error);
    res.status(500).json({ message: 'เกิดข้อผิดพลาดในการแก้ไขข้อมูล' });
  }
};

// /bookings//my-bookings/active (GET method) 
// การจองของฉัน (Active): วันปัจจุบันหรืออนาคต + (Pending/Approved)
export const getMyActiveBookings = async (req, res) => {
  const { user_id } = req.user;

  try {
    const result = await pool.query(
      `SELECT 
         b.*,
         TO_CHAR(b.date, 'YYYY-MM-DD') AS formatted_date,
         u.name,
         u.surname
       FROM public."Booking" b
       JOIN public."Users" u ON b.user_id = u.user_id
       WHERE b.user_id = $1
       AND b.date >= CURRENT_DATE 
       AND b.status IN ('pending', 'approved') 
       ORDER BY b.date ASC, b.start_time ASC`,
      [user_id]
    );

    // 2. จัด Format ข้อมูลตอนส่ง
    const bookings = result.rows.map(row => ({
      ...row,
      date: row.formatted_date, // 👈 3. เอาข้อความวันที่ที่ถูกต้อง ไปทับตัวแปร date อันเดิมที่เพี้ยน
      start_time: String(row.start_time).substring(0, 5),
      end_time: String(row.end_time).substring(0, 5),
      can_edit_delete: true
    }));
    res.json(bookings);

  } catch (error) {
    console.error('Get Active Bookings Error:', error);
    res.status(500).json({ message: 'เกิดข้อผิดพลาดในการดึงข้อมูลการจอง' });
  }
};

// /bookings//my-bookings/history (GET method)
// ประวัติการจอง (History): อดีต หรือ รายการที่จบไปแล้ว (Rejected/Cancelled/Approved) โดยจะรวมกับ table schedules ที่มี status cancel ด้วย 
export const getMyBookingHistory = async (req, res) => {
  const { user_id } = req.user;

  try {
    // 1. ดึงจากตาราง Booking + JOIN Users (เพิ่ม TO_CHAR)
    const bookingQuery = pool.query(
      `SELECT 
          b.booking_id, 
          b.room_id, 
          b.user_id, 
          b.purpose, 
          TO_CHAR(b.date, 'YYYY-MM-DD') AS formatted_date,
          b.start_time, 
          b.end_time, 
          b.status,
          u.name,
          u.surname
       FROM public."Booking" b
       JOIN public."Users" u ON b.user_id = u.user_id
       WHERE b.user_id = $1
       AND (
         b.date < CURRENT_DATE
         OR 
         b.status IN ('rejected', 'cancelled', 'approved')
       )`,
      [user_id]
    );

    // 2. ดึงจากตาราง Schedules (เพิ่ม TO_CHAR)
    const scheduleQuery = pool.query(
      `SELECT 
          schedule_id, 
          room_id, 
          subject_name, 
          teacher_name, 
          TO_CHAR(date, 'YYYY-MM-DD') AS formatted_date,
          start_time, 
          end_time, 
          temporarily_closed
      FROM public."Schedules"
      WHERE user_id = $1 
      AND temporarily_closed = TRUE`,
      [user_id]
    );

    // ทำงานพร้อมกัน
    const [bookingResult, scheduleResult] = await Promise.all([bookingQuery, scheduleQuery]);

    // Merge & Normalize
    // แปลงข้อมูล Booking
    const bookings = bookingResult.rows.map(row => ({
      id: row.booking_id,
      type: 'booking',
      user_id: row.user_id,
      teacher_name: `${row.name} ${row.surname}`,
      purpose: row.purpose,
      room_id: row.room_id,
      date: row.formatted_date, // 👈 เรียกใช้ String ที่แปลงแล้ว
      start_time: String(row.start_time).substring(0, 5),
      end_time: String(row.end_time).substring(0, 5),
      status: row.status,
      can_edit_delete: false
    }));

    // แปลงข้อมูล Schedule
    const schedules = scheduleResult.rows.map(row => ({
      id: row.schedule_id,
      type: 'class_schedule',
      purpose: row.subject_name,
      teacher_name: row.teacher_name,
      room_id: row.room_id,
      date: row.formatted_date, // 👈 เรียกใช้ String ที่แปลงแล้ว
      start_time: String(row.start_time).substring(0, 5),
      end_time: String(row.end_time).substring(0, 5),
      status: 'class_cancelled',
      can_edit_delete: false
    }));

    // รวมและเรียงลำดับ (เรียงจากล่าสุดไปเก่าสุด)
    const allHistory = [...bookings, ...schedules].sort((a, b) => {
      // ตอนนี้ a.date และ b.date เป็น String แบบ 'YYYY-MM-DD' ชัวร์ๆ แล้ว 
      // การเอามาใส่ new Date() ตรงนี้จะไม่มีปัญหาเรื่อง Timezone ขยับวันครับ
      const dateA = new Date(a.date);
      const dateB = new Date(b.date);
      if (dateB - dateA !== 0) return dateB - dateA;
      return a.start_time.localeCompare(b.start_time);
    });

    res.json(allHistory);

  } catch (error) {
    console.error('Get Booking History Error:', error);
    res.status(500).json({ message: 'เกิดข้อผิดพลาดในการดึงประวัติการจอง' });
  }
};

// /bookings/scope (PUT)
// บันทึกหรืออัปเดตการตั้งค่าเงื่อนไขการจอง (Booking Scope) แบบมีแถวเดียวเสมอ
export const createBookingScope = async (req, res) => {
  const { 
    opening_mins, 
    closing_mins, 
    max_duration_hours, 
    max_advance_days, 
    min_advance_hours 
  } = req.body;

  // Validation: ตรวจสอบความครบถ้วนของข้อมูล
  if (
    !opening_mins || 
    !closing_mins || 
    max_duration_hours === undefined || 
    max_advance_days === undefined ||
    min_advance_hours === undefined
  ) {
    return res.status(400).json({ 
      success: false, 
      message: 'กรุณากรอกข้อมูลการตั้งค่าให้ครบถ้วน (เวลาเปิด, เวลาปิด, จำนวนชั่วโมงสูงสุด, จำนวนวันล่วงหน้าสูงสุด, และระยะเวลาจองล่วงหน้าขั้นต่ำ)' 
    });
  }

  try {
    const values = [opening_mins, closing_mins, max_duration_hours, max_advance_days, min_advance_hours];

    // 💡 1. ลองสั่ง UPDATE ข้อมูลในตารางโดยตรง (ไม่ต้องใส่ WHERE เพราะเราต้องการอัปเดตแถวเดียวที่มีอยู่)
    // พร้อมกับอัปเดต date_create ให้เป็นวันปัจจุบันที่แก้ไข
    const updateQuery = `
      UPDATE public."BookingScope" 
      SET 
        opening_mins = $1,
        closing_mins = $2,
        max_duration_hours = $3,
        max_advance_days = $4,
        min_advance_hours = $5,
        date_create = CURRENT_DATE
      RETURNING *;
    `;
    let result = await pool.query(updateQuery, values);

    // 💡 2. ถ้า Update ไม่เจอข้อมูลเลย (rowCount === 0) แปลว่าตารางนี้ยังว่างเปล่า 
    // ให้ใช้คำสั่ง INSERT แถวแรกเข้าไปแทน
    if (result.rowCount === 0) {
      const insertQuery = `
        INSERT INTO public."BookingScope" 
          (opening_mins, closing_mins, max_duration_hours, max_advance_days, min_advance_hours, date_create)
        VALUES 
          ($1, $2, $3, $4, $5, CURRENT_DATE)
        RETURNING *;
      `;
      result = await pool.query(insertQuery, values);
    }

    // ส่งผลลัพธ์กลับไปยัง Frontend
    res.status(200).json({
      success: true,
      message: 'บันทึกการตั้งค่าระบบจองสำเร็จ',
      data: result.rows[0]
    });

  } catch (error) {
    console.error('Create Booking Scope Error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'เกิดข้อผิดพลาดในการบันทึกการตั้งค่า' 
    });
  }
};


// /bookings/scope (GET)
// ดึงข้อมูลการตั้งค่าเงื่อนไขการจองล่าสุด
export const getCreateBookingScope = async (req, res) => {
  try {
    // ดึงข้อมูลการตั้งค่าล่าสุด 1 รายการ โดยเรียงจากวันที่สร้างล่าสุด
    const query = `
      SELECT 
        opening_mins, 
        closing_mins, 
        max_duration_hours, 
        max_advance_days, 
        min_advance_hours,
        TO_CHAR(date_create, 'YYYY-MM-DD') AS date_create
      FROM public."BookingScope"
      ORDER BY date_create DESC
      LIMIT 1;
    `;

    const result = await pool.query(query);

    // กรณีที่ระบบเพิ่งเปิดใช้งาน และ Staff ยังไม่เคยเข้ามาตั้งค่าเลย
    if (result.rowCount === 0) {
      return res.status(200).json({
        success: true,
        message: 'ยังไม่มีข้อมูลการตั้งค่าระบบจอง (ใช้ค่า Default)',
        data: null // หรือจะส่งค่า Default ที่เป็นตัวเลขกลับไปเผื่อ Frontend นำไปแสดงผลก็ได้ครับ
      });
    }

    // กรณีมีข้อมูลการตั้งค่า
    res.status(200).json({
      success: true,
      message: 'ดึงข้อมูลการตั้งค่าระบบจองสำเร็จ',
      data: result.rows[0]
    });

  } catch (error) {
    console.error('Get Booking Scope Error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'เกิดข้อผิดพลาดในการดึงข้อมูลการตั้งค่า' 
    });
  }
};