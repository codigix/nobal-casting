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

async function checkTables() {
  const connection = await mysql.createConnection(config)
  try {
    const bomId = 'BOM-1773669839953'
    const woId = 'WO-SA-1773915478704-2'

    const [bomRaw] = await connection.execute('SELECT * FROM bom_raw_material WHERE bom_id = ?', [bomId])
    console.log(`BOM Raw Materials for ${bomId}:`, bomRaw.length)
    if (bomRaw.length > 0) console.log('First raw material:', bomRaw[0])

    const [bomOps] = await connection.execute('SELECT * FROM bom_operation WHERE bom_id = ? ORDER BY sequence', [bomId])
    console.log(`BOM Operations for ${bomId}:`, bomOps.length)
    if (bomOps.length > 0) console.log('First BOM op:', bomOps[0])

    const [woOps] = await connection.execute('SELECT * FROM work_order_operation WHERE wo_id = ? ORDER BY sequence', [woId])
    console.log(`Work Order Operations for ${woId}:`, woOps.length)
    if (woOps.length > 0) console.log('First WO op:', woOps[0])
    
  } catch (error) {
    console.error('Error:', error)
  } finally {
    await connection.end()
  }
}

checkTables()
