
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
dotenv.config();

async function test() {
  const db = await mysql.createConnection({
    host: process.env.DB_HOST || '127.0.0.1',
    user: process.env.DB_USER || 'nobalcasting_user',
    password: process.env.DB_PASSWORD || 'C0digix$309',
    database: process.env.DB_NAME || 'nobalcasting',
    port: 3307
  });
  const filters = { startDate: '2026-02-15', endDate: '2026-02-15' };
  let query = `
        SELECT 
          w.workstation_name as machine_name,
          w.name as machine_id,
          w.location as line_id,
          w.status as machine_status,
          w.workstation_type,
          pe.entry_date,
          pe.shift_no,
          pe.work_order_id,
          COALESCE(pe.quantity_produced, 0) as total_units,
          COALESCE(pe.quantity_rejected, 0) as rejected_units,
          (COALESCE(pe.quantity_produced, 0) - COALESCE(pe.quantity_rejected, 0)) as good_units,
          COALESCE(pe.hours_worked, 0) * 60 as operating_time_mins,
          (
            SELECT SUM(duration_minutes) 
            FROM downtime_entry de 
            JOIN job_card jc_de ON de.job_card_id = jc_de.job_card_id
            WHERE jc_de.machine_id = w.name 
            AND (
              (pe.entry_date IS NOT NULL AND DATE(de.created_at) = pe.entry_date)
              OR 
              (pe.entry_date IS NULL AND DATE(de.created_at) BETWEEN ? AND ?)
            )
          ) as downtime_mins,
          (
            SELECT COALESCE(AVG(operation_time), 1)
            FROM job_card jc
            WHERE jc.work_order_id = pe.work_order_id 
            AND jc.machine_id = w.name
          ) as ideal_cycle_time_mins,
          (
            SELECT COUNT(*)
            FROM job_card jc_count
            WHERE jc_count.machine_id = w.name
            AND jc_count.status = 'in-progress'
          ) as active_jobs
        FROM workstation w
        LEFT JOIN production_entry pe ON w.name = pe.machine_id
      `
  const params = [filters.startDate, filters.endDate];
  query += ' AND pe.entry_date >= ?';
  params.push(filters.startDate);
  query += ' AND pe.entry_date <= ?';
  params.push(filters.endDate);

  console.log('Query:', query);
  console.log('Params:', params);
  
  try {
    const [rows] = await db.query(query, params);
    console.log('Rows found:', rows.length);
    if (rows.length > 0) console.log('First row:', rows[0]);
  } catch (err) {
    console.error('Query error:', err);
  }
  
  await db.end();
}
test();
