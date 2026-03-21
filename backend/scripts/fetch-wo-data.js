import mysql from 'mysql2/promise'
import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

dotenv.config({ path: path.join(__dirname, '../.env') })

const config = {
  host: '127.0.0.1',
  user: 'nobalcasting_user',
  password: 'C0digix$309',
  database: 'nobalcasting',
  port: 3307
}

async function fetchWorkOrder() {
  const connection = await mysql.createConnection(config)
  try {
    const searchId = 'WO-SA-1773915478704-2'
    const [woRows] = await connection.execute('SELECT * FROM work_order WHERE wo_id = ?', [searchId])
    
    if (woRows.length === 0) {
      console.log(`Work Order ${searchId} not found. Listing all work orders:`)
      const [allWOs] = await connection.execute('SELECT wo_id, item_code, status FROM work_order')
      console.log(JSON.stringify(allWOs, null, 2))
      return
    }

    const wo = woRows[0]
    console.log('--- WORK ORDER ---')
    console.log(JSON.stringify(wo, null, 2))

    const [opRows] = await connection.execute('SELECT * FROM work_order_operation WHERE wo_id = ?', [wo.wo_id])
    console.log('--- OPERATIONS ---')
    console.log(JSON.stringify(opRows, null, 2))

    const [itemRows] = await connection.execute('SELECT * FROM work_order_item WHERE wo_id = ?', [wo.wo_id])
    console.log('--- ITEMS ---')
    console.log(JSON.stringify(itemRows, null, 2))
    
    if (wo.bom_no) {
      const [bomItems] = await connection.execute('SELECT * FROM bom_raw_material WHERE bom_id = ?', [wo.bom_no])
      console.log('--- BOM RAW MATERIALS ---')
      console.log(JSON.stringify(bomItems, null, 2))
      
      const [bomOps] = await connection.execute('SELECT * FROM bom_operation WHERE bom_id = ?', [wo.bom_no])
      console.log('--- BOM OPERATIONS ---')
      console.log(JSON.stringify(bomOps, null, 2))
    }
    
    if (wo.production_plan_id) {
      const [planRows] = await connection.execute('SELECT * FROM production_plan WHERE plan_id = ?', [wo.production_plan_id])
      console.log('--- PRODUCTION PLAN ---')
      console.log(JSON.stringify(planRows[0], null, 2))
    }
  } catch (error) {
    console.error('Error:', error)
  } finally {
    await connection.end()
  }
}

fetchWorkOrder()
