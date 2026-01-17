import mysql from 'mysql2/promise';

const config = {
  host: 'localhost',
  user: 'root',
  password: 'root',
  database: 'nobalcasting'
};

async function checkBoms() {
  const conn = await mysql.createConnection(config);

  console.log('=== Available BOMs ===');
  const [boms] = await conn.execute('SELECT bom_id, product_name FROM bom LIMIT 10');
  console.log('Total BOMs:', boms.length);
  if (boms.length > 0) {
    console.log('First BOM:', boms[0]);
    boms.forEach(b => console.log(`  - ${b.bom_id}: ${b.product_name}`));
  }

  await conn.end();
}

checkBoms().catch(console.error);
