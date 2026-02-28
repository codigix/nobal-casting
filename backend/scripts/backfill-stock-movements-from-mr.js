import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'
import mysql from 'mysql2/promise'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: path.join(__dirname, '..', '.env') })

async function backfillStockMovements() {
  let connection

  try {
    console.log('\n╔════════════════════════════════════════════════════════════╗')
    console.log('║  Backfill Stock Movements from Approved Material Requests  ║')
    console.log('╚════════════════════════════════════════════════════════════╝\n')

    const dbConfig = {
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || 'root',
      database: process.env.DB_NAME || 'nobalcasting',
      port: process.env.DB_PORT || 3306
    }

    console.log('📡 Connecting to database:', dbConfig.database)
    connection = await mysql.createConnection(dbConfig)
    console.log('✅ Connection established\n')

    // Get all approved/partial/completed material requests that are stock transactions
    console.log('🔍 Finding approved Material Requests with stock transactions...\n')
    const [materialRequests] = await connection.execute(`
      SELECT mr.* FROM material_request mr
      WHERE mr.status IN ('approved', 'partial', 'completed')
      AND LOWER(mr.purpose) IN ('material_issue', 'material_transfer')
      ORDER BY mr.created_at DESC
    `)

    console.log(`📋 Found ${materialRequests.length} Material Requests to process\n`)

    let createdCount = 0
    let skippedCount = 0

    for (const mr of materialRequests) {
      // Get all items for this MR
      const [items] = await connection.execute(`
        SELECT * FROM material_request_item WHERE mr_id = ? AND issued_qty > 0
      `, [mr.mr_id])

      for (const item of items) {
        // Check if stock movement already exists for this MR item
        const [existingMovement] = await connection.execute(`
          SELECT id FROM stock_movements 
          WHERE reference_name = ? AND item_code = ? AND movement_type IN ('OUT', 'TRANSFER')
          LIMIT 1
        `, [mr.mr_id, item.item_code])

        if (existingMovement.length > 0) {
          console.log(`  ⏭️  Skipping ${item.item_code} - Movement already exists`)
          skippedCount++
          continue
        }

        // Generate transaction number
        const date = new Date()
        const dateStr = date.getFullYear() + String(date.getMonth() + 1).padStart(2, '0') + String(date.getDate()).padStart(2, '0')
        const [lastTxn] = await connection.execute(`
          SELECT MAX(CAST(SUBSTRING(transaction_no, -5) AS UNSIGNED)) as max_no 
          FROM stock_movements 
          WHERE transaction_no LIKE ?
        `, [`STK-${dateStr}-%`])

        const nextNo = (lastTxn[0]?.max_no || 0) + 1
        const transaction_no = `STK-${dateStr}-${String(nextNo).padStart(5, '0')}`

        // Get warehouse IDs
        let sourceWarehouseId = null
        if (mr.source_warehouse) {
          const [sourceWh] = await connection.execute(
            'SELECT id FROM warehouses WHERE id = ? OR warehouse_code = ? OR warehouse_name = ? LIMIT 1',
            [mr.source_warehouse, mr.source_warehouse, mr.source_warehouse]
          )
          sourceWarehouseId = sourceWh[0]?.id || null
        }

        let targetWarehouseId = null
        if (mr.purpose?.toLowerCase() === 'material_transfer' && mr.target_warehouse) {
          const [targetWh] = await connection.execute(
            'SELECT id FROM warehouses WHERE id = ? OR warehouse_code = ? OR warehouse_name = ? LIMIT 1',
            [mr.target_warehouse, mr.target_warehouse, mr.target_warehouse]
          )
          targetWarehouseId = targetWh?.[0]?.id || null
        }

        const movement_type = mr.purpose?.toLowerCase() === 'material_transfer' ? 'TRANSFER' : 'OUT'
        const warehouse_id = movement_type === 'OUT' ? sourceWarehouseId : null

        // Create stock movement entry
        const createdBy = mr.created_by || 'system'
        await connection.execute(`
          INSERT INTO stock_movements (
            transaction_no, item_code, warehouse_id, source_warehouse_id, target_warehouse_id, 
            movement_type, quantity, reference_type, reference_name, notes, 
            status, created_by, approved_by, created_at, approved_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
        `, [
          transaction_no,
          item.item_code,
          warehouse_id === undefined ? null : warehouse_id,
          sourceWarehouseId === undefined ? null : sourceWarehouseId,
          targetWarehouseId === undefined ? null : targetWarehouseId,
          movement_type,
          item.issued_qty,
          'Material Request',
          mr.mr_id,
          `Backfill: Material Release for ${mr.mr_id}`,
          'Approved',
          createdBy,
          createdBy
        ])

        console.log(`  ✅ Created movement: ${transaction_no} - ${item.item_code} (${item.issued_qty} units)`)
        createdCount++
      }
    }

    console.log(`\n📊 Backfill Complete:`)
    console.log(`   ✅ Created: ${createdCount} stock movement entries`)
    console.log(`   ⏭️  Skipped: ${skippedCount} (already exist)`)
    console.log(`\n✨ All approved Material Requests now have Stock Movement entries!\n`)

  } catch (error) {
    console.error('\n❌ Error during backfill:', error.message)
    process.exit(1)
  } finally {
    if (connection) {
      await connection.end()
    }
  }
}

backfillStockMovements()
