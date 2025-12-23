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

async function checkSalesOrder() {
  try {
    const [results] = await db.execute(
      `SELECT sales_order_id, items, bom_finished_goods, bom_raw_materials, bom_operations 
       FROM selling_sales_order 
       WHERE sales_order_id = ?`,
      ['SO-1765449142581']
    )

    if (results.length === 0) {
      console.log('Sales order not found')
      process.exit(1)
    }

    const order = results[0]
    console.log('Sales Order:', order.sales_order_id)
    console.log('\nItems:', order.items ? JSON.parse(order.items) : [])
    console.log('\nBOM Finished Goods:', order.bom_finished_goods ? JSON.parse(order.bom_finished_goods) : [])
    console.log('\nBOM Raw Materials:', order.bom_raw_materials ? JSON.parse(order.bom_raw_materials) : [])
    console.log('\nBOM Operations:', order.bom_operations ? JSON.parse(order.bom_operations) : [])

    process.exit(0)
  } catch (error) {
    console.error('Error:', error.message)
    process.exit(1)
  }
}

checkSalesOrder()
