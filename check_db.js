import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: './backend/.env' });

async function check() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: process.env.DB_PORT
  });

  try {
    const woId = 'WO-SA-1771333203697-2';
    console.log(`Checking data for WO: ${woId}`);

    const [woItems] = await connection.execute('SELECT * FROM work_order_item WHERE wo_id = ?', [woId]);
    console.log('Work Order Items:', woItems);

    const [allocations] = await connection.execute('SELECT * FROM material_allocation WHERE work_order_id = ?', [woId]);
    console.log('Material Allocations:', allocations);

    const [targetWO] = await connection.execute('SELECT * FROM work_order WHERE wo_id = ?', [woId]);
    console.log('Target Work Order:', targetWO);

    const [woCount] = await connection.execute('SELECT COUNT(*) as count FROM work_order');
    console.log('Total Work Orders:', woCount[0].count);

    const [allocCount] = await connection.execute('SELECT COUNT(*) as count FROM material_allocation');
    console.log('Total Material Allocations:', allocCount[0].count);

  } catch (err) {
    console.error(err);
  } finally {
    await connection.end();
  }
}

check();
