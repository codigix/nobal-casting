
import mysql from 'mysql2/promise';

const dbConfig = {
  host: 'localhost',
  user: 'root',
  password: 'root',
  database: 'nobalcasting'
};

async function checkWarehouses() {
  const connection = await mysql.createConnection(dbConfig);
  try {
    const [rows] = await connection.execute('SELECT * FROM warehouse');
    console.log('Warehouses:', JSON.stringify(rows, null, 2));
    
    const required = ['Accepted', 'Rejected', 'Hold'];
    const existing = rows.map(r => r.name);
    
    for (const name of required) {
      if (!existing.includes(name)) {
        console.log(`Missing warehouse: ${name}`);
        const code = name.toUpperCase();
        await connection.execute(
          'INSERT INTO warehouse (warehouse_code, name, is_active) VALUES (?, ?, 1)',
          [code, name]
        );
        console.log(`Created warehouse: ${name} (${code})`);
      }
    }
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await connection.end();
  }
}

checkWarehouses();
