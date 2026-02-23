import pkg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pkg;

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

pool.query('SELECT current_database();')
  .then(res => console.log('🎯 สรุปตอนนี้ Node.js อยู่ใน Database ชื่อ:', res.rows[0].current_database))
  .catch(err => console.error(err));

pool.query("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public';")
  .then(res => console.log('🎯 ตารางทั้งหมดที่ Node.js มองเห็นคือ:', res.rows.map(r => r.table_name)))
  .catch(err => console.error(err));

pool.on('connect', () => {
  console.log('✅ PostgreSQL connected');
});

pool.on('error', (err) => {
  console.error('❌ DB connection error', err);
});