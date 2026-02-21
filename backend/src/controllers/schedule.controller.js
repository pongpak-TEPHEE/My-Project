import { pool } from '../config/db.js';
import ExcelJS from 'exceljs';
import crypto from 'crypto'; // สำหรับเข้าระหัส schedule_id
import { sendBookingCancelledEmail } from '../services/mailer.js';

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

    // --- STEP 2: วนลูปตรวจสอบข้อมูล---
    const validData = []; 
    const errors = [];
    let successCount = 0; // นับจำนวนคาบที่สร้างได้จริง (ไม่ใช่จำนวนแถว Excel)
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
    // Loop 1: วนตามแถวใน Excel (รายวิชา)
    for (const [index, row] of importedData.entries()) {
        
        // ดึงข้อมูลพื้นฐานที่ไม่แปรผัน หรือไม่เปลี่ยนค่าตามเวลา
        const roomId = row.room_id ? String(row.room_id).trim() : null;
        const subjectName = row.subject_name ? String(row.subject_name).trim() : "";
        const teacherName = row.name ? String(row.name).trim() : "";
        const teacherSurname = row.surname ? String(row.surname).trim() : "";
        const semesterId = row.semester_id ? String(row.semester_id).trim() : "";

        const searchKey = getFullNameKey(row.name, row.surname);
        // 🚨 เพิ่ม 2 บรรทัดนี้เพื่อ Debug
        console.log(`🔍 กำลังหาชื่อ: [${searchKey}]`); 
        console.log(`📋 รายชื่อในฐานข้อมูล (5 คนแรก):`, Array.from(userMap.keys()).slice(0, 8));
        // ค้นหา teacherId จาก userMap โดยใช้ ชื่อและนามสกุล ต่อกัน
        const teacherId = userMap.get(`${teacherName} ${teacherSurname}`);
        
        console.log("roomId " , roomId);
        console.log("subject name " , subjectName);
        console.log("teacher name " , teacherName);
        console.log("teacher surname " , teacherSurname);
        console.log("semester id " , semesterId);
        console.log("teacher id " , teacherId);
        
        // - ถ้ามีข้อมูล: ให้แปลงเป็นตัวเลข (parseInt)
        // - ถ้าไม่มีข้อมูล: ให้ Default เป็น 15 (ตามลูปเดิมของคุณ) หรือจะเป็น 1 ก็ได้แล้วแต่ตกลง
        let repeatCount = row.repeat ? parseInt(row.repeat) : 15; 

        // กันพลาด: ถ้าเลขที่ใส่มาน้อยกว่า 1 ให้บังคับเป็น 1
        if (isNaN(repeatCount) || repeatCount < 1) repeatCount = 1;

        // เวลาเริ่ม-จบ
        const startTime = formatExcelData(row.start_time, 'time'); 
        const endTime = formatExcelData(row.end_time, 'time');
        
        // วันที่เริ่มต้น
        const firstDateRaw = formatExcelData(row.date, 'date');

        // Validation
        if (!roomId || !semesterId || !firstDateRaw) {
             errors.push({ 
                row: index + 2,
                room: roomId || 'ไม่ระบุ', 
                type: 'INVALID_DATA',
                message: 'ข้อมูลไม่ครบ (ต้องมี room_id, semester_id, date)' 
            });
            continue;
        }
        // ✅ 3. ปรับ Validation ให้เช็คว่า "เจออาจารย์คนนี้ในระบบไหม"
        if (!roomId || !semesterId || !firstDateRaw || !teacherId) {
            
            // แยกข้อความ Error ให้ชัดเจนว่าข้อมูลขาด หรือหาอาจารย์ไม่เจอ
            let errorMsg = 'ข้อมูลไม่ครบ (ต้องมี room_id, semester_id, date)';
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
                // คำนวณวันที่ (Logic เดิมถูกต้องแล้วครับ)
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
                // เปลี่ยนจาก NOT IN เป็น IN ('pending', 'approved') เพื่อให้ตรงกับเงื่อนไขที่คุณต้องการ
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
                     LEFT JOIN public."Users" u ON b.teacher_id = u.user_id
                     WHERE b.room_id = $1 
                     AND b.date = $2 
                     AND b.status IN ('pending', 'approved') 
                     AND (b.start_time < $4 AND b.end_time > $3)`, 
                    [roomId, targetDate, startTime, endTime]
                );

                if (bookingConflictCheck.rows.length > 0) {
                    // หาค่าวันที่ปัจจุบันในรูปแบบ 'YYYY-MM-DD' เพื่อนำมาเทียบ
                    // การเทียบ String วันที่ในรูปแบบ ISO สามารถใช้เครื่องหมาย > < ได้เลย (เช่น '2026-09-10' > '2026-09-08' จะเป็น true)
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

                            // สร้าง Key เฉพาะสำหรับการยกเลิกด้วยตารางเรียน เช่น "booking_cancel_conflict_b0001"
                            const cooldownKey = `booking_cancel_conflict_${conflict.booking_id}`; 
                            const COOLDOWN_MINUTES = 5; // ห้ามส่งอีเมลซ้ำสำหรับ Booking ID นี้ ภายใน 5 นาที
                            let shouldSendEmail = true;

                            if (emailCooldowns.has(cooldownKey)) {
                                const lastSentTime = emailCooldowns.get(cooldownKey);
                                const diffMinutes = (Date.now() - lastSentTime) / (1000 * 60);

                                if (diffMinutes < COOLDOWN_MINUTES) {
                                    shouldSendEmail = false;
                                    console.log(`⏳ [Rate Limit] ข้ามการส่งเมลยกเลิกอัตโนมัติให้ ${toEmail} (เพิ่งส่งไปเมื่อ ${diffMinutes.toFixed(1)} นาทีที่แล้ว)`);
                                }
                            }
                            
                            if (toEmail && shouldSendEmail) {
                              // บันทึกเวลาที่ส่งลง Map
                              emailCooldowns.set(cooldownKey, Date.now());

                              sendBookingCancelledEmail(
                                  toEmail, 
                                  userName, 
                                  roomId, 
                                  formattedDate, 
                                  timeSlotStr, 
                                  subjectName
                              );
                              
                              console.log(`📧 สั่งส่งอีเมลแจ้งยกเลิก Booking ID: ${conflict.booking_id} ไปที่ ${toEmail} เรียบร้อยแล้ว`);
                            }
                            console.log(`⚠️ ยกเลิก Booking ID: ${conflict.booking_id} อัตโนมัติ เนื่องจากชนตารางเรียนวิชา ${subjectName}`);
                          }
                        }
                    }
              validData.push({
                  temp_id: `${index + 1}_w${week + 1}`,
                  week_number: week + 1,
                  room_id: roomId,
                  subject_name: subjectName,
                  teacher_name: teacherName,
                  teacher_surname: teacherSurname,
                  start_time: startTime,
                  end_time: endTime,
                  semester_id: semesterId,
                  temporarily_closed: false,
                  teacher_id: teacherId,
                  date: targetDate
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
        } // End Inner Loop (repeatCount Weeks)
    }

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

    console.log(`💾 กำลังบันทึก ${schedules.length} รายการ...`);

    for (const schedule of schedules) {

      await insertScheduleToDB(client, schedule); 
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
const insertScheduleToDB = async (client, data) => {

  // UUID  จะได้รหัสยาวๆ เช่น '550e8400-e29b-41d4-a716-446655440000'
  const scheduleId = crypto.randomUUID(); 

  // สุ่มแบบสั้นๆ 'sch_a1b2c3d4' (ยาว 12 ตัวอักษร)
  // const randomHex = crypto.randomBytes(4).toString('hex'); 
  // const scheduleId = `sch_${randomHex}`;

  await client.query(
    `INSERT INTO public."Schedules" 
     (schedule_id, room_id, subject_name, teacher_name, teacher_surname, start_time, end_time, semester_id, date, temporarily_closed, teacher_id)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
    [
      scheduleId,
      data.room_id,
      data.subject_name,
      data.teacher_name,
      data.teacher_surname,
      data.start_time,
      data.end_time,
      data.semester_id,
      data.date,
      data.temporarily_closed,
      data.teacher_id
    ]
  );

     // ส่งค่าตัวเลขล่าสุดกลับไป เพื่อให้รอบต่อไปนับต่อได้
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
        teacher_surname,
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
