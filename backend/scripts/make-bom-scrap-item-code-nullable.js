import mysql from 'mysql2/promise'

async function runMigration() {
  let connection
  try {
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || 'root',
      database: process.env.DB_NAME || 'nobalcasting'
    })

    console.log('Starting migration: Make item_code nullable in bom_scrap table...')

    const queries = [
      `ALTER TABLE bom_scrap MODIFY COLUMN item_code VARCHAR(100) NULL`,
      `ALTER TABLE bom_scrap DROP FOREIGN KEY bom_scrap_ibfk_2`,
      `ALTER TABLE bom_scrap ADD CONSTRAINT bom_scrap_ibfk_2 FOREIGN KEY (item_code) REFERENCES item(item_code) ON DELETE SET NULL`
    ]

    for (const query of queries) {
      try {
        await connection.execute(query)
        console.log('✓ Executed:', query.substring(0, 60) + '...')
      } catch (error) {
        if (error.message.includes('Constraint not found')) {
          console.log('⚠ Constraint already dropped, skipping...')
        } else {
          console.log('✗ Query error:', error.message)
        }
      }
    }

    console.log('Migration completed!')
  } catch (error) {
    console.error('Migration failed:', error.message)
  } finally {
    if (connection) {
      await connection.end()
    }
  }
}

runMigration()
