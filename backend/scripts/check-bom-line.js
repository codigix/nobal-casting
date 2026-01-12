import mysql from 'mysql2/promise';

(async () => {
  try {
    const conn = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: 'root',
      database: 'nobalcasting'
    });
    
    console.log('✓ Checking bom_line columns...\n');
    const [rows] = await conn.query('SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = "bom_line" ORDER BY ORDINAL_POSITION');
    rows.forEach(r => console.log('  -', r.COLUMN_NAME));
    
    console.log('\n✓ Sample bom_line data:\n');
    const [data] = await conn.query('SELECT bom_id, component_code, quantity, rate, amount FROM bom_line LIMIT 3');
    console.log(data);
    
    await conn.end();
  } catch (err) {
    console.error('Error:', err.message);
  }
  process.exit(0);
})();
