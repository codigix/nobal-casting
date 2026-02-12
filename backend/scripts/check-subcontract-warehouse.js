import mysql from 'mysql2/promise'
import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: path.join(__dirname, '../.env') })

async function checkSubcontractWarehouse() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: parseInt(process.env.DB_PORT)
  })

  try {
    const [rows] = await connection.execute("SELECT * FROM warehouses WHERE warehouse_code = 'SUBCONTRACT_WIP'")
    if (rows.length === 0) {
      console.log('Creating SUBCONTRACT_WIP warehouse...')
      await connection.execute("INSERT INTO warehouses (warehouse_code, warehouse_name, is_active) VALUES ('SUBCONTRACT_WIP', 'Subcontract WIP', 1)")
      console.log('✓ Successfully created SUBCONTRACT_WIP warehouse')
    } else {
      console.log('✓ SUBCONTRACT_WIP warehouse already exists')
    }
  } catch (err) {
    console.error('Error:', err.message)
    if (err.message.includes("Table 'nobalcasting.warehouses' doesn't exist")) {
        console.log('Table warehouses doesn\'t exist, trying warehouse table...')
        const [rows2] = await connection.execute("SELECT * FROM warehouse WHERE warehouse_code = 'SUBCONTRACT_WIP'")
        if (rows2.length === 0) {
          console.log('Creating SUBCONTRACT_WIP warehouse in warehouse table...')
          await connection.execute("INSERT INTO warehouse (warehouse_code, name, is_active) VALUES ('SUBCONTRACT_WIP', 'Subcontract WIP', 1)")
          console.log('✓ Successfully created SUBCONTRACT_WIP warehouse')
        } else {
          console.log('✓ SUBCONTRACT_WIP warehouse already exists')
        }
    }
  } finally {
    await connection.end()
  }
}

checkSubcontractWarehouse()
