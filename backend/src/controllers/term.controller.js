import { pool } from '../config/db.js';


// POST /terms/fillInTerm
// ฟังก์ชันสำหรับเพิ่มหรืออัปเดตวันที่ของเทอมแบบหลายรายการพร้อมกัน (Bulk Upsert)
export const fillInTerm = async (req, res) => {
  // รับค่า terms มาเป็น Array จากหน้าเว็บ
  const { terms } = req.body; 

  // 1. Validation: เช็คว่าส่งข้อมูล terms มาเป็น Array และมีข้อมูลข้างในหรือไม่
  if (!terms || !Array.isArray(terms) || terms.length === 0) {
    return res.status(400).json({ message: 'กรุณาส่งข้อมูล terms เป็นรูปแบบชุดข้อมูล (Array)' });
  }

  const allowedTerms = ['summer', 'first', 'end'];
  const validTerms = [];
  
  // 🚨 ตัวแปรสำหรับเก็บวันที่ของแต่ละเทอมไว้ตรวจสอบข้ามเทอม
  const termDates = {}; 

  // 2. Validation: วนลูปเช็คข้อมูลแต่ละก้อนว่าถูกต้องไหม
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

    // 🚨 แปลงเป็น Date Object เพื่อง่ายต่อการเปรียบเทียบ
    const startDate = new Date(item.start_date);
    const endDate = new Date(item.end_date);

    // 🚨 เงื่อนไขที่ 1: วันเริ่มเทอมของตัวเองต้องน้อยกว่าวันสิ้นสุดของเทอมตัวเอง
    if (startDate >= endDate) {
      return res.status(400).json({ 
        message: `วันที่ของเทอม '${item.term}' ไม่ถูกต้อง: วันเริ่มต้นต้องมาก่อนวันสิ้นสุด` 
      });
    }

    // เก็บวันที่ลง Object ไว้เทียบข้ามเทอม
    termDates[termLower] = { start: startDate, end: endDate };

    // เก็บข้อมูลลง Array เพื่อเตรียม Save
    validTerms.push({ 
      term: termLower, 
      start_date: item.start_date, 
      end_date: item.end_date 
    });
  }

  // ========================================================
  // 🛡️ 3. Cross-term Validation: ตรวจสอบความถูกต้องระหว่างเทอม
  // ========================================================

  // 🚨 เงื่อนไขที่ 2: วันสิ้นสุดเทอมต้น (first) < วันเริ่มเทอมปลาย (end)
  if (termDates['first'] && termDates['end']) {
    if (termDates['first'].end >= termDates['end'].start) {
      return res.status(400).json({ 
        message: 'ลำดับเวลาผิดพลาด: วันสิ้นสุดเทอมต้น ต้องน้อยกว่า วันเริ่มเทอมปลาย' 
      });
    }
  }

  // 🚨 เงื่อนไขที่ 3: วันสิ้นสุดเทอมปลาย (end) < วันเริ่มเทอมฤดูร้อน (summer)
  if (termDates['end'] && termDates['summer']) {
    if (termDates['end'].end >= termDates['summer'].start) {
      return res.status(400).json({ 
        message: 'ลำดับเวลาผิดพลาด: วันสิ้นสุดเทอมปลาย ต้องน้อยกว่า วันเริ่มเทอมฤดูร้อน' 
      });
    }
  }

  // 🚨 เงื่อนไขที่ 4: วันสิ้นสุดเทอมฤดูร้อน (summer) ต้องไม่น้อยกว่าวันปัจจุบัน
  if (termDates['summer']) {
    const today = new Date();
    today.setHours(0, 0, 0, 0); // รีเซ็ตเวลาเป็นเที่ยงคืนเพื่อเทียบแค่วันที่ (ไม่สนใจชั่วโมง/นาที)
    
    const summerEnd = new Date(termDates['summer'].end);
    summerEnd.setHours(0, 0, 0, 0);

    if (summerEnd < today) {
      return res.status(400).json({ 
        message: 'ไม่อนุญาตให้บันทึก: วันสิ้นสุดเทอมฤดูร้อน ต้องไม่ใช่วันในอดีต (ต้องมากกว่าหรือเท่ากับวันปัจจุบัน)' 
      });
    }
  }

  // ========================================================
  // 💾 4. บันทึกลง Database
  // ========================================================
  const client = await pool.connect();

  try {
    await client.query('BEGIN'); // เริ่มการทำงาน

    // เตรียมคำสั่ง Upsert 
    const query = `
      INSERT INTO public."Terms" (term, start_date, end_date) 
      VALUES ($1, $2, $3)
      ON CONFLICT (term) 
      DO UPDATE SET 
        start_date = EXCLUDED.start_date,
        end_date = EXCLUDED.end_date
      RETURNING *;
    `;
    
    const results = [];

    // วนลูปบันทึกข้อมูลทีละรายการ
    for (const item of validTerms) {
      const dbResult = await client.query(query, [item.term, item.start_date, item.end_date]);
      results.push(dbResult.rows[0]);
    }

    await client.query('COMMIT'); // ยืนยันการบันทึกข้อมูลทั้งหมด

    // แจ้งผลลัพธ์กลับไปยัง Frontend
    res.status(200).json({
      message: `บันทึกข้อมูลเทอมจำนวน ${results.length} รายการ สำเร็จแล้ว`,
      data: results
    });

  } catch (error) {
    await client.query('ROLLBACK'); // กู้คืนข้อมูลถ้ามี Error เกิดขึ้นกลางคัน
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
    // 1. ดึงข้อมูลเทอมทั้งหมดมาก่อน
    const query = `
      SELECT 
        term, 
        TO_CHAR(start_date, 'YYYY-MM-DD') AS start_date,
        TO_CHAR(end_date, 'YYYY-MM-DD') AS end_date
      FROM public."Terms"
      ORDER BY 
        CASE term
          WHEN 'first' THEN 1
          WHEN 'end' THEN 2
          WHEN 'summer' THEN 3
          ELSE 4
        END ASC
    `;

    const result = await pool.query(query);
    const terms = result.rows;

    // ========================================================
    // 🧹 2. ตรวจสอบเงื่อนไขปีการศึกษาใหม่ (หลังจบเทอม Summer)
    // ========================================================
    
    // หาข้อมูลเทอม summer จากที่ Query มาได้
    const summerTerm = terms.find(t => t.term === 'summer');

    if (summerTerm && summerTerm.end_date) {
      // สร้างวันที่ปัจจุบันในรูปแบบ YYYY-MM-DD ตาม Local Time
      const today = new Date();
      const y = today.getFullYear();
      const m = String(today.getMonth() + 1).padStart(2, '0');
      const d = String(today.getDate()).padStart(2, '0');
      const todayStr = `${y}-${m}-${d}`;

      // ถ้าวันสิ้นสุดซัมเมอร์ ผ่านมาแล้ว (น้อยกว่าวันนี้)
      if (summerTerm.end_date < todayStr) {
        console.log('[Auto-Reset] ขึ้นปีการศึกษาใหม่ กำลังล้างข้อมูลเทอมเก่า...');
        
        // ล้างข้อมูลทุกแถวในตาราง Terms
        await pool.query(`DELETE FROM public."Terms"`);

        // ส่ง Response กลับไปให้ Frontend ว่าข้อมูลว่างเปล่าแล้ว
        return res.status(200).json({
          message: 'ขึ้นปีการศึกษาใหม่ ระบบได้ทำการล้างข้อมูลเทอมเรียบร้อยแล้ว',
          total: 0,
          data: []
        });
      }
    }

    // ========================================================
    // 📤 3. ถ้ายังไม่จบปีการศึกษา ก็ส่งข้อมูลตามปกติ
    // ========================================================
    res.status(200).json({
      message: 'ดึงข้อมูลเทอมสำเร็จ',
      total: terms.length,
      data: terms
    });

  } catch (error) {
    console.error('Show Term Error:', error);
    res.status(500).json({ message: 'เกิดข้อผิดพลาดในการดึงข้อมูลเทอม' });
  }
};
