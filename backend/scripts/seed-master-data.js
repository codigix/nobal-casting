import mysql from 'mysql2/promise'
import dotenv from 'dotenv'
import bcrypt from 'bcryptjs'

dotenv.config({ path: 'backend/.env' })

async function seedMasterData() {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'nobalcasting',
    port: process.env.DB_PORT || 3306,
  })

  try {
    console.log('Seeding master data...')

    // 0. Seed Admin User
    const adminPassword = await bcrypt.hash('admin123', 10)
    await conn.execute(
      `INSERT INTO users (full_name, email, password, department, role) 
       VALUES (?, ?, ?, ?, ?) 
       ON DUPLICATE KEY UPDATE password = VALUES(password)`,
      ['Administrator', 'admin@nobalcasting.com', adminPassword, 'admin', 'admin']
    )
    console.log('✓ Admin user seeded (admin@nobalcasting.com / admin123)')

    // 0.1 Seed Item Groups (Table-based)
    try {
      const itemGroups = [
        ['Raw Material', 'Raw casting materials'],
        ['Finished Goods', 'Final manufactured products'],
        ['Consumable', 'Workshop consumables'],
        ['Scrap', 'Process waste and scrap'],
        ['Sub Assemblies', 'Intermediate manufactured components']
      ]
      for (const [name, desc] of itemGroups) {
        await conn.execute(
          'INSERT IGNORE INTO item_group (name, description) VALUES (?, ?)',
          [name, desc]
        )
      }
      console.log('✓ Item Groups seeded')
    } catch (e) {
      console.log('- Skipping Item Groups table seed:', e.message)
    }

    // 1. Seed Warehouses
    const warehouses = [
      ['WH-FG', 'Finished Goods Store', 'Finished Goods', 'Main Factory', 1],
      ['WH-RM', 'Raw Material Store', 'Raw Material', 'Main Factory', 1],
      ['WH-CONS', 'Consumables Store', 'Stores', 'Main Factory', 1],
      ['WH-SCRAP', 'Scrap Yard', 'Scrap', 'Back Yard', 1],
      ['WH-WIP', 'Work In Progress', 'WIP', 'Production Floor', 1]
    ]

    const warehouseIdMap = {}

    for (const [code, name, type, loc, active] of warehouses) {
      // Seed plural 'warehouses' (used by app models)
      const [result] = await conn.execute(
        `INSERT INTO warehouses (warehouse_code, warehouse_name, warehouse_type, location, is_active, department) 
         VALUES (?, ?, ?, ?, ?, 'all') 
         ON DUPLICATE KEY UPDATE id=LAST_INSERT_ID(id), warehouse_name=?, warehouse_type=?, location=?, is_active=?`,
        [code, name, type, loc, active, name, type, loc, active]
      )
      warehouseIdMap[code] = result.insertId

      // Seed singular 'warehouse' (used by init.sql modules)
      await conn.execute(
        'INSERT IGNORE INTO warehouse (warehouse_code, name, location, is_active) VALUES (?, ?, ?, ?)',
        [code, name, loc, active]
      )
    }
    console.log('✓ Warehouses seeded (plural and singular)')

    // 2. Seed Supplier Groups (if table exists)
    try {
      const supplierGroups = [
        ['Raw Material Supplier', 'Suppliers of raw casting materials'],
        ['Consumable Supplier', 'Suppliers of workshop consumables'],
        ['Service Provider', 'External service providers']
      ]
      for (const [name, desc] of supplierGroups) {
        await conn.execute(
          'INSERT IGNORE INTO supplier_group (name, description) VALUES (?, ?)',
          [name, desc]
        )
      }
      console.log('✓ Supplier Groups seeded')
    } catch (e) {
      console.log('- Skipping Supplier Groups (table might not exist or schema differs)')
    }

    // 3. Seed Items
    const items = [
      ['RM-ALU-001', 'Aluminium Ingot A7', 'Raw Material', 'High purity aluminium ingot', 'Kg', 18, 1],
      ['RM-ALU-002', 'Aluminium Ingot ADC12', 'Raw Material', 'Secondary aluminium alloy', 'Kg', 18, 1],
      ['FG-CAST-001', 'Engine Block Housing', 'Finished Goods', 'Finished casting for automotive', 'Nos', 12, 1],
      ['FG-CAST-002', 'Transmission Case', 'Finished Goods', 'High pressure die cast case', 'Nos', 12, 1],
      ['CONS-OIL-001', 'Hydraulic Oil ISO 46', 'Consumable', 'Standard hydraulic oil', 'Litre', 18, 1],
      ['SCRAP-ALU', 'Aluminium Scrap', 'Scrap', 'Process scrap for recycling', 'Kg', 18, 1]
    ]

    for (const [code, name, group, desc, uom, gst, active] of items) {
      await conn.execute(
        `INSERT IGNORE INTO item (item_code, name, item_group, description, uom, gst_rate, is_active, maintain_stock) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [code, name, group, desc, uom, gst, active, 1]
      )
    }
    console.log('✓ Items seeded')

    // 4. Seed Opening Stock Balance
    // Linking RM-ALU-001 to WH-RM
    const stockBalances = [
      ['RM-ALU-001', 'WH-RM', 1000, 100, 5000],
      ['RM-ALU-002', 'WH-RM', 500, 50, 2000],
      ['FG-CAST-001', 'WH-FG', 50, 10, 500],
      ['CONS-OIL-001', 'WH-CONS', 200, 20, 1000]
    ]

    for (const [item, whCode, qty, min, max] of stockBalances) {
      // Update the 'stock' table from init.sql
      await conn.execute(
        'INSERT INTO stock (item_code, warehouse_code, qty, min_qty, max_qty) VALUES (?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE qty = ?',
        [item, whCode, qty, min, max, qty]
      )
      
      // Also update 'stock_balance' (used by app models)
      const warehouseId = warehouseIdMap[whCode]
      if (warehouseId) {
        await conn.execute(
          `INSERT INTO stock_balance (item_code, warehouse_id, current_qty, reserved_qty, available_qty, valuation_rate, total_value) 
           VALUES (?, ?, ?, ?, ?, ?, ?)
           ON DUPLICATE KEY UPDATE current_qty = ?, available_qty = ?, total_value = ?`,
          [item, warehouseId, qty, 0, qty, 0, 0, qty, qty, 0]
        )
      }
    }
    console.log('✓ Stock balances seeded')

    console.log('\nMaster data seeding completed successfully!')

  } catch (error) {
    console.error('Seeding failed:', error.message)
  } finally {
    await conn.end()
  }
}

seedMasterData()
