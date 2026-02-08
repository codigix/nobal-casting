
const mysql = require('mysql2/promise');
require('dotenv').config({ path: '../backend/.env' });

async function checkJobCard() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || '127.0.0.1',
    user: process.env.DB_USER || 'nobalcasting_user',
    password: process.env.DB_PASSWORD || 'C0digix$309',
    database: process.env.DB_NAME || 'nobalcasting',
    port: process.env.DB_PORT || 3307
  });

  try {
    const [columns] = await connection.query('DESCRIBE job_card');
    console.table(columns);
  } catch (err) {
    console.error(err);
  } finally {
    await connection.end();
  }
}

checkJobCard();
