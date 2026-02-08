import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import OEEModel from './src/models/OEEModel.js';
dotenv.config();

async function verifyOEE() {
  const connection = await mysql.createPool({
    host: process.env.DB_HOST || '127.0.0.1',
    user: process.env.DB_USER || 'nobalcasting_user',
    password: process.env.DB_PASSWORD || 'C0digix$309',
    database: process.env.DB_NAME || 'nobalcasting',
    port: parseInt(process.env.DB_PORT || '3307')
  });

  try {
    const oeeModel = new OEEModel(connection);
    const metrics = await oeeModel.getOEEMetrics();
    console.log('OEE Metrics for all machines:', JSON.stringify(metrics, null, 2));

    const summary = await oeeModel.getOEESummary();
    console.log('\nOEE Summary:', JSON.stringify(summary, null, 2));

    const trends = await oeeModel.getTrends();
    console.log('\nOEE Trends (Daily):', JSON.stringify(trends, null, 2));

  } catch (err) {
    console.error('❌ Verification failed:', err);
  } finally {
    await connection.end();
  }
}

verifyOEE();
