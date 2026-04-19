
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../.env') });

const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || 'root',
    database: process.env.DB_NAME || 'nobalcasting',
    port: parseInt(process.env.DB_PORT) || 3306
};

async function fixJobCards() {
    console.log("Using DB Config:", { ...dbConfig, password: '****' });
    const connection = await mysql.createConnection(dbConfig);
    try {
        console.log("Step 1: Fixing Work Orders with 0 quantity from Production Plan...");
        const [woRows] = await connection.query(
            `SELECT wo.wo_id, wo.item_code, psa.planned_qty as plan_qty 
             FROM work_order wo 
             JOIN production_plan_sub_assembly psa ON wo.production_plan_id = psa.plan_id AND wo.item_code = psa.item_code
             WHERE wo.quantity = 0`
        );
        
        console.log(`Found ${woRows.length} work orders to fix.`);
        for (const row of woRows) {
            console.log(`Fixing WO: ${row.wo_id} (${row.item_code}). Old Qty: 0, New Qty: ${row.plan_qty}`);
            await connection.query(
                "UPDATE work_order SET quantity = ? WHERE wo_id = ?",
                [row.plan_qty, row.wo_id]
            );
        }

        console.log("\nStep 2: Fetching job cards where planned_quantity != work_order quantity...");
        const [rows] = await connection.query(
            `SELECT jc.job_card_id, jc.planned_quantity, wo.quantity as wo_qty, jc.operation 
             FROM job_card jc 
             JOIN work_order wo ON jc.work_order_id = wo.wo_id 
             WHERE ABS(jc.planned_quantity - wo.quantity) > 0.000001`
        );
        
        console.log(`Found ${rows.length} job cards to fix.`);
        
        for (const row of rows) {
            console.log(`Fixing JC: ${row.job_card_id} (${row.operation}). Old Planned: ${row.planned_quantity}, New Planned: ${row.wo_qty}`);
            await connection.query(
                "UPDATE job_card SET planned_quantity = ? WHERE job_card_id = ?",
                [row.wo_qty, row.job_card_id]
            );
        }
        
        console.log("\nFix completed.");
    } catch (err) {
        console.error("Error:", err);
    } finally {
        await connection.end();
    }
}

fixJobCards();
