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
    console.log('🔍 Checking database schema...\n')

    console.log('📋 TABLE: item')
    const [itemSchema] = await db.query('DESCRIBE item')
    itemSchema.forEach(col => {
      console.log(`   ${col.Field}: ${col.Type} ${col.Key ? `[${col.Key}]` : ''}`)
    })

    console.log('\n📋 TABLE: stock_entry_items')
    const [seiSchema] = await db.query('DESCRIBE stock_entry_items')
    seiSchema.forEach(col => {
      console.log(`   ${col.Field}: ${col.Type} ${col.Key ? `[${col.Key}]` : ''}`)
    })

    console.log('\n📋 TABLE: stock_balance')
    const [sbSchema] = await db.query('DESCRIBE stock_balance')
    sbSchema.forEach(col => {
      console.log(`   ${col.Field}: ${col.Type} ${col.Key ? `[${col.Key}]` : ''}`)
    })

    console.log('\n📋 TABLE: stock_ledger')
    const [slSchema] = await db.query('DESCRIBE stock_ledger')
    slSchema.forEach(col => {
      console.log(`   ${col.Field}: ${col.Type} ${col.Key ? `[${col.Key}]` : ''}`)
    })

    console.log('\n✅ Schema check complete!')
    process.exit(0)
  } catch (err) {
    console.error('❌ Error:', err.message)
    process.exit(1)
  } finally {
    await db.end()
  }
}

main()
