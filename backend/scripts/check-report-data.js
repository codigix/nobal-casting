import mysql from 'mysql2/promise';

async function checkJobCards() {
  const connection = await mysql.createConnection({
    host: '127.0.0.1',
    user: 'nobalcasting_user',
    password: 'C0digix$309',
    database: 'nobalcasting',
    port: 3307
  });

  try {
    const woId = 'WO-SA-1773915478704-2';
    console.log(`Checking Job Cards for Work Order: ${woId}`);
    
    const [columnsWOI] = await connection.execute('DESCRIBE work_order_item');
    console.log('work_order_item:');
    console.table(columnsWOI.map(c => ({ Field: c.Field, Type: c.Type })));

    const [jobCards] = await connection.execute(
      'SELECT * FROM job_card WHERE work_order_id = ?',
      [woId]
    );
    
    console.log('Job Cards:');
    console.table(jobCards.map(jc => ({ 
        id: jc.job_card_id, 
        op: jc.operation_name || jc.operation, 
        status: jc.status, 
        prod: jc.produced_quantity || jc.completed_quantity,
        acc: jc.accepted_quantity,
        rej: jc.rejected_quantity
    })));

    for (const jc of jobCards) {
      const jcId = jc.job_card_id;
      const op = jc.operation_name || jc.operation;
      console.log(`\n--- Logs for Job Card: ${jcId} (${op}) ---`);
      
      try {
          const [timeLogs] = await connection.execute(
            'SELECT log_date, shift, operator_name, completed_qty, accepted_qty, rejected_qty FROM time_log WHERE job_card_id = ?',
            [jcId]
          );
          console.log('Time Logs:');
          console.table(timeLogs);
      } catch (e) { console.log('Error fetching time_log:', e.message); }

      try {
          const [rejections] = await connection.execute(
            'SELECT log_date, shift, accepted_qty, rejected_qty, scrap_qty FROM rejection_entry WHERE job_card_id = ?',
            [jcId]
          );
          console.log('Rejection Entries:');
          console.table(rejections);
      } catch (e) { console.log('Error fetching rejection_entry:', e.message); }

      try {
          const [downtimes] = await connection.execute(
            'SELECT log_date, shift, downtime_type, duration_minutes FROM downtime_entry WHERE job_card_id = ?',
            [jcId]
          );
          console.log('Downtimes:');
          console.table(downtimes);
      } catch (e) { console.log('Error fetching downtime_entry:', e.message); }
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await connection.end();
  }
}

checkJobCards();
