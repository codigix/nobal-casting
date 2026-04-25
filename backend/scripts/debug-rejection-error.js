import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../.env') });

async function debug() {
    let connection;
    try {
        connection = await mysql.createConnection({
            host: process.env.DB_HOST || '127.0.0.1',
            user: process.env.DB_USER || 'root',
            password: process.env.DB_PASSWORD || '',
            database: process.env.DB_NAME || 'nobalcasting',
            port: parseInt(process.env.DB_PORT || '3306')
        });

        console.log('✓ Connected to database');

        // Check Job Card and its Work Order
        const jobCardId = 'JC - 3 - WO-SA-1776607246739-2'; // From screenshot URL
        console.log(`Checking Job Card: ${jobCardId}`);

        const [jcRows] = await connection.query(
            'SELECT job_card_id, work_order_id FROM job_card WHERE job_card_id = ?',
            [jobCardId]
        );

        if (jcRows.length === 0) {
            console.log('Job Card not found. Fetching recent job cards...');
            const [recentJc] = await connection.query('SELECT job_card_id, work_order_id FROM job_card ORDER BY id DESC LIMIT 5');
            console.table(recentJc);
            return;
        }

        const woId = jcRows[0].work_order_id;
        console.log(`Work Order ID: ${woId}`);

        const [woRows] = await connection.query(
            'SELECT wo_id, wip_warehouse FROM work_order WHERE wo_id = ?',
            [woId]
        );

        if (woRows.length === 0) {
            console.log('Work Order not found');
            return;
        }

        const wipWhName = woRows[0].wip_warehouse;
        console.log(`WIP Warehouse in WO: "${wipWhName}"`);

        const [whRows] = await connection.query(
            'SELECT id, warehouse_code, warehouse_name FROM warehouses WHERE warehouse_name = ? OR warehouse_code = ?',
            [wipWhName, wipWhName]
        );

        if (whRows.length === 0) {
            console.log(`❌ WIP Warehouse "${wipWhName}" NOT FOUND in warehouses table!`);
            
            console.log('Available warehouses:');
            const [allWh] = await connection.query('SELECT id, warehouse_code, warehouse_name FROM warehouses');
            console.table(allWh);
        } else {
            console.log('✅ WIP Warehouse found:');
            console.table(whRows);
        }

    } catch (error) {
        console.error('Error:', error);
    } finally {
        if (connection) await connection.end();
    }
}

debug();
