import mysql from 'mysql2/promise';

async function migrate() {
  const connection = await mysql.createConnection({
    host: '127.0.0.1',
    user: 'nobalcasting_user',
    password: 'C0digix$309',
    database: 'nobalcasting',
    port: 3307
  });

  try {
    console.log('Adding qty_per_unit column to job_card_buffer...');
    await connection.query('ALTER TABLE job_card_buffer ADD COLUMN qty_per_unit DECIMAL(18, 6) DEFAULT 1.0 AFTER source_job_card_id');
    console.log('Column added successfully.');
  } catch (error) {
    if (error.code === 'ER_DUP_COLUMN_NAME') {
      console.log('Column already exists.');
    } else {
      console.error('Migration failed:', error);
    }
  } finally {
    await connection.end();
  }
}

migrate();
