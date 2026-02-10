import { pool } from '../config/db.js';


// /users
// (ยังไม่เปิดใช้งาน !!!!) ดึงรายชื่อของ ผู้ใช้งานทั้งหมดของระบบ
export const getUsers = async (req, res) => {
  const result = await pool.query('SELECT * FROM public."Users"');
  res.json(result.rows);
};

// /users/create
// ใช้เมื่อสร้าง frome สำหรับเพิ่ม user (teacher, staff) โดยใสข้อมูล (user_id, title, name, surname, role, email)
export const createUser = async (req, res) => {

  const { user_id, title, name, surname, role, email } = req.body;

  // Validation: ตรวจสอบข้อมูลจำเป็น
  if (!user_id || !name || !role || !email) {
    return res.status(400).json({ message: 'กรุณากรอกข้อมูลให้ครบถ้วน (รหัส, ชื่อ, อีเมล, ตำแหน่ง)' });
  }

  try {
    // 2. เช็คว่ามี User นี้ในระบบหรือยัง (เช็คจาก user_id หรือ email)
    const checkUser = await pool.query(
      'SELECT user_id FROM public."Users" WHERE user_id = $1 OR email = $2', 
      [user_id, email]
    );

    if (checkUser.rows.length > 0) {
      return res.status(400).json({ message: 'ผู้ใช้งานนี้ (รหัสหรืออีเมล) มีอยู่ในระบบแล้ว' });
    }

    // 3. เพิ่มลง Database
    // created_at จะใช้ฟังก์ชัน NOW() ของ PostgreSQL เพื่อเอาเวลาปัจจุบันของ Database
    const newUser = await pool.query(
      `INSERT INTO public."Users" 
       (user_id, title, name, surname, role, email, is_verified, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, TRUE, NOW())
       RETURNING user_id, title, name, surname, email, role, created_at`,
      [
        user_id,       // $1
        title || '',   // $2 (ไม่ส่งมา ให้เป็นค่าว่าง)
        name,          // $3
        surname || '', // $4 (ไม่ส่งมา ให้เป็นค่าว่าง)
        role,          // $5
        email          // $6
      ]
    );

    // 4. ส่งผลลัพธ์กลับ
    res.status(201).json({
      message: 'เพิ่มผู้ใช้งานสำเร็จ',
      user: newUser.rows[0]
    });

  } catch (error) {
    console.error('Create User Error:', error);
    // เช็ค Error จาก Database (เช่น user_id ซ้ำ)
    if (error.code === '23505') {
        return res.status(400).json({ message: 'ข้อมูลซ้ำ: รหัสผู้ใช้หรืออีเมลนี้ถูกใช้งานแล้ว' });
    }
    res.status(500).json({ message: 'เกิดข้อผิดพลาดในการเพิ่มข้อมูล' });
  }
};
