import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
dotenv.config();

async function check() {
  const db = await mysql.createConnection({
    host: process.env.DB_HOST || '127.0.0.1',
    user: process.env.DB_USER || 'nobalcasting_user',
    password: process.env.DB_PASSWORD || 'C0digix$309',
    database: process.env.DB_NAME || 'nobalcasting',
    port: parseInt(process.env.DB_PORT || '3307')
  });

  const [plans] = await db.execute("SELECT DISTINCT production_plan_id FROM work_order WHERE wo_id LIKE '%1770810052492%'");
  if (plans.length === 0) {
    console.log('No plans found for timestamp 1770810052492');
    await db.end();
    return;
  }
  const planId = plans[0].production_plan_id;
  console.log('Checking Plan:', planId);

  const [subAsms] = await db.execute('SELECT id, item_code, explosion_level, planned_qty, bom_no FROM production_plan_sub_assembly WHERE plan_id = ?', [planId]);
  console.log('Sub-assemblies in DB:', subAsms.length);
  
  for (const sa of subAsms) {
    console.log(`Checking SA: ${sa.item_code} (L${sa.explosion_level})`);
    if (sa.bom_no) {
      const [lines] = await db.execute('SELECT component_code, quantity FROM bom_line WHERE bom_id = ?', [sa.bom_no]);
      console.log(`  BOM Lines for ${sa.item_code} (${sa.bom_no}):`, lines.length);
      for (const line of lines) {
        const [childBoms] = await db.execute('SELECT bom_id FROM bom WHERE item_code = ? AND is_active = 1', [line.component_code]);
        console.log(`    Line: ${line.component_code} | Has BOM: ${childBoms.length > 0}`);
      }
    } else {
        console.log(`  No BOM assigned to ${sa.item_code}`);
    }
  }

  const [fgItems] = await db.execute('SELECT item_code, planned_qty, bom_no FROM production_plan_fg WHERE plan_id = ?', [planId]);
  console.log('FG Items in DB:', fgItems.length);
  for (const fg of fgItems) {
    console.log(`Checking FG: ${fg.item_code}`);
    if (fg.bom_no) {
      const [lines] = await db.execute('SELECT component_code, quantity FROM bom_line WHERE bom_id = ?', [fg.bom_no]);
      console.log(`  BOM Lines for FG ${fg.item_code} (${fg.bom_no}):`, lines.length);
      for (const line of lines) {
        const [childBoms] = await db.execute('SELECT bom_id FROM bom WHERE item_code = ? AND is_active = 1', [line.component_code]);
        console.log(`    Line: ${line.component_code} | Has BOM: ${childBoms.length > 0}`);
      }
    }
  }

  await db.end();
}

check();
