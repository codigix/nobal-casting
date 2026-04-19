
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import { ProductionPlanningService } from './src/services/ProductionPlanningService.js';

dotenv.config();

async function debug() {
  const db = await mysql.createConnection({
    host: process.env.DB_HOST || '127.0.0.1',
    user: process.env.DB_USER || 'nobalcasting_user',
    password: process.env.DB_PASSWORD || 'C0digix$309',
    database: process.env.DB_NAME || 'nobalcasting',
    port: parseInt(process.env.DB_PORT || '3307')
  });

  const service = new ProductionPlanningService(db);
  
  const bomId = 'BOM-1776605432500';
  console.log(`Fetching details for ${bomId}...`);
  const bomData = await service.getBOMDetails(bomId);
  
  if (!bomData) {
    console.log('BOM not found');
  } else {
    console.log('BOM Lines:');
    bomData.lines.forEach(line => {
      console.log(`- ${line.component_code} (${line.item_group})`);
    });
    
    console.log('\nBOM Raw Materials:');
    bomData.raw_materials.forEach(rm => {
      console.log(`- ${rm.item_code} (${rm.item_group})`);
    });
  }

  await db.end();
}

debug().catch(console.error);
