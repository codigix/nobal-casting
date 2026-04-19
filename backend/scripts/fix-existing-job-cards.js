
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
dotenv.config();

const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || 'root',
    database: process.env.DB_NAME || 'nobalcasting',
    port: parseInt(process.env.DB_PORT) || 3306
};

async function fixJobCards() {
    const connection = await mysql.createConnection(dbConfig);
    try {
        console.log("Fetching job cards with 0 planned_quantity...");
        const [rows] = await connection.query(
            `SELECT jc.job_card_id, wo.quantity as wo_qty 
             FROM job_card jc 
             JOIN work_order wo ON jc.work_order_id = wo.wo_id 
             WHERE jc.planned_quantity = 0`
        );
        
        console.log(`Found ${rows.length} job cards to fix.`);
        
        for (const row of rows) {
            await connection.query(
                "UPDATE job_card SET planned_quantity = ? WHERE job_card_id = ?",
                [row.wo_qty, row.job_card_id]
            );
        }
        
        console.log("Fix completed.");

        // Also fix any transferred_quantity that might have been added to planned_quantity by previous buggy logic
        // Actually, if we just set them to wo_qty, it should be fine if they are all sequential.
        
    } catch (err) {
        console.error("Error:", err);
    } finally {
        await connection.end();
    }
}

fixJobCards();
