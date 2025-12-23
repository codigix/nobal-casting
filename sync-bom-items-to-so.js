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

    console.log(`\nFetching recently updated BOMs...`)
    const [bomResults] = await db.execute(
      `SELECT bom_id, bom_name, finished_goods_item, raw_materials_json, sub_assemblies_json, operations_json
       FROM production_bom
       WHERE updated_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
       ORDER BY updated_at DESC`,
      []
    )

    console.log(`Found ${bomResults.length} recently updated BOMs`)

    const itemsToAdd = new Set()
    const bomItemsMap = {}

    for (const bom of bomResults) {
      console.log(`\n  BOM: ${bom.bom_name} (${bom.bom_id})`)

      try {
        const rawMaterials = bom.raw_materials_json ? JSON.parse(bom.raw_materials_json) : []
        const subAssemblies = bom.sub_assemblies_json ? JSON.parse(bom.sub_assemblies_json) : []
        const operations = bom.operations_json ? JSON.parse(bom.operations_json) : []

        for (const item of rawMaterials) {
          if (item.item_code && !existingItemCodes.has(item.item_code)) {
            itemsToAdd.add(item.item_code)
            bomItemsMap[item.item_code] = {
              item_name: item.item_name || item.name,
              item_group: 'Raw Material',
              description: item.description || '',
              qty: item.qty || 1
            }
            console.log(`    + Raw Material: ${item.item_code}`)
          }
        }

        for (const item of subAssemblies) {
          if (item.item_code && !existingItemCodes.has(item.item_code)) {
            itemsToAdd.add(item.item_code)
            bomItemsMap[item.item_code] = {
              item_name: item.item_name || item.name,
              item_group: 'Sub Assemblies',
              description: item.description || '',
              qty: item.qty || 1
            }
            console.log(`    + Sub Assembly: ${item.item_code}`)
          }
        }
      } catch (err) {
        console.log(`    Error parsing BOM items: ${err.message}`)
      }
    }

    if (itemsToAdd.size === 0) {
      console.log('\n✓ No new items to add from recent BOM updates')
      process.exit(0)
    }

    console.log(`\nFetching details for ${itemsToAdd.size} new items from item master...`)

    const newItems = []
    for (const itemCode of itemsToAdd) {
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
          qty: (bomItemsMap[itemCode]?.qty || 1).toString(),
          ordered_qty: (bomItemsMap[itemCode]?.qty || 1).toString(),
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
    process.exit(1)
  }
}

syncBOMItemsToSalesOrder()
