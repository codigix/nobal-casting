
import mysql from 'mysql2/promise';

async function checkJobCards() {
  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'root',
    database: 'nobalcasting'
  });

  try {
    const [rows] = await connection.execute(
      "SELECT * FROM job_card ORDER BY created_at DESC LIMIT 10"
    );
    console.log('Last 10 Job Cards:');
    console.table(rows.map(r => ({
        id: r.job_card_id,
        op: r.operation,
        seq: r.operation_sequence,
        status: r.status,
        wo: r.work_order_id,
        mode: r.execution_mode
    })));
    
    // Check for the specific work order if found in last 10
    const woIds = [...new Set(rows.map(r => r.work_order_id))];
    if (woIds.length > 0) {
        console.log('Work Orders found:', woIds);
    }

  } catch (err) {
    console.error(err);
  } finally {
    await connection.end();
  }
}

checkJobCards();
