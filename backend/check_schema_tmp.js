import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'nobalcasting_user',
  password: process.env.DB_PASSWORD || 'C0digix$309',
  database: process.env.DB_NAME || 'nobalcasting',
  port: process.env.DB_PORT || 3307,
});

async function checkSchema() {
  try {
    const [columns] = await pool.query('SHOW COLUMNS FROM production_entry');
    console.log('Columns in production_entry:');
    console.table(columns.map(c => ({ Field: c.Field, Type: c.Type })));
    
    const [jcColumns] = await pool.query('SHOW COLUMNS FROM job_card');
    console.log('Columns in job_card:');
    console.table(jcColumns.map(c => ({ Field: c.Field, Type: c.Type })));

    const [rejColumns] = await pool.query('SHOW COLUMNS FROM rejection_entry');
    console.log('Columns in rejection_entry:');
    console.table(rejColumns.map(c => ({ Field: c.Field, Type: c.Type })));

    const [tlColumns] = await pool.query('SHOW COLUMNS FROM time_log');
    console.log('Columns in time_log:');
    console.table(tlColumns.map(c => ({ Field: c.Field, Type: c.Type })));
  } catch (err) {
    console.error(err);
  } finally {
    await pool.end();
  }
}

checkSchema();
