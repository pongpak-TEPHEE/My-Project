# 1. เลือกสภาพแวดล้อมตั้งต้น (ใช้ Node version 20 เพราะเสถียรที่สุด) และ ใช้ OS "Alpine Linux"
FROM node:20-alpine

# 2. สร้างและกำหนดโฟลเดอร์ทำงานข้างใน Container
WORKDIR /usr/src/app

# 3. ก๊อปปี้ไฟล์ package.json และ package-lock.json เข้าไปก่อน
# (ทำแบบนี้เพื่อให้ Docker จำ Cache ไว้ ถ้าไม่ได้เพิ่มแพ็กเกจใหม่ จะได้ไม่ต้องโหลด npm install ใหม่ทุกครั้ง)
COPY package*.json ./

# 4. ติดตั้งแพ็กเกจทั้งหมด
RUN npm install

# 5. ก๊อปปี้โค้ดทั้งหมดในโปรเจกต์ของเราเข้าไปใน Container
COPY . .

# 6. แจ้งว่า Container นี้จะเปิดพอร์ตอะไร
EXPOSE 3000

# 7. คำสั่งสำหรับรันเซิร์ฟเวอร์
CMD ["npm", "start"]