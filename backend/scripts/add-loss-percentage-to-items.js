import mysql from 'mysql2/promise'

async function addLossPercentageToItems() {
  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'root',
    database: 'nobalcasting'
  })

  try {
    console.log('🔄 Adding loss_percentage column to items table...\n')

    // Add loss_percentage column
    await connection.execute(`
      ALTER TABLE items 
      ADD COLUMN loss_percentage DECIMAL(5,2) DEFAULT 0 AFTER is_active
    `)
    console.log('✓ Added loss_percentage column to items table')

    // Add index for performance
    await connection.execute(`
      CREATE INDEX idx_items_loss_percentage 
      ON items(loss_percentage)
    `)
    console.log('✓ Created index on loss_percentage')

    console.log('\n✅ Migration Complete!')
    console.log('\nNew column added:')
    console.log('  - items.loss_percentage (DECIMAL(5,2), DEFAULT 0)')
    console.log('    Range: 0-100 (represents percentage of material lost as scrap)')

  } catch (error) {
    if (error.code === 'ER_DUP_FIELDNAME') {
      console.log('ℹ️  Column loss_percentage already exists in items table')
    } else {
      console.error('❌ Migration failed:', error.message)
    }
  } finally {
    await connection.end()
  }
}

addLossPercentageToItems()
