import { pool } from '../config/db.js';
import ExcelJS from 'exceljs';

// ฟังก์ชันสำหรับ Import Excel ลง Table Semesters
const formatExcelData = (value, type = 'time') => {
  if (!value) return null;

  // 🟢 กรณี 1: ExcelJS อ่านมาเป็น Date Object
  if (value instanceof Date) {
    // แก้ไข: ใช้ getUTC...() แทน get...() 
    // เพื่อดึงค่าเวลาดิบๆ โดยไม่สน Timezone ของประเทศไทยในปี 1899
    
    if (type === 'time') {
      // ใช้ UTC เพื่อให้ได้ 09:00 ตาม Excel เป๊ะๆ
      const hours = String(value.getUTCHours()).padStart(2, '0');
      const minutes = String(value.getUTCMinutes()).padStart(2, '0');
      const seconds = String(value.getUTCSeconds()).padStart(2, '0');
      return `${hours}:${minutes}:${seconds}`; 
    } else {
      // type === 'date'
      // สำหรับวันที่ ก็ควรใช้ UTC เช่นกันเพื่อความชัวร์ ถ้า Excel เก็บเป็น UTC
      const year = value.getUTCFullYear();
      const month = String(value.getUTCMonth() + 1).padStart(2, '0');
      const day = String(value.getUTCDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    }
  }

  // 🟡 กรณี 2: มาเป็นตัวเลขทศนิยม (Logic เดิม)
  if (typeof value === 'number' && type === 'time') {
    // ปัดเศษวินาทีเพื่อความแม่นยำ (กันกรณี 09:00 กลายเป็น 08:59:59.999)
    const totalSeconds = Math.round(value * 24 * 60 * 60);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    
    const hh = String(hours).padStart(2, '0');
    const mm = String(minutes).padStart(2, '0');
    const ss = String(seconds).padStart(2, '0');
    return `${hh}:${mm}:${ss}`;
  }

  // 🔴 กรณี 3: มาเป็น String
  return String(value).trim();
};

// 🛠 Helper Function: จัดการเรื่องวันที่และเวลา, ExcelJS มักจะ return Date Object มาเลย แต่เราเขียนเผื่อไว้
function parseExcelDate(value, type = 'date') {
    if (!value) return null;

    // กรณี 1: ExcelJS ส่งมาเป็น Date Object อยู่แล้ว (ดีที่สุด)
    if (value instanceof Date) {
        if (type === 'time') {
            // ดึงเฉพาะเวลา HH:mm:ss
            return value.toTimeString().split(' ')[0];
        } else {
            // ดึงเฉพาะวันที่ YYYY-MM-DD (แก้เรื่อง Timezone Offset เบื้องต้น)
            const year = value.getFullYear();
            const month = String(value.getMonth() + 1).padStart(2, '0');
            const day = String(value.getDate()).padStart(2, '0');
            return `${year}-${month}-${day}`;
        }
    }

    // กรณี 2: เป็น String (เช่น "10:30" หรือ "2023-12-01")
    return String(value).trim();
}

// /schedule/import 
// อัพโหลดข้อมูล file 
// มีการป้องกันการชนกันของข้อมูลการจองภายใน file โดยจะมีข้อความแจ้งว่าชนกับห้องไหนบ้าง
export const importClassSchedules = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'กรุณาอัปโหลดไฟล์ Excel' });
    }

    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(req.file.buffer);
    
    const worksheet = workbook.getWorksheet(1);
    
    if (!worksheet) {
       return res.status(400).json({ message: 'ไม่พบข้อมูล Worksheet ในไฟล์' });
    }

    // --- ส่วนการแปลง Excel ---
    const importedData = [];
    let headers = {};

    worksheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) {
        row.eachCell((cell, colNumber) => {
          headers[colNumber] = cell.value; 
        });
      } else {
        let rowData = {};
        row.eachCell((cell, colNumber) => {
          const key = headers[colNumber];
          let cellValue = cell.value;
          if (typeof cellValue === 'object' && cellValue !== null) {
             if (cellValue.text) cellValue = cellValue.text;
             else if (cellValue.result) cellValue = cellValue.result;
          }
          if (key) rowData[key] = cellValue;
        });
        importedData.push(rowData);
      }
    });

    console.log(`📥 กำลังนำเข้าตารางเรียน ${importedData.length} รายการ`);

    // --- STEP 1: หา ID ล่าสุด ---
    let currentIdNum = 0;
    const lastIdResult = await pool.query(
      `SELECT schedule_id FROM public."Schedules" ORDER BY schedule_id DESC LIMIT 1`
    );

    if (lastIdResult.rows.length > 0) {
      const lastId = lastIdResult.rows[0].schedule_id;
      const numPart = lastId.replace('schedule', ''); 
      currentIdNum = parseInt(numPart, 10); 
      if (isNaN(currentIdNum)) currentIdNum = 0;
    }

    // --- STEP 2: วนลูปตรวจสอบข้อมูล ---
    const validData = []; 
    const errors = [];
    let successCount = 0;

    for (const [index, row] of importedData.entries()) {
      try {
        const roomId = row.room_id ? String(row.room_id).trim() : null;
        const subjectName = row.subject_name ? String(row.subject_name).trim() : "";
        const teacherName = row.teacher_name ? String(row.teacher_name).trim() : "";
        const semesterId = row.semester_id ? String(row.semester_id).trim() : "";
        
        // แปลงค่าวันที่และเวลา
        const startTime = formatExcelData(row.start_time, 'time'); 
        const endTime = formatExcelData(row.end_time, 'time');
        const scheduleDate = formatExcelData(row.date, 'date'); 

        if (!roomId || !semesterId || !scheduleDate) {
           throw new Error('ข้อมูลไม่ครบ (ต้องมี room_id, semester_id, date)');
        }

        // 🛑 CHECK 1: ตรวจสอบการชนกับ "ตารางเรียนที่มีอยู่แล้ว"
        const scheduleConflictCheck = await pool.query(
            `SELECT schedule_id, subject_name, start_time, end_time
             FROM public."Schedules"
             WHERE room_id = $1
             AND date = $2
             AND (start_time < $4 AND end_time > $3)`,
            [roomId, scheduleDate, startTime, endTime]
        );

        if (scheduleConflictCheck.rows.length > 0) {
            const conflict = scheduleConflictCheck.rows[0];
            throw new Error(
                `เวลาชนกับวิชาที่มีอยู่แล้ว: ${conflict.subject_name} (${conflict.start_time}-${conflict.end_time})`
            );
        }

        // 🛑 CHECK 2: ตรวจสอบการชนกับ "ตารางการจอง"
        const bookingConflictCheck = await pool.query(
            `SELECT booking_id, purpose, start_time, end_time 
             FROM public."Booking" 
             WHERE room_id = $1 
             AND date = $2 
             AND status NOT IN ('cancelled', 'rejected') 
             AND (start_time < $4 AND end_time > $3)`, 
            [roomId, scheduleDate, startTime, endTime]
        );

        if (bookingConflictCheck.rows.length > 0) {
            const conflict = bookingConflictCheck.rows[0];
            throw new Error(
                `เวลาชนกับการจอง ID: ${conflict.booking_id} (${conflict.purpose} ${conflict.start_time}-${conflict.end_time})`
            );
        }

        // --- ถ้าไม่ชนใครเลย ก็ทำต่อ ---
        
        // ✅✅✅ แก้ไขจุดที่ 2: ลบ Loop ซ้อน Loop ออก และ push ใส่ validData ตรงๆ
        validData.push({
            // สร้าง ID จำลองส่งไปให้ Frontend ดูด้วยก็ได้ (Optional)
            temp_id: index + 1, 
            room_id: roomId,
            subject_name: subjectName,
            teacher_name: teacherName,
            start_time: startTime,
            end_time: endTime,
            semester_id: semesterId,
            date: scheduleDate
        });
        
        successCount++;

      } catch (err) {
        console.error(`❌ Error row ${index + 2}:`, err.message);

        let errorType = 'UNKNOWN';
        if (err.message.includes('ชนกับ')) {
            errorType = 'COLLISION'; 
        } else if (err.message.includes('ข้อมูลไม่ครบ')) {
            errorType = 'INVALID_DATA';
        }

        errors.push({ 
          row: index + 2, 
          room: row.room_id || 'ไม่ระบุ', 
          type: errorType,
          message: err.message 
        });
      }
    }

    // ✅✅✅ จุดที่ 3: ส่ง Response (ตอนนี้รู้จัก validData และ errors แล้ว)
    res.json({
        message: 'ตรวจสอบไฟล์เรียบร้อย (ยังไม่ได้บันทึก)',
        total: importedData.length,
        valid_count: validData.length,
        error_count: errors.length,
        previewData: validData, 
        errors: errors.length > 0 ? errors : undefined
    });

  } catch (error) {
    console.error('Import Error:', error);
    res.status(500).json({ message: 'เกิดข้อผิดพลาดในการนำเข้าข้อมูล' });
  }
};

export const confirmSchedules = async (req, res) => {
  // รับข้อมูลเป็น Array จาก Frontend
  // body: { schedules: [ { room_id: '...', ... }, { ... } ] }
  const { schedules } = req.body;

  if (!schedules || schedules.length === 0) {
    return res.status(400).json({ message: 'ไม่มีข้อมูลที่จะบันทึก' });
  }

  const client = await pool.connect(); // ใช้ Client เพื่อทำ Transaction (ปลอดภัยกว่า)

  try {
    await client.query('BEGIN'); // เริ่ม Transaction (ถ้าพัง ให้ยกเลิกทั้งหมด)

    // 1. หา ID ล่าสุดใน DB ก่อน
    let currentIdNum = 0;
    const lastIdResult = await client.query(
      `SELECT schedule_id FROM public."Schedules" ORDER BY schedule_id DESC LIMIT 1`
    );

    if (lastIdResult.rows.length > 0) {
      const lastId = lastIdResult.rows[0].schedule_id;
      const numPart = lastId.replace('schedule', '');
      currentIdNum = parseInt(numPart, 10);
      if (isNaN(currentIdNum)) currentIdNum = 0;
    }

    console.log(`💾 กำลังบันทึก ${schedules.length} รายการ... เริ่มต้นที่ ID: ${currentIdNum}`);

    // 2. วนลูปบันทึกข้อมูลทีละแถว
    for (const schedule of schedules) {
      // เรียกใช้ฟังก์ชัน insert ที่เราแยกไว้
      // และอัปเดต currentIdNum ไปเรื่อยๆ
      currentIdNum = await insertScheduleToDB(client, schedule, currentIdNum);
    }

    await client.query('COMMIT'); // ✅ บันทึกจริงเมื่อทำครบทุกรายการ
    
    res.json({ 
      message: 'บันทึกข้อมูลทั้งหมดสำเร็จ', 
      totalSaved: schedules.length 
    });

  } catch (error) {
    await client.query('ROLLBACK'); // ❌ ถ้ารายการไหนพัง ให้ยกเลิกทั้งหมด!
    console.error('Save Error:', error);
    res.status(500).json({ message: 'เกิดข้อผิดพลาดในการบันทึกข้อมูล', error: error.message });
  } finally {
    client.release(); // คืน Connection
  }
};

const insertScheduleToDB = async (client, data, currentIdNum) => {
  // Generate ID ใหม่ (รับค่าตัวเลขล่าสุดมา + 1)
  const nextIdNum = currentIdNum + 1;
  const nextScheduleId = `schedule${String(nextIdNum).padStart(3, '0')}`;

  await client.query(
    `INSERT INTO public."Schedules" 
     (schedule_id, room_id, subject_name, teacher_name, start_time, end_time, semester_id, date)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
    [
      nextScheduleId,
      data.room_id,
      data.subject_name,
      data.teacher_name,
      data.start_time,
      data.end_time,
      data.semester_id,
      data.date
    ]
  );

  return nextIdNum; // ส่งค่าตัวเลขล่าสุดกลับไป เพื่อให้รอบต่อไปนับต่อได้
};

// /schedule/:room_id
// ดึงรายการการจองห้องที่มาจาก Excel table
export const getSchedule = async (req, res) => {
  try {
    const { room_id } = req.params;
    const { semester_id } = req.query;

    let sql = `
      SELECT 
        schedule_id, 
        room_id, 
        subject_name, 
        teacher_name, 
        start_time, 
        end_time, 
        semester_id, 
        date,
        temporarily_closed,  -- ✅ 1. ต้อง SELECT ออกมาด้วย
        teacher_id           -- (แถม) ควรดึงออกมาด้วย เพื่อให้ Frontend เช็คสิทธิ์ได้
      FROM public."Schedules"
      WHERE room_id = $1
    `;
    
    const params = [room_id];

    if (semester_id) {
      sql += ` AND semester_id = $2`;
      params.push(semester_id);
    }

    sql += ` ORDER BY date ASC, start_time ASC`;

    const result = await pool.query(sql, params);

    const formattedSchedules = result.rows.map(row => {
      // ✅ 2. วิธีเรียกใช้ที่ถูกต้องคือ row.temporarily_closed
      // ถ้าค่าเป็น null ให้ถือว่าเป็น false (ไม่ได้งด)
      const isClosed = row.temporarily_closed === true; 

      return {
        ...row,
        start_time: String(row.start_time).substring(0, 5),
        end_time: String(row.end_time).substring(0, 5),
        temporarily_closed: isClosed, // ส่งค่า boolean กลับไปให้ Frontend
        
        // (Optional) เพิ่มข้อความสถานะให้ Frontend ใช้ง่ายๆ
        status_text: isClosed ? 'งดคลาส' : 'เรียนปกติ'
      };
    });

    res.json({
      room_id,
      semester: semester_id || 'All',
      total: result.rowCount,
      schedules: formattedSchedules
    });

  } catch (error) {
    console.error('Get Schedule Error:', error);
    res.status(500).json({ message: 'เกิดข้อผิดพลาดในการดึงตารางเรียน' });
  }
};
// // PATCH /schedules/:id/status
// ฟังก์ชันเปลี่ยนสถานะงดใช้ห้อง 
export const updateScheduleStatus = async (req, res) => {
  const { id } = req.params; // รับ schedule_id
  const { temporarily_closed } = req.body;

  
  // ✅ ดึง user_id และ role จาก Token (ที่ผ่าน Middleware มา)
  // user_id นี้คือ ID ของคนที่กำลังกดปุ่มอยู่ตอนนี้
  const { user_id, role } = req.user;

    console.log("user_id : ", user_id);

  // ตรวจสอบ Input
  if (typeof temporarily_closed !== 'boolean') {
    return res.status(400).json({ message: 'ข้อมูลไม่ถูกต้อง (ต้องเป็น true หรือ false)' });
  }

  try {
    // -----------------------------------------------------------
    // 🛡️ สร้าง Query แบบ Dynamic (แยก Logic ตาม Role)
    // -----------------------------------------------------------
    
    let sql = `UPDATE public."Schedules"
               SET temporarily_closed = $1
               WHERE schedule_id = $2`;
    
    const params = [temporarily_closed, id];

    // 🔒 กฎ: ถ้า "ไม่ใช่ Admin" ต้องเช็คว่า teacher_id ตรงกับ user_id ไหม
    // (สมมติว่าในตาราง Schedules มีคอลัมน์ชื่อ teacher_id นะครับ)
    if (role !== 'staff') {
        sql += ` AND teacher_id = $3`; 
        params.push(user_id);
    }

    sql += ` RETURNING schedule_id, subject_name, temporarily_closed`;

    // -----------------------------------------------------------
    // 🚀 ยิง Database
    // -----------------------------------------------------------
    const result = await pool.query(sql, params);

    // ถ้าไม่เจอผลลัพธ์ (row = 0) เป็นไปได้ 2 กรณี:
    // 1. ไม่มี ID นี้จริง
    // 2. มี ID นี้จริง แต่ user_id ไม่ตรง (โดน AND teacher_id = ... ดักไว้)
    if (result.rows.length === 0) {
      return res.status(403).json({ 
          message: 'ไม่พบข้อมูล หรือ คุณไม่มีสิทธิ์แก้ไขตารางเรียนนี้' 
      });
    }

    const updatedSchedule = result.rows[0];
    const statusText = temporarily_closed ? 'งดใช้ห้อง (Closed)' : 'ใช้งานปกติ (Active)';

    res.json({
      message: `อัปเดตสถานะสำเร็จ: ${statusText}`,
      schedule: updatedSchedule
    });

  } catch (error) {
    console.error('Update Schedule Status Error:', error);
    res.status(500).json({ message: 'เกิดข้อผิดพลาดในการอัปเดตสถานะ' });
  }
};