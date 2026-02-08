
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
dotenv.config({ path: './backend/.env' });

async function check() {
  try {
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      port: parseInt(process.env.DB_PORT || '3306')
    });

    // Check if column exists first
    const [cols] = await connection.query('SHOW COLUMNS FROM work_order LIKE "parent_wo_id"');
    if (cols.length === 0) {
      await connection.query('ALTER TABLE work_order ADD COLUMN parent_wo_id VARCHAR(50) NULL');
      console.log('Column parent_wo_id added successfully');
    } else {
      console.log('Column parent_wo_id already exists');
    }
    
    await connection.end();
  } catch (err) {
    console.error(err);
  }
}
check();
