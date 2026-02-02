
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../.env') });

const dbConfig = {
  host: process.env.DB_HOST || '127.0.0.1',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'nobalcasting',
  port: parseInt(process.env.DB_PORT) || 3306
};

async function verify() {
  console.log('Using config:', { ...dbConfig, password: '****' });
  let connection;
  try {
    connection = await mysql.createConnection(dbConfig);
    const tables = ['operation', 'job_card', 'work_order_operation', 'bom_operation', 'production_plan_operations', 'time_log'];
    
    for (const table of tables) {
      console.log(`\nChecking table: ${table}`);
      try {
        const [columns] = await connection.query(`SHOW COLUMNS FROM ${table}`);
        const hourlyRateCol = columns.find(c => c.Field === 'hourly_rate');
        if (hourlyRateCol) {
          console.log(`✅ hourly_rate exists: ${JSON.stringify(hourlyRateCol)}`);
        } else {
          console.log(`❌ hourly_rate MISSING in ${table}`);
        }
      } catch (e) {
        console.log(`⚠️ Error checking ${table}: ${e.message}`);
      }
    }
  } catch (error) {
    console.error('Failed to connect:', error.message);
  } finally {
    if (connection) await connection.end();
  }
}

verify();
