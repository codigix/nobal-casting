import mysql from 'mysql2/promise';

const config = {
  host: 'localhost',
  user: 'root',
  password: 'root',
  database: 'nobalcasting'
};

async function fixForeignKeyConstraint() {
  let connection;
  try {
    connection = await mysql.createConnection(config);
    
    console.log('Fixing foreign key constraint on selling_sales_order...');
    
    // Drop the incorrect constraint
    try {
      await connection.execute(
        'ALTER TABLE selling_sales_order DROP FOREIGN KEY selling_sales_order_ibfk_1'
      );
      console.log('✅ Dropped incorrect foreign key constraint');
    } catch (err) {
      console.log('⚠️  Could not drop constraint (may not exist):', err.message);
    }
    
    // Add the correct constraint
    await connection.execute(
      'ALTER TABLE selling_sales_order ADD CONSTRAINT selling_sales_order_ibfk_1 FOREIGN KEY (customer_id) REFERENCES selling_customer(customer_id)'
    );
    console.log('✅ Added correct foreign key constraint');
    
    // Verify the constraint
    const [rows] = await connection.execute(
      `SELECT CONSTRAINT_NAME, TABLE_NAME, COLUMN_NAME, REFERENCED_TABLE_NAME, REFERENCED_COLUMN_NAME
       FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
       WHERE TABLE_NAME = 'selling_sales_order' AND COLUMN_NAME = 'customer_id'`
    );
    
    if (rows.length > 0) {
      const row = rows[0];
      console.log('\n✅ Constraint verified:');
      console.log(`   Table: ${row.TABLE_NAME}`);
      console.log(`   Column: ${row.COLUMN_NAME}`);
      console.log(`   References: ${row.REFERENCED_TABLE_NAME}(${row.REFERENCED_COLUMN_NAME})`);
      console.log('\n✅ Foreign key constraint fixed successfully!');
    }
    
    await connection.end();
  } catch (error) {
    console.error('❌ Error fixing foreign key constraint:', error.message);
    process.exit(1);
  }
}

fixForeignKeyConstraint();
