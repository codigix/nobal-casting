const mysql = require('mysql2/promise');
(async () => {
    try {
        const db = await mysql.createConnection({
            host: '127.0.0.1',
            user: 'erp_user',
            password: 'erp_password',
            database: 'nobalcasting',
            port: 3306
        });
        const [rows] = await db.query('SELECT id, warehouse_code, warehouse_name FROM warehouses');
        console.table(rows);
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
})();
