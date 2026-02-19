import { pool } from '../config/db.js';


// /users
// (ยังไม่เปิดใช้งาน !!!!) ดึงรายชื่อของ ผู้ใช้งานทั้งหมดของระบบ
export const getUsers = async (req, res) => {
  const result = await pool.query('SELECT * FROM public."Users"');
  res.json(result.rows);
};

// /users/create
// ใช้เมื่อสร้าง form สำหรับเพิ่ม user (teacher, staff) โดยใสข้อมูล (user_id, title, name, surname, role, email)
export const createUser = async (req, res) => {

  const { user_id, title, name, surname, role, email } = req.body;

  // Validation: ตรวจสอบข้อมูลจำเป็น
  if (!user_id || !name || !role || !email) {
    return res.status(400).json({ message: 'กรุณากรอกข้อมูลให้ครบถ้วน (รหัส, ชื่อ, อีเมล, ตำแหน่ง)' });
  }

  // if ()

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
       (user_id, title, name, surname, role, email, is_verified, is_active, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, FALSE, TRUE, NOW())
       RETURNING user_id, title, name, surname, email, role, created_at`,
      [
        user_id,
        title || '',
        name,
        surname || '',
        role,
        email
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

// /users/delete
// ใช้เพื่อ ทำการลบ user
export const deleteUser = async (req, res) => {

  const { user_id } = req.params;
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // STEP 1: ตรวจสอบประวัติการใช้งาน (Check Dependencies)
    
    // เช็ค 1: เคยมีการจองห้องหรือไม่? (เช็คจาก teacher_id)
    const checkBooking = await client.query(
      `SELECT 1 FROM public."Booking" WHERE teacher_id = $1 LIMIT 1`,
      [user_id]
    );

    // เช็ค 2: เคยมีตารางสอนหรือไม่? (เช็คจาก teacher_id)
    const checkSchedule = await client.query(
      `SELECT 1 FROM public."Schedules" WHERE teacher_id = $1 LIMIT 1`,
      [user_id]
    );

    const hasHistory = (checkBooking.rowCount > 0 || checkSchedule.rowCount > 0);
    // STEP 2: ตัดสินใจว่าจะลบแบบไหน?

    if (!hasHistory) {
      
      const deleteResult = await client.query(
        `DELETE FROM public."Users" WHERE user_id = $1 RETURNING user_id`,
        [user_id]
      );

      if (deleteResult.rowCount === 0) {
        throw new Error('User not found during hard delete');
      }

      await client.query('COMMIT');
      return res.json({ 
        message: `ลบผู้ใช้งาน ${user_id} ถาวรเรียบร้อยแล้ว (Hard Delete) เนื่องจากไม่มีประวัติการทำรายการ` 
      });

    } else {
      // ⚠️ กรณี B: "มีประวัติการใช้งาน" -> ปิดการใช้งาน (Soft Delete)
      
      // 1. ยกเลิก Booking ในอนาคตที่อาจารย์คนนี้เป็นคนจอง (เฉพาะที่ยังไม่จบ)
      await client.query(
        `UPDATE public."Booking"
         SET status = 'cancelled'
         WHERE teacher_id = $1 
         AND date >= CURRENT_DATE 
         AND status IN ('pending', 'approved')`,
        [user_id]
      );

      // 2. เปลี่ยน is_active เป็น false ในตาราง Users
      const updateResult = await client.query(
        `UPDATE public."Users" 
         SET is_active = FALSE 
         WHERE user_id = $1
         RETURNING user_id`, 
        [user_id]
      );

      if (updateResult.rowCount === 0) {
        await client.query('ROLLBACK');
        return res.status(404).json({ message: 'ไม่พบผู้ใช้งานที่ต้องการลบ' });
      }

      await client.query('COMMIT');
      return res.json({ 
        message: `ระงับบัญชีผู้ใช้งาน ${user_id} สำเร็จ (Soft Delete) และยกเลิกรายการจองล่วงหน้าแล้ว` 
      });
    }

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Delete User Error:', error);
    res.status(500).json({ message: 'เกิดข้อผิดพลาดในการลบผู้ใช้งาน' });
  } finally {
    client.release();
  }
};

// /users/edit
// ใช้เพื่อ แก้ไขข้อมูล user
export const editUser = async (req, res) => {
  const { user_id } = req.params;

  // รับข้อมูลจาก Frontend
  const {
    title,
    name,
    surname,
    role,
    email
  } = req.body;

  const client = await pool.connect();

  try {
    await client.query('BEGIN'); // เริ่ม Transaction

    // STEP 1: อัปเดตข้อมูลผู้ใช้งานลงตาราง Users
    const updateUserResult = await client.query(
      `UPDATE public."Users" 
       SET title = $1, 
           name = $2, 
           surname = $3, 
           role = $4,
           email = $5,
           is_verified = $6,
           is_active = $7
       WHERE user_id = $8`,
      [
        title, 
        name, 
        surname, 
        role, 
        email, 
        false,
        true,
        user_id
      ]
    );

    // เช็คว่าหา User ที่ต้องการแก้เจอหรือไม่
    if (updateUserResult.rowCount === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ message: 'ไม่พบผู้ใช้งานที่ต้องการแก้ไข' });
    }

    await client.query('COMMIT'); // ยืนยันการทำรายการ
    res.json({ message: 'แก้ไขข้อมูลผู้ใช้งานสำเร็จ' });

  } catch (error) {
    await client.query('ROLLBACK'); // ถอยกลับถ้ามี Error
    console.error('Edit User Error:', error);
    res.status(500).json({ message: 'เกิดข้อผิดพลาดในการแก้ไขข้อมูลผู้ใช้งาน' });
  } finally {
    client.release();
  }
};
