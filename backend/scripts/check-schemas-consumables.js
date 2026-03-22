import mysql from 'mysql2/promise';

async function run() {
    try {
        const db = await mysql.createConnection({
            host: 'localhost',
            user: 'root',
            password: 'root',
            database: 'nobalcasting'
        });
        const tables = ['item', 'bom_line', 'work_order_item', 'job_card', 'work_order'];
        for (const table of tables) {
            console.log(`--- ${table} ---`);
            const [rows] = await db.execute(`DESCRIBE ${table}`);
            console.log(JSON.stringify(rows, null, 2));
        }
        await db.end();
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}
run();
