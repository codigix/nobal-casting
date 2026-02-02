import { createPool } from 'mysql2/promise';

const pool = createPool({
  host: 'localhost',
  user: 'root',
  password: 'root',
  database: 'nobalcasting',
  port: 3306
});

async function main() {
  try {
    const [bom] = await pool.query('SELECT * FROM bom WHERE bom_id = ?', ['BOM-1769881014237']);
    console.log('BOM Details:');
    console.table(bom);
    
    const [ops] = await pool.query('SELECT * FROM bom_operation WHERE bom_id = ?', ['BOM-1769881014237']);
    console.log('BOM Operations:');
    console.table(ops);
  } catch (err) {
    console.error(err);
  } finally {
    await pool.end();
  }
}

main();
