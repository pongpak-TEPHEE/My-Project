
import pkg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pkg;

console.log('🚀 Starting test_db.js');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

const test = async () => {
  try {
    console.log('⏳ Querying database...');
    // Name of table use "Users" only 
    const result = await pool.query('SELECT * FROM public."Users"');
    console.log('✅ RESULT:', result.rows);
  } catch (err) {
    console.error('❌ ERROR:', err.message);
  } finally {
    await pool.end();
    process.exit();
  }
};
console.log(process.env.DATABASE_URL);
test();
