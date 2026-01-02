import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

async function addWorkOrderFields() {
  let connection;
  try {
    connection = await pool.getConnection();
    
    console.log('Adding missing columns to work_order table...');
    
    const columns = [
      { name: 'bom_no', type: 'VARCHAR(100)' },
      { name: 'planned_start_date', type: 'DATETIME' },
      { name: 'planned_end_date', type: 'DATETIME' },
      { name: 'actual_start_date', type: 'DATETIME' },
      { name: 'actual_end_date', type: 'DATETIME' },
      { name: 'expected_delivery_date', type: 'DATETIME' }
    ];

    for (const col of columns) {
      try {
        await connection.execute(
          `ALTER TABLE work_order ADD COLUMN ${col.name} ${col.type}`
        );
        console.log(`✓ Added column: ${col.name}`);
      } catch (err) {
        if (err.code === 'ER_DUP_FIELDNAME') {
          console.log(`✓ Column ${col.name} already exists`);
        } else {
          throw err;
        }
      }
    }

    console.log('\n✓ All columns added successfully!');
    process.exit(0);
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  } finally {
    if (connection) connection.release();
    await pool.end();
  }
}

addWorkOrderFields();
