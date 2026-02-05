const mysql = require('mysql2/promise');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../.env') });

async function checkBOMs() {
  const db = await mysql.createConnection({
    host: process.env.DB_HOST || '127.0.0.1',
    user: process.env.DB_USER || 'nobalcasting_user',
    password: process.env.DB_PASSWORD || 'C0digix$309',
    database: process.env.DB_NAME || 'nobalcasting',
    port: process.env.DB_PORT || 3307
  });

  console.log('--- ALL BOMs ---');
  const [boms] = await db.execute('SELECT bom_id, item_code FROM bom');
  
  for (const bom of boms) {
    console.log(`\nBOM: ${bom.bom_id} for ${bom.item_code}`);
    
    const [rm] = await db.execute('SELECT item_code, item_name, item_group, qty FROM bom_raw_material WHERE bom_id = ?', [bom.bom_id]);
    const consumables = rm.filter(r => r.item_group === 'Consumable');
    
    if (consumables.length > 0) {
      console.log('Consumables:');
      consumables.forEach(c => console.log(`  - ${c.item_code}: ${c.item_name} (Qty: ${c.qty})`));
    } else {
      console.log(' No consumables found.');
    }
  }

  await db.end();
}

checkBOMs().catch(console.error);
