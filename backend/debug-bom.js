import mysql from 'mysql2/promise';

async function checkBOMData() {
  let conn;
  try {
    conn = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: 'root',
      database: 'nobalcasting'
    });

    console.log('\n=== Checking BOM Data ===');
    
    const [boms] = await conn.execute('SELECT bom_id, item_code, quantity FROM bom LIMIT 3');
    console.log('\nAvailable BOMs:');
    console.log(boms);

    if (boms && boms.length > 0) {
      const bomId = boms[0].bom_id;
      console.log(`\n=== Checking lines for BOM: ${bomId} ===`);
      
      const [lines] = await conn.execute('SELECT * FROM bom_line WHERE bom_id = ?', [bomId]);
      console.log(`Lines count: ${lines.length}`);
      if (lines.length > 0) {
        console.log('Sample line:', lines[0]);
      }

      const [ops] = await conn.execute('SELECT * FROM bom_operation WHERE bom_id = ?', [bomId]);
      console.log(`Operations count: ${ops.length}`);

      const [raws] = await conn.execute('SELECT * FROM bom_raw_material WHERE bom_id = ?', [bomId]);
      console.log(`Raw materials count: ${raws.length}`);

      const [scraps] = await conn.execute('SELECT * FROM bom_scrap WHERE bom_id = ?', [bomId]);
      console.log(`Scrap items count: ${scraps.length}`);
    }

    await conn.end();
    console.log('\n✓ Database check complete\n');
  } catch (error) {
    console.error('Error:', error.message);
    if (conn) await conn.end();
    process.exit(1);
  }
}

checkBOMData();
