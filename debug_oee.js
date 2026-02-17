import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import OEEModel from './backend/src/models/OEEModel.js';

dotenv.config({ path: 'backend/.env' });

async function check() {
  const db = await mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: parseInt(process.env.DB_PORT)
  });

  try {
    const model = new OEEModel(db);
    const data = await model.getOEEMetrics({});
    console.log('Result length:', data.length);
    if (data.length > 0) {
      console.log('Sample:', data[0]);
    }
  } catch (err) {
    console.error(err);
  } finally {
    await db.end();
  }
}

check();
