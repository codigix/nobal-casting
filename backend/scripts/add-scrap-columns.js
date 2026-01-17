import mysql from 'mysql2/promise';

const config = {
  host: 'localhost',
  user: 'root',
  password: 'root',
  database: 'nobalcasting'
};

async function addColumns() {
  const conn = await mysql.createConnection(config);
  try {
    console.log('Adding scrap columns...');
    
    await conn.execute('ALTER TABLE production_plan_sub_assembly ADD COLUMN planned_qty DECIMAL(18,6) AFTER required_qty');
    console.log('✅ Added planned_qty');
    
    await conn.execute('ALTER TABLE production_plan_sub_assembly ADD COLUMN planned_qty_before_scrap DECIMAL(18,6) AFTER planned_qty');
    console.log('✅ Added planned_qty_before_scrap');
    
    await conn.execute('ALTER TABLE production_plan_sub_assembly ADD COLUMN scrap_percentage DECIMAL(5,2) DEFAULT 0 AFTER planned_qty_before_scrap');
    console.log('✅ Added scrap_percentage');
    
    console.log('\n✅ All columns added successfully!');
    await conn.end();
  } catch (error) {
    if (error.message.includes('Duplicate column')) {
      console.log('⚠️  Columns already exist');
    } else {
      console.error('❌ Error:', error.message);
    }
    process.exit(error.message.includes('Duplicate') ? 0 : 1);
  }
}

addColumns();
