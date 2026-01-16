import mysql from 'mysql2/promise'

async function addProfitMarginToSalesOrder() {
  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'root',
    database: 'nobalcasting'
  })

  try {
    console.log('🔄 Adding tax and profit columns to selling_sales_order table...\n')

    try {
      await connection.execute(`
        ALTER TABLE selling_sales_order 
        ADD COLUMN profit_margin_percentage DECIMAL(10,2) DEFAULT 0 AFTER order_amount
      `)
      console.log('✓ Added profit_margin_percentage column')
    } catch (err) {
      if (err.code === 'ER_DUP_FIELDNAME') {
        console.log('ℹ️  Column profit_margin_percentage already exists')
      } else {
        throw err
      }
    }

    try {
      await connection.execute(`
        ALTER TABLE selling_sales_order 
        ADD COLUMN cgst_rate DECIMAL(5,2) DEFAULT 0 AFTER profit_margin_percentage
      `)
      console.log('✓ Added cgst_rate column')
    } catch (err) {
      if (err.code === 'ER_DUP_FIELDNAME') {
        console.log('ℹ️  Column cgst_rate already exists')
      } else {
        throw err
      }
    }

    try {
      await connection.execute(`
        ALTER TABLE selling_sales_order 
        ADD COLUMN sgst_rate DECIMAL(5,2) DEFAULT 0 AFTER cgst_rate
      `)
      console.log('✓ Added sgst_rate column')
    } catch (err) {
      if (err.code === 'ER_DUP_FIELDNAME') {
        console.log('ℹ️  Column sgst_rate already exists')
      } else {
        throw err
      }
    }

    console.log('\n✅ Migration Complete!')
    console.log('\nNew columns added:')
    console.log('  - selling_sales_order.profit_margin_percentage (DECIMAL(10,2), DEFAULT 0)')
    console.log('  - selling_sales_order.cgst_rate (DECIMAL(5,2), DEFAULT 0)')
    console.log('  - selling_sales_order.sgst_rate (DECIMAL(5,2), DEFAULT 0)')

  } catch (error) {
    if (error.code === 'ER_DUP_FIELDNAME') {
      console.log('ℹ️  Column profit_margin_percentage already exists in selling_sales_order table')
    } else {
      console.error('❌ Migration failed:', error.message)
    }
  } finally {
    await connection.end()
  }
}

addProfitMarginToSalesOrder()
