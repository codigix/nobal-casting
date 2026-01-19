import mysql from 'mysql2/promise';
import { config } from './src/config/config.js';

(async () => {
  try {
    const connection = await mysql.createConnection(config.database);
    
    console.log('Fetching current BOM operations...\n');
    
    const [existing] = await connection.execute(
      'SELECT * FROM bom_operation LIMIT 5'
    );
    
    console.log('Sample BOM Operation record structure:');
    if (existing.length > 0) {
      console.log('Columns:', Object.keys(existing[0]));
      console.log(existing[0]);
    }
    
    console.log('Current BOM Operations:');
    console.log(existing);
    console.log('\n');
    
    // Define operation times (in minutes)
    const operationTimes = {
      'assembly': 8.00,
      'Assembly': 8.00,
      'Injection Molding': 18.00,
      'injection molding': 18.00,
      'buffing': 5.00,
      'BUFFING': 5.00,
      'Annealing': 60.00,
      'annealing': 60.00,
      'Fettling': 10.00,
      'fettling': 10.00,
      'CNC Machining': 20.00,
      'Drilling & Tapping': 15.00,
      'Dimensional Inspection': 5.00,
      'Final Inspection': 10.00,
      'Cleaning & Packing': 8.00,
      'Core Preparation': 30.00,
      'Deep Drawing': 25.00,
      'Aluminum Slug Cutting': 5.00,
      'Coil Winding': 12.00
    };
    
    console.log('Updating operation times...\n');
    
    let updatedCount = 0;
    for (const [opName, time] of Object.entries(operationTimes)) {
      const [result] = await connection.execute(
        'UPDATE bom_operation SET operation_time = ? WHERE operation_name = ?',
        [time, opName]
      );
      
      if (result.affectedRows > 0) {
        console.log(`✓ Updated '${opName}' to ${time} minutes (${result.affectedRows} rows)`);
        updatedCount += result.affectedRows;
      }
    }
    
    console.log(`\nTotal rows updated: ${updatedCount}`);
    
    // Verify updates
    console.log('\nVerifying updates...\n');
    const [updated] = await connection.execute(
      'SELECT operation_id, bom_id, operation_name, operation_time FROM bom_operation WHERE operation_time > 0 ORDER BY bom_id, operation_name'
    );
    
    console.log('Updated BOM Operations:');
    console.table(updated);
    
    await connection.end();
    console.log('\n✓ Database update complete!');
    
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
})();
