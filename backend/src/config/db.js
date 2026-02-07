// Database configuration file and connection setup
import pkg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pkg;

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

pool.on('connect', () => {
  console.log('✅ PostgreSQL connected');
});

pool.on('error', (err) => {
  console.error('❌ DB connection error', err);
});

// console.log('DATABASE_URL =', process.env.DATABASE_URL);  // ตรวจสอบว่า database url ใช้งานได้ไหม
// File that connects to the database