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

async function updateSalesOrderItems() {
  try {
    const [results] = await db.execute(
      `SELECT sales_order_id, items 
       FROM selling_sales_order 
       WHERE sales_order_id = ?`,
      ['SO-1765449142581']
    )

    if (results.length === 0) {
      console.log('Sales order not found')
      process.exit(1)
    }

    const order = results[0]
    let items = order.items ? JSON.parse(order.items) : []

    console.log('Fetching item groups for items...')

    const updatedItems = []
    for (const item of items) {
      const [itemResults] = await db.execute(
        `SELECT item_code, name, item_group FROM item WHERE item_code = ?`,
        [item.item_code]
      )

      if (itemResults.length > 0) {
        const itemRecord = itemResults[0]
        const updatedItem = {
          ...item,
          item_group: itemRecord.item_group || 'Unknown'
        }
        updatedItems.push(updatedItem)
        console.log(`✓ ${item.item_code} -> ${itemRecord.item_group}`)
      } else {
        console.log(`✗ Item not found: ${item.item_code}`)
        updatedItems.push(item)
      }
    }

    const itemsJSON = JSON.stringify(updatedItems)

    await db.execute(
      `UPDATE selling_sales_order SET items = ? WHERE sales_order_id = ?`,
      [itemsJSON, 'SO-1765449142581']
    )

    console.log('\n✓ Sales order updated successfully with item groups')
    console.log('\nUpdated items:')
    console.log(JSON.stringify(updatedItems, null, 2))

    process.exit(0)
  } catch (error) {
    console.error('Error:', error.message)
    process.exit(1)
  }
}

updateSalesOrderItems()
