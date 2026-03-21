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

async function upgradeWorkOrder() {
  const connection = await mysql.createConnection(config)
  try {
    const woId = 'WO-SA-1773915478704-2'
    const [woRows] = await connection.execute('SELECT * FROM work_order WHERE wo_id = ?', [woId])
    
    if (woRows.length === 0) {
      console.log(`Work Order ${woId} not found.`)
      return
    }

    const wo = woRows[0]
    const qty = parseFloat(wo.quantity) || 1
    const bomId = wo.bom_no

    if (!bomId) {
      console.log('No BOM linked to this Work Order.')
      return
    }

    console.log(`Upgrading Work Order ${woId} (Qty: ${qty}) using BOM ${bomId}...`)

    // 1. Fetch BOM Raw Materials
    const [bomItems] = await connection.execute('SELECT * FROM bom_raw_material WHERE bom_id = ?', [bomId])
    
    // 2. Clear existing items
    await connection.execute('DELETE FROM work_order_item WHERE wo_id = ?', [woId])

    let totalMaterialCost = 0

    // 3. Insert into work_order_item using correct columns
    for (const item of bomItems) {
      const requiredQty = parseFloat(item.qty) * qty
      const rate = parseFloat(item.rate) || 0
      const amount = requiredQty * rate
      totalMaterialCost += amount

      await connection.execute(
        `INSERT INTO work_order_item 
         (wo_id, item_code, required_qty, allocated_qty, issued_qty, consumed_qty, returned_qty, scrap_qty, sequence, source_warehouse) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          woId, 
          item.item_code, 
          requiredQty, 
          0, // allocated_qty
          0, // issued_qty
          0, // consumed_qty
          0, // returned_qty
          0, // scrap_qty
          item.sequence || 0,
          item.source_warehouse || 'Main'
        ]
      )
      console.log(`- Added ${item.item_code}: ${requiredQty} ${item.uom} (Rate: ${rate}, Amount: ${amount})`)
    }

    // 4. Update Work Order Costs
    // Calculate operation cost from existing operations
    const [opRows] = await connection.execute('SELECT SUM(operating_cost) as total_op_cost FROM work_order_operation WHERE wo_id = ?', [woId])
    const totalOpCost = parseFloat(opRows[0].total_op_cost || 0)
    
    const totalCost = totalMaterialCost + totalOpCost
    const unitCost = totalCost / qty

    await connection.execute(
      `UPDATE work_order SET 
       material_cost = ?, 
       operation_cost = ?, 
       unit_cost = ?, 
       total_cost = ? 
       WHERE wo_id = ?`,
      [totalMaterialCost, totalOpCost, unitCost, totalCost, woId]
    )

    console.log(`\nWork Order upgraded successfully.`)
    console.log(`- Material Cost: ${totalMaterialCost}`)
    console.log(`- Operation Cost: ${totalOpCost}`)
    console.log(`- Total Cost: ${totalCost}`)
    console.log(`- Unit Cost: ${unitCost}`)

  } catch (error) {
    console.error('Error during upgrade:', error)
  } finally {
    await connection.end()
  }
}

upgradeWorkOrder()
