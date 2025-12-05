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
    console.log('🔍 Diagnostic Report\n')

    console.log('═'.repeat(60))
    console.log('📋 ITEM TABLE SCHEMA')
    console.log('═'.repeat(60))
    const [itemCols] = await db.query('DESCRIBE item')
    itemCols.forEach(col => {
      console.log(`${col.Field.padEnd(30)} ${col.Type.padEnd(20)} ${col.Key || ''}`)
    })

    console.log('\n' + '═'.repeat(60))
    console.log('📋 STOCK_ENTRY_ITEMS SCHEMA')
    console.log('═'.repeat(60))
    const [seiCols] = await db.query('DESCRIBE stock_entry_items')
    seiCols.forEach(col => {
      console.log(`${col.Field.padEnd(30)} ${col.Type.padEnd(20)} ${col.Key || ''}`)
    })

    console.log('\n' + '═'.repeat(60))
    console.log('📊 SAMPLE DATA')
    console.log('═'.repeat(60))
    
    const [items] = await db.query('SELECT item_code, id FROM item LIMIT 3')
    console.log('Items:')
    items.forEach(i => console.log(`  ${i.item_code} (id: ${i.id})`))

    const [sei] = await db.query('SELECT id, item_code FROM stock_entry_items LIMIT 3')
    console.log('\nStock Entry Items:')
    sei.forEach(s => console.log(`  id: ${s.id}, item_code: ${s.item_code}`))

    console.log('\n' + '═'.repeat(60))
    console.log('✅ Diagnostic complete')
    process.exit(0)
  } catch (err) {
    console.error('❌ Error:', err.message)
    process.exit(1)
  } finally {
    await db.end()
  }
}

main()
