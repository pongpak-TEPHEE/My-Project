import dotenv from 'dotenv';
dotenv.config();
// ตรวจสอบการโหลด ฐานข้อมูลจาก .env
console.log('ENV CHECK:', process.env.DATABASE_URL);

import express from 'express';
import usersRoute from './routes/users.route.js';
import authRoutes from './routes/auth.routes.js';

const app = express();
app.use(express.json());

app.use('/api/users', usersRoute);
app.use('/api/auth', authRoutes);

app.listen(3000, () => {
  console.log('🚀 Server running on port 3000');
});
