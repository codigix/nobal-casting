import mysql from 'mysql2/promise';

async function checkRecentLogs() {
  const connection = await mysql.createConnection({
    host: '127.0.0.1',
    user: 'nobalcasting_user',
    password: 'C0digix$309',
    database: 'nobalcasting',
    port: 3307
  });

  try {
    console.log(`Checking All Logs across the system...`);
    
    const [logs] = await connection.execute(
      `SELECT tl.*, jc.work_order_id, jc.operation 
       FROM time_log tl 
       JOIN job_card jc ON tl.job_card_id = jc.job_card_id 
       ORDER BY tl.created_at DESC LIMIT 10`
    );
    console.log('Recent Time Logs:');
    console.table(logs.map(l => ({ 
        id: l.time_log_id, 
        wo: l.work_order_id, 
        op: l.operation, 
        date: l.log_date, 
        qty: l.completed_qty,
        created: l.created_at
    })));

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await connection.end();
  }
}

checkRecentLogs();
