import { pool } from '../config/db.js';
import xlsx from 'xlsx';
import fs from 'fs';

// ฟังก์ชันสำหรับ Import Excel ลง Table Semesters
const formatExcelTime = (value) => {
  if (!value) return null;
  
  // 1. ถ้ามาเป็นตัวเลขทศนิยม (เช่น 0.375)
  if (typeof value === 'number') {
    // Excel เก็บเวลาเป็นสัดส่วนของวัน (1 วัน = 24 ชม.)
    // สูตร: ค่า * 24 * 60 * 60 = จำนวนวินาทีทั้งหมด
    const totalSeconds = Math.round(value * 24 * 60 * 60);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    
    // จัดรูปแบบให้เป็น "HH:MM" (เติม 0 ข้างหน้าถ้าหลักเดียว)
    const hh = String(hours).padStart(2, '0');
    const mm = String(minutes).padStart(2, '0');
    return `${hh}:${mm}`;
  }
  
  // 2. ถ้ามาเป็น String อยู่แล้ว (เช่น "09:00") ก็ส่งกลับไปได้เลย
  return String(value).trim();
};

export const importClassSchedules = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'กรุณาอัปโหลดไฟล์ Excel' });
    }

    const workbook = xlsx.read(req.file.buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];

    const data = xlsx.utils.sheet_to_json(sheet, { defval: "" });

    console.log(`📥 กำลังนำเข้าตารางเรียน ${date.length} รายการ`);

    // ---------------------------------------------------------
    // 🟡 STEP 1: หา ID ล่าสุดใน DB ก่อน เพื่อจะนับต่อ
    // ---------------------------------------------------------
    let currentIdNum = 0;

    // Query เพื่อหา schedule_id ตัวที่มากที่สุด (Sort DESC แล้วเอาตัวแรก)
    const lastIdResult = await pool.query(
      `SELECT schedule_id FROM public."Schedules" 
       ORDER BY schedule_id DESC LIMIT 1`
    );

    if (lastIdResult.rows.length > 0) {
      const lastId = lastIdResult.rows[0].schedule_id; // เช่น "schedule005"
      // ตัดคำว่า "schedule" ออก เหลือแค่ตัวเลข แล้วแปลงเป็น Int
      const numPart = lastId.replace('schedule', ''); 
      currentIdNum = parseInt(numPart, 10); 
      
      // กันเหนียว: กรณี parse ไม่ได้ ให้เริ่มที่ 0
      if (isNaN(currentIdNum)) currentIdNum = 0;
    }

    console.log(`🔢 ID ล่าสุดในระบบคือ: schedule${String(currentIdNum).padStart(3, '0')}, เริ่มรันต่อที่เลขถัดไป...`);

    // ---------------------------------------------------------
    
    let successCount = 0;
    const errors = [];

    for (const [index, row] of date.entries()) {
      try {
        const roomId = row.room_id ? String(row.room_id).trim() : null;
        const subjectName = row.subject_name ? String(row.subject_name).trim() : "";
        const teacherName = row.teacher_name ? String(row.teacher_name).trim() : "";
        const semesterId = row.semester_id ? String(row.semester_id).trim() : "";
        
        const startTime = formatExcelTime(row.start_time); 
        const endTime = formatExcelTime(row.end_time);
        const date = formatExcelTime(row.date);

        // console.log("semesterID = ", semesterId);
        if (!roomId || !semesterId ) {
           throw new Error('ข้อมูลไม่ครบ (ต้องมี room_id, semester_id');
        }

        // 🟡 STEP 2: สร้าง ID ใหม่ (Generate New ID)
        currentIdNum++; // บวกเลขเพิ่ม 1
        // แปลงเป็น String และเติม 0 ข้างหน้าให้ครบ 3 หลัก (001, 010, 100)
        const nextScheduleId = `schedule${String(currentIdNum).padStart(3, '0')}`;

        await pool.query(
          `INSERT INTO public."Schedules" 
           (schedule_id, room_id, subject_name, teacher_name, start_time, end_time, semester_id, data)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
          [
            nextScheduleId, // $1: ใส่ ID ที่เราสร้างเอง
            roomId,         // $2
            subjectName,    // $3
            teacherName,    // $4
            startTime,      // $5
            endTime,        // $6
            semesterId,     // $7
            date            // $8
            
          ]
        );
        successCount++;

      } catch (err) {
        console.error(`❌ Error row ${index + 2}:`, err.message);
        errors.push({ row: index + 2, error: err.message });
      }
    }

    res.json({
      message: 'Import ตารางเรียนเรียบร้อยแล้ว',
      total: date.length,
      success: successCount,
      failed: errors.length,
      errors: errors.length > 0 ? errors : undefined
    });

  } catch (error) {
    console.error('Import Error:', error);
    res.status(500).json({ message: 'เกิดข้อผิดพลาดในการนำเข้าข้อมูล' });
  }
};

export const getSchedule = async (req, res) => {
  try {
    const { room_id } = req.params;      // รับ room_id จาก URL
    const { semester_id } = req.query;   // รับ semester_id จาก Query Param (ถ้ามี)

    // 1. สร้าง Query พื้นฐาน
    let sql = `
      SELECT 
        schedule_id, 
        room_id, 
        subject_name, 
        teacher_name, 
        start_time, 
        end_time, 
        semester_id, 
        date 
      FROM public."Schedules"
      WHERE room_id = $1
    `;
    
    
    const params = [room_id];

    // 2. ถ้ามีการส่ง semester_id มา ให้กรองเฉพาะเทอมนั้น
    if (semester_id) {
      sql += ` AND semester_id = $2`;
      params.push(semester_id);
    }

    // 3. เพิ่มการเรียงลำดับ (ORDER BY)
    // เรียงตาม 'data' (วัน/วันที่) ก่อน แล้วค่อยเรียงตามเวลาเริ่มเรียน
    // (หมายเหตุ: ถ้า data เป็นภาษาไทย 'จันทร์', 'อังคาร' Database อาจจะเรียงตามก-ฮ ไม่ใช่วันจริง
    // แต่ถ้า data เป็นวันที่ (Date) หรือตัวเลข จะเรียงได้ถูกต้องทันที)
    sql += ` ORDER BY date ASC, start_time ASC`;

    const result = await pool.query(sql, params);

    // 4. จัด Format เวลาให้สวยงาม (ตัดวินาทีออก ถ้า Database เก็บมาเป็น 09:00:00)
    const formattedSchedules = result.rows.map(row => ({
      ...row,
      start_time: String(row.start_time).substring(0, 5), // ตัดเหลือ 09:00
      end_time: String(row.end_time).substring(0, 5)      // ตัดเหลือ 12:00
    }));

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