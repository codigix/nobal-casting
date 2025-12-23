import { createPool } from 'mysql2/promise';

const pool = createPool({
  host: 'localhost',
  user: 'root',
  password: 'root',
  database: 'nobalcasting',
  port: 3306
});

async function addWorkstationType() {
  try {
    // Check if column exists
    const [columns] = await pool.query(`
      SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_NAME = 'workstation' AND COLUMN_NAME = 'workstation_type'
    `);
    
    if (columns.length === 0) {
      // Add workstation_type column if it doesn't exist
      await pool.query(`
        ALTER TABLE workstation 
        ADD COLUMN workstation_type VARCHAR(100) DEFAULT NULL
      `);
      console.log('✓ Added workstation_type column');
    } else {
      console.log('✓ workstation_type column already exists');
    }

    // Mapping of workstation names to types
    const typeMapping = {
      'GDC': 'GDC - Machine',
      'DCM': 'CNC - Machine',
      'VMC': 'VMC - Machine',
      'Line': 'Line',
      'CNC': 'CNC - Machine',
      'FURNACE': 'HT - Furnace',
      'INSPECTION': 'Inspection Table',
      'WLT': 'WLT - Machine',
      'WELDING': 'Welding Station',
      'CUTTING': 'Cutting Machine',
      'LATHE': 'LATHE MACHINE',
      'CORE': 'Core preparation m/c',
      'BLAST': 'Shot Blasting M/C',
      'SOURCING': 'OUT SOURCES',
      'OUTSOURCE': 'OUT SOURCES',
      'SAND': 'Core preparation m/c',
      'BEARING': 'BEARING PRESS ASSEMB...',
      'MANUAL': 'MANUAL',
      'ASSEMBLY': 'ASSEMBLY MACHINE',
      'BOLT': 'BOLT FITMENT ASSY',
      'KEEPER': 'KEEPER ASSY',
      'BUFFING': 'BUFFING - MACHINE',
      'ENGRAVING': 'ENGRAVING - MACHINE',
      'WS': 'Sample Workstation',
      'ID': 'Inspection Table'
    };

    // Clear existing assignments
    await pool.query('UPDATE workstation SET workstation_type = NULL');
    
    // Get all workstations
    const [workstations] = await pool.query('SELECT id, name FROM workstation');
    
    console.log(`\nUpdating ${workstations.length} workstations...`);
    
    for (const ws of workstations) {
      let wsType = null;
      const wsName = ws.name.toUpperCase();
      
      // Match against mapping
      for (const [key, type] of Object.entries(typeMapping)) {
        if (wsName.includes(key.toUpperCase())) {
          wsType = type;
          break;
        }
      }

      if (wsType) {
        await pool.query(
          'UPDATE workstation SET workstation_type = ? WHERE id = ?',
          [wsType, ws.id]
        );
        console.log(`  ✓ ${ws.name} → ${wsType}`);
      } else {
        console.log(`  ⚠ ${ws.name} → (no type assigned)`);
      }
    }

    // Show summary
    const [summary] = await pool.query(`
      SELECT workstation_type, COUNT(*) as count 
      FROM workstation 
      GROUP BY workstation_type 
      ORDER BY workstation_type
    `);
    
    console.log('\nSummary by type:');
    summary.forEach(row => {
      console.log(`  ${row.workstation_type || '(unassigned)'}: ${row.count}`);
    });
    
  } catch(err) {
    console.error('Error:', err.message);
  }
  
  await pool.end();
}

addWorkstationType();
