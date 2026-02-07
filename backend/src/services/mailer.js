import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

// ✅ 1. ประกาศ transporter ไว้ข้างบนสุด (เพื่อให้ทุกฟังก์ชันเรียกใช้ได้)
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

// ✅ 2. ฟังก์ชันส่ง OTP (สำหรับตอน Login/Register)
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

// ✅ 3. ฟังก์ชันส่งเมลแจ้งผลการจอง (สำหรับ Staff กดอนุมัติ)
export const sendBookingStatusEmail = async (toEmail, bookingDetails) => {
  // รับค่า transporter มาใช้ได้เลย เพราะประกาศไว้ข้างบนแล้ว
  const { status, room_name, date, start_time, end_time, reject_reason } = bookingDetails;

  const isApproved = status === 'approved';
  const color = isApproved ? '#28a745' : '#dc3545'; // เขียว หรือ แดง
  const title = isApproved ? '✅ อนุมัติการจองห้อง' : '❌ ปฏิเสธการจองห้อง';
  
  const mailOptions = {
    from: `"Nisit Booking System" <${process.env.EMAIL_USER}>`,
    to: toEmail,
    subject: `${title} - ${room_name} (${date})`,
    html: `
      <div style="font-family: Arial, sans-serif; padding: 20px; border: 1px solid #ddd; border-radius: 10px;">
        <h2 style="color: ${color};">${title}</h2>
        <p>เรียนอาจารย์,</p>
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