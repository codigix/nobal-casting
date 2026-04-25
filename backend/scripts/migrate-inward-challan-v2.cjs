
const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: path.join(__dirname, '../.env') });

async function migrate() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: process.env.DB_PORT || 3306,
    multipleStatements: true
  });

  try {
    console.log('Applying inward challan schema updates...');
    const sql = fs.readFileSync(path.join(__dirname, 'update-inward-challan-schema-v2.sql'), 'utf8');
    await connection.query(sql);
    console.log('Migration completed successfully!');
  } catch (error) {
    if (error.code === 'ER_DUP_FIELDNAME') {
      console.log('Some columns already exist, skipping duplicate field errors...');
    } else {
      console.error('Migration failed:', error);
    }
  } finally {
    await connection.end();
  }
}

migrate();
