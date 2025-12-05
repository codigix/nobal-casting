import { createPool } from 'mysql2/promise'

const pool = createPool({
  host: 'localhost',
  user: 'erp_user',
  password: 'erp_password',
  database: 'aluminium_erp'
})

async function fixCollation() {
  try {
    const conn = await pool.getConnection()
    
    // Get collation of item table
    const [result] = await conn.query(`
      SELECT TABLE_COLLATION 
      FROM information_schema.TABLES 
      WHERE TABLE_SCHEMA = 'aluminium_erp' 
      AND TABLE_NAME = 'item'
    `)
    
    if (result.length > 0) {
      const collation = result[0].TABLE_COLLATION
      console.log(`Item table collation: ${collation}`)
      
      // Get list of stock tables
      const [stockTables] = await conn.query(`
        SELECT TABLE_NAME 
        FROM information_schema.TABLES 
        WHERE TABLE_SCHEMA = 'aluminium_erp' 
        AND TABLE_NAME IN ('stock_balance', 'stock_ledger', 'stock_entries', 'stock_entry_items', 
                           'material_transfers', 'material_transfer_items', 'batch_tracking', 
                           'stock_reconciliation', 'stock_reconciliation_items', 
                           'reorder_management', 'reorder_items')
      `)
      
      console.log(`\nFixing collation for ${stockTables.length} tables to ${collation}...\n`)
      
      for (const table of stockTables) {
        try {
          await conn.query(`ALTER TABLE ${table.TABLE_NAME} CONVERT TO CHARACTER SET utf8mb4 COLLATE ${collation}`)
          console.log(`✅ ${table.TABLE_NAME}`)
        } catch (error) {
          console.log(`⚠️  ${table.TABLE_NAME}: ${error.message.substring(0, 100)}`)
        }
      }
      
      console.log('\n✅ Collation fix completed!')
    }
    
    conn.release()
    pool.end()
    process.exit(0)
  } catch (error) {
    console.error('Error:', error.message)
    pool.end()
    process.exit(1)
  }
}

fixCollation()