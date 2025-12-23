import { createPool } from 'mysql2/promise'
import dotenv from 'dotenv'

dotenv.config({ path: './backend/.env' })

const db = createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'erp_user',
  password: process.env.DB_PASSWORD || 'erp_password',
  database: process.env.DB_NAME || 'nobalcasting',
  port: process.env.DB_PORT || 3306
})

async function syncBOMItemsToSalesOrder() {
  try {
    const salesOrderId = 'SO-1765449142581'

    console.log(`Fetching sales order: ${salesOrderId}`)
    const [soResults] = await db.execute(
      `SELECT sales_order_id, items, bom_id, bom_name 
       FROM selling_sales_order 
       WHERE sales_order_id = ?`,
      [salesOrderId]
    )

    if (soResults.length === 0) {
      console.log('Sales order not found')
      process.exit(1)
    }

    const salesOrder = soResults[0]
    let soItems = salesOrder.items ? JSON.parse(salesOrder.items) : []
    const existingItemCodes = new Set(soItems.map(item => item.item_code))

    console.log(`Current items in SO: ${existingItemCodes.size}`)
    console.log(`Items: ${Array.from(existingItemCodes).join(', ')}`)

    console.log(`\nFetching recently updated BOMs...`)
    const [bomResults] = await db.execute(
      `SELECT bom_id, item_code, updated_at
       FROM bom
       WHERE updated_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
       ORDER BY updated_at DESC`,
      []
    )

    console.log(`Found ${bomResults.length} recently updated BOMs\n`)

    const itemsToFetch = new Set()

    for (const bom of bomResults) {
      console.log(`BOM: ${bom.item_code} (ID: ${bom.bom_id}, Updated: ${bom.updated_at})`)

      const [bomLines] = await db.execute(
        `SELECT line_id, component_code, component_description, quantity, uom 
         FROM bom_line 
         WHERE bom_id = ?
         ORDER BY sequence ASC`,
        [bom.bom_id]
      )

      console.log(`  BOM Lines: ${bomLines.length}`)
      for (const line of bomLines) {
        if (line.component_code && !existingItemCodes.has(line.component_code)) {
          itemsToFetch.add(line.component_code)
          console.log(`    + ${line.component_code}: ${line.component_description || 'N/A'} (Qty: ${line.quantity})`)
        }
      }

      const [rawMats] = await db.execute(
        `SELECT raw_material_id, item_code, item_name, qty, uom 
         FROM bom_raw_material 
         WHERE bom_id = ?
         ORDER BY sequence ASC`,
        [bom.bom_id]
      )

      if (rawMats.length > 0) {
        console.log(`  Raw Materials: ${rawMats.length}`)
        for (const item of rawMats) {
          if (item.item_code && !existingItemCodes.has(item.item_code)) {
            itemsToFetch.add(item.item_code)
            console.log(`    + ${item.item_code}: ${item.item_name || 'N/A'} (Qty: ${item.qty})`)
          }
        }
      }

      const [ops] = await db.execute(
        `SELECT operation_id, operation_name, workstation_type 
         FROM bom_operation 
         WHERE bom_id = ?
         ORDER BY sequence ASC`,
        [bom.bom_id]
      )

      if (ops.length > 0) {
        console.log(`  Operations: ${ops.length}`)
      }
    }

    if (itemsToFetch.size === 0) {
      console.log('\n✓ No new items to add from recent BOM updates')
      process.exit(0)
    }

    console.log(`\n\nFetching details for ${itemsToFetch.size} new items from item master...`)

    const newItems = []
    for (const itemCode of itemsToFetch) {
      const [itemResults] = await db.execute(
        `SELECT item_code, name, item_group, description FROM item WHERE item_code = ?`,
        [itemCode]
      )

      if (itemResults.length > 0) {
        const itemRecord = itemResults[0]
        const newItem = {
          item_code: itemRecord.item_code,
          item_name: itemRecord.name,
          field_description: itemRecord.description || '',
          fg_sub_assembly: itemRecord.item_group || 'Raw Material',
          delivery_date: '',
          commit_date: '',
          qty: '1.000000',
          ordered_qty: '1.000000',
          rate: '0.000000',
          amount: 0,
          input_group: '',
          source_warehouse: '',
          item_group: itemRecord.item_group || 'Raw Material'
        }
        newItems.push(newItem)
        console.log(`  ✓ ${itemCode} (${itemRecord.item_group})`)
      } else {
        console.log(`  ✗ Item not found in master: ${itemCode}`)
      }
    }

    if (newItems.length === 0) {
      console.log('\n✓ Could not find any new items in master data')
      process.exit(0)
    }

    const updatedItems = [...soItems, ...newItems]
    const itemsJSON = JSON.stringify(updatedItems)

    console.log(`\nUpdating sales order with ${newItems.length} new items...`)
    await db.execute(
      `UPDATE selling_sales_order SET items = ? WHERE sales_order_id = ?`,
      [itemsJSON, salesOrderId]
    )

    console.log(`✓ Sales order updated successfully!`)
    console.log(`\nNew items added (${newItems.length}):`)
    newItems.forEach(item => {
      console.log(`  - ${item.item_code}: ${item.item_name} (${item.item_group})`)
    })

    process.exit(0)
  } catch (error) {
    console.error('Error:', error.message)
    console.error(error)
    process.exit(1)
  }
}

syncBOMItemsToSalesOrder()
