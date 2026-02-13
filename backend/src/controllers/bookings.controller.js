import { pool } from '../config/db.js';
import { sendBookingStatusEmail } from '../services/mailer.js';


// /bookings/pending
// ดึงรายการที่ "รออนุมัติ"
export const getPendingBookings = async (req, res) => {
  try {
    // เราต้อง JOIN ตาราง เพื่อให้ได้ชื่อห้องและชื่อคนจอง (ไม่ใช่แค่ ID)
    const result = await pool.query(
      `SELECT 
         b.booking_id, 
         b.date, 
         b.start_time, 
         b.end_time, 
         b.purpose, 
         b.status,
         r.room_id,
         u.name as teacher_name,
         u.email,
        u.surname
       FROM public."Booking" b
       JOIN public."Rooms" r ON b.room_id = r.room_id
       JOIN public."Users" u ON b.teacher_id = u.user_id
       WHERE b.status = 'pending'
       ORDER BY b.date ASC, b.start_time ASC`
    );

    res.json(result.rows);

  } catch (error) {
    console.error('Get Pending Error:', error);
    res.status(500).json({ message: 'ไม่สามารถดึงข้อมูลรายการรออนุมัติได้' });
  }
};

// /bookings/rejected
// ดึงรายการที่ "ถูกปฏิเสธ"
export const getRejectedBookings = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT 
          b.booking_id, 
          b.date, 
          b.start_time, 
          b.end_time, 
          b.purpose,
          b.status,
          r.room_id,
          u.name as teacher_name,
          u.email,
          u.surname
        FROM public."Booking" b
        JOIN public."Rooms" r ON b.room_id = r.room_id
        JOIN public."Users" u ON b.teacher_id = u.user_id
        WHERE b.status = 'rejected'
        ORDER BY b.date DESC, b.start_time ASC`
    );

    res.json(result.rows);

  } catch (error) {
    console.error('Get Rejected Error:', error);
    res.status(500).json({ message: 'ไม่สามารถดึงข้อมูลรายการที่ถูกปฏิเสธได้' });
  }
};

// /bookings/approved
// ดึงรายการที่ "อนุมัติแล้ว"
export const getApprovedBookings = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT 
         b.booking_id, 
         b.date, 
         b.start_time, 
         b.end_time,
         r.room_id,
         b.purpose, 
         b.status,
         u.name as teacher_name,
         u.email,
        u.surname
       FROM public."Booking" b
       JOIN public."Rooms" r ON b.room_id = r.room_id
       JOIN public."Users" u ON b.teacher_id = u.user_id
       WHERE b.status = 'approved'
       ORDER BY b.date DESC, b.start_time ASC` 
    );

    res.json(result.rows);

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

    // 0. ดักการจองย้อนหลัง
    const now = new Date();
    const bookingStart = new Date(`${date}T${start_time}`);

    if (bookingStart < now) {
      return res.status(400).json({ message: 'ไม่สามารถจองเวลาย้อนหลังได้' });
    }

    // 1. ตรวจสอบว่าห้องว่างไหม? 
    // 🛑 DANGER ZONE 1: เช็คว่าชนกับ "ตารางเรียน (Schedule)" ไหม?
    const scheduleConflict = await pool.query(
      `SELECT subject_name, start_time, end_time
       FROM public."Schedules"
       WHERE room_id = $1
       AND date = $2
       AND (start_time < $4 AND end_time > $3)  -- ช่วงเวลาชนกัน
       AND (temporarily_closed IS FALSE OR temporarily_closed IS NULL)`, // 👈 เพิ่มบรรทัดนี้: เฉพาะวิชาที่ไม่ได้งดสอน
      [room_id, date, start_time, end_time]
    );

    if (scheduleConflict.rows.length > 0) {
      const conflict = scheduleConflict.rows[0];
      // ส่ง status 409 (Conflict) กลับไป
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
    
    // ในตัวแปร existingBooking คือถ้ามีการขอจองมา 1 คำขอ ก็จะไปถาม database ว่ามีใครที่มีสถาณะ approved แล้วมีช่วงเวลาตรงกันบ้างถ้ามีจะถูกเก็บใน existingBooking ทำให้มี rows มากกว่า 1
    if (bookingConflict.rows.length > 0) {
    const approvedBooking = bookingConflict.rows.find(b => b.status === 'approved');

    // ถ้าเข้าเงือนไข แสดงว่าข้อมูลใน existingBooking มีสถาณะ approved 
    if (approvedBooking) {
        // ถ้าเจอ Approved -> จบเลย ห้องไม่ว่างแน่นอน
        return res.status(409).json({ 
            message: 'ไม่สามารถจองได้ เนื่องจากช่วงเวลานี้ได้รับการอนุมัติแล้ว',
            status: 'approved' 
        });
    } 
    
    // แต่ถ้าไม่ใช้ก็แสดงว่าเป็น pending 
    return res.status(400).json({ 
        message: 'ช่วงเวลานี้มีผู้รอการอนุมัติอยู่ (กรุณาเลือกเวลาอื่น)',
        status: 'pending'
    });
}

    // 2. สร้าง Booking ID แบบเรียงลำดับ (b0001, b0002, ...)

    let newBookingId = 'b0001'; // ค่าเริ่มต้น (ถ้ายังไม่มีใครจองเลย)

    // ดึง booking_id ล่าสุดออกมา (เรียงจากมากไปน้อย แล้วเอามาแค่ 1 ตัว)
    const latestBookingResult = await pool.query(
      `SELECT booking_id FROM public."Booking" ORDER BY booking_id DESC LIMIT 1`
    );

    if (latestBookingResult.rows.length > 0) {
      const latestId = latestBookingResult.rows[0].booking_id; // เช่น 'b0015'
      
      // ตัดตัว 'b' ออก (substring(1)) แล้วแปลงเป็นตัวเลข
      const currentNumber = parseInt(latestId.substring(1)); 
      
      // บวก 1
      const nextNumber = currentNumber + 1; 

      // แปลงกลับเป็น String และเติม 0 ข้างหน้าให้ครบ 4 หลัก
      // เช่น 16 -> '0016' -> 'b0016'
      newBookingId = 'b' + nextNumber.toString().padStart(4, '0');
    }

    console.log(`new booking id = ${newBookingId}`);


    // 3. บันทึกข้อมูล (ใช้ newBookingId ที่เราคำนวณมา)
    await pool.query(
      `INSERT INTO public."Booking" 
       (booking_id, room_id, teacher_id, purpose, date, start_time, end_time, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, 'pending')`,
      [newBookingId, room_id, teacher_id, purpose, date, start_time, end_time]
    );

    // 4. ส่ง response กลับ
    res.status(201).json({ 
        message: 'ส่งคำขอจองสำเร็จ', 
        bookingId: newBookingId // ส่ง ID ใหม่กลับไป
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

  const teacher_id = req.user.user_id; 
  // console.log("teacher id : ", teacher_id);
  try {

    // 0. ดักการจองย้อนหลัง

    const now = new Date();
    const bookingStart = new Date(`${date}T${start_time}`);

    if (bookingStart < now) {
      return res.status(400).json({ message: 'ไม่สามารถจองเวลาย้อนหลังได้' });
    }

    // 1. ตรวจสอบว่าห้องว่างไหม? 
    // 🛑 DANGER ZONE 1: เช็คว่าชนกับ "ตารางเรียน (Schedule)" ไหม?
    const scheduleConflict = await pool.query(
      `SELECT subject_name, start_time, end_time
       FROM public."Schedules"
       WHERE room_id = $1
       AND date = $2
       AND (start_time < $4 AND end_time > $3)  -- ช่วงเวลาชนกัน
       AND (temporarily_closed IS FALSE OR temporarily_closed IS NULL)`, // 👈 เพิ่มบรรทัดนี้: เฉพาะวิชาที่ไม่ได้งดสอน
      [room_id, date, start_time, end_time]
    );

    if (scheduleConflict.rows.length > 0) {
      const conflict = scheduleConflict.rows[0];
      // ส่ง status 409 (Conflict) กลับไป
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
    
    // ในตัวแปร existingBooking คือถ้ามีการขอจองมา 1 คำขอ ก็จะไปถาม database ว่ามีใครที่มีสถาณะ approved แล้วมีช่วงเวลาตรงกันบ้างถ้ามีจะถูกเก็บใน existingBooking ทำให้มี rows มากกว่า 1
    if (bookingConflict.rows.length > 0) {
    const approvedBooking = bookingConflict.rows.find(b => b.status === 'approved');


    // ถ้าเข้าเงือนไข แสดงว่าข้อมูลใน existingBooking มีสถาณะ approved 
    if (approvedBooking) {
        // ถ้าเจอ Approved -> จบเลย ห้องไม่ว่างแน่นอน
        return res.status(409).json({ 
            message: 'ไม่สามารถจองได้ เนื่องจากช่วงเวลานี้ได้รับการอนุมัติแล้ว',
            status: 'approved' 
        });
    } 
    
    // แต่ถ้าไม่ใช้ก็แสดงว่าเป็น pending 
    return res.status(400).json({ 
        message: 'ช่วงเวลานี้มีผู้รอการอนุมัติอยู่ (กรุณาเลือกเวลาอื่น)',
        status: 'pending'
    });
}

    // 2. สร้าง Booking ID แบบเรียงลำดับ (b0001, b0002, ...)

    let newBookingId = 'b0001'; // ค่าเริ่มต้น (ถ้ายังไม่มีใครจองเลย)

    // ดึง booking_id ล่าสุดออกมา (เรียงจากมากไปน้อย แล้วเอามาแค่ 1 ตัว)
    const latestBookingResult = await pool.query(
      `SELECT booking_id FROM public."Booking" ORDER BY booking_id DESC LIMIT 1`
    );

    if (latestBookingResult.rows.length > 0) {
      const latestId = latestBookingResult.rows[0].booking_id; // เช่น 'b0015'
      
      // ตัดตัว 'b' ออก (substring(1)) แล้วแปลงเป็นตัวเลข
      const currentNumber = parseInt(latestId.substring(1)); 
      
      // บวก 1
      const nextNumber = currentNumber + 1; 

      // แปลงกลับเป็น String และเติม 0 ข้างหน้าให้ครบ 4 หลัก
      // เช่น 16 -> '0016' -> 'b0016'
      newBookingId = 'b' + nextNumber.toString().padStart(4, '0');
    }

    console.log(`new booking id = ${newBookingId}`);

    const name = req.user.name;
    console.log("name : ", name);


    // 3. บันทึกข้อมูล (ใช้ newBookingId ที่เราคำนวณมา)
    await pool.query(
      `INSERT INTO public."Booking" 
       (booking_id, room_id, teacher_id, purpose, date, start_time, end_time, status, approved_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, 'approved', $8)`,
      [newBookingId, room_id, teacher_id, purpose, date, start_time, end_time, req.user.user_id]
    );

    // 4. ส่ง response กลับ
    res.status(201).json({ 
        message: 'ส่งคำขอจองสำเร็จ', 
        bookingId: newBookingId // ส่ง ID ใหม่กลับไป
    });

  } catch (error) {
    console.error('Booking Error:', error);
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

// /bookings/allBooking/:roomId
// สร้าง function เพื่อจะส่งข้อมูลการจองห้องที่ "อณุมัติแล้ว" ในห้องที่ต้องการ เช่นในห้อง 26504 -> ดึงรายการที่ approved ทั้งหมดมา เพื่อใช้ในปฐิทิน
export const getAllBooking =  async (req, res) => {
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
      `SELECT * FROM public."Booking"
       WHERE teacher_id = $1
       AND date >= CURRENT_DATE -- ✅ ต้องเป็นวันนี้ หรือ อนาคตเท่านั้น
       AND status IN ('pending', 'approved') -- ✅ เฉพาะสถานะที่ยังดำเนินการอยู่
       ORDER BY date ASC, start_time ASC`, // เรียงจาก ใกล้ -> ไกล
      [user_id]
    );

    // จัด Format เวลาให้สวยงาม (ตัดวินาทีออก)
    const bookings = result.rows.map(row => ({
      ...row,
      start_time: String(row.start_time).substring(0, 5),
      end_time: String(row.end_time).substring(0, 5),
      // เพิ่ม flag ให้ Frontend รู้ว่า "รายการนี้แก้ไข/ยกเลิกได้นะ"
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
    // Query 1: ดึงจากตาราง Booking
    const bookingQuery = pool.query(
      `SELECT 
          booking_id, room_id, purpose, date, start_time, end_time, status, created_at
       FROM public."Booking"
       WHERE teacher_id = $1
       AND (
         date < CURRENT_DATE -- อดีต
         OR 
         status IN ('rejected', 'cancelled', 'approved') -- จบสถานะแล้ว
       )`,
      [user_id]
    );


    // Query 2: ดึงจากตาราง Schedules (temporarily_closed = true)
    // เงื่อนไข: เป็นเจ้าของวิชา (teacher_id) AND ถูกงดคลาส (temporarily_closed = true)
    const scheduleQuery = pool.query(
      `SELECT 
          schedule_id, room_id, subject_name, date, start_time, end_time, temporarily_closed
       FROM public."Schedules"
       WHERE teacher_id = $1 
       AND temporarily_closed = TRUE`, 
      [user_id]
    );

    // ทำงานพร้อมกันทั้ง 2 Query (Parallel to up speed)
    const [bookingResult, scheduleResult] = await Promise.all([bookingQuery, scheduleQuery]);

    // ---------------------------------------------------------
    // Merge & Normalize: แปลงร่างข้อมูลให้หน้าตาเหมือนกัน
    // ---------------------------------------------------------

    // 1. แปลงข้อมูล Booking
    const bookings = bookingResult.rows.map(row => ({
      id: row.booking_id,           // ใช้ชื่อกลางๆ ว่า id
      type: 'booking',              // บอก frontend ว่าเป็น type ไหน
      purpose: row.purpose,           // map purpose -> title
      room_id: row.room_id,
      date: row.date,
      start_time: String(row.start_time).substring(0, 5),
      end_time: String(row.end_time).substring(0, 5),
      status: row.status,           // approved, rejected, cancelled
      can_edit_delete: false
    }));

    // 2. แปลงข้อมูล Schedule (งดคลาส)
    const schedules = scheduleResult.rows.map(row => ({
      id: row.schedule_id,
      type: 'class_schedule',       // บอก frontend ว่าเป็น type ไหน
      purpose: row.subject_name,      // map subject_name -> title
      room_id: row.room_id,
      date: row.date,
      start_time: String(row.start_time).substring(0, 5),
      end_time: String(row.end_time).substring(0, 5),
      status: 'class_cancelled',    // ✅ สร้างสถานะจำลองขึ้นมาเพื่อให้ Frontend แสดงผลถูก
      can_edit_delete: false
    }));

    // 3. รวมเรียงลำดับ (ล่าสุดขึ้นก่อน)
    const allHistory = [...bookings, ...schedules].sort((a, b) => {
        // Order by Desc
        const dateA = new Date(a.date); // วันที่ของรายการใน bookings
        const dateB = new Date(b.date); // วันที่ของรายการใน schedules
        // if two data have not equalment date
        if (dateB - dateA !== 0) return dateB - dateA; 

        // ถ้าวันเท่ากัน เรียงตามเวลาเริ่ม (Asc) 
        return a.start_time.localeCompare(b.start_time);
    });

    res.json(allHistory);

  } catch (error) {
    console.error('Get Booking History Error:', error);
    res.status(500).json({ message: 'เกิดข้อผิดพลาดในการดึงประวัติการจอง' });
  }
};