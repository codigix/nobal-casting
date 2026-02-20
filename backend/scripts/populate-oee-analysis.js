import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import OEEModel from '../src/models/OEEModel.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../.env') });

const config = {
  host: process.env.DB_HOST || '127.0.0.1',
  port: process.env.DB_PORT || 3307,
  user: process.env.DB_USER || 'nobalcasting_user',
  password: process.env.DB_PASSWORD || 'C0digix$309',
  database: process.env.DB_NAME || 'nobalcasting',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
};

async function populateOEE() {
  let connection;
  try {
    connection = await mysql.createPool(config);
    console.log('Connected to database pool');

    const oeeModel = new OEEModel(connection);

    // 1. Get unique job_card_id, log_date, shift from time_log
    console.log('Scanning time_log...');
    const [timeLogCombos] = await connection.query(`
      SELECT DISTINCT job_card_id, log_date, shift 
      FROM time_log 
      WHERE job_card_id IS NOT NULL AND log_date IS NOT NULL
    `);

    // 2. Get unique job_card_id, log_date, shift from downtime_entry
    console.log('Scanning downtime_entry...');
    const [downtimeCombos] = await connection.query(`
      SELECT DISTINCT job_card_id, log_date, shift 
      FROM downtime_entry 
      WHERE job_card_id IS NOT NULL AND log_date IS NOT NULL
    `);

    // Combine and uniqueify
    const allCombos = new Map();
    [...timeLogCombos, ...downtimeCombos].forEach(c => {
      const key = `${c.job_card_id}|${c.log_date.toISOString().split('T')[0]}|${c.shift}`;
      allCombos.set(key, { 
        jobCardId: c.job_card_id, 
        logDate: c.log_date.toISOString().split('T')[0], 
        shift: c.shift 
      });
    });

    console.log(`Found ${allCombos.size} unique Job Card/Date/Shift combinations to calculate.`);

    let successCount = 0;
    let errorCount = 0;

    for (const [key, combo] of allCombos.entries()) {
      try {
        console.log(`Processing: ${combo.jobCardId} on ${combo.logDate} shift ${combo.shift}`);
        await oeeModel.calculateAndSaveJobCardOEE(combo.jobCardId, combo.logDate, combo.shift);
        successCount++;
      } catch (err) {
        console.error(`Error processing ${key}:`, err.message);
        errorCount++;
      }
    }

    console.log('\n--- Population Summary ---');
    console.log(`Total processed: ${allCombos.size}`);
    console.log(`Successfully calculated: ${successCount}`);
    console.log(`Errors encountered: ${errorCount}`);

  } catch (err) {
    console.error('Fatal error:', err.message);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

populateOEE();
