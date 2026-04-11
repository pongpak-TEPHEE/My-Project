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

    // ส่วนการแปลง Excel
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

    console.log(`📥 ได้รับข้อมูลต้นแบบ ${importedData.length} รายการ (จะถูกขยายเป็นสัปดาห์)`);

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

    // --- STEP 2: วนลูปตรวจสอบข้อมูล ---
    const validData = []; 
    const errors = [];
    let successCount = 0; // นับจำนวนคาบที่สร้างได้จริง
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

    // ✅ Timestamp ปัจจุบัน
    const dateCreate = new Date().toISOString(); 

    // ✅ Unique string ไม่เกิน 20 ตัวอักษร
    const uniqueSchedules = `sch_${crypto.randomBytes(8).toString('hex')}`; 

    // Loop 1: วนตามแถวใน Excel (รายวิชา)
    for (const [index, row] of importedData.entries()) {
        
        // 🗑️ (เอา semester_id ออกไปแล้ว)
        const roomId = row.room_id ? String(row.room_id).trim() : null;
        const subjectName = row.subject_name ? String(row.subject_name).trim() : "";
        const teacherName = row.name ? String(row.name).trim() : "";
        const teacherSurname = row.surname ? String(row.surname).trim() : "";
        const sec = row.sec ? String(row.sec).trim() : "";

        const department = row.department ? String(row.department).trim() : "";
        const studyYear = row.study_year ? String(row.study_year).trim() : "";
        const programType = row.program_type ? String(row.program_type).trim() : "";


        const searchKey = getFullNameKey(row.name, row.surname);
        
        const teacherId = userMap.get(`${teacherName} ${teacherSurname}`);
        
        let repeatCount = row.repeat ? parseInt(row.repeat) : 15; 

        if (isNaN(repeatCount) || repeatCount < 1) repeatCount = 1;

        // เวลาเริ่ม-จบ
        const startTime = formatExcelData(row.start_time, 'time'); 
        const endTime = formatExcelData(row.end_time, 'time');
        
        // วันที่เริ่มต้น
        const firstDateRaw = formatExcelData(row.date, 'date');

        // Validation 1: ข้อมูลพื้นฐาน 
        if (!roomId || !firstDateRaw) {
             errors.push({ 
                row: index + 2,
                room: roomId || 'ไม่ระบุ', 
                type: 'INVALID_DATA',
                message: 'ข้อมูลไม่ครบ (ต้องมี room_id, date)' 
            });
            continue;
        }
        
        // Validation 2: ข้อมูลอาจารย์
        if (!roomId || !firstDateRaw || !teacherId) {
            
            let errorMsg = 'ข้อมูลไม่ครบ (ต้องมี room_id, date)';
            let errorType = 'INVALID_DATA';

            if (!teacherId) {
                errorMsg = `ไม่พบข้อมูลอาจารย์ชื่อ: '${teacherName} ${teacherSurname}' ในระบบ (กรุณาตรวจสอบการสะกดคำ)`;
                errorType = 'TEACHER_NOT_FOUND';
            }

            errors.push({ 
                row: index + 2,
                room: roomId || 'ไม่ระบุ', 
                type: errorType,
                message: errorMsg 
            });
            continue;
        }

        const baseDateObj = new Date(firstDateRaw);

        for (let week = 0; week < repeatCount; week++) {
            try {
                const targetDateObj = new Date(baseDateObj);
                targetDateObj.setDate(baseDateObj.getDate() + (week * 7));
                const targetDate = targetDateObj.toISOString().split('T')[0];
                
                // ตรวจสอบการชนกับ "ตารางเรียนที่มีอยู่แล้ว"
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
                                 SET status = 'cancelled' 
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
                    
              // 🗑️ (เอา semester_id ออกจาก Object ที่ส่งออกไปแล้ว)
              validData.push({
                  temp_id: `${index + 1}_w${week + 1}`,
                  week_number: week + 1,
                  room_id: roomId,
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
                  uniqueSchedules: uniqueSchedules,
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
// สาเหตุการที่ต้องมีการ confirm เพราะก่อนที่จะเอาข้อมูลลง database ต้องตรวจดูว่ามีการชนกับข้อมูลการจองอื่นๆไหม รับได้ไหมก่อนจะเอาเข้าฐานข้อมูล
export const confirmSchedules = async (req, res) => {
  // รับข้อมูลเป็น Array จาก Frontend
  const { schedules } = req.body;

  if (!schedules || schedules.length === 0) {
    return res.status(400).json({ message: 'ไม่มีข้อมูลที่จะบันทึก' });
  }

  // ดึงข้อมูล Header จากรายการแรกสุดออกมาเตรียมไว้
  const { uniqueSchedules, dateCreate, department, study_year, program_type } = schedules[0];

  // ==========================================
  // 🛡️ เช็คข้อมูลซ้ำ: ป้องกันการอัปโหลดสาขาและชั้นปีที่เคยมีแล้ว
  // ==========================================
  try {
    const checkDuplicateQuery = `
      SELECT unique_schedules 
      FROM public."DetailSchedules" 
      WHERE department = $1 
        AND study_year = $2 
        AND program_type = $3
    `;
    // 💡 สังเกตว่าไม่ต้องมีเงื่อนไข != id เหมือนตอน Edit เพราะนี่คือการสร้างใหม่
    const duplicateCheck = await pool.query(checkDuplicateQuery, [department, study_year, program_type]);

    if (duplicateCheck.rowCount > 0) {
      return res.status(400).json({
        success: false,
        message: `ไม่อนุญาตให้บันทึก: มีตารางเรียนของสาขา "${department}" ปี ${study_year} ภาค ${program_type} อยู่ในระบบแล้ว (กรุณาใช้เมนู 'อัปโหลดไฟล์ใหม่' ทับของเดิมแทน)`
      });
    }
  } catch (error) {
    console.error('Check Duplicate Error:', error);
    return res.status(500).json({ message: 'เกิดข้อผิดพลาดในการตรวจสอบข้อมูลซ้ำ' });
  }


  // ==========================================
  // 💾 ผ่านด่านเช็คซ้ำแล้ว เริ่มกระบวนการบันทึกลง Database
  // ==========================================
  const client = await pool.connect(); // ใช้ Client เพื่อทำ Transaction

  try {
    await client.query('BEGIN'); // เริ่ม Transaction 

    await client.query(
      `INSERT INTO public."DetailSchedules" 
      (unique_schedules, date_create, department, study_year, program_type)
      VALUES ($1, $2, $3, $4, $5)`,
      [uniqueSchedules, dateCreate, department, study_year, program_type]
    );

    console.log(`💾 กำลังบันทึก ${schedules.length} รายการ สำหรับสาขา ${department}...`);

    for (const schedule of schedules) {
      await insertScheduleToDB(client, schedule); 
    }

    await client.query('COMMIT'); // บันทึกจริง
    
    res.json({ 
      success: true, // เพิ่มตัวแปร success ให้ฝั่ง Frontend เช็คง่ายๆ
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
const insertScheduleToDB = async (client, data) => {

  // ใช้ UUID เพื่อป้องกันรหัสซ้ำ 100% 
  const scheduleId = crypto.randomUUID(); 

  // 🗑️ (ถอด semester_id และปรับจำนวน $ ให้เหลือ 12 ตัว)
  await client.query(
    `INSERT INTO public."Schedules" 
     (schedule_id, room_id, subject_name, teacher_name, teacher_surname, start_time, end_time, date, temporarily_closed, user_id, sec, unique_schedules)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
    [
      scheduleId,               // $1
      data.room_id,             // $2
      data.subject_name,        // $3
      data.teacher_name,        // $4
      data.teacher_surname,     // $5
      data.start_time,          // $6
      data.end_time,            // $7
      data.date,                // $8
      data.temporarily_closed,  // $9
      data.user_id,             // $10
      data.sec,                 // $11
      data.uniqueSchedules      // $12
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


export const getScheduleLog = async (req, res) => {
  try {
    // และจัดเรียงข้อมูลตามวันที่สร้างล่าสุด (date_create) จากใหม่ไปเก่า
    const query = `
      SELECT
        unique_schedules,
        department, 
        study_year, 
        program_type, 
        date_create 
      FROM public."DetailSchedules"
      ORDER BY date_create DESC
    `;

    const result = await pool.query(query);

    // ส่งผลลัพธ์กลับไปยัง Frontend
    res.status(200).json({
      success: true,
      message: 'ดึงข้อมูลประวัติตารางเรียนสำเร็จ',
      total: result.rowCount, // บอกจำนวนรายการทั้งหมดที่ดึงมาได้
      data: result.rows
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
  // รับ Primary Key จากพารามิเตอร์ใน URL
  const { id } = req.params; 
  
  // รับข้อมูลใหม่ที่จะเอามาอัปเดตจากแบบฟอร์ม Frontend
  const { department, study_year, program_type } = req.body;

  // Validation: ดักจับกรณีที่ส่งข้อมูลมาไม่ครบ
  if (!department || !study_year || !program_type) {
    return res.status(400).json({ 
      success: false,
      message: 'กรุณากรอกข้อมูลให้ครบถ้วน (ภาควิชา, ชั้นปี, ประเภทโครงการ)' 
    });
  }

  try {
    // ==========================================
    // 🛡️ เช็คข้อมูลซ้ำ: มีตารางนี้อยู่ในระบบแล้วหรือยัง?
    // ==========================================
    const checkDuplicateQuery = `
      SELECT unique_schedules 
      FROM public."DetailSchedules" 
      WHERE department = $1 
        AND study_year = $2 
        AND program_type = $3 
        AND unique_schedules != $4 -- 👈 สำคัญ: ต้องไม่เช็คซ้ำกับ ID ของตัวเอง
    `;
    const checkValues = [department, study_year, program_type, id];
    const duplicateCheck = await pool.query(checkDuplicateQuery, checkValues);

    // ถ้าเจอว่ามีข้อมูลตรงกันทุกอย่าง (rowCount > 0) ให้ดีดกลับทันที
    if (duplicateCheck.rowCount > 0) {
      return res.status(400).json({
        success: false,
        message: `มีตารางเรียนของสาขา "${department}" ปี ${study_year} ภาค ${program_type} อยู่ในระบบแล้ว กรุณาตรวจสอบอีกครั้ง`
      });
    }

    // ==========================================
    // 💾 เริ่มอัปเดตข้อมูลจริง
    // ==========================================
    // คำสั่ง SQL สำหรับอัปเดตข้อมูล และใช้ RETURNING * เพื่อขอดูข้อมูลใหม่ที่เพิ่งแก้เสร็จ
    const query = `
      UPDATE public."DetailSchedules"
      SET department = $1, 
          study_year = $2, 
          program_type = $3
      WHERE unique_schedules = $4
      RETURNING *
    `;

    // เรียงลำดับตัวแปรให้ตรงกับ $1, $2, $3, $4 เป๊ะๆ
    const values = [department, study_year, program_type, id];
    const result = await pool.query(query, values);

    // ถ้า rowCount เป็น 0 แปลว่าหา ID นี้ไม่เจอใน Database
    if (result.rowCount === 0) {
      return res.status(404).json({ 
        success: false,
        message: 'ไม่พบข้อมูลตารางเรียนที่ต้องการแก้ไข (ID ไม่ถูกต้อง)' 
      });
    }

    // ส่งผลลัพธ์กลับไปบอก Frontend ว่าแก้เสร็จแล้ว
    res.status(200).json({
      success: true,
      message: 'แก้ไขข้อมูลรายละเอียดตารางเรียนสำเร็จ',
      data: result.rows[0]
    });

  } catch (error) {
    console.error('Edit Schedule Log Error:', error);
    res.status(500).json({ 
      success: false,
      message: 'เกิดข้อผิดพลาดในการแก้ไขข้อมูลตารางเรียน' 
    });
  }
};

export const deleteScheduleLog = async (req, res) => {
  const { id } = req.params;

  try {
    // ใช้วิธีตั้งค่า ON DELETE CASCADE ทำให้สั่งลบแค่ตารางแม่ตารางเดียว แล้วเดี๋ยว DB จะไปกวาดลบข้อมูลลูกใน Schedules ให้
    const query = `
      DELETE FROM public."DetailSchedules"
      WHERE unique_schedules = $1
      RETURNING *
    `;
    const result = await pool.query(query, [id]);

    if (result.rowCount === 0) {
      return res.status(404).json({ 
        success: false,
        message: 'ไม่พบข้อมูลตารางเรียนที่ต้องการลบ' 
      });
    }

    res.status(200).json({
      success: true,
      message: 'ลบข้อมูลตารางเรียน และช่วงเวลาที่เกี่ยวข้องสำเร็จแล้ว',
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
  const { id } = req.params; // รับ unique_schedules เดิมมาจาก URL
  const { schedules } = req.body; // รับ Array ที่ผ่านการ Preview มา

  if (!schedules || schedules.length === 0) {
    return res.status(400).json({ message: 'ไม่มีข้อมูลที่จะบันทึก' });
  }

  const client = await pool.connect(); 

  try {
    await client.query('BEGIN'); // 🚦 เริ่ม Transaction ปกป้องข้อมูล

    // 💡 1. ทุบ "กำแพงเก่า" ทิ้ง: ลบข้อมูล Schedules ของเดิมที่ผูกกับ ID นี้ออกให้เกลี้ยงก่อน
    await client.query(
      `DELETE FROM public."Schedules" WHERE unique_schedules = $1`,
      [id]
    );

    console.log(`🗑️ ลบข้อมูลตารางเรียนย่อยชุดเก่าของ ID: ${id} ทิ้งแล้ว`);
    console.log(`💾 กำลังบันทึกข้อมูลตารางเรียนชุดใหม่ ${schedules.length} รายการ...`);

    // 💡 2. สร้าง "กำแพงใหม่": วนลูป Insert ข้อมูลที่มาจากไฟล์ใหม่ลงไป 
    // (สามารถเรียกใช้ฟังก์ชัน insertScheduleToDB ตัวเดิมของคุณพงศ์ภัคได้เลย!)
    for (const schedule of schedules) {
      await insertScheduleToDB(client, schedule); 
    }

    // 💡 3. (Optional) อัปเดตเวลา date_create ของตารางแม่ให้เป็นเวลาปัจจุบัน
    await client.query(
      `UPDATE public."DetailSchedules" SET date_create = NOW() WHERE unique_schedules = $1`,
      [id]
    );

    await client.query('COMMIT'); // ✅ ยืนยันการเปลี่ยนแปลงทั้งหมด
    
    res.json({ 
      success: true,
      message: 'อัปเดตไฟล์ตารางเรียนทับข้อมูลเดิมสำเร็จ', 
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
  // 1. รับ ID ตารางแม่เดิม (unique_schedules) จาก URL
  const { id } = req.params; 

  try {
    if (!req.file) {
      return res.status(400).json({ message: 'กรุณาอัปโหลดไฟล์ Excel ใหม่' });
    }

    // ==========================================
    // 💡 นำกลับมาแล้วครับ! ดึงข้อมูล Header เดิม (ภาควิชา, ชั้นปี, หลักสูตร) เพื่อนำมาใช้ซ้ำ
    // ==========================================
    const detailResult = await pool.query(
      `SELECT department, study_year, program_type FROM public."DetailSchedules" WHERE unique_schedules = $1`,
      [id]
    );

    if (detailResult.rowCount === 0) {
      return res.status(404).json({ message: 'ไม่พบประวัติตารางเรียนเดิมในระบบ' });
    }

    const oldDetail = detailResult.rows[0];

    // ==========================================
    // 📊 อ่านไฟล์ Excel ที่เพิ่งอัปโหลดเข้ามาใหม่
    // ==========================================
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(req.file.buffer);
    
    const worksheet = workbook.getWorksheet(1);
    if (!worksheet) {
       return res.status(400).json({ message: 'ไม่พบข้อมูล Worksheet ในไฟล์' });
    }

    // แปลงข้อมูล Excel เป็น Array
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

    console.log(`📥 [Re-upload] ได้รับข้อมูลไฟล์ใหม่ ${importedData.length} รายการ (จะถูกขยายเป็นสัปดาห์)`);

    // ==========================================
    // 🧑‍🏫 เตรียมข้อมูลอาจารย์สำหรับค้นหา ID
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
    let successCount = 0;
    const dateCreate = new Date().toISOString(); 

    // วนลูปตามรายวิชาใน Excel
    for (const [index, row] of importedData.entries()) {
        
        const roomId = row.room_id ? String(row.room_id).trim() : null;
        const subjectName = row.subject_name ? String(row.subject_name).trim() : "";
        const teacherName = row.name ? String(row.name).trim() : "";
        const teacherSurname = row.surname ? String(row.surname).trim() : "";
        const sec = row.sec ? String(row.sec).trim() : "";

        // ค้นหา ID อาจารย์
        const teacherId = userMap.get(`${teacherName} ${teacherSurname}`);
        
        let repeatCount = row.repeat ? parseInt(row.repeat) : 15; 
        if (isNaN(repeatCount) || repeatCount < 1) repeatCount = 1;

        const startTime = formatExcelData(row.start_time, 'time'); 
        const endTime = formatExcelData(row.end_time, 'time');
        const firstDateRaw = formatExcelData(row.date, 'date');

        // Validation ข้อมูลพื้นฐาน (ไม่ต้องเช็ค semester_id แล้ว)
        if (!roomId || !firstDateRaw || !teacherId) {
            let errorMsg = 'ข้อมูลไม่ครบ (ต้องมี room_id, date)';
            let errorType = 'INVALID_DATA';

            if (!teacherId) {
                errorMsg = `ไม่พบข้อมูลอาจารย์ชื่อ: '${teacherName} ${teacherSurname}' ในระบบ`;
                errorType = 'TEACHER_NOT_FOUND';
            }

            errors.push({ 
                row: index + 2,
                room: roomId || 'ไม่ระบุ', 
                type: errorType,
                message: errorMsg 
            });
            continue;
        }

        const baseDateObj = new Date(firstDateRaw);

        // วนลูปตามจำนวนสัปดาห์
        for (let week = 0; week < repeatCount; week++) {
            try {
                const targetDateObj = new Date(baseDateObj);
                targetDateObj.setDate(baseDateObj.getDate() + (week * 7));
                const targetDate = targetDateObj.toISOString().split('T')[0];
                
                // 🛑 เช็คชนกับตารางเรียนอื่นๆ ในระบบ (ยกเว้นตารางเรียนของ ID ตัวเอง)
                const scheduleConflictCheck = await pool.query(
                    `SELECT schedule_id, subject_name, start_time, end_time
                     FROM public."Schedules"
                     WHERE room_id = $1
                     AND date = $2
                     AND unique_schedules != $5 
                     AND (start_time < $4 AND end_time > $3)`,
                    [roomId, targetDate, startTime, endTime, id]
                );

                if (scheduleConflictCheck.rows.length > 0) {
                    const conflict = scheduleConflictCheck.rows[0];
                    throw new Error(
                        `เวลาชนกับวิชาที่มีอยู่แล้ว: ${conflict.subject_name} (${conflict.start_time}-${conflict.end_time})`
                    );
                }

                // 🛑 (สามารถวาง Logic ตรวจสอบ Booking ทับซ้อนตรงนี้ได้เลยครับ)
                
                // ✅ แพ็กข้อมูลเตรียมส่งกลับไป Preview
                validData.push({
                  temp_id: `${index + 1}_w${week + 1}`,
                  week_number: week + 1,
                  room_id: roomId,
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
                  
                  // 👇 ใช้ข้อมูลที่ดึงมาจาก DetailSchedules โดยตรง
                  uniqueSchedules: id, 
                  department: oldDetail.department,
                  study_year: oldDetail.study_year,        
                  program_type: oldDetail.program_type     
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
        } // จบ Loop สัปดาห์
    } // จบ Loop แถว Excel

    // ส่ง Response ข้อมูล Preview กลับให้ Frontend
    res.status(200).json({
        message: 'ตรวจสอบไฟล์ใหม่เรียบร้อย',
        total_rows_excel: importedData.length,
        total_generated_slots: successCount + errors.length,
        valid_count: validData.length,
        error_count: errors.length,
        previewData: validData, 
        errors: errors.length > 0 ? errors : undefined
    });

  } catch (error) {
    console.error('Re-upload Error:', error);
    res.status(500).json({ message: 'เกิดข้อผิดพลาดในการตรวจสอบและอัปเดตไฟล์' });
  }
};


// GET /schedules/subjects/:unique_schedules
// ฟังก์ชันแสดงรายการวิชาที่ไม่ซ้ำกันในชุดอัปโหลดนั้นๆ (ดึงเฉพาะวันแรกที่เริ่มเรียน)
export const showSubjectSchedule = async (req, res) => {
  const { unique_schedules } = req.params; 

  if (!unique_schedules) {
    return res.status(400).json({ message: 'กรุณาระบุรหัสชุดข้อมูลตารางเรียน (unique_schedules)' });
  }

  try {
    // 1. DISTINCT ON (subject_name, sec) -> จัดกลุ่มวิชาและเซคเดียวกันให้เหลือแค่ Record เดียว
    // 2. 🗑️ เอา semester_id ออก
    // 3. ⚡ ดึง teacher_name, teacher_surname จากตาราง Schedules ได้เลย ไม่ต้อง JOIN แล้ว
    const query = `
      SELECT DISTINCT ON (subject_name, sec)
        room_id, 
        subject_name, 
        teacher_name, 
        teacher_surname, 
        start_time, 
        end_time, 
        TO_CHAR(date, 'YYYY-MM-DD') AS date, -- ป้องกัน Timezone เพี้ยน
        sec
      FROM public."Schedules"
      WHERE unique_schedules = $1
      ORDER BY subject_name, sec, date ASC
    `;

    const result = await pool.query(query, [unique_schedules]);

    // จัด Format ข้อมูลเวลาให้สวยงาม (ตัดวินาทีทิ้ง)
    const formattedSubjects = result.rows.map(row => ({
      ...row,
      start_time: String(row.start_time).substring(0, 5),
      end_time: String(row.end_time).substring(0, 5)
    }));

    res.json({
      message: `ดึงข้อมูลสำเร็จ พบทั้งหมด ${formattedSubjects.length} รายวิชา`,
      subjects: formattedSubjects
    });

  } catch (error) {
    console.error('Show Subject Schedule Error:', error);
    res.status(500).json({ message: 'เกิดข้อผิดพลาดในการดึงข้อมูลรายวิชา' });
  }
};


export const editSubjectDataSchedule = async (req, res) => {
  const { unique_schedules } = req.params; 
  const {
    old_subject_name, 
    old_sec,          
    room_id,
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

  if (!unique_schedules || !old_subject_name || !old_sec) {
    return res.status(400).json({ message: 'ข้อมูลระบุวิชาเดิมไม่ครบถ้วน' });
  }
  if (!date || !repeat || repeat < 1) {
    return res.status(400).json({ message: 'ข้อมูลวันที่เริ่มหรือจำนวนรอบ (repeat) ไม่ถูกต้อง' });
  }

  const client = await pool.connect();

  try {
    await client.query('BEGIN'); 

    const userResult = await client.query(
      `SELECT user_id FROM public."Users" 
       WHERE name = $1 AND surname = $2`,
      [teacher_name, teacher_surname]
    );

    if (userResult.rows.length === 0) {
      throw { status: 404, message: 'ไม่พบข้อมูลอาจารย์ท่านนี้ในระบบ (ชื่อหรือนามสกุลไม่ตรง)' };
    }
    const teacherUserId = userResult.rows[0].user_id;
    
    // 🔍 ปรับให้ดึงแค่ schedule_id มาเช็คว่ามีวิชานี้อยู่จริงไหม
    const oldDataResult = await client.query(
       `SELECT schedule_id
        FROM public."Schedules"
        WHERE unique_schedules = $1 AND subject_name = $2 AND sec = $3
        LIMIT 1`,
       [unique_schedules, old_subject_name, old_sec]
    );

    if (oldDataResult.rows.length === 0) {
        throw { status: 404, message: 'ไม่พบรายวิชาเดิมที่ต้องการแก้ไข' };
    }

    // 🗑️ ลบของเก่าทิ้งไปก่อน
    await client.query(
      `DELETE FROM public."Schedules"
       WHERE unique_schedules = $1 AND subject_name = $2 AND sec = $3`,
      [unique_schedules, old_subject_name, old_sec]
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
      // 🚨 1. เช็คว่าทับซ้อนกับ "ตารางเรียนวิชาอื่น" (Schedules) หรือไม่?
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
      const scheduleId = crypto.randomUUID();
      const insertQuery = `
        INSERT INTO public."Schedules"
        (schedule_id, unique_schedules, room_id, subject_name, user_id, teacher_name, teacher_surname, date, start_time, end_time, sec)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      `;

      await client.query(insertQuery, [
        scheduleId,          
        unique_schedules,    
        room_id,             
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
    
    // ดัก Error 409 เพื่อส่งกลับให้ Frontend แสดบ Pop-up
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
  const { unique_schedules } = req.params; 
  // รับชื่อวิชาและ sec ที่ต้องการลบ (ใช้ req.body หรือ req.query ก็ได้ ขึ้นอยู่กับฝั่ง Frontend ส่งมา)
  const { subject_name, sec } = req.body; 
  const { user_id, role } = req.user; // ดึงข้อมูลคนกดลบมาจาก Token

  // 1. ตรวจสอบว่าส่งข้อมูลมาครบไหม
  if (!unique_schedules || !subject_name || !sec) {
    return res.status(400).json({ 
      message: 'กรุณาระบุรหัสชุดตารางเรียน (unique_schedules), ชื่อวิชา และหมู่เรียน (sec) ให้ครบถ้วน' 
    });
  }

  try {
    // 2. 🔍 เช็คก่อนว่ามีวิชานี้อยู่จริงไหม และใครเป็นเจ้าของ
    const checkQuery = await pool.query(
      `SELECT user_id FROM public."Schedules" 
       WHERE unique_schedules = $1 AND subject_name = $2 AND sec = $3 
       LIMIT 1`,
      [unique_schedules, subject_name, sec]
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

    // 4. 🗑️ ทำการลบข้อมูล (จะลบออกกี่สัปดาห์ก็ตามที่ตรงกับเงื่อนไขนี้)
    const deleteResult = await pool.query(
      `DELETE FROM public."Schedules" 
       WHERE unique_schedules = $1 AND subject_name = $2 AND sec = $3`,
      [unique_schedules, subject_name, sec]
    );

    res.json({ 
      message: `ลบตารางเรียนวิชา ${subject_name} กลุ่มเรียน ${sec} สำเร็จแล้ว (จำนวน ${deleteResult.rowCount} รายการ)`,
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
