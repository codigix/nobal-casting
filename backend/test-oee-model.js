
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import OEEModel from './src/models/OEEModel.js';
dotenv.config();

async function test() {
  const db = await mysql.createConnection({
    host: process.env.DB_HOST || '127.0.0.1',
    user: process.env.DB_USER || 'nobalcasting_user',
    password: process.env.DB_PASSWORD || 'C0digix$309',
    database: process.env.DB_NAME || 'nobalcasting',
    port: 3307
  });

  const model = new OEEModel(db);
  const filters = { 
    startDate: '2026-02-15', 
    endDate: '2026-02-15' 
  };
  
  try {
    const data = await model.getOEEMetrics(filters);
    console.log('OEEMetrics result length:', data.length);
    if (data.length > 0) {
      console.log('Sample result:', JSON.stringify(data[0], null, 2));
    }
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await db.end();
  }
}

test();
