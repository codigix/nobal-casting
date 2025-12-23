import { createPool } from 'mysql2/promise'
import dotenv from 'dotenv'

dotenv.config()

const db = createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'nobalcasting',
  port: process.env.DB_PORT || 3306
})

const subAssemblies = [
  'Trial Part 2',
  'Trial Part 1',
  'Testing Part 3 Core',
  'Testing Part 2 - Core',
  'Testing Part - Core',
  'TANK RH Y1 TRUCK',
  'TANK RH 712',
  'TANK RH - IC Y1 5 L',
  'TANK RH - TRAX BS6',
  'TANK LH 712',
  'TANK LH - TRAX BS6',
  'TANK LH - IC Y1 5 L',
  'tank 1618 rh',
  'tank 1618 lh',
  'TANK - VE 3100 - 90 KW - RH',
  'TANK LH Y1 TRUCK',
  'RIGHT TANK Y1 LPO BUS (497 ENGIN',
  'RIGHT TANK LPTA 715 BS3',
  'RIGHT TANK 4K 100 KVA',
  'RIGHT PIPE Y1 LPO BUS (497 ENGINE'
]

async function insertSubAssemblies() {
  try {
    console.log('Starting insert of sub-assembly items...')
    
    for (const itemName of subAssemblies) {
      try {
        const itemCode = itemName.replace(/\s+/g, '-').toUpperCase()
        
        await db.execute(
          `INSERT INTO item (item_code, name, item_group, is_active, disabled, maintain_stock, uom, valuation_method, default_purchase_uom, default_sales_uom)
           VALUES (?, ?, 'Sub Assemblies', 1, 0, 1, 'Nos', 'FIFO', 'Nos', 'Nos')
           ON DUPLICATE KEY UPDATE name = VALUES(name)`,
          [itemCode, itemName]
        )
        
        console.log(`✓ Inserted: ${itemName}`)
      } catch (error) {
        console.error(`✗ Error inserting ${itemName}:`, error.message)
      }
    }
    
    console.log('All sub-assembly items processed!')
    process.exit(0)
  } catch (error) {
    console.error('Fatal error:', error)
    process.exit(1)
  }
}

insertSubAssemblies()
