import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../.env') });

async function run() {
    let db;
    try {
        db = await mysql.createConnection({
            host: process.env.DB_HOST || 'localhost',
            user: process.env.DB_USER || 'root',
            password: process.env.DB_PASSWORD || '',
            database: process.env.DB_NAME || 'nobalcasting',
            port: parseInt(process.env.DB_PORT) || 3306
        });

        console.log('--- Starting Migration: Add Consumable Management Fields ---');

        // 1. Add item_type to item table
        console.log('Adding item_type to item table...');
        try {
            await db.execute(`ALTER TABLE item ADD COLUMN item_type VARCHAR(50) DEFAULT 'Raw Material' AFTER item_group`);
            console.log('Successfully added item_type to item table.');
        } catch (e) {
            if (e.code === 'ER_DUP_COLUMN_NAME') {
                console.log('item_type column already exists in item table.');
            } else {
                throw e;
            }
        }

        // 2. Add item_type to work_order_item table
        console.log('Adding item_type to work_order_item table...');
        try {
            await db.execute(`ALTER TABLE work_order_item ADD COLUMN item_type VARCHAR(50) DEFAULT 'Raw Material' AFTER item_code`);
            console.log('Successfully added item_type to work_order_item table.');
        } catch (e) {
            if (e.code === 'ER_DUP_COLUMN_NAME') {
                console.log('item_type column already exists in work_order_item table.');
            } else {
                throw e;
            }
        }

        // 3. Update existing consumables based on item_group
        console.log('Updating item_type for existing consumables...');
        await db.execute(`UPDATE item SET item_type = 'Consumable' WHERE LOWER(item_group) = 'consumable'`);
        await db.execute(`UPDATE work_order_item woi JOIN item i ON woi.item_code = i.item_code SET woi.item_type = i.item_type`);
        console.log('Successfully updated existing items.');

        console.log('--- Migration Completed Successfully ---');
    } catch (e) {
        console.error('Migration failed:', e);
        process.exit(1);
    } finally {
        if (db) await db.end();
    }
}

run();
