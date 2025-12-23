import mysql from 'mysql2/promise'

async function checkData() {
  const conn = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'root',
    database: 'nobalcasting'
  })

  console.log('=== Checking BOM Data ===\n')

  const [boms] = await conn.execute(`
    SELECT bom_id, product_name, item_code FROM production_bom 
    WHERE deleted_at IS NULL
    LIMIT 5
  `)

  console.log(`Found ${boms.length} BOMs:`)
  boms.forEach(b => console.log(`  - ${b.bom_id} | ${b.product_name || 'N/A'} | Item: ${b.item_code || 'N/A'}`))

  if (boms.length > 0) {
    console.log('\nChecking BOM items for first BOM:')
    const [bomItems] = await conn.execute(`
      SELECT item_code, item_name, quantity FROM production_bom_item 
      WHERE bom_id = ? AND deleted_at IS NULL
      LIMIT 10
    `, [boms[0].bom_id])

    console.log(`Found ${bomItems.length} items in ${boms[0].bom_id}:`)
    bomItems.forEach(bi => console.log(`    - ${bi.item_code} | ${bi.item_name || 'N/A'} | Qty: ${bi.quantity || 0}`))
  }

  console.log('\n=== Checking Sales Order Items ===\n')

  const [salesOrders] = await conn.execute(`
    SELECT sales_order_id, customer_name, items FROM selling_sales_order 
    WHERE deleted_at IS NULL
    LIMIT 3
  `)

  console.log(`Found ${salesOrders.length} Sales Orders:`)
  salesOrders.forEach(so => {
    const items = so.items ? JSON.parse(so.items) : []
    console.log(`  - ${so.sales_order_id} | Customer: ${so.customer_name} | Items: ${items.length}`)
    items.forEach(item => console.log(`      * ${item.item_code || 'N/A'} | ${item.item_name || 'N/A'} | Qty: ${item.qty || item.ordered_qty || 0}`))
  })

  console.log('\n=== Checking Items ===\n')

  const [items] = await conn.execute(`
    SELECT item_code, name, item_group FROM item 
    WHERE deleted_at IS NULL
    LIMIT 10
  `)

  console.log(`Found ${items.length} Items:`)
  items.forEach(i => console.log(`  - ${i.item_code} | ${i.name} | Group: ${i.item_group}`))

  conn.end()
}

checkData().catch(err => console.error('Error:', err.message))
