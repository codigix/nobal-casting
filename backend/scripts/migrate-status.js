import mysql from 'mysql2/promise';

async function migrateStatus() {
  try {
    const connection = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: 'root',
      database: 'nobalcasting'
    });
    
    console.log('Checking current statuses...');
    const [statuses] = await connection.execute('SELECT DISTINCT status, COUNT(*) as count FROM selling_sales_order WHERE deleted_at IS NULL GROUP BY status');
    console.log('Current statuses in database:');
    statuses.forEach(s => console.log(`  - '${s.status}' (${s.count} rows)`));
    
    console.log('\nMigrating statuses...');
    
    const mappings = [
      { old: 'confirmed', new: 'production' },
      { old: 'shipped', new: 'dispatched' },
      { old: 'invoiced', new: 'delivered' },
      { old: 'cancelled', new: 'on_hold' }
    ];
    
    for (const mapping of mappings) {
      try {
        const sql = `UPDATE selling_sales_order SET status = ? WHERE status = ? AND deleted_at IS NULL`;
        const [result] = await connection.execute(sql, [mapping.new, mapping.old]);
        console.log(`  SQL: ${sql} [${mapping.new}, ${mapping.old}]`);
        console.log(`  Affected rows: ${result.affectedRows}`);
        if (result.affectedRows > 0) {
          console.log(`✓ Migrated ${result.affectedRows} rows from '${mapping.old}' to '${mapping.new}'`);
        }
      } catch (err) {
        console.log(`⚠ Error migrating '${mapping.old}': ${err.message}`);
      }
    }
    
    console.log('\nUpdating ENUM...');
    const alterSql = 'ALTER TABLE selling_sales_order MODIFY COLUMN status ENUM(\'draft\', \'production\', \'complete\', \'on_hold\', \'dispatched\', \'delivered\') DEFAULT \'draft\'';
    await connection.execute(alterSql);
    console.log('✓ Status ENUM updated successfully');
    
    const [finalStatuses] = await connection.execute('SELECT DISTINCT status FROM selling_sales_order WHERE deleted_at IS NULL');
    console.log('Final statuses in database:', finalStatuses.map(s => s.status));
    
    await connection.end();
  } catch (error) {
    console.error('✗ Error:', error.message);
    process.exit(1);
  }
}

migrateStatus();
