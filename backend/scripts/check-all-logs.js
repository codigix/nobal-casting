const db = require('./src/config/db');
async function run() {
  try {
    const [allLogs] = await db.query('SELECT * FROM time_log WHERE job_card_id IN (SELECT job_card_id FROM job_card WHERE work_order_id = "WO-SA-1773915478704-2")');
    console.log('All Time Logs:', JSON.stringify(allLogs, null, 2));
    const [allRejs] = await db.query('SELECT * FROM rejection_entry WHERE job_card_id IN (SELECT job_card_id FROM job_card WHERE work_order_id = "WO-SA-1773915478704-2")');
    console.log('All Rejections:', JSON.stringify(allRejs, null, 2));
  } catch (e) {
    console.error(e);
  } finally {
    process.exit();
  }
}
run();