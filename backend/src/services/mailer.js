import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

// ประกาศ transporter ไว้ข้างบนสุด (เพื่อให้ทุกฟังก์ชันเรียกใช้ได้)
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

// ฟังก์ชันส่ง OTP (สำหรับตอน Login/Register)
export const sendOTPEmail = async (toEmail, otpCode) => {
  const mailOptions = {
    from: `"Nisit Booking System" <${process.env.EMAIL_USER}>`,
    to: toEmail,
    subject: 'รหัสยืนยันตัวตน (OTP) - ระบบจองห้อง',
    html: `
      <div style="font-family: Arial, sans-serif; padding: 20px; border: 1px solid #ddd; border-radius: 10px;">
        <h2 style="color: #0066cc;">รหัส OTP ของคุณคือ</h2>
        <h1 style="font-size: 48px; letter-spacing: 5px; color: #333; margin: 10px 0;">${otpCode}</h1>
        <p>รหัสนี้จะหมดอายุภายใน 5 นาที</p>
      </div>
    `
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`OTP Email sent to ${toEmail}`);
    return true;
  } catch (error) {
    console.error('Error sending OTP email:', error);
    return false;
  }
};

// ฟังก์ชันส่งเมลแจ้งผลการจอง (สำหรับ Staff กดอนุมัติ)
export const sendBookingStatusEmail = async (toEmail, bookingDetails) => {
  // รับค่า transporter มาใช้ได้เลย เพราะประกาศไว้ข้างบนแล้ว
  const { teacher_name, status, room_name, date, start_time, end_time, reject_reason } = bookingDetails;

  const isApproved = status === 'approved';
  const color = isApproved ? '#28a745' : '#dc3545'; // เขียว หรือ แดง
  const title = isApproved ? 'อนุมัติการจองห้อง' : 'ปฏิเสธการจองห้อง';
  
  const mailOptions = {
    from: `"Nisit Booking System" <${process.env.EMAIL_USER}>`,
    to: toEmail,
    subject: `${title} - ${room_name} (${date})`,
    html: `
      <div style="font-family: Arial, sans-serif; padding: 20px; border: 1px solid #ddd; border-radius: 10px;">
        <h2 style="color: ${color};">${title}</h2>
        <p>เรียนอาจารย์ ${teacher_name},</p>
        <p>รายการจองห้องของคุณมีสถานะการดำเนินการดังนี้:</p>
        
        <table style="width: 100%; border-collapse: collapse; margin-top: 10px;">
          <tr>
            <td style="padding: 8px; border-bottom: 1px solid #eee;"><strong>ห้อง:</strong></td>
            <td style="padding: 8px; border-bottom: 1px solid #eee;">${room_name}</td>
          </tr>
          <tr>
            <td style="padding: 8px; border-bottom: 1px solid #eee;"><strong>วันที่:</strong></td>
            <td style="padding: 8px; border-bottom: 1px solid #eee;">${date}</td>
          </tr>
          <tr>
            <td style="padding: 8px; border-bottom: 1px solid #eee;"><strong>เวลา:</strong></td>
            <td style="padding: 8px; border-bottom: 1px solid #eee;">${start_time} - ${end_time}</td>
          </tr>
        </table>

        ${!isApproved && reject_reason ? `<p style="color: red; margin-top: 15px;"><strong>หมายเหตุ:</strong> ${reject_reason}</p>` : ''}

        <p style="margin-top: 20px; font-size: 12px; color: #777;">คุณสามารถตรวจสอบรายละเอียดเพิ่มเติมได้ที่หน้าเว็บไซต์</p>
      </div>
    `
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`Status email sent to ${toEmail}`);
  } catch (error) {
    console.error('Error sending status email:', error);
    // ไม่ return false เพื่อกันไม่ให้ function หลักพังถ้าส่งเมลไม่ผ่าน
  }
};

// ฟังก์ชันส่งเมลแจ้งผู้สอนว่ามีการ สอนทับกันกับ ตารางเรียน
export const sendScheduleBookingCancelledEmail = async (toEmail, userName, roomId, date, timeSlot, subjectName) => {
    try {
        const mailOptions = {
            from: `"ระบบจองห้อง" <${process.env.EMAIL_USER}>`,
            to: toEmail,
            subject: `[ระบบจองห้อง] แจ้งยกเลิกการจองห้อง ${roomId} ในวันที่ ${date}`,
            html: `
                <div style="font-family: Arial, sans-serif; color: #333; line-height: 1.6; max-width: 600px; margin: 0 auto; border: 1px solid #ddd; border-radius: 8px; overflow: hidden;">
                    <div style="background-color: #dc3545; padding: 15px; text-align: center;">
                        <h2 style="color: white; margin: 0;">แจ้งยกเลิกการจองห้องพัก/ห้องเรียน</h2>
                    </div>
                    <div style="padding: 20px;">
                        <p>เรียน คุณ <strong>${userName}</strong>,</p>
                        <p>ระบบขออภัยที่ต้องแจ้งให้ทราบว่า รายการจองห้องของคุณถูก <strong>ยกเลิกโดยอัตโนมัติ</strong> เนื่องจากมีการปรับปรุงตารางเรียนของคณะ/ภาควิชา ซึ่งตรงกับช่วงเวลาที่คุณได้ทำการจองไว้</p>
                        
                        <div style="background-color: #f8f9fa; padding: 15px; border-left: 4px solid #dc3545; margin: 20px 0;">
                            <h3 style="margin-top: 0; color: #dc3545;">รายละเอียดการจองที่ถูกยกเลิก:</h3>
                            <ul style="list-style-type: none; padding-left: 0;">
                                <li><strong>ห้อง:</strong> ${roomId}</li>
                                <li><strong>วันที่:</strong> ${date}</li>
                                <li><strong>เวลา:</strong> ${timeSlot}</li>
                                <li><strong>วิชาที่ทับซ้อน:</strong> ${subjectName}</li>
                            </ul>
                        </div>
                        
                        <p>กรุณาเข้าสู่ระบบเพื่อทำการจองห้องว่างในช่วงเวลาอื่น หรือเลือกห้องอื่นแทนครับ</p>
                        <p>ขออภัยในความไม่สะดวกมา ณ ที่นี้</p>
                        <br/>
                        <p style="margin-bottom: 0;">ขอแสดงความนับถือ,</p>
                        <p style="margin-top: 5px;"><strong>ทีมงานผู้ดูแลระบบ</strong></p>
                    </div>
                    <div style="background-color: #f1f1f1; padding: 10px; text-align: center; font-size: 12px; color: #777;">
                        <p>อีเมลฉบับนี้เป็นการแจ้งเตือนจากระบบอัตโนมัติ กรุณาอย่าตอบกลับอีเมลนี้</p>
                    </div>
                </div>
            `
        };

        const info = await transporter.sendMail(mailOptions);
        console.log(`ส่งอีเมลยกเลิกการจองให้ ${toEmail} สำเร็จ! [Message ID: ${info.messageId}]`);
        return true;

    } catch (error) {
        console.error(`เกิดข้อผิดพลาดในการส่งอีเมลยกเลิกการจองไปที่ ${toEmail}:`, error);
        return false;
    }
};


// ฟังก์ชันสำหรับส่งอีเมลเมื่อ Staff เป็นคนกดยกเลิกการจอง
export const sendBookingCancelledEmail = async (toEmail, userName, roomId, date, timeSlot, cancelReason) => {
    try {
        // ถ้าไม่ได้ระบุเหตุผลมา ให้ใช้ข้อความมาตรฐาน
        const reasonText = cancelReason ? cancelReason : 'ผู้ดูแลระบบได้ทำการพิจารณายกเลิกรายการจองนี้';

        const mailOptions = {
            from: `"ระบบจองห้อง" <${process.env.EMAIL_USER}>`,
            to: toEmail,
            subject: `[ระบบจองห้อง] แจ้งยกเลิกการจองห้อง ${roomId} ในวันที่ ${date}`,
            html: `
                <div style="font-family: Arial, sans-serif; color: #333; line-height: 1.6; max-width: 600px; margin: 0 auto; border: 1px solid #ddd; border-radius: 8px; overflow: hidden;">
                    <div style="background-color: #dc3545; padding: 15px; text-align: center;">
                        <h2 style="color: white; margin: 0;">แจ้งยกเลิกการจองห้อง</h2>
                    </div>
                    <div style="padding: 20px;">
                        <p>เรียน อาจารย์ <strong>${userName}</strong>,</p>
                        <p>ระบบขอแจ้งให้ทราบว่า รายการจองห้องของคุณถูก <strong>ยกเลิกโดยเจ้าหน้าที่/ผู้ดูแลระบบ</strong></p>
                        
                        <div style="background-color: #f8f9fa; padding: 15px; border-left: 4px solid #dc3545; margin: 20px 0;">
                            <h3 style="margin-top: 0; color: #dc3545;">รายละเอียดการจองที่ถูกยกเลิก:</h3>
                            <ul style="list-style-type: none; padding-left: 0;">
                                <li><strong>ห้อง:</strong> ${roomId}</li>
                                <li><strong>วันที่:</strong> ${date}</li>
                                <li><strong>เวลา:</strong> ${timeSlot}</li>
                                <li><strong>เหตุผลการยกเลิก:</strong> <span style="color: #dc3545;">${reasonText}</span></li>
                            </ul>
                        </div>
                        
                        <p>หากมีข้อสงสัยเพิ่มเติม กรุณาติดต่อเจ้าหน้าที่ดูแลระบบครับ</p>
                        <p>ขออภัยในความไม่สะดวกมา ณ ที่นี้</p>
                        <br/>
                        <p style="margin-bottom: 0;">ขอแสดงความนับถือ,</p>
                        <p style="margin-top: 5px;"><strong>ทีมงานผู้ดูแลระบบ</strong></p>
                    </div>
                    <div style="background-color: #f1f1f1; padding: 10px; text-align: center; font-size: 12px; color: #777;">
                        <p>อีเมลฉบับนี้เป็นการแจ้งเตือนจากระบบอัตโนมัติ กรุณาอย่าตอบกลับอีเมลนี้</p>
                    </div>
                </div>
            `
        };

        const info = await transporter.sendMail(mailOptions);
        console.log(`✅ ส่งอีเมลแจ้งยกเลิกการจอง (โดย Admin) ให้ ${toEmail} สำเร็จ! [Message ID: ${info.messageId}]`);
        return true;

    } catch (error) {
        console.error(`❌ เกิดข้อผิดพลาดในการส่งอีเมลแจ้งยกเลิกการจองไปที่ ${toEmail}:`, error);
        return false;
    }
};