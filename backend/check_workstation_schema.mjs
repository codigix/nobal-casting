import { createPool } from 'mysql2/promise';

const pool = createPool({
  host: 'localhost',
  user: 'root',
  password: 'root',
  database: 'nobalcasting',
  port: 3306
});

async function test() {
  try {
    const [columns] = await pool.query(`
      SELECT COLUMN_NAME, COLUMN_TYPE, IS_NULLABLE, COLUMN_KEY, EXTRA
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_NAME = 'workstation' AND TABLE_SCHEMA = 'nobalcasting'
      ORDER BY ORDINAL_POSITION
    `);
    
    console.log('Current workstation table schema:');
    columns.forEach(col => {
      console.log(`  ${col.COLUMN_NAME}: ${col.COLUMN_TYPE} ${col.IS_NULLABLE === 'NO' ? 'NOT NULL' : ''} ${col.EXTRA || ''}`);
    });
    
  } catch(err) {
    console.error('Error:', err.message);
  }
  
  await pool.end();
}

test();
