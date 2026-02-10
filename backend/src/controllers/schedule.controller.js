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
// อัพโหลดข้อมูล file และอ่านไฟล์เพื่อนำไปใส่ใน database
export const importClassSchedules = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'กรุณาอัปโหลดไฟล์ Excel' });
    }

    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(req.file.buffer);
    
    // ดึง Sheet แรก (ExcelJS เริ่มนับ Sheet ที่ 1)
    const worksheet = workbook.getWorksheet(1);
    
    if (!worksheet) {
       return res.status(400).json({ message: 'ไม่พบข้อมูล Worksheet ในไฟล์' });
    }

    // แปลงข้อมูลใน Sheet ให้เป็น Array of Objects (เลียนแบบ sheet_to_json)
    const importedData = [];
    let headers = {};

    worksheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) {
        // แถวที่ 1: เก็บ Header (key) เช่น room_id, subject_name
        row.eachCell((cell, colNumber) => {
          headers[colNumber] = cell.value; 
        });
      } else {
        // แถวที่ 2+: เก็บข้อมูล
        let rowData = {};
        row.eachCell((cell, colNumber) => {
          const key = headers[colNumber];
          // ดึงค่า value (exceljs บางที return เป็น object ถ้าเป็นสูตร/link)
          let cellValue = cell.value;
          
          // ตรวจสอบว่าเป็น Object หรือ Text ธรรมดา (กรณีมี Hyperlink หรือ RichText)
          if (typeof cellValue === 'object' && cellValue !== null) {
             if (cellValue.text) cellValue = cellValue.text;
             else if (cellValue.result) cellValue = cellValue.result;
          }
          
          if (key) {
             rowData[key] = cellValue;
          }
        });
        importedData.push(rowData);
      }
    });

    console.log(`📥 กำลังนำเข้าตารางเรียน ${importedData.length} รายการ`);

    // STEP 1: หา ID ล่าสุดใน DB
    let currentIdNum = 0;

    const lastIdResult = await pool.query(
      `SELECT schedule_id FROM public."Schedules" 
       ORDER BY schedule_id DESC LIMIT 1`
    );

    if (lastIdResult.rows.length > 0) {
      const lastId = lastIdResult.rows[0].schedule_id;
      const numPart = lastId.replace('schedule', ''); 
      currentIdNum = parseInt(numPart, 10); 
      if (isNaN(currentIdNum)) currentIdNum = 0;
    }

    console.log(`🔢 ID ล่าสุดคือ: schedule${String(currentIdNum).padStart(3, '0')}, เริ่มรันต่อ...`);

    // STEP 2: วนลูปบันทึกข้อมูล
    let successCount = 0;
    const errors = [];

    // เปลี่ยนตัวแปรจาก date เป็น importedData เพื่อไม่ให้สับสนกับตัวแปรวันที่
    for (const [index, row] of importedData.entries()) {
      try {
        const roomId = row.room_id ? String(row.room_id).trim() : null;
        const subjectName = row.subject_name ? String(row.subject_name).trim() : "";
        const teacherName = row.teacher_name ? String(row.teacher_name).trim() : "";
        const semesterId = row.semester_id ? String(row.semester_id).trim() : "";
        
        // ฟังก์ชันจัดการวันที่ (ExcelJS มักจะส่งมาเป็น Date Object อยู่แล้ว ถ้า Format ใน Excel ถูก)
        const startTime = formatExcelData(row.start_time, 'time'); 
        const endTime = formatExcelData(row.end_time, 'time');
        const scheduleDate = formatExcelData(row.date, 'date'); // เปลี่ยนชื่อตัวแปรไม่ให้ซ้ำ

        if (!roomId || !semesterId) {
           throw new Error('ข้อมูลไม่ครบ (ต้องมี room_id, semester_id)');
        }

        // Generate ID
        currentIdNum++;
        const nextScheduleId = `schedule${String(currentIdNum).padStart(3, '0')}`;

        await pool.query(
          `INSERT INTO public."Schedules" 
           (schedule_id, room_id, subject_name, teacher_name, start_time, end_time, semester_id, date)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
          [
            nextScheduleId, 
            roomId,        
            subjectName,    
            teacherName,    
            startTime,      
            endTime,        
            semesterId,     
            scheduleDate    
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
      total: importedData.length,
      success: successCount,
      failed: errors.length,
      errors: errors.length > 0 ? errors : undefined
    });

  } catch (error) {
    console.error('Import Error:', error);
    res.status(500).json({ message: 'เกิดข้อผิดพลาดในการนำเข้าข้อมูล' });
  }
};

// /schedule/:room_id
// ดึงรายการการจองห้องที่มาจาก Excel table
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