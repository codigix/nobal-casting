import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
dotenv.config();

async function main() {
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '',
        database: process.env.DB_NAME || 'nobalcasting',
        port: parseInt(process.env.DB_PORT || '3306'),
    });

    const [rows] = await connection.query('SELECT id, warehouse_code, warehouse_name, warehouse_type FROM warehouses');
    console.table(rows);
    await connection.end();
}

main().catch(console.error);
