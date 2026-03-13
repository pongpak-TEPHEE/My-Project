import { pool } from '../config/db.js';
import crypto from 'crypto';


// /users
// ดึงข้อมูลผู้ใช้งานทั้งหมด
export const getUsers = async (req, res) => {
  try {
    // req.user ได้มาจาก authenticateToken middleware
    const loggedInUserId = req.user?.user_id;

    if (!loggedInUserId) {
      // เผื่อกรณีไม่มีข้อมูล user ใน req ให้ส่งกลับไปทั้งหมดหรือจัดการตามเหมาะสม
      const result = await pool.query('SELECT * FROM public."Users"');
      return res.json(result.rows);
    }
    
    // ดึงข้อมูลผู้ใช้งานทั้งหมด โดยยกเว้นคนที่กำลัง Login อยู่
    const result = await pool.query(
      'SELECT * FROM public."Users" WHERE user_id != $1',
      [loggedInUserId]
    );
    
    res.json(result.rows);
  } catch (error) {
    console.error('Get Users Error:', error);
    res.status(500).json({ message: 'เกิดข้อผิดพลาดในการดึงข้อมูล' });
  }
};

// /users/create
// ใช้เมื่อสร้าง form สำหรับเพิ่ม user (teacher, staff) โดยใสข้อมูล (user_id, title, name, surname, role, email)
export const createUser = async (req, res) => {
  // 1. เอา user_id ออกจากการรับค่า req.body
  const { title, name, surname, role, email } = req.body;

  // ดักให้ต้องใส่เป็น mail.ku.th เท่านั้น
  if (!email.endsWith('@ku.th')) {
    return res.status(400).json({ message: 'อนุญาตให้ใช้งานเฉพาะอีเมล @ku.th เท่านั้น' });
  }

  // 2. อัปเดต Validation: เอา user_id ออกจากการเช็ค
  if (!name || !role || !email) {
    return res.status(400).json({ message: 'กรุณากรอกข้อมูลให้ครบถ้วน (ชื่อ, อีเมล, ตำแหน่ง)' });
  }

  // 3. สร้าง user_id แบบสุ่มด้วย UUID
  const user_id = crypto.randomUUID().replace(/-/g, '').substring(0, 20);

  try {
    // 4. อัปเดตการเช็คข้อมูลซ้ำ: ตัดการเช็ค user_id ออก เช็คแค่ email และ ชื่อ-นามสกุล
    const checkUser = await pool.query(
      `SELECT email, name, surname 
       FROM public."Users" 
       WHERE email = $1 OR (name = $2 AND surname = $3)`, 
      [email, name, surname || '']
    );

    // ถ้าเจอข้อมูลแสดงว่ามีอะไรซ้ำสักอย่าง
    if (checkUser.rows.length > 0) {
      const existing = checkUser.rows[0];
      
      if (existing.email === email) {
        return res.status(400).json({ message: 'อีเมลนี้ถูกใช้งานแล้ว' });
      }
      
      // ถ้าไม่ซ้ำอีเมล แสดงว่าชื่อซ้ำแน่นอน
      return res.status(400).json({ message: `ชื่อและนามสกุล '${name} ${surname || ''}' มีอยู่ในระบบแล้ว` });
    }

    // 5. เพิ่มลง Database (ส่งตัวแปร user_id ที่เพิ่งสุ่มมาเข้าไป)
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

    // ส่งผลลัพธ์กลับ
    res.status(201).json({
      message: 'เพิ่มผู้ใช้งานสำเร็จ',
      user: newUser.rows[0]
    });

  } catch (error) {
    console.error('Create User Error:', error);
    // เช็ค Error จาก Database
    if (error.code === '23505') {
        return res.status(400).json({ message: 'ข้อมูลซ้ำ: อีเมลนี้ถูกใช้งานแล้ว' });
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

    // ตรวจสอบประวัติการใช้งาน (Check Dependencies)

    // เช็คว่าเคยมีการจองห้องหรือไม่? (เช็คจาก teacher_id)
    const checkBooking = await client.query(
      `SELECT 1 FROM public."Booking" WHERE teacher_id = $1 LIMIT 1`,
      [user_id]
    );

    // เช็คว่าเคยมีตารางสอนหรือไม่? (เช็คจาก teacher_id)
    const checkSchedule = await client.query(
      `SELECT 1 FROM public."Schedules" WHERE teacher_id = $1 LIMIT 1`,
      [user_id]
    );

    const hasHistory = (checkBooking.rowCount > 0 || checkSchedule.rowCount > 0);
    // ตัดสินใจว่าจะลบแบบไหน? ------------------

    // กรณี A: "ไม่มีประวัติการใช้งาน" -> ลบถาวร (Hard Delete)
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
      // กรณี B: "มีประวัติการใช้งาน" -> ปิดการใช้งาน (Soft Delete)
      
      // ยกเลิก Booking ในอนาคตที่อาจารย์คนนี้เป็นคนจอง (เฉพาะที่ยังไม่จบ)
      await client.query(
        `UPDATE public."Booking"
         SET status = 'cancelled'
         WHERE teacher_id = $1 
         AND date >= CURRENT_DATE 
         AND status IN ('pending', 'approved')`,
        [user_id]
      );

      // เปลี่ยน is_active เป็น false ในตาราง Users
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
  const {
    title,
    name,
    surname,
    email
  } = req.body;

  // ดักให้ต้องใส่เป็น mail @ku.th เท่านั้น
  if (!email || !email.endsWith('@ku.th')) {
    return res.status(400).json({ message: 'อนุญาตให้ใช้งานเฉพาะอีเมล @ku.th เท่านั้น' });
  }

  const client = await pool.connect();

  try {
    await client.query('BEGIN'); // เริ่ม Transaction

    const updateUserResult = await client.query(
      `UPDATE public."Users" 
       SET title = $1, 
           name = $2, 
           surname = $3, 
           email = $4,         
           is_verified = $5, 
           is_active = $6    
       WHERE user_id = $7`,  
      [
        title,      // ตัวที่ 1 ($1)
        name,       // ตัวที่ 2 ($2)
        surname,    // ตัวที่ 3 ($3)
        email,      // ตัวที่ 4 ($4)
        false,      // ตัวที่ 5 ($5) - เซ็ตให้ต้องยืนยันอีเมลใหม่
        true,       // ตัวที่ 6 ($6) - เซ็ตให้ใช้งานได้
        user_id     // ตัวที่ 7 ($7)
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
