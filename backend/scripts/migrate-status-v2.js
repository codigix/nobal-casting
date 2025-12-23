import mysql from 'mysql2/promise';

async function migrateStatus() {
  try {
    const connection = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: 'root',
      database: 'nobalcasting'
    });
    
    console.log('Step 1: Converting status column to VARCHAR...');
    await connection.execute('ALTER TABLE selling_sales_order MODIFY COLUMN status VARCHAR(50)');
    console.log('✓ Column converted to VARCHAR');
    
    console.log('\nStep 2: Checking current statuses...');
    const [statuses] = await connection.execute('SELECT DISTINCT status, COUNT(*) as count FROM selling_sales_order WHERE deleted_at IS NULL GROUP BY status');
    console.log('Current statuses in database:');
    statuses.forEach(s => console.log(`  - '${s.status}' (${s.count} rows)`));
    
    console.log('\nStep 3: Migrating statuses (including deleted rows)...');
    const mappings = [
      { old: 'confirmed', new: 'production' },
      { old: 'shipped', new: 'dispatched' },
      { old: 'invoiced', new: 'delivered' },
      { old: 'cancelled', new: 'on_hold' }
    ];
    
    for (const mapping of mappings) {
      const sql = `UPDATE selling_sales_order SET status = ? WHERE status = ?`;
      const [result] = await connection.execute(sql, [mapping.new, mapping.old]);
      if (result.affectedRows > 0) {
        console.log(`✓ Migrated ${result.affectedRows} rows from '${mapping.old}' to '${mapping.new}'`);
      }
    }
    
    console.log('\nStep 4: Checking statuses before ENUM conversion...');
    const [beforeFinal] = await connection.execute('SELECT status, COUNT(*) as count FROM selling_sales_order GROUP BY status');
    console.log('All statuses (including deleted):');
    beforeFinal.forEach(s => console.log(`  - '${s.status}' (${s.count} rows)`));
    
    console.log('\nStep 5: Converting status column back to ENUM...');
    await connection.execute('ALTER TABLE selling_sales_order MODIFY COLUMN status ENUM(\'draft\', \'production\', \'complete\', \'on_hold\', \'dispatched\', \'delivered\') DEFAULT \'draft\'');
    console.log('✓ Status ENUM updated successfully');
    
    const [finalStatuses] = await connection.execute('SELECT DISTINCT status, COUNT(*) as count FROM selling_sales_order WHERE deleted_at IS NULL GROUP BY status');
    console.log('\nFinal statuses in database:');
    finalStatuses.forEach(s => console.log(`  - '${s.status}' (${s.count} rows)`));
    
    console.log('\n✓ Migration completed successfully!');
    await connection.end();
  } catch (error) {
    console.error('✗ Error:', error.message);
    process.exit(1);
  }
}

migrateStatus();
