import { pool } from '../config/db.js';
import { v4 as uuidv4 } from 'uuid';



export const fillInTerm = async (req, res) => {
  const { terms } = req.body; 

  if (!terms || !Array.isArray(terms) || terms.length === 0) {
    return res.status(400).json({ message: 'กรุณาส่งข้อมูล terms เป็นรูปแบบชุดข้อมูล (Array)' });
  }

  const allowedTerms = ['summer', 'first', 'end'];
  const termDates = {}; 

  // ========================================================
  // 🛡️ 1. Validation ข้อมูลพื้นฐานแต่ละรายการ
  // ========================================================
  for (const item of terms) {
    if (!item.term || !item.start_date || !item.end_date) {
      return res.status(400).json({ 
        message: 'กรุณาระบุข้อมูล term, start_date และ end_date ให้ครบถ้วนในทุกรายการ' 
      });
    }

    const termLower = String(item.term).toLowerCase();
    if (!allowedTerms.includes(termLower)) {
      return res.status(400).json({ 
        message: `ค่า term '${item.term}' ไม่ถูกต้อง (ต้องเป็น summer, first หรือ end เท่านั้น)` 
      });
    }

    const startDate = new Date(item.start_date);
    const endDate = new Date(item.end_date);

    if (startDate >= endDate) {
      return res.status(400).json({ 
        message: `วันที่ของเทอม '${item.term}' ไม่ถูกต้อง: วันเริ่มต้นต้องมาก่อนวันสิ้นสุด` 
      });
    }
    termDates[termLower] = { start: startDate, end: endDate };
  }

  // ========================================================
  // 🛡️ 2. Cross-term Validation (เช็คข้ามเทอม)
  // ========================================================
  if (!termDates['first'] || !termDates['end'] || !termDates['summer']) {
    return res.status(400).json({ message: 'ต้องกรอกข้อมูลให้ครบทั้ง 3 เทอมพร้อมกัน (first, end, summer)' });
  }

  if (termDates['first'].end >= termDates['end'].start) {
    return res.status(400).json({ message: 'ลำดับเวลาผิดพลาด: วันสิ้นสุดเทอมต้น ต้องน้อยกว่า วันเริ่มเทอมปลาย' });
  }

  if (termDates['end'].end >= termDates['summer'].start) {
    return res.status(400).json({ message: 'ลำดับเวลาผิดพลาด: วันสิ้นสุดเทอมปลาย ต้องน้อยกว่า วันเริ่มเทอมฤดูร้อน' });
  }

  // ========================================================
  // ⚙️ 3. จัดเตรียม academic_year และ status 
  // ========================================================
  // 💡 ดึง "ปี" จากเทอม first มาเป็น academic_year 
  const academicYear = termDates['first'].start.getFullYear().toString();

  // 💡 ลอจิกหา status: ถ้าสิ้นสุด summer ถือว่า past, ถ้ายังไม่ถึงถือว่า active
  const today = new Date();
  today.setHours(0, 0, 0, 0); 
  const summerEnd = new Date(termDates['summer'].end);
  summerEnd.setHours(0, 0, 0, 0);

  const termStatus = summerEnd < today ? 'past' : 'active';

  // เตรียมข้อมูลชุดสุดท้ายสำหรับบันทึก
  const finalTerms = [
    { id: uuidv4(), term: 'first', start_date: termDates['first'].start, end_date: termDates['first'].end, academic_year: academicYear, status: termStatus },
    { id: uuidv4(), term: 'end', start_date: termDates['end'].start, end_date: termDates['end'].end, academic_year: academicYear, status: termStatus },
    { id: uuidv4(), term: 'summer', start_date: termDates['summer'].start, end_date: termDates['summer'].end, academic_year: academicYear, status: termStatus }
  ];

  // ========================================================
  // 💾 4. บันทึกลง Database
  // ========================================================
  const client = await pool.connect();

  try {
    await client.query('BEGIN'); 

    // 💡 ถ้ามีการเพิ่มเทอมชุดใหม่เข้ามา (ที่มี status เป็น active)
    // เราควรทำการเปลี่ยนเทอมเก่าๆ ทั้งหมดที่เคยเป็น active ให้กลายเป็น past ก่อน
    if (termStatus === 'active') {
      await client.query(`UPDATE public."Terms" SET status = 'past' WHERE status = 'active'`);
    }

    // Insert ข้อมูลชุดใหม่
    const query = `
      INSERT INTO public."Terms" (id, term, start_date, end_date, academic_year, status) 
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *;
    `;
    
    const results = [];
    for (const item of finalTerms) {
      const dbResult = await client.query(query, [item.id, item.term, item.start_date, item.end_date, item.academic_year, item.status]);
      results.push(dbResult.rows[0]);
    }

    await client.query('COMMIT'); 

    res.status(200).json({
      message: `บันทึกข้อมูลปีการศึกษา ${academicYear} สำเร็จ (สถานะ: ${termStatus})`,
      data: results
    });

  } catch (error) {
    await client.query('ROLLBACK'); 
    console.error('Fill In Terms Error:', error);
    res.status(500).json({ message: 'เกิดข้อผิดพลาดในการบันทึกข้อมูลเทอม' });
  } finally {
    client.release();
  }
};


// GET /terms/showTerm
// ฟังก์ชันสำหรับดึงข้อมูลเทอมและช่วงเวลาทั้งหมด
export const showTerm = async (req, res) => {
  try {
    const query = `
      SELECT 
        id, academic_year, term, status,
        TO_CHAR(start_date, 'YYYY-MM-DD') AS start_date,
        TO_CHAR(end_date, 'YYYY-MM-DD') AS end_date
      FROM public."Terms"
      WHERE status = 'active'
      ORDER BY 
        CASE term
          WHEN 'first' THEN 1
          WHEN 'end' THEN 2
          WHEN 'summer' THEN 3
          ELSE 4
        END ASC
    `;

    const result = await pool.query(query);

    res.status(200).json({
      message: 'ดึงข้อมูลเทอมปัจจุบันสำเร็จ',
      total: result.rowCount,
      data: result.rows
    });

  } catch (error) {
    console.error('Show Term Error:', error);
    res.status(500).json({ message: 'เกิดข้อผิดพลาดในการดึงข้อมูลเทอม' });
  }
};
