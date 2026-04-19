const mysql = require('mysql2/promise');

async function main() {
    const connection = await mysql.createConnection({
        host: 'localhost',
        user: 'root',
        password: 'root',
        database: 'nobalcasting'
    });

    try {
        const [plans] = await connection.execute('SELECT plan_id FROM production_plan ORDER BY created_at DESC LIMIT 10');
        console.log('Recent Plans:', plans);

        const [wos] = await connection.execute('SELECT wo_id, production_plan_id FROM work_order WHERE wo_id = "WO-SA-1776002541868-2"');
        console.log('Target WO Info:', wos);

    } catch (err) {
        console.error(err);
    } finally {
        await connection.end();
    }
}

main();
