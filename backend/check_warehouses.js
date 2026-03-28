import mysql from 'mysql2/promise';

async function checkWarehouses() {
  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'root',
    database: 'nobalcasting'
  });

  try {
    const [rows] = await connection.execute('SELECT id, warehouse_code, warehouse_name FROM warehouses');
    console.log('Warehouses:', rows);
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await connection.end();
  }
}

checkWarehouses();
