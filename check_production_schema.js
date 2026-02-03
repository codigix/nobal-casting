const mysql = require('mysql2/promise');

async function checkSchema() {
    const connection = await mysql.createConnection({
        host: '127.0.0.1',
        user: 'nobalcasting_user',
        password: 'C0digix$309',
        database: 'nobalcasting',
        port: 3307
    });

    try {
        const tables = ['work_order', 'work_order_item', 'work_order_operation', 'job_card', 'bom', 'bom_line', 'workstation'];
        for (const table of tables) {
            console.log(`--- Schema for ${table} ---`);
            const [columns] = await connection.query(`DESCRIBE ${table}`);
            console.table(columns);
        }
    } catch (error) {
        console.error('Error:', error);
    } finally {
        await connection.end();
    }
}

checkSchema();
