import { pool } from '../config/db.js';
import { sendBookingStatusEmail } from '../services/mailer.js';


// /bookings/pending
// ดึงรายการที่ "รออนุมัติ"
export const getPendingBookings = async (req, res) => {
  try {
    // ดึงข้อมูล User คนที่เรียก API นี้มาจาก Token
    const requester = req.user; 
    
    // ตั้งค่า Default SQL
    let sql = `
      SELECT 
         b.booking_id, b.date, b.start_time, b.end_time, b.purpose, b.status,
         r.room_id,
         u.name, u.surname, u.email
      FROM public."Booking" b
      JOIN public."Rooms" r ON b.room_id = r.room_id
      JOIN public."Users" u ON b.teacher_id = u.user_id
      WHERE b.status = 'pending'
    `;
    
    const params = [];
    
    if (requester.role === 'teacher') {
        // 🔒 ถ้าเป็น Teacher: บังคับกรองเฉพาะของตัวเอง
        sql += ` AND b.teacher_id = $1`;
        params.push(requester.user_id);
        
    } else if (requester.role === 'staff') {
        // กรณีส่ง
        if (req.query.user_id) {
            sql += ` AND b.teacher_id = $1`;
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

    // console.log("ข้อมูลที่ดึง : ", formattedBookings);
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
    // 1. รับข้อมูลผู้เรียก (Requester) และ Query Parameter
    const requester = req.user; 
    const { user_id } = req.query; // (Optional) สำหรับ Staff ใช้กรองดูเฉพาะคน

    // 2. สร้าง SQL พื้นฐาน
    let sql = `
      SELECT 
         b.booking_id, 
         b.date, 
         b.start_time, 
         b.end_time, 
         b.purpose,
         b.status,
         r.room_id,
         u.name, 
         u.surname,
         u.email
      FROM public."Booking" b
      JOIN public."Rooms" r ON b.room_id = r.room_id
      JOIN public."Users" u ON b.teacher_id = u.user_id
      WHERE b.status = 'rejected'
    `;

    const params = [];

    // 3. Logic การกรองสิทธิ์ (Role-based Logic)
    if (requester.role === 'teacher') {
        // 🔒 Teacher: บังคับกรองเฉพาะของตัวเอง (User ID จาก Token)
        sql += ` AND b.teacher_id = $1`;
        params.push(requester.user_id);

    } else if (requester.role === 'staff' || requester.role === 'admin') {
        // 🔓 Staff: ถ้าส่ง user_id มา ก็กรองตามนั้น ถ้าไม่ส่งก็เอาทั้งหมด
        if (user_id) {
            sql += ` AND b.teacher_id = $1`;
            params.push(user_id);
        }
    }

    // 4. การเรียงลำดับ (วันที่ล่าสุดขึ้นก่อน)
    sql += ` ORDER BY b.date DESC, b.start_time ASC`;

    // 5. รัน Query
    const result = await pool.query(sql, params);

    // 6. จัด Format ข้อมูล
    const formattedBookings = result.rows.map(row => ({
       ...row,
      //  teacher_name: `${row.name} ${row.surname}`, // รวมชื่อ + นามสกุล
       start_time: String(row.start_time).substring(0, 5), // ตัดวินาทีออก
       end_time: String(row.end_time).substring(0, 5)
    }));
    // console.log("ข้อมูลที่ดึง : ", formattedBookings);
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
    // 1. รับข้อมูลผู้เรียก (Requester) และ Query Parameter
    const requester = req.user; 
    const { user_id } = req.query; // (Optional) สำหรับ Staff ใช้กรองดูเฉพาะคน

    // 2. สร้าง SQL พื้นฐาน
    let sql = `
      SELECT 
         b.booking_id, 
         b.date, 
         b.start_time, 
         b.end_time, 
         b.purpose, 
         b.status,
         r.room_id,
         u.name, 
         u.surname, 
         u.email
      FROM public."Booking" b
      JOIN public."Rooms" r ON b.room_id = r.room_id
      JOIN public."Users" u ON b.teacher_id = u.user_id
      WHERE b.status = 'approved'
    `;

    const params = [];

    // 3. Logic การกรองสิทธิ์ (Role-based Logic)
    if (requester.role === 'teacher') {
        // 🔒 Teacher: เห็นเฉพาะของตัวเองเท่านั้น
        sql += ` AND b.teacher_id = $${params.length + 1}`;
        params.push(requester.user_id);

    } else if (requester.role === 'staff' || requester.role === 'admin') {
        // 🔓 Staff: ดูทั้งหมดได้ หรือเลือกดูรายคนได้
        if (user_id) {
            sql += ` AND b.teacher_id = $${params.length + 1}`;
            params.push(user_id);
        }
    }

    // 4. การเรียงลำดับ 
    // (แนะนำ: ถ้าเป็นรายการที่ "กำลังจะมาถึง" ใช้ ASC จะดูง่ายกว่า แต่ถ้าดูประวัติใช้ DESC ครับ)
    // อันนี้ผมคง DESC ตามโค้ดเดิมไว้ก่อนครับ
    sql += ` ORDER BY b.date DESC, b.start_time ASC`;

    // 5. รัน Query
    const result = await pool.query(sql, params);

    // 6. จัด Format ข้อมูล
    const formattedBookings = result.rows.map(row => ({
       ...row,
      //  teacher_name: `${row.name} ${row.surname}`, // รวมชื่อ + นามสกุล
       start_time: String(row.start_time).substring(0, 5), // ตัดวินาที (HH:mm)
       end_time: String(row.end_time).substring(0, 5)
    }));
    // console.log("ข้อมูลที่ดึง : ", formattedBookings);
    res.json(formattedBookings);

  } catch (error) {
    console.error('Get Approved Error:', error);
    res.status(500).json({ message: 'ไม่สามารถดึงข้อมูลรายการที่อนุมัติแล้วได้' });
  }
};

// /bookings/:id
// ใช้เมื่อสแกร QR code ห้องระบบ frontend จะส่ง room_id มาตรวจสอบหลังบ้านว่าห้องนี้เวลานี้ห้องว่างไหม ณ ขณะ ที่เราแสกน
export const getRoomStatus = async (req, res) => {
  const { id } = req.params; // นี่คือ room_id (เช่น 26504)

  // ถ้าไม่ส่งวันที่มา ให้ใช้วันปัจจุบัน
  const queryDate =  new Date().toISOString().split('T')[0];

  try {
    // 1. ดึงข้อมูลห้อง (เพื่อให้รู้ชื่อห้องไปโชว์หัวข้อ)
    const roomResult = await pool.query(
      `SELECT room_id FROM public."Rooms" WHERE room_id = $1`,
      [id]
    );

    if (roomResult.rows.length === 0) {
      return res.status(404).json({ message: 'ไม่พบห้องดังกล่าว' });
    }

    // 2. ดึงรายการจองที่ "อนุมัติแล้ว" (Approved) ของห้องนั้น ในวันนั้น
    const bookingsResult = await pool.query(
      `SELECT 
         b.booking_id,
         b.start_time, 
         b.end_time, 
         b.purpose, 
         u.name, 
         u.surname
       FROM public."Booking" b
       JOIN public."Users" u ON b.teacher_id = u.user_id
       WHERE b.room_id = $1 
       AND b.date = $2 
       AND b.status = 'approved' 
       ORDER BY b.start_time ASC`,
      [id, queryDate]
    );

    // 3. เตรียมข้อมูลส่งกลับ (คำนวณว่าห้อง "ว่าง" หรือ "ไม่ว่าง")
    const bookings = bookingsResult.rows;
    const isBusy = bookings.length > 0; // ถ้ามีรายการจอง > 0 แปลว่า "ไม่ว่าง"

    res.json({
      room_info: roomResult.rows[0],
      date: queryDate,
      status_label: isBusy ? 'ไม่ว่าง' : 'ว่าง', // เอาไปทำป้ายสีแดง/เขียว
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

// /bookings/teacher
// สร้างการจองห้องสำหรับ teacher โดยรับข้อมูลจาก forme ของเว็บ
export const createBookingForTeacher = async (req, res) => {
  const { room_id, purpose, date, start_time, end_time } = req.body;
  const teacher_id = req.user.user_id; 

  try {
    // 0. ตรวจสอบเรื่องเวลา (Standardization)

    const now = new Date();
    const bookingDate = new Date(date);
    const bookingStart = new Date(`${date}T${start_time}`);

    // Set เวลาให้เป็น 00:00:00 เพื่อเทียบแค่วันที่
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    bookingDate.setHours(0, 0, 0, 0);

    // 0.1 ห้ามจองย้อนหลัง (อดีต)
    if (bookingDate < today) {
      return res.status(400).json({ message: 'ไม่สามารถจองเวลาย้อนหลังได้' });
    }
    
    // เช็คเวลาละเอียด (กรณีจองวันนี้ แต่เวลาผ่านไปแล้ว)
    if (bookingStart < now) {
       return res.status(400).json({ message: 'เวลาที่เลือกผ่านไปแล้ว' });
    }

    // 1. ตรวจสอบว่าห้องว่างไหม?

    // 🛑 DANGER ZONE 1: เช็คว่าชนกับ "ตารางเรียน (Schedule)" ไหม?
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

    // 🛑 DANGER ZONE 2: เช็คว่าชนกับ "การจองของคนอื่น (Booking)" ไหม?
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

    // 2. สร้าง Booking ID แบบเรียงลำดับ
    let newBookingId = 'b0001';

    const latestBookingResult = await pool.query(
      `SELECT booking_id FROM public."Booking" ORDER BY booking_id DESC LIMIT 1`
    );

    if (latestBookingResult.rows.length > 0) {
      const latestId = latestBookingResult.rows[0].booking_id;
      const currentNumber = parseInt(latestId.substring(1)); 
      const nextNumber = currentNumber + 1; 
      newBookingId = 'b' + nextNumber.toString().padStart(4, '0');
    }

    // 3. บันทึกข้อมูล
    await pool.query(
      `INSERT INTO public."Booking" 
       (booking_id, room_id, teacher_id, purpose, date, start_time, end_time, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, 'pending')`,
      [newBookingId, room_id, teacher_id, purpose, date, start_time, end_time]
    );

    // 4. ส่ง response
    res.status(201).json({ 
        message: 'ส่งคำขอจองสำเร็จ', 
        bookingId: newBookingId 
    });

  } catch (error) {
    console.error('Booking Error:', error);
    res.status(500).json({ message: 'เกิดข้อผิดพลาดในการจอง' });
  }
};

// /bookings/staff
// สร้างการจองห้องสำหรับ staff โดยรับข้อมูลจาก forme ของเว็บ
export const createBookingForStaff = async (req, res) => {
  const { room_id, purpose, date, start_time, end_time } = req.body;
  
  // สำหรับ Staff เราจะใช้ user_id ของเขาบันทึกเป็นทั้งผู้จอง (teacher_id) และผู้อนุมัติ (approved_by)
  const staff_id = req.user.user_id; 

  try {

    // 0. ตรวจสอบเรื่องเวลา (Standardization)

    const now = new Date();
    const bookingDate = new Date(date);
    const bookingStart = new Date(`${date}T${start_time}`);

    // Set เวลาให้เป็น 00:00:00 เพื่อเทียบแค่วันที่
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    bookingDate.setHours(0, 0, 0, 0);

    // 0.1 ห้ามจองย้อนหลัง (อดีต)
    if (bookingDate < today) {
      return res.status(400).json({ message: 'ไม่สามารถจองเวลาย้อนหลังได้' });
    }
    
    // เช็คเวลาละเอียด (กรณีจองวันนี้ แต่เวลาผ่านไปแล้ว)
    if (bookingStart < now) {
       return res.status(400).json({ message: 'เวลาที่เลือกผ่านไปแล้ว' });
    }



    // 1. ตรวจสอบว่าห้องว่างไหม?

    // 🛑 CHECk 1: เช็ค "ตารางเรียน (Schedule)" (รวมถึงวิชาที่งดสอน)
    const scheduleConflict = await pool.query(
      `SELECT subject_name, start_time, end_time
       FROM public."Schedules"
       WHERE room_id = $1
       AND date = $2
       AND (start_time < $4 AND end_time > $3)
       AND (temporarily_closed IS FALSE OR temporarily_closed IS NULL)`, // ✅ เช็ค status งดสอน
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

    // 🛑 CHECK 2: เช็ค "การจองของคนอื่น (Booking)"
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
      // แต่ในที่นี้เราจะ Block ไว้ก่อนเพื่อกันการจองซ้อน (หรือคุณจะยอมให้ Staff แทรกก็ได้)
      return res.status(400).json({ 
        message: 'ช่วงเวลานี้มีผู้รอการอนุมัติอยู่ (กรุณาตรวจสอบรายการ Pending ก่อน)',
        status: 'pending'
      });
    }

    // -----------------------------------------------------------------------
    // 2. สร้าง Booking ID (Logic เดิม)
    // -----------------------------------------------------------------------
    let newBookingId = 'b0001';

    const latestBookingResult = await pool.query(
      `SELECT booking_id FROM public."Booking" ORDER BY booking_id DESC LIMIT 1`
    );

    if (latestBookingResult.rows.length > 0) {
      const latestId = latestBookingResult.rows[0].booking_id;
      const currentNumber = parseInt(latestId.substring(1)); 
      const nextNumber = currentNumber + 1; 
      newBookingId = 'b' + nextNumber.toString().padStart(4, '0');
    }

    console.log(`New Booking ID (Staff): ${newBookingId}`);

    // -----------------------------------------------------------------------
    // 3. บันทึกข้อมูล (Status = approved)
    // -----------------------------------------------------------------------
    await pool.query(
      `INSERT INTO public."Booking" 
       (booking_id, room_id, teacher_id, purpose, date, start_time, end_time, status, approved_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, 'approved', $8)`,
      [newBookingId, room_id, staff_id, purpose, date, start_time, end_time, staff_id]
    );

    // 4. ส่ง response
    res.status(201).json({ 
        message: 'จองห้องสำเร็จ (อนุมัติทันที)', 
        bookingId: newBookingId,
        status: 'approved'
    });

  } catch (error) {
    console.error('Staff Booking Error:', error);
    res.status(500).json({ message: 'เกิดข้อผิดพลาดในการจอง' });
  }
};

// /bookings/:id/status
// อัปเดตสถานะการจอง (Approve / Reject) for role staff only !!!!!!
export const updateBookingStatus = async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;


  if (!['approved', 'rejected', 'pending'].includes(status)) {
    return res.status(400).json({ message: 'สถานะไม่ถูกต้อง' });
  }

  try {
    // 1. อัปเดตสถานะลง DB
    const updateResult = await pool.query(
      `UPDATE public."Booking" 
       SET status = $1
       WHERE booking_id = $2 
       RETURNING *`, 
      [status, id]
    );
    
    await pool.query(
      `UPDATE public."Booking" 
       SET approved_by = $1
       WHERE booking_id = $2 
       RETURNING *`, 
      [req.user.user_id, id]
    );


    if (updateResult.rowCount === 0) {
      return res.status(404).json({ message: 'ไม่พบรายการจองนี้' });
    }

    const booking = updateResult.rows[0];

    //2. ดึงข้อมูลเพิ่มเติมเพื่อเตรียมส่งเมล (อีเมลผู้จอง + ชื่อห้อง)
    const details = await pool.query(
      `SELECT u.email
       FROM public."Booking" b
       JOIN public."Users" u ON b.teacher_id = u.user_id
       JOIN public."Rooms" r ON b.room_id = r.room_id
       WHERE b.booking_id = $1`,
      [id]
    );

    if (details.rows.length > 0) {
      const { email, room_name } = details.rows[0];

      //3. ส่งเมล (ยิงแล้วลืมเลย ไม่ต้องรอ await ก็ได้เพื่อให้ response เร็ว)
      sendBookingStatusEmail(email, {
        status: status,
        room_name: room_name,
        date: booking.date,
        start_time: booking.start_time,
        end_time: booking.end_time,
        reject_reason: '' // ถ้ามีระบบใส่เหตุผลการปฏิเสธ ค่อยส่งมาตรงนี้ครับ
      });
    }

    res.json({ 
      message: `อัปเดตสถานะเป็น ${status} เรียบร้อยแล้ว`, 
      booking: booking 
    });

  } catch (error) {
    console.error('Update Status Error:', error);
    res.status(500).json({ message: 'เกิดข้อผิดพลาดในการอัปเดตสถานะ' });
  }
};

// /bookings/allBookingSpecific/:roomId
// สร้าง function เพื่อจะส่งข้อมูลการจองห้องที่ "อณุมัติแล้ว" ในห้องที่ต้องการ เช่นในห้อง 26504 -> ดึงรายการที่ approved ทั้งหมดมา เพื่อใช้ในปฐิทิน
export const getAllBookingSpecific =  async (req, res) => {
    const { roomId } = req.params;
    const { status } = req.query;

    try {
        const query = `
            SELECT 
                b.booking_id,
                b.date,
                b.start_time,
                b.end_time,
                b.purpose, -- ไม่จำเป็น
                u.name as teacher_name,
                u.surname as teacher_surname
            FROM public."Booking" b
            JOIN public."Users" u ON b.teacher_id = u.user_id
            WHERE b.room_id = $1 AND b.status = $2
        `;
        const result = await pool.query(query, [roomId, status || 'approved']);
        
        res.json(result.rows); 
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Internal Server Error" });
    }
};


// /bookings/allBooking
// สร้าง function เพื่อจะส่งข้อมูลการจองห้องที่ "อณุมัติแล้ว" ในทุกห้อง
export const getAllBooking = async (req, res) => {
    const { status } = req.query; 
    try {
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
            JOIN public."Users" u ON b.teacher_id = u.user_id
            WHERE b.status = $1
            ORDER BY b.date DESC, b.start_time ASC
        `;
        
        // 2. ส่งแค่ parameter ตัวเดียว คือ status
        const result = await pool.query(query, [status || 'approved']);
        
        res.json(result.rows); 
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Internal Server Error" });
    }
};

// /bookings/my-history
// ดึงรายการที่เราเคยจอง เช่น ผมนาย A มี userId = 001 : จองห้องอะไรบ้างก็ดึงมาทั้งหมด
export const getMyBookings = async (req, res) => {
  const teacher_id = req.user.userId; // ดึง ID จาก Token (Middleware แกะมาให้แล้ว)

  try {
    const result = await pool.query(
      `SELECT 
         b.booking_id, 
         b.date, 
         b.start_time, 
         b.end_time, 
         b.purpose, 
         b.status,
         b.reject_reason,
         r.room_name
       FROM public."Booking" b
       JOIN public."Rooms" r ON b.room_id = r.room_id
       WHERE b.teacher_id = $1
       ORDER BY b.date DESC, b.start_time ASC`, // เรียงจากวันที่ล่าสุด
      [teacher_id]
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
  console.log("cancel is activate!!!");
  const { id } = req.params; // Booking ID ที่จะยกเลิก
  const teacher_id = req.user.user_id; // ต้องเป็นเจ้าของรายการเท่านั้นถึงจะลบได้

  console.log("id : ", id);
  console.log("teacher id : ", teacher_id);
   
  try {
    // 2.1 ตรวจสอบก่อนว่ารายการนี้เป็นของคนนี้จริงไหม + สถานะยกเลิกได้ไหม
    const checkQuery = await pool.query(
      `SELECT * FROM public."Booking" 
       WHERE booking_id = $1 AND teacher_id = $2`,
      [id, teacher_id]
    );

    if (checkQuery.rows.length === 0) {
      return res.status(404).json({ message: 'ไม่พบรายการจอง หรือคุณไม่มีสิทธิ์ยกเลิกรายการนี้' });
      console.log("ไม่มีรายการที่ตรง ???");
    }

    const booking = checkQuery.rows[0];

    // 2.2 เช็คว่ารายการผ่านไปหรือยัง (กันเนียนมายกเลิกย้อนหลัง)
    const bookingDate = new Date(booking.date);
    const today = new Date();
    today.setHours(0, 0, 0, 0); // set เวลาให้เป็น 00:00 เพื่อเทียบแค่วันที่

    if (bookingDate < today) {
        return res.status(400).json({ message: 'ไม่สามารถยกเลิกรายการย้อนหลังได้' });
    }

    // 2.3 เช็คสถานะ (ถ้าโดน reject หรือ cancel ไปแล้ว จะยกเลิกซ้ำทำไม)
    if (['rejected', 'cancelled'].includes(booking.status)) {
        return res.status(400).json({ message: 'รายการนี้ถูกยกเลิกหรือปฏิเสธไปแล้ว' });
    }

    // 2.4 ลงมืออัปเดตสถานะ
    await pool.query(
      `UPDATE public."Booking" 
       SET status = 'cancelled' 
       WHERE booking_id = $1`,
      [id]
    );

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

  // console.log("user_id, role : ", req.user)
  // Validation เบื้องต้น
  if (!purpose || !date || !start_time || !end_time) {
    return res.status(400).json({ message: 'กรุณากรอกข้อมูลให้ครบถ้วน' });
  }

  try {

    // STEP 1: ดึงข้อมูลเก่ามาก่อน (เพื่อเช็คสิทธิ์ และเอา room_id)
    const oldBookingResult = await pool.query(
      `SELECT * FROM public."Booking" WHERE booking_id = $1`,
      [id]
    );

    if (oldBookingResult.rows.length === 0) {
      return res.status(404).json({ message: 'ไม่พบรายการจองนี้' });
    }

    const oldBooking = oldBookingResult.rows[0];
    const roomId = oldBooking.room_id; // ต้องใช้ room_id จาก database

    // STEP 2: ตรวจสอบสิทธิ์ (เจ้าของ หรือ staff เท่านั้น)
    // user_id ของคนที่จองและ user_id ของคนที่แก้ไขต้องตรงกัน
    if (oldBooking.teacher_id !== user_id) {
      return res.status(403).json({ message: 'คุณไม่มีสิทธิ์แก้ไขการจองของคนอื่น' });
    }

    // ห้ามแก้รายการที่ถูกยกเลิกไปแล้ว (Optional)
    if (oldBooking.status === 'cancelled') {
        return res.status(400).json({ message: 'รายการนี้ถูกยกเลิกไปแล้ว ไม่สามารถแก้ไขได้' });
    }

    // STEP 3: ตรวจสอบเวลาชน (Collision Check) 🛑
    // 3.1 เช็คชนกับ "ตารางเรียน (Schedule)"
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

    // 3.2 เช็คชนกับ "Booking อื่น"
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

    // STEP 4: อัปเดตข้อมูล (Update) ✅
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
         b.*,           -- ดึงทุกคอลัมน์จาก Booking
         u.name,        -- ✅ ดึงชื่อ
         u.surname      -- ✅ ดึงนามสกุล
       FROM public."Booking" b
       JOIN public."Users" u ON b.teacher_id = u.user_id
       WHERE b.teacher_id = $1
       AND b.date >= CURRENT_DATE 
       AND b.status IN ('pending', 'approved') 
       ORDER BY b.date ASC, b.start_time ASC`, 
      [user_id]
    );

    // จัด Format ข้อมูล
    const bookings = result.rows.map(row => ({
      ...row,
      start_time: String(row.start_time).substring(0, 5),
      end_time: String(row.end_time).substring(0, 5),
      can_edit_delete: true 
    }));

    console.log("booking : ",bookings);
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
    // ---------------------------------------------------------
    // Query 1: ดึงจากตาราง Booking + JOIN Users
    // ---------------------------------------------------------
    const bookingQuery = pool.query(
      `SELECT 
          b.booking_id, 
          b.room_id, 
          b.teacher_id, 
          b.purpose, 
          b.date, 
          b.start_time, 
          b.end_time, 
          b.status,
          u.name,      -- ✅ ดึงชื่อ
          u.surname    -- ✅ ดึงนามสกุล
       FROM public."Booking" b
       JOIN public."Users" u ON b.teacher_id = u.user_id -- 🔗 เชื่อมตารางตรงนี้
       WHERE b.teacher_id = $1
       AND (
         b.date < CURRENT_DATE
         OR 
         b.status IN ('rejected', 'cancelled', 'approved')
       )`,
      [user_id]
    );

    // ---------------------------------------------------------
    // Query 2: ดึงจากตาราง Schedules (เหมือนเดิม)
    // ---------------------------------------------------------
    const scheduleQuery = pool.query(
      `SELECT 
          schedule_id, room_id, subject_name, teacher_name, date, start_time, end_time, temporarily_closed
       FROM public."Schedules"
       WHERE teacher_id = $1 
       AND temporarily_closed = TRUE`, 
      [user_id]
    );

    // ทำงานพร้อมกัน
    const [bookingResult, scheduleResult] = await Promise.all([bookingQuery, scheduleQuery]);

    // ---------------------------------------------------------
    // Merge & Normalize
    // ---------------------------------------------------------

    // 1. แปลงข้อมูล Booking
    const bookings = bookingResult.rows.map(row => ({
      id: row.booking_id,
      type: 'booking',
      teacher_id: row.teacher_id,
      teacher_name: `${row.name} ${row.surname}`, // ✅ รวมชื่อและนามสกุลส่งกลับไป
      purpose: row.purpose,
      room_id: row.room_id,
      date: row.date,
      start_time: String(row.start_time).substring(0, 5),
      end_time: String(row.end_time).substring(0, 5),
      status: row.status,
      can_edit_delete: false
    }));

    // 2. แปลงข้อมูล Schedule
    const schedules = scheduleResult.rows.map(row => ({
      id: row.schedule_id,
      type: 'class_schedule',
      purpose: row.subject_name,
      teacher_name: row.teacher_name, // (ใน Table Schedule มีชื่อเก็บไว้อยู่แล้ว ใช้ได้เลย)
      room_id: row.room_id,
      date: row.date,
      start_time: String(row.start_time).substring(0, 5),
      end_time: String(row.end_time).substring(0, 5),
      status: 'class_cancelled',
      can_edit_delete: false
    }));

    // 3. รวมและเรียงลำดับ
    const allHistory = [...bookings, ...schedules].sort((a, b) => {
        const dateA = new Date(a.date);
        const dateB = new Date(b.date);
        if (dateB - dateA !== 0) return dateB - dateA; 
        return a.start_time.localeCompare(b.start_time);
    });

    // console.log("all history : ", allHistory);

    res.json(allHistory);

  } catch (error) {
    console.error('Get Booking History Error:', error);
    res.status(500).json({ message: 'เกิดข้อผิดพลาดในการดึงประวัติการจอง' });
  }
};