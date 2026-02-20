const mysql = require('mysql2/promise');

async function migrate() {
  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'root',
    database: 'nobalcasting'
  });

  try {
    console.log('Starting migration for Work Order Material Lifecycle...');

    // 1. Update work_order table
    console.log('Updating work_order table...');
    const [woCols] = await connection.query("SHOW COLUMNS FROM work_order LIKE 'wip_warehouse'");
    if (woCols.length === 0) {
      await connection.query("ALTER TABLE work_order ADD COLUMN wip_warehouse VARCHAR(100) AFTER target_warehouse");
      console.log('Added wip_warehouse to work_order');
    }

    // 2. Update work_order_item table
    console.log('Updating work_order_item table...');
    const [itemCols] = await connection.query("SHOW COLUMNS FROM work_order_item");
    const colNames = itemCols.map(c => c.Field);

    if (!colNames.includes('allocated_qty')) {
      await connection.query("ALTER TABLE work_order_item ADD COLUMN allocated_qty DECIMAL(18, 6) DEFAULT 0 AFTER required_qty");
      console.log('Added allocated_qty to work_order_item');
    }

    if (!colNames.includes('issued_qty')) {
      // Check if transferred_qty exists and rename it or add issued_qty
      if (colNames.includes('transferred_qty')) {
        await connection.query("ALTER TABLE work_order_item CHANGE COLUMN transferred_qty issued_qty DECIMAL(18, 6) DEFAULT 0");
        console.log('Renamed transferred_qty to issued_qty in work_order_item');
      } else {
        await connection.query("ALTER TABLE work_order_item ADD COLUMN issued_qty DECIMAL(18, 6) DEFAULT 0 AFTER allocated_qty");
        console.log('Added issued_qty to work_order_item');
      }
    }

    if (!colNames.includes('scrap_qty')) {
      await connection.query("ALTER TABLE work_order_item ADD COLUMN scrap_qty DECIMAL(18, 6) DEFAULT 0 AFTER returned_qty");
      console.log('Added scrap_qty to work_order_item');
    }

    if (!colNames.includes('operation')) {
      await connection.query("ALTER TABLE work_order_item ADD COLUMN operation VARCHAR(100) AFTER scrap_qty");
      console.log('Added operation to work_order_item');
    }

    console.log('Migration completed successfully.');
  } catch (error) {
    console.error('Migration failed:', error);
  } finally {
    await connection.end();
  }
}

migrate();
