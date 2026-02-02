
import mysql from 'mysql2/promise';

async function checkStatuses() {
  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'root',
    database: 'nobalcasting'
  });

  try {
    const [rows] = await connection.execute('SELECT mr_id, status, purpose FROM material_request');
    console.log('Material Requests:', rows);
    
    const [itemRows] = await connection.execute('SELECT mr_id, item_code, qty, issued_qty, status FROM material_request_item');
    console.log('Material Request Items:', itemRows);
  } catch (err) {
    console.error(err);
  } finally {
    await connection.end();
  }
}

checkStatuses();
