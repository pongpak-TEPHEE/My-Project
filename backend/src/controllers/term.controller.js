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

  // 2. Validation: วนลูปเช็คข้อมูลแต่ละก้อนว่าถูกต้องไหม
  for (const item of terms) {
    if (!item.term || !item.date) {
      return res.status(400).json({ 
        message: 'กรุณาระบุข้อมูล term และ date ให้ครบถ้วนในทุกรายการ' 
      });
    }

    const termLower = String(item.term).toLowerCase();

    if (!allowedTerms.includes(termLower)) {
      return res.status(400).json({ 
        message: `ค่า term '${item.term}' ไม่ถูกต้อง (ต้องเป็น summer, first หรือ end เท่านั้น)` 
      });
    }

    validTerms.push({ term: termLower, date: item.date });
  }

  // 🚨 สร้าง Connection สำหรับทำ Transaction
  const client = await pool.connect();

  try {
    await client.query('BEGIN'); // เริ่มการทำงาน

    // 3. เตรียมคำสั่ง Upsert
    const query = `
      INSERT INTO public."Terms" (term, date) 
      VALUES ($1, $2)
      ON CONFLICT (term) 
      DO UPDATE SET date = EXCLUDED.date
      RETURNING *;
    `;
    
    const results = [];

    // 4. วนลูปบันทึกข้อมูลทีละรายการ
    for (const item of validTerms) {
      const dbResult = await client.query(query, [item.term, item.date]);
      results.push(dbResult.rows[0]);
    }

    await client.query('COMMIT'); // ยืนยันการบันทึกข้อมูลทั้งหมด

    // 5. แจ้งผลลัพธ์กลับไปยัง Frontend
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
// ฟังก์ชันสำหรับดึงข้อมูลเทอมและวันที่ทั้งหมด
export const showTerm = async (req, res) => {
  try {
    // ใช้ TO_CHAR เพื่อให้วันที่ส่งกลับไปเป็นฟอร์แมต YYYY-MM-DD แบบเป๊ะๆ ไม่เพี้ยนตาม Timezone
    // และใช้ CASE เพื่อเรียงลำดับให้สวยงาม: first -> end -> summer
    const query = `
      SELECT 
        term, 
        TO_CHAR(date, 'YYYY-MM-DD') AS date 
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

    res.status(200).json({
      message: 'ดึงข้อมูลเทอมสำเร็จ',
      total: result.rowCount,
      data: result.rows
    });

  } catch (error) {
    console.error('Show Term Error:', error);
    res.status(500).json({ message: 'เกิดข้อผิดพลาดในการดึงข้อมูลเทอม' });
  }
};

