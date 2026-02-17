
import mysql from 'mysql2/promise';

async function checkBOM(bomId) {
  const db = await mysql.createConnection({
    host: '127.0.0.1',
    user: 'nobalcasting_user',
    password: 'C0digix$309',
    database: 'nobalcasting',
    port: 3307
  });

  try {
    console.log(`Checking BOM: ${bomId}`);
    
    const [boms] = await db.execute('SELECT * FROM bom WHERE bom_id = ?', [bomId]);
    console.log('BOM Header:', boms[0]);

    const [lines] = await db.execute('SELECT * FROM bom_line WHERE bom_id = ?', [bomId]);
    console.log('BOM Lines:', lines);

    for (const line of lines) {
        const [compBoms] = await db.execute('SELECT bom_id FROM bom WHERE item_code = ? AND is_active = 1', [line.component_code]);
        console.log(`Sub-BOMs for ${line.component_code}:`, compBoms);
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await db.end();
  }
}

checkBOM('BOM-1771140679649');
