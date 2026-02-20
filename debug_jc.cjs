
const mysql = require('mysql2/promise');

async function checkJobCards() {
  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'root',
    database: 'nobalcasting'
  });

  try {
    const [rows] = await connection.execute(
      "SELECT * FROM job_card ORDER BY created_at DESC LIMIT 5"
    );
    console.log('Job Cards for WO ending in 1072-5:');
    console.table(rows);
    
    if (rows.length > 0) {
        const woId = rows[0].work_order_id;
        const [wo] = await connection.execute("SELECT * FROM work_order WHERE wo_id = ?", [woId]);
        console.log('Work Order details:');
        console.table(wo);
    }

  } catch (err) {
    console.error(err);
  } finally {
    await connection.end();
  }
}

checkJobCards();
