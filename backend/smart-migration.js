#!/usr/bin/env node
import { createPool } from 'mysql2/promise'
import dotenv from 'dotenv'

dotenv.config()

async function main() {
  const db = createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'aluminium_erp',
    port: process.env.DB_PORT || 3306
  })

  try {
    console.log('🔧 Smart Database Schema Migration\n')

    const execute = async (sql, desc) => {
      try {
        await db.execute(sql)
        console.log(`✓ ${desc}`)
        return true
      } catch (err) {
        console.log(`⚠️  ${desc} - ${err.message.substring(0, 60)}`)
        return false
      }
    }

    const check = async (table, column) => {
      try {
        const [rows] = await db.query(
          `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS 
           WHERE TABLE_NAME = ? AND COLUMN_NAME = ? AND TABLE_SCHEMA = ?`,
          [table, column, process.env.DB_NAME || 'aluminium_erp']
        )
        return rows.length > 0
      } catch {
        return false
      }
    }

    console.log('📋 Checking current schema...')
    const hasItemCodeInSEI = await check('stock_entry_items', 'item_code')
    const hasItemCodeInSB = await check('stock_balance', 'item_code')
    const hasItemCodeInSL = await check('stock_ledger', 'item_code')
    
    console.log(`stock_entry_items has item_code: ${hasItemCodeInSEI}`)
    console.log(`stock_balance has item_code: ${hasItemCodeInSB}`)
    console.log(`stock_ledger has item_code: ${hasItemCodeInSL}\n`)

    if (!hasItemCodeInSEI) {
      console.log('🔧 Migrating stock_entry_items...')
      await execute(
        'ALTER TABLE stock_entry_items ADD COLUMN item_code VARCHAR(50) AFTER item_id',
        'Add item_code column'
      )
      await execute(
        `UPDATE stock_entry_items sei
         SET sei.item_code = (SELECT i.item_code FROM item i WHERE i.id = sei.item_id LIMIT 1)`,
        'Populate item_code from item_id'
      )
      await execute(
        'UPDATE stock_entry_items SET item_code = "UNKNOWN" WHERE item_code IS NULL',
        'Set default for null item_codes'
      )
      await execute(
        'ALTER TABLE stock_entry_items MODIFY COLUMN item_code VARCHAR(50) NOT NULL',
        'Make item_code NOT NULL'
      )
      console.log('✓ stock_entry_items migration complete\n')
    }

    if (!hasItemCodeInSB) {
      console.log('🔧 Migrating stock_balance...')
      await execute(
        'ALTER TABLE stock_balance ADD COLUMN item_code VARCHAR(50) AFTER item_id',
        'Add item_code column'
      )
      await execute(
        `UPDATE stock_balance sb
         SET sb.item_code = (SELECT i.item_code FROM item i WHERE i.id = sb.item_id LIMIT 1)`,
        'Populate item_code from item_id'
      )
      await execute(
        'UPDATE stock_balance SET item_code = "UNKNOWN" WHERE item_code IS NULL',
        'Set default for null item_codes'
      )
      await execute(
        'ALTER TABLE stock_balance MODIFY COLUMN item_code VARCHAR(50) NOT NULL',
        'Make item_code NOT NULL'
      )
      console.log('✓ stock_balance migration complete\n')
    }

    if (!hasItemCodeInSL) {
      console.log('🔧 Migrating stock_ledger...')
      await execute(
        'ALTER TABLE stock_ledger ADD COLUMN item_code VARCHAR(50) AFTER item_id',
        'Add item_code column'
      )
      await execute(
        `UPDATE stock_ledger sl
         SET sl.item_code = (SELECT i.item_code FROM item i WHERE i.id = sl.item_id LIMIT 1)`,
        'Populate item_code from item_id'
      )
      await execute(
        'UPDATE stock_ledger SET item_code = "UNKNOWN" WHERE item_code IS NULL',
        'Set default for null item_codes'
      )
      await execute(
        'ALTER TABLE stock_ledger MODIFY COLUMN item_code VARCHAR(50) NOT NULL',
        'Make item_code NOT NULL'
      )
      console.log('✓ stock_ledger migration complete\n')
    }

    console.log('🎉 Migration complete!')
    console.log('The stock entry creation should now work correctly.')
    process.exit(0)
  } catch (err) {
    console.error('❌ Fatal error:', err.message)
    process.exit(1)
  } finally {
    await db.end()
  }
}

main()
