const mysql = require('mysql2/promise');
(async () => {
    try {
        const db = await mysql.createConnection({
            host: '127.0.0.1',
            user: 'nobalcasting_user',
            password: 'C0digix$309',
            database: 'nobalcasting',
            port: 3307
        });
        const [rows] = await db.query('SELECT * FROM bom_line');
        console.table(rows);
        const [boms] = await db.query('SELECT * FROM bom');
        console.table(boms);
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
})();
