
const mysql = require('mysql2/promise');
require('dotenv').config({ path: 'd:\\projects\\nobal-casting\\backend\\.env' });

async function checkJobCards() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'nobal_casting'
  });

  try {
    const [rows] = await connection.execute('SELECT * FROM job_card WHERE work_order_id = ?', ['WO-1765803666902']);
    console.log('Job Cards for WO-1765803666902:', rows);
    
    const [allJobCards] = await connection.execute('SELECT * FROM job_card LIMIT 5');
    console.log('Sample Job Cards:', allJobCards);

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await connection.end();
  }
}

checkJobCards();
