import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
dotenv.config();

async function main() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || '127.0.0.1',
    user: process.env.DB_USER || 'nobalcasting_user',
    password: process.env.DB_PASSWORD || 'C0digix$309',
    database: process.env.DB_NAME || 'nobalcasting',
    port: parseInt(process.env.DB_PORT || '3307')
  });

  console.log('Adding parallel_capacity to workstation table...');
  try {
    await connection.query('ALTER TABLE workstation ADD COLUMN parallel_capacity INT DEFAULT 1');
    console.log('✓ Successfully added parallel_capacity to workstation');
  } catch (err) {
    if (err.code === 'ER_DUP_COLUMN_NAME') {
      console.log('✓ parallel_capacity already exists in workstation table');
    } else {
      throw err;
    }
  }

  await connection.end();
}

main().catch(console.error);
