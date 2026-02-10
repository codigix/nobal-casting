const mysql = require('mysql2/promise');
(async () => {
  try {
    const db = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: 'root',
      database: 'nobalcasting'
    });
    const [tl] = await db.execute('SELECT completed_qty, shift, log_date FROM time_log WHERE job_card_id = ?', ['JC-8']);
    const [rj] = await db.execute('SELECT accepted_qty, rejected_qty, scrap_qty, shift, log_date, status FROM rejection_entry WHERE job_card_id = ?', ['JC-8']);
    console.log('Time Logs:', JSON.stringify(tl, null, 2));
    console.log('Rejections:', JSON.stringify(rj, null, 2));
    await db.end();
  } catch (err) {
    console.error(err);
  }
})();
