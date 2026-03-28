import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

const config = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'nobalcasting',
  port: parseInt(process.env.DB_PORT) || 3306
};

async function backfillJobCardOperationTimes() {
  let connection;
  try {
    connection = await mysql.createConnection(config);
    console.log('Connected to database');

    // Find Job Cards where operation_time might be batch time instead of per-unit time
    // We compare with BOM operations to find the correct per-unit time
    const [rows] = await connection.execute(`
      SELECT 
        jc.job_card_id, 
        jc.operation_time as current_op_time, 
        jc.planned_quantity,
        bo.operation_time as bom_op_time
      FROM job_card jc
      LEFT JOIN work_order wo ON jc.work_order_id = wo.wo_id
      LEFT JOIN bom_operation bo ON wo.bom_no = bo.bom_id AND jc.operation = bo.operation_name
      WHERE jc.status != 'cancelled'
    `);

    console.log(`Checking ${rows.length} Job Cards...`);
    let fixedCount = 0;

    for (const row of rows) {
      const { job_card_id, current_op_time, planned_quantity, bom_op_time } = row;
      const current = parseFloat(current_op_time || 0);
      const planned = parseFloat(planned_quantity || 1);
      const bom = parseFloat(bom_op_time || 0);

      let newTime = null;

      if (bom > 0 && Math.abs(current - bom) > 0.01) {
        // If we have BOM time and it differs significantly from JC time
        // Check if JC time is batch time (bom * planned)
        if (Math.abs(current - (bom * planned)) < 0.1) {
          console.log(`- JC ${job_card_id}: Batch time (${current}) detected. Resetting to BOM per-unit time (${bom}).`);
          newTime = bom;
        } else if (current > bom * 1.5 && planned > 1) {
          // Heuristic: If JC time is much larger than BOM time, it's likely wrong
          console.log(`- JC ${job_card_id}: Suspicious time (${current}) vs BOM (${bom}). Resetting to BOM.`);
          newTime = bom;
        }
      } else if (!bom && planned > 1 && current > 60) {
          // If no BOM found but time is large and quantity > 1, it might be batch time
          // This is riskier so we only do it if it looks like a full shift or similar
          // For now, we only trust BOM comparisons to avoid false positives.
      }

      if (newTime !== null) {
        await connection.execute(
          'UPDATE job_card SET operation_time = ? WHERE job_card_id = ?',
          [newTime, job_card_id]
        );
        fixedCount++;
      }
    }

    console.log(`\n✓ Backfill completed! Fixed ${fixedCount} Job Cards.`);
    process.exit(0);
  } catch (error) {
    console.error('❌ Backfill failed:', error.message);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

backfillJobCardOperationTimes();
