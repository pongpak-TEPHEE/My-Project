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

// Helper Function: จัดการเรื่องวันที่และเวลา, ExcelJS มักจะ return Date Object มาเลย แต่เราเขียนเผื่อไว้ (ยังไม่เปิดใช้)
// function parseExcelDate(value, type = 'date') {
//     if (!value) return null;

//     // กรณี 1: ExcelJS ส่งมาเป็น Date Object อยู่แล้ว (ดีที่สุด)
//     if (value instanceof Date) {
//         if (type === 'time') {
//             // ดึงเฉพาะเวลา HH:mm:ss
//             return value.toTimeString().split(' ')[0];
//         } else {
//             // ดึงเฉพาะวันที่ YYYY-MM-DD (แก้เรื่อง Timezone Offset เบื้องต้น)
//             const year = value.getFullYear();
//             const month = String(value.getMonth() + 1).padStart(2, '0');
//             const day = String(value.getDate()).padStart(2, '0');
//             return `${year}-${month}-${day}`;
//         }
//     }

//     // กรณี 2: เป็น String (เช่น "10:30" หรือ "2023-12-01")
//     return String(value).trim();
// }

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

    console.log(`📥 ได้รับข้อมูลต้นแบบ ${importedData.length} รายการ (จะถูกขยายเป็น 15 สัปดาห์)`);

    // --- STEP 1: หา ID ล่าสุด ---
    // (Logic ส่วนนี้อาจจะไม่ได้ใช้จริงตอน Preview แต่คงไว้ตามโครงเดิม)
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

    // --- STEP 2: วนลูปตรวจสอบข้อมูล (แบบ 15 สัปดาห์) ---
    const validData = []; 
    const errors = [];
    let successCount = 0; // นับจำนวนคาบที่สร้างได้จริง (ไม่ใช่จำนวนแถว Excel)

    // Loop 1: วนตามแถวใน Excel (รายวิชา)
    for (const [index, row] of importedData.entries()) {
        
        // ดึงข้อมูลพื้นฐาน (ที่ไม่เปลี่ยนตามสัปดาห์)
        const roomId = row.room_id ? String(row.room_id).trim() : null;
        const subjectName = row.subject_name ? String(row.subject_name).trim() : "";
        const teacherName = row.teacher_name ? String(row.teacher_name).trim() : "";
        const semesterId = row.semester_id ? String(row.semester_id).trim() : "";
        const teacherId = row.user_id ? String(row.user_id).trim() : "";
        
        // เวลาเริ่ม-จบ (เหมือนเดิมทุกสัปดาห์)
        const startTime = formatExcelData(row.start_time, 'time'); 
        const endTime = formatExcelData(row.end_time, 'time');
        
        // วันที่เริ่มต้น (First Date)
        const firstDateRaw = formatExcelData(row.date, 'date'); // ต้องได้ Format 'YYYY-MM-DD'

        // Validation ตรวจสอบ ข้อมูล room id, semester id, first dae raw ว่ามีข้อมูลไหมในแต่ละ rows
        if (!roomId || !semesterId || !firstDateRaw) {
             errors.push({ 
                row: index + 2, // ไปที่ row ทัดไป
                room: roomId || 'ไม่ระบุ', 
                type: 'INVALID_DATA',
                message: 'ข้อมูลไม่ครบ (ต้องมี room_id, semester_id, date)' 
            });
            continue; // ข้ามแถวนี้ไปเลยถ้าข้อมูลหลักไม่ครบ
        }

        // แปลง firstDateRaw เป็น Object Date เพื่อคำนวณ
        const baseDateObj = new Date(firstDateRaw); // สร้าง วันเริ่มต้นก่อนจะวลลูป

        // ✅ Loop 2: วนลูป 15 สัปดาห์ (Week 1 - Week 15)
        for (let week = 0; week < 15; week++) {
            try {
                // คำนวณวันที่ของสัปดาห์ที่ week
                // สูตร: วันที่ฐาน + (จำนวนสัปดาห์ * 7 วัน)
                const targetDateObj = new Date(baseDateObj);
                targetDateObj.setDate(baseDateObj.getDate() + (week * 7));
                // แปลงกลับเป็น String 'YYYY-MM-DD' เพื่อใช้กับ Database
                const targetDate = targetDateObj.toISOString().split('T')[0];

                // 🛑 CHECK 1: ตรวจสอบการชนกับ "ตารางเรียนที่มีอยู่แล้ว"
                const scheduleConflictCheck = await pool.query(
                    `SELECT schedule_id, subject_name, start_time, end_time
                     FROM public."Schedules"
                     WHERE room_id = $1
                     AND date = $2
                     AND (start_time < $4 AND end_time > $3)`,
                    [roomId, targetDate, startTime, endTime]
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
                    [roomId, targetDate, startTime, endTime]
                );

                if (bookingConflictCheck.rows.length > 0) {
                    const conflict = bookingConflictCheck.rows[0];
                    throw new Error(
                        `เวลาชนกับการจอง ID: ${conflict.booking_id} (${conflict.purpose} ${conflict.start_time}-${conflict.end_time})`
                    );
                }

                // --- ถ้าไม่ชนใครเลย ---
                validData.push({
                    temp_id: `${index + 1}_w${week + 1}`, // สร้าง ID ปลอม เช่น 1_w1, 1_w2
                    week_number: week + 1, // บอกว่าเป็นสัปดาห์ที่เท่าไหร่
                    room_id: roomId,
                    subject_name: subjectName,
                    teacher_name: teacherName,
                    start_time: startTime,
                    end_time: endTime,
                    semester_id: semesterId,
                    teacher_id: teacherId,
                    date: targetDate // ใช้วันที่ที่คำนวณใหม่
                });

                successCount++;

            } catch (err) {
                // เก็บ Error โดยระบุด้วยว่าเป็นของสัปดาห์ไหน
                // วันที่ error อาจจะ format ให้สวยงามหน่อย
                const targetDateObj = new Date(baseDateObj);
                targetDateObj.setDate(baseDateObj.getDate() + (week * 7));
                const dateStr = targetDateObj.toISOString().split('T')[0];

                let errorType = 'UNKNOWN';
                if (err.message.includes('ชนกับ')) errorType = 'COLLISION';
                else if (err.message.includes('ข้อมูลไม่ครบ')) errorType = 'INVALID_DATA';

                errors.push({ 
                    row: index + 2, 
                    week: week + 1,
                    date: dateStr,
                    room: roomId, 
                    type: errorType,
                    message: `(Week ${week + 1}: ${dateStr}) ${err.message}` 
                });
            }
        } // End Inner Loop (15 Weeks)
    } // End Outer Loop (Excel Rows)

    // ส่ง Response
    res.json({
        message: 'ตรวจสอบไฟล์เรียบร้อย (Generate 15 สัปดาห์)',
        total_rows_excel: importedData.length,
        total_generated_slots: successCount + errors.length, // จำนวนทั้งหมดที่พยายามสร้าง
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

// /schedules/confirm
// สาเหตุการที่ต้องมีการ confirm เพราะก่อนที่จะเอาข้อมูลลง database ต้องตรวจดูว่ามีการชนกับข้อมูลการจองอื่นๆไหม รับไๆด้ไหมก่อนจะเอาเข้าฐานข้อมูล
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

// เมื่อมีการ confirm จะนำข้อมูลส่วนอื่นที่ไม่ซ้ำนำเข้า database
const insertScheduleToDB = async (client, data, currentIdNum) => {
  // Generate ID ใหม่ (รับค่าตัวเลขล่าสุดมา + 1)
  const nextIdNum = currentIdNum + 1;
  const nextScheduleId = `schedule${String(nextIdNum).padStart(3, '0')}`;

  await client.query(
    `INSERT INTO public."Schedules" 
     (schedule_id, room_id, subject_name, teacher_name, start_time, end_time, semester_id, date, teacher_id)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
    [
      nextScheduleId,
      data.room_id,
      data.subject_name,
      data.teacher_name,
      data.start_time,
      data.end_time,
      data.semester_id,
      data.date,
      data.teacher_id
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


export const getAllSchedules = async (req, res) => {
  try {
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
        temporarily_closed, 
        teacher_id
      FROM public."Schedules"
    `;
    
    const params = [];

    if (semester_id) {
      sql += ` WHERE semester_id = $1`;
      params.push(semester_id);
    }

    // เรียงลำดับ: วันที่ -> เวลาเริ่ม -> ห้อง
    sql += ` ORDER BY date ASC, start_time ASC, room_id ASC`;

    const result = await pool.query(sql, params);

    // จัด Format ข้อมูล (Logic เดียวกับ getSchedule เดิม)
    const formattedSchedules = result.rows.map(row => {
      const isClosed = row.temporarily_closed === true; 

      return {
        ...row,
        start_time: String(row.start_time).substring(0, 5),
        end_time: String(row.end_time).substring(0, 5),
        temporarily_closed: isClosed,
        status_text: isClosed ? 'งดคลาส' : 'เรียนปกติ'
      };
    });

    res.json({
      message: 'ดึงข้อมูลตารางเรียนทั้งหมดสำเร็จ',
      semester: semester_id || 'All',
      total: result.rowCount,
      schedules: formattedSchedules
    });

  } catch (error) {
    console.error('Get All Schedules Error:', error);
    res.status(500).json({ message: 'เกิดข้อผิดพลาดในการดึงข้อมูลทั้งหมด' });
  }
};

// // PATCH /schedules/:id/status
// ฟังก์ชันเปลี่ยนสถานะงดใช้ห้อง 
export const updateScheduleStatus = async (req, res) => {
  const { id } = req.params; // รับ schedule_id
  const { temporarily_closed } = req.body;

  // ดึง user_id และ role จาก Token
  // user_id นี้คือ ID ของคนที่กำลังกดปุ่มอยู่ตอนนี้
  const { user_id, role } = req.user;


  console.log("user_id : ", user_id);
  console.log("user_id : ", role);

  // ตรวจสอบ Input
  if (typeof temporarily_closed !== 'boolean') {
    return res.status(400).json({ message: 'ข้อมูลไม่ถูกต้อง (ต้องเป็น true หรือ false)' });
  }

  try {
    // สร้าง Query แบบ Dynamic (แยก Logic ตาม Role)
    
    let sql = `UPDATE public."Schedules"
               SET temporarily_closed = $1
               WHERE schedule_id = $2`;
    
    const params = [temporarily_closed, id];

    // 🔒 กฎ: ถ้า "ไม่ใช่ Admin" ต้องเช็คว่า teacher_id ตรงกับ user_id ไหม
    // (สมมติว่าในตาราง Schedules มีคอลัมน์ชื่อ teacher_id นะครับ)
    if (role.toLowerCase().trim() !== 'staff') {
        sql += ` AND teacher_id = $3`; 
        params.push(user_id);
    }

    sql += ` RETURNING schedule_id, subject_name, temporarily_closed`;

    const result = await pool.query(sql, params);

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


