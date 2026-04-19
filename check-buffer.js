
import mysql from 'mysql2/promise';
(async () => {
  const db = await mysql.createConnection({
    host: '127.0.0.1',
    port: 3307,
    user: 'nobalcasting_user',
    password: 'C0digix$309',
    database: 'nobalcasting'
  });
  const [rows] = await db.query("SELECT job_card_id, operation, status, accepted_quantity, available_to_transfer, input_qty, input_buffer_qty FROM job_card WHERE job_card_id LIKE '%WO-SA-1776535633000-2%' ORDER BY operation_sequence");
  console.log(JSON.stringify(rows, null, 2));
  await db.end();
})();
