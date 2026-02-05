const mysql = require('mysql2/promise');
const dotenv = require('dotenv');
const path = require('path');
const { ProductionPlanningService } = require('../src/services/ProductionPlanningService');

dotenv.config({ path: path.join(__dirname, '../.env') });

async function verifyExclusion() {
  const db = await mysql.createConnection({
    host: process.env.DB_HOST || '127.0.0.1',
    user: process.env.DB_USER || 'nobalcasting_user',
    password: process.env.DB_PASSWORD || 'C0digix$309',
    database: process.env.DB_NAME || 'nobalcasting',
    port: process.env.DB_PORT || 3307
  });

  const service = new ProductionPlanningService(db);

  const bomId = 'BOM-1770268501625';
  const quantity = 10;

  console.log(`Generating plan for BOM ${bomId} with quantity ${quantity}...`);
  
  const bomData = await service.getBOMDetails(bomId);
  const plan = {
    plan_id: `TEST-PP-${Date.now()}`,
    bom_id: bomId,
    finished_goods: [],
    sub_assemblies: [],
    raw_materials: [],
    operations: [],
    fg_operations: []
  };

  await service.processFinishedGoodsBOM(bomData, quantity, plan);

  console.log('Production Plan Raw Materials:');
  plan.raw_materials.forEach(rm => {
    console.log(`- ${rm.item_code} (${rm.item_group}): ${rm.total_qty} ${rm.uom}`);
  });

  const consumableFound = plan.raw_materials.some(rm => rm.item_group === 'Consumable' || rm.item_code.startsWith('CON-'));

  if (consumableFound) {
    console.error('FAILED: Consumables found in production plan!');
  } else {
    console.log('SUCCESS: Consumables correctly excluded from production plan.');
  }

  await db.end();
}

verifyExclusion().catch(console.error);
