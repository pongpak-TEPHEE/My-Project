import { pool } from '../config/db.js';
import ExcelJS from 'exceljs';
import crypto from 'crypto';
import { sendScheduleBookingCancelledEmail, sendScheduleReclaimCancelledEmail, sendBookingCancelledEmail, sendScheduleEditConflictEmail } from '../services/mailer.js';

// ฟังก์ชันสำหรับ Import Excel ลง Table
const formatExcelData = (value, type = 'time') => {
  if (!value) return null;

  // กรณี 1: ExcelJS อ่านมาเป็น Date Object
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

  // กรณี 2: มาเป็นตัวเลขทศนิยม (Logic เดิม)
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

  // กรณี 3: มาเป็น String
  return String(value).trim();
};

const emailCooldowns = new Map();

// /schedule/import 
// อัพโหลดข้อมูล file 
// มีการป้องกันการชนกันของข้อมูลการจองภายใน file โดยจะมีข้อความแจ้งว่าชนกับห้องไหนบ้าง
export const importClassSchedules = async (req, res) => {

  // 🚨 เติม 3 บรรทัดนี้เข้าไป เพื่อดูว่ามีอะไรส่งมาถึง Backend บ้าง
  console.log("--- DEBUG UPLOAD ---");
  console.log("req.body: ", req.body);
  console.log("req.file: ", req.file);
  
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'กรุณาอัปโหลดไฟล์ Excel' });
    }

    // ========================================================
    // 📅 STEP 0: ดึงข้อมูลวันเริ่มเทอมต้น (first) เพื่อนำมาเป็นฐานการคำนวณ
    // ========================================================
    const termResult = await pool.query(
      `SELECT TO_CHAR(start_date, 'YYYY-MM-DD') AS start_date FROM public."Terms" WHERE term = 'first' LIMIT 1`
    );

    if (termResult.rowCount === 0 || !termResult.rows[0].start_date) {
      return res.status(400).json({ 
        message: 'ไม่พบข้อมูลวันเริ่มเทอมต้นในระบบ กรุณาตั้งค่าวันเปิดเทอมก่อนนำเข้าตารางเรียน' 
      });
    }

    const termStartDateStr = termResult.rows[0].start_date;
    const baseTermDate = new Date(termStartDateStr);

    // Map วันในสัปดาห์ เพื่อใช้บวกจำนวนวัน (M = +0, Tu = +1, ...)
    const dayOffsets = {
      'm': 0, 'tu': 1, 'w': 2, 'th': 3, 'f': 4, 'sa': 5, 'su': 6
    };

    // ========================================================
    // 📊 STEP 1: อ่านไฟล์ Excel และ Map ข้อมูล
    // ========================================================
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(req.file.buffer);
    
    const worksheet = workbook.getWorksheet(1);
    
    if (!worksheet) {
       return res.status(400).json({ message: 'ไม่พบข้อมูล Worksheet ในไฟล์' });
    }

    const importedData = [];
    let headers = {};

    worksheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) {
        row.eachCell((cell, colNumber) => {
          // เก็บชื่อคอลัมน์ภาษาไทยเป็น Key
          headers[colNumber] = cell.value ? String(cell.value).trim() : ''; 
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

    console.log(`📥 ได้รับข้อมูลต้นแบบ ${importedData.length} รายการ (จะถูกขยายเป็นสัปดาห์)`);

    // ========================================================
    // 🔍 STEP 2: เตรียมข้อมูล Users สำหรับตรวจสอบอาจารย์
    // ========================================================
    const getFullNameKey = (name, surname) => {
      const n = name ? String(name).trim() : "";
      const s = surname ? String(surname).trim() : "";
      return `${n} ${s}`.trim(); 
    };

    const usersResult = await pool.query(`SELECT user_id, name, surname FROM public."Users"`);
    const userMap = new Map();

    usersResult.rows.forEach(user => {
        const key = getFullNameKey(user.name, user.surname);
        if (key) { 
            userMap.set(key, user.user_id);
        }
    });

    const validData = []; 
    const errors = [];
    let successCount = 0; 
    const dateCreate = new Date().toISOString(); 

    // ========================================================
    // 🔄 STEP 3: วนลูปตรวจสอบข้อมูลและขยายจำนวนสัปดาห์
    // ========================================================
    for (const [index, row] of importedData.entries()) {
        
        // Mapping หัวคอลัมน์ภาษาไทย
        const roomId = row['หมายเลขห้อง'] ? String(row['หมายเลขห้อง']).trim() : null;
        const courseCode = row['รหัสวิชา'] ? String(row['รหัสวิชา']).trim() : "";
        const subjectName = row['ชื่อวิชา'] ? String(row['ชื่อวิชา']).trim() : "";
        const teacherName = row['ชื่อ'] ? String(row['ชื่อ']).trim() : "";
        const teacherSurname = row['นามสกุล'] ? String(row['นามสกุล']).trim() : "";
        const repeatStr = row['จำนวนสัปดาห์'];
        const scheduleStr = row['วันที่'] ? String(row['วันที่']).trim() : "";
        
        // ดึงข้อมูลเดิมมาเสริม (ถ้ามีใน Excel)
        const sec = row['sec'] ? String(row['sec']).trim() : "";
        const department = row['department'] ? String(row['department']).trim() : "";
        const studyYear = row['study_year'] ? String(row['study_year']).trim() : "";
        const programType = row['program_type'] ? String(row['program_type']).trim() : "";

        const teacherId = userMap.get(`${teacherName} ${teacherSurname}`);
        
        let repeatCount = repeatStr ? parseInt(repeatStr) : 15; 
        if (isNaN(repeatCount) || repeatCount < 1) repeatCount = 1;

        // ระบบแยกส่วนรูปแบบวันที่ M-8-10
        let startTime = "";
        let endTime = "";
        let firstDateRaw = "";

        if (scheduleStr) {
          const parts = scheduleStr.split('-');
          if (parts.length === 3) {
            const dayCode = parts[0].trim().toLowerCase(); // m, tu, w...
            const startHr = parts[1].trim(); // 8
            const endHr = parts[2].trim(); // 10

            const offset = dayOffsets[dayCode];
            
            if (offset !== undefined) {
              // คำนวณวันที่เริ่มต้น
              const firstDateObj = new Date(baseTermDate);
              firstDateObj.setDate(baseTermDate.getDate() + offset);
              firstDateRaw = firstDateObj.toISOString().split('T')[0];

              // แปลงเวลาให้เป็น 00:00:00
              startTime = `${startHr.padStart(2, '0')}:00:00`;
              endTime = `${endHr.padStart(2, '0')}:00:00`;
            }
          }
        }

        // Validation 1: ข้อมูลพื้นฐาน 
        if (!roomId || !firstDateRaw || !startTime || !endTime) {
             errors.push({ 
                row: index + 2,
                room: roomId || 'ไม่ระบุ', 
                type: 'INVALID_DATA',
                message: `รูปแบบข้อมูลไม่ถูกต้อง ตรวจสอบหมายเลขห้อง หรือ รูปแบบวันที่ (เช่น M-8-10) [ข้อมูลที่ได้: ${scheduleStr}]` 
            });
            continue;
        }
        
        // Validation 2: ข้อมูลอาจารย์
        if (!teacherId) {
            errors.push({ 
                row: index + 2,
                room: roomId, 
                type: 'TEACHER_NOT_FOUND',
                message: `ไม่พบข้อมูลอาจารย์ชื่อ: '${teacherName} ${teacherSurname}' ในระบบ (กรุณาตรวจสอบการสะกดคำ)` 
            });
            continue;
        }

        const baseDateObj = new Date(firstDateRaw);

        for (let week = 0; week < repeatCount; week++) {
            try {
                const targetDateObj = new Date(baseDateObj);
                targetDateObj.setDate(baseDateObj.getDate() + (week * 7));
                const targetDate = targetDateObj.toISOString().split('T')[0];
                
                // CHECK 1: ตรวจสอบการชนกับ "ตารางเรียนที่มีอยู่แล้ว"
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

                // CHECK 2: ตรวจสอบการชนกับ "ตารางการจอง"
                const bookingConflictCheck = await pool.query(
                    `SELECT 
                        b.booking_id, 
                        b.purpose, 
                        b.start_time, 
                        b.end_time, 
                        u.email, 
                        u.name, 
                        u.surname
                     FROM public."Booking" b
                     LEFT JOIN public."Users" u ON b.user_id = u.user_id
                     WHERE b.room_id = $1 
                     AND b.date = $2 
                     AND b.status IN ('pending', 'approved') 
                     AND (b.start_time < $4 AND b.end_time > $3)`, 
                    [roomId, targetDate, startTime, endTime]
                );

                if (bookingConflictCheck.rows.length > 0) {
                    const todayStr = new Date().toISOString().split('T')[0];

                    if (targetDate >= todayStr) {
                        for (const conflict of bookingConflictCheck.rows) {
                            await pool.query(
                                `UPDATE public."Booking" 
                                 SET status = 'cancelled',
                                     cancel_reason = 'ยกเลิกอัตโนมัติเนื่องจากชนกับตารางเรียนวิชา ${subjectName}'
                                 WHERE booking_id = $1`,
                                [conflict.booking_id]
                            );

                            const toEmail = conflict.email;
                            const userName = `${conflict.name || ''} ${conflict.surname || ''}`.trim();
                            const formattedDate = targetDate.split('-').reverse().join('/'); 
                            const timeSlotStr = `${conflict.start_time.slice(0, 5)} - ${conflict.end_time.slice(0, 5)}`;

                            const cooldownKey = `booking_cancel_conflict_${conflict.booking_id}`; 
                            const COOLDOWN_MINUTES = 5; 
                            let shouldSendEmail = true;

                            if (typeof emailCooldowns !== 'undefined' && emailCooldowns.has(cooldownKey)) {
                                const lastSentTime = emailCooldowns.get(cooldownKey);
                                const diffMinutes = (Date.now() - lastSentTime) / (1000 * 60);

                                if (diffMinutes < COOLDOWN_MINUTES) {
                                    shouldSendEmail = false;
                                    console.log(`⏳ [Rate Limit] ข้ามการส่งเมลยกเลิกอัตโนมัติให้ ${toEmail}`);
                                }
                            }
                            
                            if (toEmail && shouldSendEmail) {
                              if (typeof emailCooldowns !== 'undefined') {
                                emailCooldowns.set(cooldownKey, Date.now());
                              }

                              sendScheduleBookingCancelledEmail(
                                  toEmail, 
                                  userName, 
                                  roomId, 
                                  formattedDate, 
                                  timeSlotStr, 
                                  subjectName
                              );
                              
                              console.log(`สั่งส่งอีเมลแจ้งยกเลิก Booking ID: ${conflict.booking_id} ไปที่ ${toEmail} เรียบร้อยแล้ว`);
                            }
                            console.log(`ยกเลิก Booking ID: ${conflict.booking_id} อัตโนมัติ เนื่องจากชนตารางเรียนวิชา ${subjectName}`);
                          }
                        }
                    }
                    
              // เพิ่มข้อมูลลง validData (ไม่มี uniqueSchedules แล้ว)
              validData.push({
                  temp_id: `${index + 1}_w${week + 1}`,
                  week_number: week + 1,
                  room_id: roomId,
                  course_code: courseCode, 
                  subject_name: subjectName,
                  teacher_name: teacherName,
                  teacher_surname: teacherSurname,
                  start_time: startTime,
                  end_time: endTime,
                  temporarily_closed: false,
                  user_id: teacherId,
                  date: targetDate,
                  sec: sec,
                  dateCreate: dateCreate,
                  department: department,
                  study_year: studyYear,        
                  program_type: programType     
              });
              successCount++;
            } catch (err) {
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
        } // End Inner Loop
    }

    // ส่ง Response
    res.json({
        message: 'ตรวจสอบไฟล์เรียบร้อย',
        total_rows_excel: importedData.length,
        total_generated_slots: successCount + errors.length,
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
// สาเหตุการที่ต้องมีการ confirm เพราะก่อนที่จะเอาข้อมูลลง database ต้องตรวจดูว่ามีการชนกับข้อมูลการจองอื่นๆไหม 
export const confirmSchedules = async (req, res) => {
  // รับข้อมูลเป็น Array จาก Frontend
  const { schedules } = req.body;

  if (!schedules || schedules.length === 0) {
    return res.status(400).json({ message: 'ไม่มีข้อมูลที่จะบันทึก' });
  }

  const client = await pool.connect(); 

  try {
    await client.query('BEGIN'); // 🚦 เริ่ม Transaction 

    console.log(`💾 กำลังบันทึกข้อมูลตารางเรียนชุดใหม่จำนวน ${schedules.length} รายการ...`);

    // 🚨 เตรียมคำสั่งบันทึกข้อมูล (เพิ่ม course_code เข้าไปแล้ว)
    const insertScheduleQuery = `
      INSERT INTO public."Schedules" 
      (schedule_id, room_id, course_code, subject_name, teacher_name, teacher_surname, start_time, end_time, date, temporarily_closed, user_id, sec)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
    `;

    // วนลูปบันทึกทีละแถว 
    for (const schedule of schedules) {
      const scheduleId = crypto.randomUUID(); // ป้องกันรหัสซ้ำ 100%
      const values = [
        scheduleId,
        schedule.room_id,
        schedule.course_code,     // นำ course_code มาใช้งาน
        schedule.subject_name,
        schedule.teacher_name,
        schedule.teacher_surname,
        schedule.start_time,
        schedule.end_time,
        schedule.date,
        schedule.temporarily_closed || false,
        schedule.user_id,
        schedule.sec
      ];
      await client.query(insertScheduleQuery, values); 
    }

    await client.query('COMMIT'); // ✅ บันทึกจริงลง Database
    
    res.json({ 
      success: true, 
      message: 'บันทึกข้อมูลทั้งหมดสำเร็จ', 
      totalSaved: schedules.length 
    });

  } catch (error) {
    await client.query('ROLLBACK'); // ❌ ถ้ารายการไหนพัง หรือ Error ให้ยกเลิกการบันทึกทั้งหมด!
    console.error('Confirm Save Error:', error);
    res.status(500).json({ message: 'เกิดข้อผิดพลาดในการบันทึกข้อมูล', error: error.message });
  } finally {
    client.release(); // คืน Connection เสมอ
  }
};


// เมื่อมีการ confirm จะนำข้อมูลส่วนอื่นที่ไม่ซ้ำนำเข้า database
const insertScheduleToDB = async (client, data) => {
  // ใช้ UUID เพื่อป้องกันรหัสซ้ำ 100% 
  const scheduleId = crypto.randomUUID(); 

  // 🚨 ถอด unique_schedules ออกจากคำสั่ง INSERT ลงตาราง Schedules
  // 🚨 มี course_code ตามที่เราปรับแก้กันก่อนหน้านี้ และลดจำนวน $ เหลือ 12 ตัว
  await client.query(
    `INSERT INTO public."Schedules" 
     (schedule_id, room_id, course_code, subject_name, teacher_name, teacher_surname, start_time, end_time, date, temporarily_closed, user_id, sec)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
    [
      scheduleId,               // $1
      data.room_id,             // $2
      data.course_code,         // $3
      data.subject_name,        // $4
      data.teacher_name,        // $5
      data.teacher_surname,     // $6
      data.start_time,          // $7
      data.end_time,            // $8
      data.date,                // $9
      data.temporarily_closed,  // $10
      data.user_id,             // $11
      data.sec                  // $12
    ]
  );
};

// /schedule/:room_id
// ดึงรายการตารางเรียนของห้องนั้นๆ 
export const getSchedule = async (req, res) => {
  try {
    const { room_id } = req.params;
    let sql = `
      SELECT 
        schedule_id, 
        room_id, 
        subject_name, 
        teacher_name,
        teacher_surname,
        start_time,
        end_time, 
        date,
        temporarily_closed,
        user_id
      FROM public."Schedules"
      WHERE room_id = $1
      ORDER BY date ASC, start_time ASC
    `;
    
    const params = [room_id];
    
    const result = await pool.query(sql, params);

    const formattedSchedules = result.rows.map(row => {
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
      total: result.rowCount, // 🗑️ เอาการส่งกลับ semester ออก
      schedules: formattedSchedules
    });

  } catch (error) {
    console.error('Get Schedule Error:', error);
    res.status(500).json({ message: 'เกิดข้อผิดพลาดในการดึงตารางเรียน' });
  }
};


export const getAllSchedules = async (req, res) => {
  try {
    const sql = `
      SELECT 
        schedule_id, 
        room_id,
        subject_name, 
        teacher_name,
        teacher_surname,
        start_time, 
        end_time, 
        date,
        temporarily_closed, 
        user_id
      FROM public."Schedules"
      ORDER BY date ASC, start_time ASC, room_id ASC
    `;
    
    // ไม่ต้องมี params แล้ว สามารถรัน Query ตรงๆ ได้เลย
    const result = await pool.query(sql);

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
      total: result.rowCount, // 🗑️ เอาบรรทัด semester: ... ออกไป
      schedules: formattedSchedules
    });

  } catch (error) {
    console.error('Get All Schedules Error:', error);
    res.status(500).json({ message: 'เกิดข้อผิดพลาดในการดึงข้อมูลทั้งหมด' });
  }
};

// PATCH /schedules/:id/status
// ฟังก์ชันเปลี่ยนสถานะงดใช้ห้อง
export const updateScheduleStatus = async (req, res) => {
  const { id } = req.params; // รับ schedule_id
  const { temporarily_closed, closed_reason } = req.body;
  const { user_id, role, name } = req.user; // ดึงชื่อ Staff/Teacher ออกมาจาก Token

  if (typeof temporarily_closed !== 'boolean') {
    return res.status(400).json({ message: 'ข้อมูลไม่ถูกต้อง (ต้องเป็น true หรือ false)' });
  }

  // 🚨 1. สร้าง Connection พิเศษสำหรับทำ Transaction
  const client = await pool.connect();

  try {
    // 🚨 2. เริ่มต้น Transaction 
    await client.query('BEGIN');

    // ขั้นตอนที่ 1: ดึงข้อมูลตารางเรียน + JOIN ข้อมูลอาจารย์เจ้าของวิชา
    const scheduleResult = await client.query(
      `SELECT s.*, 
              TO_CHAR(s.date, 'YYYY-MM-DD') AS formatted_date,
              u.email AS owner_email, 
              u.name AS owner_name 
      FROM public."Schedules" s
      JOIN public."Users" u ON s.user_id = u.user_id
      WHERE s.schedule_id = $1`,
      [id]
    );

    if (scheduleResult.rows.length === 0) {
      throw { status: 404, message: 'ไม่พบข้อมูลตารางเรียนนี้' };
    }

    const schedule = scheduleResult.rows[0];

    // ตรวจสอบสิทธิ์ (ไม่ใช่ Staff และไม่ใช่เจ้าของวิชา)
    if (role.toLowerCase().trim() !== 'staff' && schedule.user_id !== user_id) {
      throw { status: 403, message: 'คุณไม่มีสิทธิ์แก้ไขตารางเรียนนี้' };
    }

    // 2. ขั้นตอนที่ 2: อัปเดตสถานะ "งดใช้ห้อง" พร้อมอัปเดต "closed_reason"
    const updateScheduleSql = `
      UPDATE public."Schedules"
      SET temporarily_closed = $1, closed_reason = $2
      WHERE schedule_id = $3
      RETURNING schedule_id, subject_name, temporarily_closed, closed_reason
    `;
    const updatedSchedule = await client.query(updateScheduleSql, [
      temporarily_closed, 
      closed_reason || null,
      id
    ]);

    let canceledBookingsCount = 0;

    // ---------------------------------------------------------
    // ขั้นตอนที่ 3: จัดการระบบส่งอีเมล และเตะคิวจองที่ทับซ้อน
    // ---------------------------------------------------------

    // กรณีที่ 3.1: Staff กด "งดใช้ห้อง" (แจ้งเตือนอาจารย์)
    if (temporarily_closed === true && role.toLowerCase().trim() === 'staff') {
        // แปลงเวลาให้ดูสวยงาม
        const timeSlot = `${String(schedule.start_time).substring(0,5)} - ${String(schedule.end_time).substring(0,5)} น.`;
        
        // 3. นำ closed_reason ไปแนบในอีเมลให้ด้วย (ถ้ามีการกรอกเข้ามา)
        const reasonText = closed_reason ? ` (เหตุผล: ${closed_reason})` : '';
        const cancelReason = `เจ้าหน้าที่ (${name}) ได้ดำเนินการ "งดใช้ห้อง" สำหรับวิชา ${schedule.subject_name} ให้เรียบร้อยแล้ว${reasonText}`;
        
        // ส่งอีเมลไปหาอาจารย์เจ้าของวิชา (ทำงานเบื้องหลัง)
        sendBookingCancelledEmail(
            schedule.owner_email,
            schedule.owner_name,
            schedule.room_id,
            schedule.formatted_date,
            timeSlot,
            cancelReason
        ).catch(err => console.error("Failed to email teacher:", err));
    }


    // กรณีที่ 3.2: อาจารย์/Staff "ยกเลิกการงดใช้ห้อง" (ต้องเตะคิวที่จองทับซ้อนออก)
    if (temporarily_closed === false) {
      const conflictParams = [
        schedule.room_id,          // $1
        schedule.formatted_date,   // $2 
        schedule.start_time,       // $3
        schedule.end_time          // $4
      ];

      // ค้นหาคิวที่ทับซ้อน (เพิ่มการดึง b.status ออกมาด้วย)
      const findConflictsSql = `
        SELECT b.booking_id, b.status, b.start_time, b.end_time, b.purpose, 
              u.email, u.name as user_name
        FROM public."Booking" b
        JOIN public."Users" u ON b.user_id = u.user_id
        WHERE b.room_id = $1
          AND b.date = $2
          AND b.start_time < $4
          AND b.end_time > $3
          AND b.status IN ('pending', 'approved')
      `;
      const conflictUsers = await client.query(findConflictsSql, conflictParams);

      // ถ้าเจอคนจองทับซ้อน ให้ทำการยกเลิก/ปฏิเสธ พร้อมบันทึกเหตุผลและส่งอีเมลแจ้ง
      if (conflictUsers.rows.length > 0) {
        
        // แยกคิวตามสถานะเดิม
        const pendingIds = conflictUsers.rows.filter(r => r.status === 'pending').map(r => r.booking_id);
        const approvedIds = conflictUsers.rows.filter(r => r.status === 'approved').map(r => r.booking_id);
        
        // ข้อความเหตุผลที่จะเก็บลง Database
        const cancelReasonText = `อาจารย์เจ้าของวิชา (${schedule.subject_name}) ดึงห้องคืนเพื่อใช้สอนตามปกติ`;

        // 📝 อัปเดตรายการ Pending -> เปลี่ยนเป็น Rejected พร้อมใส่เหตุผล
        if (pendingIds.length > 0) {
          await client.query(`
            UPDATE public."Booking"
            SET status = 'rejected', cancel_reason = $2
            WHERE booking_id = ANY($1::varchar[])
          `, [pendingIds, cancelReasonText]);
        }

        // 📝 อัปเดตรายการ Approved -> เปลี่ยนเป็น Cancelled พร้อมใส่เหตุผล
        if (approvedIds.length > 0) {
          await client.query(`
            UPDATE public."Booking"
            SET status = 'cancelled', cancel_reason = $2
            WHERE booking_id = ANY($1::varchar[])
          `, [approvedIds, cancelReasonText]);
        }

        canceledBookingsCount = conflictUsers.rows.length;

        // 📧 วนลูปส่งอีเมลแจ้งเตือนผู้จองแต่ละท่าน
        conflictUsers.rows.forEach(user => {
          const timeSlot = `${String(user.start_time).substring(0,5)} - ${String(user.end_time).substring(0,5)} น.`;
          
          sendScheduleReclaimCancelledEmail(
            user.email,
            user.user_name,
            schedule.room_id,
            schedule.formatted_date,
            timeSlot,
            user.purpose,
            schedule.owner_name,    // ชื่ออาจารย์เจ้าของวิชา
            schedule.subject_name,  // ชื่อวิชาที่ดึงห้องคืน
            user.status             // 👈 ส่ง status เดิมเข้าไปในฟังก์ชันอีเมล
          ).catch(err => console.error("Failed to email student:", err));
        });
      }
    }

    // 🚨 4. ยืนยันการเปลี่ยนแปลงทั้งหมดลง Database
    await client.query('COMMIT');

    const statusText = temporarily_closed ? 'งดใช้ห้อง (Closed)' : 'ใช้งานปกติ (Active)';

    res.json({
      message: `อัปเดตสถานะสำเร็จ: ${statusText}`,
      schedule: updatedSchedule.rows[0],
      canceled_conflicts: canceledBookingsCount 
    });

  } catch (error) {
    // 🚨 5. ถ้ามีอะไรพังกลางทาง ให้ Rollback!
    await client.query('ROLLBACK');
    console.error('Update Schedule Status Error:', error);

    if (error.status) {
      res.status(error.status).json({ message: error.message });
    } else {
      res.status(500).json({ message: 'เกิดข้อผิดพลาดในการอัปเดตสถานะ' });
    }

  } finally {
    // 🚨 6. คืน Connection กลับเข้า Pool
    client.release();
  }
};


// ดึงรายชื่อห้อง (room_id) ทั้งหมดที่มีอยู่ในตารางเรียน แบบไม่ซ้ำกัน
export const getScheduleLog = async (req, res) => {
  try {
    // ลบการคิวรี่ DetailSchedules ของเดิมออก
    // ใช้ DISTINCT ดึงเฉพาะ room_id ที่ไม่ซ้ำกันจากตาราง Schedules
    const query = `
      SELECT DISTINCT room_id 
      FROM public."Schedules"
      WHERE room_id IS NOT NULL AND room_id != ''
      ORDER BY room_id ASC
    `;

    const result = await pool.query(query);

    // ส่งผลลัพธ์กลับไปยัง Frontend
    res.status(200).json({
      success: true,
      message: 'ดึงข้อมูลหมายเลขห้องจากตารางเรียนสำเร็จ',
      total: result.rowCount, 
      data: result.rows // ข้อมูลจะออกมาในรูปแบบ [{ room_id: '26504' }, { room_id: '26512' }]
    });

  } catch (error) {
    console.error('Get Schedule Log Error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'เกิดข้อผิดพลาดในการดึงข้อมูลประวัติตารางเรียน' 
    });
  }
};


export const editScheduleLog = async (req, res) => {
  // รับ ID ห้องเดิมจาก URL (เช่น 26504)
  const oldRoomId = req.params.id; 
  
  // รับ ID ห้องใหม่ที่จะย้ายไป จากแบบฟอร์ม (เช่น 26508)
  const { new_room_id: newRoomId } = req.body;

  // Validation
  if (!newRoomId) {
    return res.status(400).json({ 
      success: false,
      message: 'กรุณาระบุหมายเลขห้องใหม่ที่ต้องการย้ายไป' 
    });
  }

  if (oldRoomId === newRoomId) {
    return res.status(400).json({ 
      success: false,
      message: 'ห้องเดิมและห้องใหม่เป็นห้องเดียวกัน กรุณาเลือกห้องอื่น' 
    });
  }

  const client = await pool.connect();

  try {
    await client.query('BEGIN'); // เริ่ม Transaction เผื่อเกิดข้อผิดพลาด

    // ==========================================
    // 🛡️ STEP 1: ตรวจสอบการชนกันของตารางเรียนระหว่างห้องเก่าและห้องใหม่
    // ==========================================
    // ใช้ JOIN เพื่อเช็คว่า วันที่ตรงกัน และ เวลาคาบเกี่ยวกันหรือไม่
    const conflictQuery = `
      SELECT DISTINCT 
        o.subject_name AS old_subject,
        n.subject_name AS conflict_subject,
        TO_CHAR(o.date, 'YYYY-MM-DD') AS conflict_date,
        o.start_time,
        o.end_time
      FROM public."Schedules" o
      JOIN public."Schedules" n
        ON n.room_id = $2
       AND o.date = n.date
       AND o.start_time < n.end_time
       AND o.end_time > n.start_time
      WHERE o.room_id = $1
    `;
    const conflictResult = await client.query(conflictQuery, [oldRoomId, newRoomId]);

    // ถ้าพบว่ามีอย่างน้อย 1 รายการที่เวลาชนกัน ให้ยกเลิกการย้ายและส่งข้อมูลให้ Frontend
    if (conflictResult.rowCount > 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        success: false,
        message: `ไม่อนุญาตให้ย้ายห้อง เนื่องจากมีตารางเรียนชนกับห้อง ${newRoomId}`,
        conflicts: conflictResult.rows // ส่ง Array ของวิชา/เวลาที่ชนไปให้ Frontend แจ้งเตือน
      });
    }

    // ==========================================
    // 💾 STEP 2: ไม่มีคิวชน เริ่มกระบวนการย้ายห้อง
    // ==========================================
    const updateQuery = `
      UPDATE public."Schedules"
      SET room_id = $2
      WHERE room_id = $1
    `;
    const updateResult = await client.query(updateQuery, [oldRoomId, newRoomId]);

    if (updateResult.rowCount === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ 
        success: false,
        message: 'ไม่พบข้อมูลตารางเรียนในห้องเดิม' 
      });
    }

    await client.query('COMMIT'); // ยืนยันการบันทึก

    res.status(200).json({
      success: true,
      message: `ย้ายตารางเรียนจากห้อง ${oldRoomId} ไปยัง ${newRoomId} สำเร็จ`,
      updatedRows: updateResult.rowCount // แจ้งจำนวนคาบเรียนที่ถูกย้าย
    });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Edit Schedule Log Error:', error);
    res.status(500).json({ 
      success: false,
      message: 'เกิดข้อผิดพลาดในการย้ายข้อมูลตารางเรียน' 
    });
  } finally {
    client.release();
  }
};


export const deleteScheduleLog = async (req, res) => {
  // รับ room_id จากพารามิเตอร์ใน URL (สมมติว่า Frontend ส่งมาเป็น /schedules/26504)
  const roomId = req.params.id;

  if (!roomId) {
    return res.status(400).json({ 
      success: false,
      message: 'กรุณาระบุหมายเลขห้องที่ต้องการลบ' 
    });
  }

  try {
    // สั่งลบข้อมูลทั้งหมดในตาราง Schedules ที่มี room_id ตรงกัน
    const query = `
      DELETE FROM public."Schedules"
      WHERE room_id = $1
      RETURNING *
    `;
    const result = await pool.query(query, [roomId]);

    // ถ้าลบไม่ได้เลย (rowCount เป็น 0) แปลว่าไม่มีตารางวิชาในห้องนี้
    if (result.rowCount === 0) {
      return res.status(404).json({ 
        success: false,
        message: `ไม่พบข้อมูลตารางเรียนของห้อง ${roomId} ที่ต้องการลบ` 
      });
    }

    // ลบสำเร็จ ส่งกลับไปบอกว่าลบไปกี่แถว
    res.status(200).json({
      success: true,
      message: `ลบข้อมูลตารางเรียนของห้อง ${roomId} สำเร็จ (จำนวน ${result.rowCount} รายการ)`,
    });

  } catch (error) {
    console.error('Delete Schedule Log Error:', error);
    res.status(500).json({ 
      success: false,
      message: 'เกิดข้อผิดพลาดในการลบข้อมูลตารางเรียน' 
    });
  }
};


export const confirmReuploadSchedules = async (req, res) => {
  const roomId = req.params.id; // 🚨 รับ ID มาจาก URL ซึ่งตอนนี้คือ room_id (เช่น 26504)
  const { schedules } = req.body; // รับ Array ที่ผ่านการ Preview มา

  if (!schedules || schedules.length === 0) {
    return res.status(400).json({ message: 'ไม่มีข้อมูลที่จะบันทึก' });
  }

  const client = await pool.connect(); 

  try {
    await client.query('BEGIN'); // 🚦 เริ่ม Transaction ปกป้องข้อมูล

    // 💡 1. ทุบ "กำแพงเก่า" ทิ้ง: ลบข้อมูล Schedules ของเดิมที่ผูกกับห้องนี้ออกให้เกลี้ยงก่อน
    await client.query(
      `DELETE FROM public."Schedules" WHERE room_id = $1`,
      [roomId]
    );

    console.log(`🗑️ ลบข้อมูลตารางเรียนชุดเก่าของห้อง ${roomId} ทิ้งแล้ว`);
    console.log(`💾 กำลังบันทึกข้อมูลตารางเรียนชุดใหม่ ${schedules.length} รายการ...`);

    // 💡 2. สร้าง "กำแพงใหม่": วนลูป Insert ข้อมูลที่มาจากไฟล์ใหม่ลงไป
    const insertScheduleQuery = `
      INSERT INTO public."Schedules" 
      (schedule_id, room_id, course_code, subject_name, teacher_name, teacher_surname, start_time, end_time, date, temporarily_closed, user_id, sec)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
    `;

    for (const schedule of schedules) {
      const scheduleId = crypto.randomUUID(); // ป้องกันรหัสซ้ำ 100%
      const values = [
        scheduleId,
        schedule.room_id,
        schedule.course_code,     // 👈 บันทึกรหัสวิชา
        schedule.subject_name,
        schedule.teacher_name,
        schedule.teacher_surname,
        schedule.start_time,
        schedule.end_time,
        schedule.date,
        schedule.temporarily_closed || false,
        schedule.user_id,
        schedule.sec
      ];
      
      await client.query(insertScheduleQuery, values); 
    }

    // 🚨 3. (ลบคำสั่ง Update DetailSchedules ทิ้งไปแล้ว เพราะไม่ได้ใช้งาน)

    await client.query('COMMIT'); // ✅ ยืนยันการเปลี่ยนแปลงทั้งหมด
    
    res.json({ 
      success: true,
      message: `อัปเดตไฟล์ตารางเรียนทับข้อมูลเดิมของห้อง ${roomId} สำเร็จ`, 
      totalSaved: schedules.length 
    });

  } catch (error) {
    await client.query('ROLLBACK'); // ❌ ถ้าพลาดให้ดึงข้อมูลชุดเก่ากลับมา!
    console.error('Confirm Re-upload Error:', error);
    res.status(500).json({ message: 'เกิดข้อผิดพลาดในการอัปเดตข้อมูล', error: error.message });
  } finally {
    client.release();
  }
};


export const reuploadScheduleFile = async (req, res) => {
  // 1. รับ ID ห้องเดิมเป้าหมาย จาก URL (เช่น 26504)
  const targetRoomId = req.params.id; 

  try {
    if (!req.file) {
      return res.status(400).json({ message: 'กรุณาอัปโหลดไฟล์ Excel ใหม่' });
    }

    // ========================================================
    // 📅 ดึงข้อมูลวันเริ่มเทอมต้น เพื่อใช้แปลงรหัส M-8-10
    // ========================================================
    const termResult = await pool.query(
      `SELECT TO_CHAR(start_date, 'YYYY-MM-DD') AS start_date FROM public."Terms" WHERE term = 'first' LIMIT 1`
    );

    if (termResult.rowCount === 0 || !termResult.rows[0].start_date) {
      return res.status(400).json({ 
        message: 'ไม่พบข้อมูลวันเริ่มเทอมในระบบ กรุณาตั้งค่าวันเปิดเทอมก่อนนำเข้าตารางเรียน' 
      });
    }

    const termStartDateStr = termResult.rows[0].start_date;
    const baseTermDate = new Date(termStartDateStr);
    const dayOffsets = { 'm': 0, 'tu': 1, 'w': 2, 'th': 3, 'f': 4, 'sa': 5, 'su': 6 };

    // ==========================================
    // 📊 อ่านไฟล์ Excel ที่เพิ่งอัปโหลดเข้ามาใหม่
    // ==========================================
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(req.file.buffer);
    
    const worksheet = workbook.getWorksheet(1);
    if (!worksheet) {
       return res.status(400).json({ message: 'ไม่พบข้อมูล Worksheet ในไฟล์' });
    }

    const importedData = [];
    let headers = {};

    worksheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) {
        row.eachCell((cell, colNumber) => {
          headers[colNumber] = cell.value ? String(cell.value).trim() : ''; 
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

    console.log(`📥 [Re-upload] ได้รับข้อมูลไฟล์ใหม่ ${importedData.length} รายการ (ห้อง: ${targetRoomId})`);

    // ==========================================
    // 🧑‍🏫 เตรียมข้อมูลอาจารย์
    // ==========================================
    const getFullNameKey = (name, surname) => {
      const n = name ? String(name).trim() : "";
      const s = surname ? String(surname).trim() : "";
      return `${n} ${s}`.trim(); 
    };

    const usersResult = await pool.query(`SELECT user_id, name, surname FROM public."Users"`);
    const userMap = new Map();
    usersResult.rows.forEach(user => {
        const key = getFullNameKey(user.name, user.surname);
        if (key) userMap.set(key, user.user_id);
    });

    // ==========================================
    // ⚙️ เริ่มต้นการตรวจสอบและขยายเป็นสัปดาห์
    // ==========================================
    const validData = []; 
    const errors = [];
    const warnings = [];
    let successCount = 0;
    const dateCreate = new Date().toISOString(); 
    const internalSchedules = []; 

    for (const [index, row] of importedData.entries()) {
        
        // ... (โค้ดดึงตัวแปรจาก Excel และถอดรหัสวันที่ M-8-10 เหมือนเดิม) ...
        const roomId = row['หมายเลขห้อง'] ? String(row['หมายเลขห้อง']).trim() : null;
        const courseCode = row['รหัสวิชา'] ? String(row['รหัสวิชา']).trim() : "";
        const subjectName = row['ชื่อวิชา'] ? String(row['ชื่อวิชา']).trim() : "";
        const teacherName = row['ชื่อ'] ? String(row['ชื่อ']).trim() : "";
        const teacherSurname = row['นามสกุล'] ? String(row['นามสกุล']).trim() : "";
        const repeatStr = row['จำนวนสัปดาห์'];
        const scheduleStr = row['วันที่'] ? String(row['วันที่']).trim() : "";
        const sec = row['sec'] ? String(row['sec']).trim() : "";

        const teacherId = userMap.get(`${teacherName} ${teacherSurname}`);
        
        let repeatCount = 15; // ตั้งค่าพื้นฐานไว้ที่ 15 เสมอ
        
        if (repeatStr) {
            const parsedRepeat = parseInt(repeatStr);
            if (!isNaN(parsedRepeat) && parsedRepeat > 0) {
                repeatCount = parsedRepeat; // ถ้ากรอกมาถูกต้อง เป็นตัวเลข ก็ใช้ค่าตามที่กรอก
            } else {
                // ถ้ากรอกมาแต่เป็นตัวอักษรแปลกๆ หรือติดลบ
                warnings.push({
                    row: index + 1, // ลำดับวิชาที่
                    subject_name: subjectName || 'ไม่ระบุชื่อวิชา',
                    message: `รูปแบบจำนวนสัปดาห์ไม่ถูกต้อง ระบบได้ตั้งค่าเป็น 15 สัปดาห์อัตโนมัติ`
                });
            }
        } else {
            // ถ้า Excel ปล่อยช่องว่างมาเลย
            warnings.push({
                row: index + 1, // ลำดับวิชาที่
                subject_name: subjectName || 'ไม่ระบุชื่อวิชา',
                message: `ไม่ได้ระบุจำนวนสัปดาห์ ระบบได้เติมค่า 15 สัปดาห์ให้โดยอัตโนมัติ`
            });
        }
        // ==========================================================

        let startTime = "";
        let endTime = "";
        let firstDateRaw = "";

        if (scheduleStr) {
          const parts = scheduleStr.split('-');
          if (parts.length === 3) {
            const dayCode = parts[0].trim().toLowerCase(); 
            const startHr = parts[1].trim(); 
            const endHr = parts[2].trim(); 

            const offset = dayOffsets[dayCode];
            if (offset !== undefined) {
              const firstDateObj = new Date(baseTermDate);
              firstDateObj.setDate(baseTermDate.getDate() + offset);
              firstDateRaw = firstDateObj.toISOString().split('T')[0];

              startTime = `${startHr.padStart(2, '0')}:00:00`;
              endTime = `${endHr.padStart(2, '0')}:00:00`;
            }
          }
        }

        // 🚨 1. Validation ข้อมูลพื้นฐาน (ดักจับให้ครบทุกคอลัมน์สำคัญ)
        if (!roomId || !courseCode || !subjectName || !sec || !firstDateRaw || !startTime || !endTime) {
            for (let w = 0; w < repeatCount; w++) {
                errors.push({ 
                    row: index + 1, // วิชาที่
                    week: w + 1,
                    date: 'ไม่สามารถระบุได้',
                    room: roomId || 'ไม่ระบุ', 
                    type: 'INVALID_DATA',
                    message: `ข้อมูลไม่ครบถ้วน กรุณากรอก รหัสวิชา, ชื่อวิชา, sec, หมายเลขห้อง และ วันที่ ให้ครบทุกช่อง` 
                });
            }
            continue;
        }

        const baseDateObj = new Date(firstDateRaw);

        for (let week = 0; week < repeatCount; week++) {
            try {
                const targetDateObj = new Date(baseDateObj);
                targetDateObj.setDate(baseDateObj.getDate() + (week * 7));
                const targetDate = targetDateObj.toISOString().split('T')[0];
                
                // 🚨 2. ย้าย Validation ห้องและอาจารย์ มาไว้ในลูป
                // พอ Error ปุ๊บ มันจะวิ่งไปเข้า Catch ด้านล่าง ทำให้เกิด Error 15 รอบอัตโนมัติ
                if (roomId !== targetRoomId) {
                    let err = new Error(`หมายเลขห้องในไฟล์ (${roomId}) ไม่ตรงกับห้องที่กำลังอัปเดต (${targetRoomId})`);
                    err.type = 'ROOM_MISMATCH';
                    throw err;
                }
                
                if (!teacherId) {
                    let err = new Error(`ไม่พบข้อมูลอาจารย์ชื่อ: '${teacherName} ${teacherSurname}'`);
                    err.type = 'TEACHER_NOT_FOUND';
                    throw err;
                }

                // 🛑 เช็คการชนกันภายในไฟล์ที่เพิ่งอัปโหลด
                const isInternalConflict = internalSchedules.some(s => 
                   s.date === targetDate && 
                   (s.startTime < endTime && s.endTime > startTime)
                );

                if (isInternalConflict) {
                    let err = new Error(`เวลาชนกับวิชาอื่นภายในไฟล์ Excel เดียวกัน (${startTime.slice(0,5)}-${endTime.slice(0,5)})`);
                    err.type = 'COLLISION';
                    throw err;
                }

                internalSchedules.push({ date: targetDate, startTime, endTime });
                
                validData.push({
                  temp_id: `${index + 1}_w${week + 1}`,
                  week_number: week + 1,
                  room_id: roomId,
                  course_code: courseCode, 
                  subject_name: subjectName,
                  teacher_name: teacherName,
                  teacher_surname: teacherSurname,
                  start_time: startTime,
                  end_time: endTime,
                  temporarily_closed: false,
                  user_id: teacherId,
                  date: targetDate,
                  sec: sec,
                  dateCreate: dateCreate
              });
              successCount++;

            } catch (err) {
                // เก็บ Error ของแต่ละสัปดาห์ลงไป
                const targetDateObj = new Date(baseDateObj);
                targetDateObj.setDate(baseDateObj.getDate() + (week * 7));
                const dateStr = targetDateObj.toISOString().split('T')[0];

                errors.push({ 
                    row: index + 1, 
                    week: week + 1,
                    date: dateStr,
                    room: roomId, 
                    type: err.type || 'UNKNOWN',
                    message: `(Week ${week + 1}: ${dateStr}) ${err.message}` 
                });
            }
        } // จบ Loop สัปดาห์
    } // จบ Loop แถว Excel

    // ส่ง Response
    res.status(200).json({
        message: 'ตรวจสอบไฟล์ใหม่เรียบร้อย',
        total_rows_excel: importedData.length,
        total_generated_slots: successCount + errors.length,
        valid_count: validData.length,
        error_count: errors.length,
        warning_count: warnings.length,
        previewData: validData, 
        errors: errors.length > 0 ? errors : undefined,
        warnings: warnings.length > 0 ? warnings : undefined
    });

  } catch (error) {
    console.error('Re-upload Error:', error);
    res.status(500).json({ message: 'เกิดข้อผิดพลาดในการตรวจสอบและอัปเดตไฟล์' });
  }
};


// GET /schedules/subjects/:id (หรือ route ที่ตั้งไว้ โดย id คือ room_id)
// ฟังก์ชันแสดงรายการวิชาที่ไม่ซ้ำกันในห้องนั้นๆ (ดึงเฉพาะวันแรกที่เริ่มเรียน)
export const showSubjectSchedule = async (req, res) => {
  // รับค่ามาจาก URL parameter (ตั้งชื่อเป็น id หรือ room_id ตามที่คุณพงศ์ภัคกำหนดในไฟล์ Route)
  const roomId = req.params.id || req.params.room_id; 

  if (!roomId) {
    return res.status(400).json({ message: 'กรุณาระบุหมายเลขห้อง (room_id)' });
  }

  try {
    // 1. DISTINCT ON (course_code, subject_name, sec) -> จัดกลุ่ม รหัสวิชา, ชื่อวิชา และเซคเดียวกันให้เหลือแค่ Record เดียว
    // 2. ดึง course_code เข้ามาแสดงผลด้วย 
    // 3. ⚡ ดึง teacher_name, teacher_surname จากตาราง Schedules
    const query = `
      SELECT DISTINCT ON (course_code, subject_name, sec)
        room_id, 
        course_code,
        subject_name, 
        teacher_name, 
        teacher_surname, 
        start_time, 
        end_time, 
        TO_CHAR(date, 'YYYY-MM-DD') AS date, -- ป้องกัน Timezone เพี้ยน
        sec
      FROM public."Schedules"
      WHERE room_id = $1
      ORDER BY course_code, subject_name, sec, date ASC
    `;

    const result = await pool.query(query, [roomId]);

    // จัด Format ข้อมูลเวลาให้สวยงาม (ตัดวินาทีทิ้ง)
    const formattedSubjects = result.rows.map(row => ({
      ...row,
      start_time: String(row.start_time).substring(0, 5),
      end_time: String(row.end_time).substring(0, 5)
    }));

    res.json({
      message: `ดึงข้อมูลสำเร็จ พบทั้งหมด ${formattedSubjects.length} รายวิชาในห้อง ${roomId}`,
      subjects: formattedSubjects
    });

  } catch (error) {
    console.error('Show Subject Schedule Error:', error);
    res.status(500).json({ message: 'เกิดข้อผิดพลาดในการดึงข้อมูลรายวิชา' });
  }
};


export const editSubjectDataSchedule = async (req, res) => {
  // รับ room_id เดิมมาจาก URL เพื่อระบุพิกัดที่จะลบ
  const old_room_id = req.params.id || req.params.room_id; 
  
  const {
    old_course_code,    // 👈 เพิ่มรหัสวิชาเดิม
    old_subject_name, 
    old_sec,          
    room_id,            // ห้องใหม่ (ถ้ามีการย้ายห้อง)
    course_code,        // 👈 รหัสวิชาใหม่
    subject_name,     
    teacher_name,
    teacher_surname,
    start_time,
    end_time,
    date,             
    sec,              
    repeat,           
    force_cancel 
  } = req.body;

  // ตรวจสอบข้อมูลอ้างอิงวิชาเดิม
  if (!old_room_id || !old_course_code || !old_subject_name || !old_sec) {
    return res.status(400).json({ message: 'ข้อมูลระบุวิชาเดิมไม่ครบถ้วน' });
  }
  // ตรวจสอบข้อมูลใหม่ที่จะอัปเดต
  if (!date || !repeat || repeat < 1 || !room_id || !course_code) {
    return res.status(400).json({ message: 'ข้อมูลที่ต้องการอัปเดตไม่ครบถ้วน (ต้องมีห้อง, รหัสวิชา, วันที่ และจำนวนรอบ)' });
  }

  const client = await pool.connect();

  try {
    await client.query('BEGIN'); 

    // 🧑‍🏫 ค้นหา ID อาจารย์
    const userResult = await client.query(
      `SELECT user_id FROM public."Users" 
       WHERE name = $1 AND surname = $2`,
      [teacher_name, teacher_surname]
    );

    if (userResult.rows.length === 0) {
      throw { status: 404, message: 'ไม่พบข้อมูลอาจารย์ท่านนี้ในระบบ (ชื่อหรือนามสกุลไม่ตรง)' };
    }
    const teacherUserId = userResult.rows[0].user_id;
    
    // 🔍 เช็คว่ามีวิชานี้อยู่จริงไหม (อ้างอิงจาก ห้องเดิม, รหัสวิชาเดิม, ชื่อเดิม, เซคเดิม)
    const oldDataResult = await client.query(
       `SELECT schedule_id
        FROM public."Schedules"
        WHERE room_id = $1 AND course_code = $2 AND subject_name = $3 AND sec = $4
        LIMIT 1`,
       [old_room_id, old_course_code, old_subject_name, old_sec]
    );

    if (oldDataResult.rows.length === 0) {
        throw { status: 404, message: 'ไม่พบรายวิชาเดิมที่ต้องการแก้ไข' };
    }

    // 🗑️ ลบของเก่าทิ้งไปก่อน (ลบทุกสัปดาห์ของวิชานี้)
    await client.query(
      `DELETE FROM public."Schedules"
       WHERE room_id = $1 AND course_code = $2 AND subject_name = $3 AND sec = $4`,
      [old_room_id, old_course_code, old_subject_name, old_sec]
    );

    let canceledBookingsTotal = 0; 
    const baseDate = new Date(date);

    // 🔄 วนลูป Insert และ Check ทีละสัปดาห์
    for (let i = 0; i < repeat; i++) {
      const insertDate = new Date(baseDate);
      insertDate.setDate(baseDate.getDate() + (i * 7));

      const year = insertDate.getFullYear();
      const month = String(insertDate.getMonth() + 1).padStart(2, '0');
      const day = String(insertDate.getDate()).padStart(2, '0');
      const formattedDate = `${year}-${month}-${day}`;

      // =========================================================
      // 🚨 1. เช็คว่าทับซ้อนกับ "ตารางเรียนวิชาอื่น" หรือไม่?
      // =========================================================
      const checkScheduleConflictSql = `
        SELECT subject_name, sec 
        FROM public."Schedules"
        WHERE room_id = $1
          AND date = $2
          AND start_time < $4
          AND end_time > $3
        LIMIT 1
      `;
      // ใช้ room_id ใหม่ ในกรณีที่มีการเปลี่ยนห้อง
      const scheduleConflict = await client.query(checkScheduleConflictSql, [
        room_id, formattedDate, start_time, end_time
      ]);

      if (scheduleConflict.rows.length > 0) {
        throw { 
          status: 400, 
          message: `เวลาหรือวันที่ดังกล่าว ทับซ้อนกับตารางเรียนอื่น` 
        };
      }

      // =========================================================
      // 🚨 2. เช็คว่าทับซ้อนกับ "คิวจองห้อง" (Booking) หรือไม่?
      // =========================================================
      const findConflictsSql = `
        SELECT b.booking_id, b.status, b.start_time, b.end_time, b.purpose, 
               u.email, u.name as user_name
        FROM public."Booking" b
        JOIN public."Users" u ON b.user_id = u.user_id
        WHERE b.room_id = $1
          AND b.date = $2
          AND b.start_time < $4
          AND b.end_time > $3
          AND b.status IN ('pending', 'approved')
      `;
      const conflictUsers = await client.query(findConflictsSql, [
        room_id, formattedDate, start_time, end_time
      ]);

      if (conflictUsers.rows.length > 0) {
        if (!force_cancel) {
            throw { 
                status: 409, 
                code: 'BOOKING_CONFLICT',
                message: `วันและเวลาดังกล่าวมีการจองห้องจำนวน ${conflictUsers.rows.length} รายการ\n คุณต้องการยกเลิกคำขอจองเหล่านั้น\nเพื่อใช้จัดตารางเรียนนี้หรือไม่?` 
            };
        }

        const pendingIds = conflictUsers.rows.filter(r => r.status === 'pending').map(r => r.booking_id);
        const approvedIds = conflictUsers.rows.filter(r => r.status === 'approved').map(r => r.booking_id);
        
        const cancelReasonText = `ทับซ้อนกับการปรับเปลี่ยนตารางเรียนรายวิชา ${subject_name}`;

        if (pendingIds.length > 0) {
          await client.query(`
            UPDATE public."Booking"
            SET status = 'rejected', cancel_reason = $2
            WHERE booking_id = ANY($1::varchar[])
          `, [pendingIds, cancelReasonText]);
        }

        if (approvedIds.length > 0) {
          await client.query(`
            UPDATE public."Booking"
            SET status = 'cancelled', cancel_reason = $2
            WHERE booking_id = ANY($1::varchar[])
          `, [approvedIds, cancelReasonText]);
        }

        canceledBookingsTotal += conflictUsers.rows.length;

        // ฟังก์ชันส่ง Email ยกเลิกการจอง
        conflictUsers.rows.forEach(user => {
          const timeSlot = `${String(user.start_time).substring(0,5)} - ${String(user.end_time).substring(0,5)} น.`;
          const fullTeacherName = `${teacher_name} ${teacher_surname}`;
          
          sendScheduleEditConflictEmail(
            user.email,
            user.user_name,
            room_id,
            formattedDate,
            timeSlot,
            user.purpose,
            fullTeacherName, 
            subject_name,
            user.status 
          ).catch(err => console.error("Failed to email student regarding schedule edit:", err));
        });
      }

      // =========================================================
      // 💾 3. บันทึกข้อมูลตารางเรียนลงฐานข้อมูล
      // =========================================================
      const scheduleId = crypto.randomUUID();
      const insertQuery = `
        INSERT INTO public."Schedules"
        (schedule_id, room_id, course_code, subject_name, user_id, teacher_name, teacher_surname, date, start_time, end_time, sec)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      `;

      await client.query(insertQuery, [
        scheduleId,          
        room_id,             // 👈 บันทึกห้องใหม่
        course_code,         // 👈 บันทึกรหัสวิชาใหม่
        subject_name,        
        teacherUserId,       
        teacher_name,        
        teacher_surname,     
        formattedDate,       
        start_time,          
        end_time,            
        sec                  
      ]);
    }

    await client.query('COMMIT');

    res.json({ 
      message: `แก้ไขและสร้างตารางเรียน ${subject_name} จำนวน ${repeat} สัปดาห์ เรียบร้อยแล้ว`,
      canceled_conflicts: canceledBookingsTotal 
    });

  } catch (error) {
    await client.query('ROLLBACK');
    
    if (error.status === 409) {
      return res.status(409).json({ code: error.code, message: error.message });
    }

    console.error('Edit Subject Schedule Error:', error);
    
    if (error.status) {
      res.status(error.status).json({ message: error.message });
    } else {
      res.status(500).json({ message: 'เกิดข้อผิดพลาดในการแก้ไขตารางเรียน' });
    }
  } finally {
    client.release();
  }
};


export const deleteSubjectSchedule = async (req, res) => {
  // รับหมายเลขห้องจาก URL
  const roomId = req.params.id || req.params.room_id; 
  
  // รับรหัสวิชา, ชื่อวิชา และ sec ที่ต้องการลบ จากแบบฟอร์ม Frontend
  const { course_code, subject_name, sec } = req.body; 
  const { user_id, role } = req.user; // ดึงข้อมูลคนกดลบมาจาก Token

  // 1. ตรวจสอบว่าส่งข้อมูลมาครบไหม
  if (!roomId || !course_code || !subject_name || !sec) {
    return res.status(400).json({ 
      message: 'กรุณาระบุหมายเลขห้อง, รหัสวิชา, ชื่อวิชา และหมู่เรียน (sec) ให้ครบถ้วน' 
    });
  }

  try {
    // 2. 🔍 เช็คก่อนว่ามีวิชานี้อยู่ในห้องนี้จริงไหม และใครเป็นเจ้าของ
    const checkQuery = await pool.query(
      `SELECT user_id FROM public."Schedules" 
       WHERE room_id = $1 AND course_code = $2 AND subject_name = $3 AND sec = $4 
       LIMIT 1`,
      [roomId, course_code, subject_name, sec]
    );

    if (checkQuery.rows.length === 0) {
      return res.status(404).json({ message: 'ไม่พบรายวิชาที่ต้องการลบในระบบ' });
    }

    const scheduleOwner = checkQuery.rows[0].user_id;

    // 3. 🛡️ ตรวจสอบสิทธิ์: ถ้าไม่ใช่ Staff, ไม่ใช่ Admin และ ไม่ใช่เจ้าของวิชา -> เตะออก!
    const userRole = role.toLowerCase().trim();
    if (userRole !== 'staff' && userRole !== 'admin' && scheduleOwner !== user_id) {
      return res.status(403).json({ message: 'คุณไม่มีสิทธิ์ลบตารางเรียนวิชานี้' });
    }

    // 4. 🗑️ ทำการลบข้อมูล (จะกวาดลบออกทุกสัปดาห์ที่มีวิชานี้ในห้องนี้)
    const deleteResult = await pool.query(
      `DELETE FROM public."Schedules" 
       WHERE room_id = $1 AND course_code = $2 AND subject_name = $3 AND sec = $4`,
      [roomId, course_code, subject_name, sec]
    );

    res.json({ 
      message: `ลบตารางเรียนวิชา ${subject_name} กลุ่มเรียน ${sec} สำเร็จแล้ว (จำนวน ${deleteResult.rowCount} คาบเรียน)`,
      deleted_count: deleteResult.rowCount
    });

  } catch (error) {
    console.error('Delete Subject Schedule Error:', error);
    res.status(500).json({ message: 'เกิดข้อผิดพลาดในการลบตารางเรียน' });
  }
};


// ⏱️ ฟังก์ชันตัวช่วย: คำนวณหาจำนวนชั่วโมงจากเวลา (เช่น 08:30:00 ถึง 10:00:00 = 1.5 ชม.)
const calculateHours = (startTime, endTime) => {
  if (!startTime || !endTime) return 0;
  const [startH, startM] = startTime.split(':').map(Number);
  const [endH, endM] = endTime.split(':').map(Number);
  return (endH + endM / 60) - (startH + startM / 60);
};

// router.get('schedules/export-excel', authenticateToken, authorizeRole('staff'), exportTermReport);
// export excel เพื่อสร้าง Log
export const exportTermReport = async (req, res) => {
  const { startDate, endDate } = req.query; 

  if (!startDate || !endDate) {
    return res.status(400).json({ message: 'กรุณาระบุวันที่เริ่มต้นและสิ้นสุดของเทอม' });
  }

  try {
    // ==========================================
    // 📊 1. Query ข้อมูลการจอง (Booking) + ดึง b.status กลับมา
    // ==========================================
    const bookingResult = await pool.query(
      `SELECT 
         b.room_id, 
         CONCAT(u.name, ' ', u.surname) AS booker_name, 
         b.purpose, 
         b.start_time, 
         b.end_time, 
         b.date, 
         b.status, 
         CASE 
           WHEN a.name IS NOT NULL AND a.name != '' THEN CONCAT(a.name, ' ', a.surname)
           ELSE b.approved_by 
         END AS approver_name
       FROM public."Booking" b
       LEFT JOIN public."Users" u ON b.user_id = u.user_id         
       LEFT JOIN public."Users" a ON b.approved_by = a.user_id     
       WHERE b.date >= $1 AND b.date <= $2
       ORDER BY b.date ASC, b.start_time ASC`,
      [startDate, endDate]
    );

    // ==========================================
    // 📚 2. Query ข้อมูลตารางเรียน (Schedules)
    // ==========================================
    const scheduleResult = await pool.query(
      `SELECT 
         s.room_id, 
         CONCAT(s.teacher_name, ' ', s.teacher_surname) AS full_name,
         s.subject_name, 
         s.start_time, 
         s.end_time, 
         s.date, 
         s.sec,
         s.unique_schedules,
         ds.department,
         ds.study_year,
         ds.program_type
       FROM public."Schedules" s
       LEFT JOIN public."DetailSchedules" ds ON s.unique_schedules = ds.unique_schedules
       WHERE s.date >= $1 AND s.date <= $2
       ORDER BY s.date ASC, s.start_time ASC`,
      [startDate, endDate]
    );

    // ==========================================
    // 🧠 3. คำนวณข้อมูลสำหรับ Dashboard
    // ==========================================
    // คำนวณจำนวนสัปดาห์ในเทอมนั้น (เพื่อหาค่าเฉลี่ย)
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffDays = Math.max(1, (end - start) / (1000 * 60 * 60 * 24));
    const totalWeeks = Math.max(1, Math.ceil(diffDays / 7));

    // ตัวแปรเก็บสถิติ
    const roomStats = {};
    const teacherStats = {};
    const statusStats = { approved: 0, pending: 0, cancelled: 0, rejected: 0 };
    const purposeStats = {};

    // 3.1 สรุปข้อมูลจากการจอง (เอาเฉพาะที่ไม่ได้ยกเลิก/ปฏิเสธ มาคิดชั่วโมง)
    bookingResult.rows.forEach(b => {
      const hrs = calculateHours(b.start_time, b.end_time);
      const stat = b.status ? b.status.toLowerCase() : 'unknown';
      
      // นับสถานะทั้งหมด (ทำ Success Rate)
      if (statusStats[stat] !== undefined) statusStats[stat]++;
      else statusStats[stat] = 1;

      // ถ้าอนุมัติหรือใช้งานแล้ว ถึงจะนำมาบวกชั่วโมง
      if (stat === 'approved' || stat === 'completed') {
        const room = b.room_id || 'ไม่ระบุ';
        const booker = b.booker_name || 'ไม่ระบุ';
        const purpose = b.purpose || 'ไม่มีเหตุผล';

        roomStats[room] = (roomStats[room] || 0) + hrs;
        teacherStats[booker] = (teacherStats[booker] || 0) + hrs;
        purposeStats[purpose] = (purposeStats[purpose] || 0) + hrs;
      }
    });

    // 3.2 สรุปข้อมูลจากตารางเรียน (Schedules ถือว่าเป็นการใช้งาน 100%)
    scheduleResult.rows.forEach(s => {
      const hrs = calculateHours(s.start_time, s.end_time);
      const room = s.room_id || 'ไม่ระบุ';
      const teacher = s.full_name || 'ไม่ระบุ';

      roomStats[room] = (roomStats[room] || 0) + hrs;
      teacherStats[teacher] = (teacherStats[teacher] || 0) + hrs;
    });

    // ==========================================
    // 📝 4. สร้างไฟล์ Excel และ Sheet ต่างๆ
    // ==========================================
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'KUSRC Room Booking System';

    // 🏆 ---- Sheet 1: Dashboard สรุปข้อมูล (สร้างเป็น Sheet แรกสุด!) ----
    const summarySheet = workbook.addWorksheet('สรุปข้อมูล (Dashboard)');
    summarySheet.getColumn('A').width = 40;
    summarySheet.getColumn('B').width = 25;
    summarySheet.getColumn('C').width = 25;

    // ส่วนหัวรายงาน
    const titleRow = summarySheet.addRow(['📊 สรุปรายงานการใช้งานห้องเรียนและตารางสอน']);
    titleRow.font = { size: 16, bold: true };
    summarySheet.addRow(['ช่วงเวลาที่วิเคราะห์:', `${startDate} ถึง ${endDate}`]);
    summarySheet.addRow(['จำนวนสัปดาห์ในระบบ:', `${totalWeeks} สัปดาห์`]);
    summarySheet.addRow([]);

    // Section 1: สถิติห้อง (Room Stats)
    const header1 = summarySheet.addRow(['🏠 สถิติการใช้งานรายห้อง (รวมคาบเรียนและจองพิเศษ)']);
    header1.font = { bold: true, color: { argb: 'FF0000FF' } }; // สีน้ำเงิน
    summarySheet.addRow(['ชื่อห้อง', 'ชั่วโมงรวมตลอดเทอม', 'เฉลี่ยต่อสัปดาห์']).font = { bold: true };
    
    // เรียงลำดับห้องที่ใช้เยอะสุดไปน้อยสุด
    Object.entries(roomStats)
      .sort((a, b) => b[1] - a[1])
      .forEach(([room, hrs]) => {
        summarySheet.addRow([room, `${hrs.toFixed(2)} ชม.`, `${(hrs / totalWeeks).toFixed(2)} ชม./สัปดาห์`]);
      });
    summarySheet.addRow([]);

    // Section 2: สถิติบุคคล (Teacher Stats)
    const header2 = summarySheet.addRow(['👨‍🏫 สถิติการจองและสอนของอาจารย์/บุคลากร (Top 10)']);
    header2.font = { bold: true, color: { argb: 'FF008000' } }; // สีเขียว
    summarySheet.addRow(['ชื่อ-นามสกุล', 'ชั่วโมงรวม', '']).font = { bold: true };
    
    Object.entries(teacherStats)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10) // เอาแค่ Top 10
      .forEach(([name, hrs]) => {
        summarySheet.addRow([name, `${hrs.toFixed(2)} ชม.`, '']);
      });
    summarySheet.addRow([]);

    // Section 3: สถิติสถานะ และ จุดประสงค์
    const header3 = summarySheet.addRow(['📈 สถิติการดำเนินการจอง และ จุดประสงค์ยอดฮิต']);
    header3.font = { bold: true, color: { argb: 'FFE65C00' } }; // สีส้ม
    summarySheet.addRow(['สถานะการจอง', 'จำนวนครั้ง', '']).font = { bold: true };
    summarySheet.addRow(['อนุมัติ (Approved / Completed)', `${(statusStats['approved'] || 0) + (statusStats['completed'] || 0)} ครั้ง`, '']);
    summarySheet.addRow(['รออนุมัติ (Pending)', `${statusStats['pending'] || 0} ครั้ง`, '']);
    summarySheet.addRow(['ยกเลิก/ปฏิเสธ (Cancelled / Rejected)', `${(statusStats['cancelled'] || 0) + (statusStats['rejected'] || 0)} ครั้ง`, '']);
    
    summarySheet.addRow([]);
    summarySheet.addRow(['จุดประสงค์การจองห้อง (Top 5)', 'ชั่วโมงรวม', '']).font = { bold: true };
    Object.entries(purposeStats)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .forEach(([purpose, hrs]) => {
        summarySheet.addRow([purpose, `${hrs.toFixed(2)} ชม.`, '']);
      });


    // 🗓️ ---- Sheet 2: ประวัติการจอง (Bookings) ----
    const bookingSheet = workbook.addWorksheet('ประวัติการจอง (Bookings)');
    bookingSheet.columns = [
      { header: 'ห้อง', key: 'room_id', width: 15 },
      { header: 'ผู้จอง', key: 'booker_name', width: 30 }, 
      { header: 'เหตุผลการขอจอง', key: 'purpose', width: 35 },
      { header: 'เวลาเริ่ม', key: 'start_time', width: 15 },
      { header: 'เวลาสิ้นสุด', key: 'end_time', width: 15 },
      { header: 'วันที่', key: 'date', width: 15 },
      { header: 'สถานะ', key: 'status', width: 15 }, // เพิ่มสถานะให้ด้วยเพื่อความชัดเจน
      { header: 'อนุมัติโดย', key: 'approver_name', width: 25 } 
    ];
    bookingSheet.getRow(1).font = { bold: true };
    bookingSheet.addRows(bookingResult.rows);


    // 📚 ---- Sheet 3 เป็นต้นไป: ตารางเรียน (แยกตามสาขา) ----
    const scheduleGroups = {};
    scheduleResult.rows.forEach(row => {
      const key = row.unique_schedules || 'Unknown';
      if (!scheduleGroups[key]) {
        let rawSheetName = 'ตารางเรียน';
        if (row.department) {
            rawSheetName = `${row.department} ปี ${row.study_year} ภาค ${row.program_type}`;
        }
        let safeSheetName = rawSheetName.length > 31 ? rawSheetName.substring(0, 31) : rawSheetName;
        
        let counter = 1;
        let finalSheetName = safeSheetName;
        while (workbook.getWorksheet(finalSheetName)) {
           finalSheetName = `${safeSheetName.substring(0, 27)} (${counter})`;
           counter++;
        }
        scheduleGroups[key] = { sheetName: finalSheetName, rows: [] };
      }
      scheduleGroups[key].rows.push(row);
    });

    for (const groupKey in scheduleGroups) {
      const groupData = scheduleGroups[groupKey];
      const scheduleSheet = workbook.addWorksheet(groupData.sheetName);
      
      scheduleSheet.columns = [
        { header: 'ห้อง', key: 'room_id', width: 15 },
        { header: 'อาจารย์ผู้สอน', key: 'full_name', width: 30 },
        { header: 'รายวิชา', key: 'subject_name', width: 35 },
        { header: 'เวลาเริ่ม', key: 'start_time', width: 15 },
        { header: 'เวลาสิ้นสุด', key: 'end_time', width: 15 },
        { header: 'วันที่', key: 'date', width: 15 },
        { header: 'SEC', key: 'sec', width: 10 }
      ];
      
      scheduleSheet.getRow(1).font = { bold: true };
      scheduleSheet.addRows(groupData.rows);
    }

    // ==========================================
    // 🚀 5. ส่งไฟล์กลับไปให้ดาวน์โหลด
    // ==========================================
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=Room_Usage_Report_${startDate}_to_${endDate}.xlsx`);

    await workbook.xlsx.write(res);
    res.end();

  } catch (error) {
    console.error('Export Excel Error:', error);
    res.status(500).json({ message: 'เกิดข้อผิดพลาดในการสร้างไฟล์รายงาน' });
  }
};


// router.get('schedules/showReport', authenticateToken, authorizeRole('staff', 'teacher'), showReport);
export const showReport = async (req, res) => {
  try {
    // 💡 1. ระบุตัวบุคคล: สมมติว่าดึงมาจาก Token ของคนที่ Login อยู่
    // (ถ้าเป็นแอดมินค้นหาให้คนอื่น อาจจะเปลี่ยนไปรับจาก req.params.id แทนได้ครับ)
    const userId = req.user.user_id; 

    // ==========================================
    // 📅 2. คำนวณหาวันจันทร์ และวันอาทิตย์ ของสัปดาห์นี้
    // ==========================================
    const today = new Date();
    const dayOfWeek = today.getDay(); // 0 = วันอาทิตย์, 1 = วันจันทร์, ..., 6 = วันเสาร์
    
    // JS มองวันอาทิตย์คือวันแรกของสัปดาห์ (0) ถ้าเป็นวันอาทิตย์เราต้องถอยไป 6 วันเพื่อหาวันจันทร์
    const distanceToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    
    const monday = new Date(today);
    monday.setDate(today.getDate() + distanceToMonday);
    
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6); // วันอาทิตย์คือวันจันทร์ + 6 วัน

    // ฟังก์ชันแปลงวันที่ให้เป็น YYYY-MM-DD เพื่อเอาไปค้นใน Database
    const formatDate = (dateObj) => {
      const y = dateObj.getFullYear();
      const m = String(dateObj.getMonth() + 1).padStart(2, '0');
      const d = String(dateObj.getDate()).padStart(2, '0');
      return `${y}-${m}-${d}`;
    };

    const startDateStr = formatDate(monday);
    const endDateStr = formatDate(sunday);

    // ==========================================
    // 🗄️ 3. ดึงข้อมูลจากฐานข้อมูล (ช่วงวันจันทร์ - อาทิตย์)
    // ==========================================
    // ดึงคิวการจอง (เอาเฉพาะที่ได้รับการอนุมัติแล้ว)
    const bookingQuery = `
      SELECT booking_id, room_id, purpose, date, start_time, end_time
      FROM public."Booking"
      WHERE user_id = $1 
        AND date >= $2 AND date <= $3
        AND status = 'approved'
      ORDER BY date ASC, start_time ASC
    `;
    const bookingResult = await pool.query(bookingQuery, [userId, startDateStr, endDateStr]);

    // ดึงตารางเรียนรายวิชา (เอาเฉพาะที่ไม่ได้งดคลาส)
    const scheduleQuery = `
      SELECT schedule_id, room_id, subject_name, date, start_time, end_time
      FROM public."Schedules"
      WHERE user_id = $1 
        AND date >= $2 AND date <= $3
        AND temporarily_closed = false
      ORDER BY date ASC, start_time ASC
    `;
    const scheduleResult = await pool.query(scheduleQuery, [userId, startDateStr, endDateStr]);

    // ==========================================
    // 🧮 4. เริ่มคำนวณและสรุปผลข้อมูล
    // ==========================================
    let totalHoursAll = 0; // ชั่วโมงรวมทั้งหมดของสัปดาห์นี้
    const roomUsage = {};  // Object เก็บชั่วโมงแยกตามห้อง เช่น { "Com1": 5.5, "Com2": 2 }

    // ฟังก์ชันย่อยสำหรับคำนวณเวลา (เช่น จาก 08:30 ถึง 10:00 = 1.5 ชม.)
    const calculateHours = (startStr, endStr) => {
      const [startH, startM] = String(startStr).split(':').map(Number);
      const [endH, endM] = String(endStr).split(':').map(Number);
      return (endH + endM / 60) - (startH + startM / 60);
    };

    // ฟังก์ชันย่อยสำหรับนำข้อมูลไปนับเวลาสะสม
    const processUsage = (items) => {
      items.forEach(item => {
        const hours = calculateHours(item.start_time, item.end_time);
        totalHoursAll += hours;

        if (!roomUsage[item.room_id]) {
          roomUsage[item.room_id] = 0;
        }
        roomUsage[item.room_id] += hours; // บวกเวลาเพิ่มเข้าไปในห้องนั้นๆ
      });
    };

    // โยนข้อมูล Booking และ Schedule เข้าไปนับรวมกัน
    processUsage(bookingResult.rows);
    processUsage(scheduleResult.rows);

    // แปลง Object ห้องให้กลายเป็น Array สวยๆ พร้อมให้ Frontend เอาไปวนลูป (Map)
    const summaryByRoom = Object.keys(roomUsage).map(roomId => ({
      room_id: roomId,
      total_hours: roomUsage[roomId]
    }));

    // ==========================================
    // 📤 5. ส่งข้อมูลทั้งหมดกลับให้ Frontend
    // ==========================================
    res.status(200).json({
      message: 'ดึงข้อมูลรายงานประจำสัปดาห์สำเร็จ',
      period: {
        start_date: startDateStr,
        end_date: endDateStr
      },
      summary: {
        total_hours_this_week: totalHoursAll, // รวมทั้งหมดกี่ ชม.
        usage_by_room: summaryByRoom          // สรุปการใช้แยกตามห้อง
      },
      raw_data: {
        bookings: bookingResult.rows,         // ข้อมูลการจองดิบ (เผื่อเอาไปโชว์เป็นรายรายการ)
        schedules: scheduleResult.rows        // ข้อมูลตารางเรียนดิบ
      }
    });

  } catch (error) {
    console.error('Show Report Error:', error);
    res.status(500).json({ message: 'เกิดข้อผิดพลาดในการดึงข้อมูลรายงานการใช้ห้อง' });
  }
};


// router.get('schedules/showReportForStaff', authenticateToken, authorizeRole('staff', 'teacher'), showReportForStaff);
export const showReportForStaff = async (req, res) => {
  try {
    // ==========================================
    // 📅 1. หา "เทอมปัจจุบัน" จาก start_date และ end_date
    // ==========================================
    const termQuery = `
      SELECT 
        term, 
        TO_CHAR(start_date, 'YYYY-MM-DD') AS start_date,
        TO_CHAR(end_date, 'YYYY-MM-DD') AS end_date
      FROM public."Terms" 
      ORDER BY start_date ASC
    `;
    const termResult = await pool.query(termQuery);
    
    if (termResult.rowCount === 0) {
      return res.status(404).json({ message: 'ไม่พบข้อมูลเทอมในระบบ กรุณาตั้งค่าเทอมก่อน' });
    }

    const terms = termResult.rows;
    
    // แปลงวันปัจจุบันให้อยู่ในฟอร์แมต YYYY-MM-DD เพื่อเทียบกับฐานข้อมูล
    const todayStr = new Date().toISOString().split('T')[0];

    let currentTerm = null;

    // 💡 ค้นหาเทอมที่วันปัจจุบันตกอยู่ในช่วง start_date และ end_date
    currentTerm = terms.find(t => todayStr >= t.start_date && todayStr <= t.end_date);

    // ถ้าไม่อยู่ในช่วงเทอมไหนเลย (เช่น ปิดเทอม) ให้ถอยไปหาเทอมล่าสุดที่เพิ่งจบไป
    if (!currentTerm) {
      for (let i = terms.length - 1; i >= 0; i--) {
        if (todayStr > terms[i].end_date) {
          currentTerm = terms[i];
          break;
        }
      }
      // ถ้าระบบยังใหม่มาก (วันนี้อยู่ก่อนเทอมแรกสุด) ให้ยึดเทอมแรกสุดเป็นหลัก
      if (!currentTerm) currentTerm = terms[0];
    }

    const startDateStr = currentTerm.start_date;
    const endDateStr = currentTerm.end_date;

    // ==========================================
    // 🗄️ 2. ดึงข้อมูลการใช้ห้องทั้งหมดในช่วงเทอมนั้น
    // ==========================================
    
    // ดึงข้อมูลการจอง (Booking) ที่ผ่านการอนุมัติแล้ว
    const bookingQuery = `
      SELECT b.room_id, b.start_time, b.end_time, u.user_id, u.name, u.surname
      FROM public."Booking" b
      JOIN public."Users" u ON b.user_id = u.user_id
      WHERE b.date >= $1 AND b.date <= $2
        AND b.status = 'approved'
    `;
    const bookingResult = await pool.query(bookingQuery, [startDateStr, endDateStr]);

    // ดึงข้อมูลตารางเรียน (Schedules) ที่ไม่ได้ถูกงด
    const scheduleQuery = `
      SELECT s.room_id, s.start_time, s.end_time, s.user_id, s.teacher_name AS name, s.teacher_surname AS surname
      FROM public."Schedules" s
      WHERE s.date >= $1 AND s.date <= $2
        AND s.temporarily_closed = false
    `;
    const scheduleResult = await pool.query(scheduleQuery, [startDateStr, endDateStr]);

    // ==========================================
    // 🧮 3. คำนวณและจัดกลุ่มข้อมูล
    // ==========================================
    const roomUsage = {};    
    const teacherUsage = {}; 
    let totalTermHours = 0;

    const calculateHours = (startStr, endStr) => {
      const [startH, startM] = String(startStr).split(':').map(Number);
      const [endH, endM] = String(endStr).split(':').map(Number);
      return (endH + endM / 60) - (startH + startM / 60);
    };

    const processData = (items) => {
      items.forEach(item => {
        const hours = calculateHours(item.start_time, item.end_time);
        totalTermHours += hours;

        // 📊 สะสมยอดรายห้อง
        if (!roomUsage[item.room_id]) roomUsage[item.room_id] = 0;
        roomUsage[item.room_id] += hours;

        // 🧑‍🏫 สะสมยอดรายบุคคล (อาจารย์/ผู้จอง)
        const fullName = `${item.name || ''} ${item.surname || ''}`.trim();
        const userKey = item.user_id || fullName; 

        if (!teacherUsage[userKey]) {
          teacherUsage[userKey] = {
            user_id: item.user_id,
            name: fullName,
            total_hours: 0
          };
        }
        teacherUsage[userKey].total_hours += hours;
      });
    };

    processData(bookingResult.rows);
    processData(scheduleResult.rows);

    // ==========================================
    // 🧹 4. จัดรูปแบบ Object ให้เป็น Array 
    // ==========================================
    
    const summaryByRoom = Object.keys(roomUsage).map(roomId => ({
      room_id: roomId,
      total_hours: roomUsage[roomId]
    })).sort((a, b) => b.total_hours - a.total_hours);

    const summaryByTeacher = Object.values(teacherUsage)
      .sort((a, b) => b.total_hours - a.total_hours);

    // ==========================================
    // 📤 5. ส่ง Response กลับ
    // ==========================================
    res.status(200).json({
      message: 'ดึงข้อมูลรายงานสำหรับ Staff สำเร็จ',
      term_info: {
        term_name: currentTerm.term,
        start_date: startDateStr,
        end_date: endDateStr
      },
      summary: {
        total_hours_all_rooms: totalTermHours,
        room_ranking: summaryByRoom,
        teacher_ranking: summaryByTeacher
      }
    });

  } catch (error) {
    console.error('Show Report For Staff Error:', error);
    res.status(500).json({ message: 'เกิดข้อผิดพลาดในการดึงข้อมูลรายงาน' });
  }
};