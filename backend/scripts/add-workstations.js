import { createPool } from 'mysql2/promise'
import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: path.join(__dirname, '../.env') })

const workstations = [
  'ID', 'DCM V2', 'Sample Line', 'DCM T1', 'DCM T3', 'DCM T6', 'DCM T5', 'DCM V3', 'DCM V4', 'Lathe Machine',
  'DCM V1', 'DCM - T7', 'Core Mic-02', 'Core Mic-03', 'DCM T2', 'DCM - T5', 'CORE MIC - 02', 'Core Mic-01',
  'Line -01 Unit 2', 'NUT BOLT ASSY', 'line -02', 'MANUAL', 'line - 01 Unit 3', 'Line - 02', 'CNC-06', 'CNC-07',
  'BUFFING', 'SAND', 'DCM 02', 'vmc -05', 'DCM 01', 'DCM 03', 'Line - 3', 'LINE-2', 'CORE M/C -01', 'CNC-05',
  'CNC-04', 'DCM 20', 'DCM 19', 'DCM 18', 'HEAT TREATMENT FURNACE', 'OUTSOURCE', 'CNC-03', 'CNC-02', 'DCM T7',
  'CNC-01', 'DCM 10', 'DCM 08', 'VMC -01', 'VMC -04', 'Shot Blasting M/C-01', 'CORE M/C - 03', 'DCM 15',
  'CORE M/C - 01', 'CORE M/C - 02', 'DCM T4', 'DCM 14', 'DCM 09', 'DCM 13', 'DCM 24', 'VMC-02',
  'WLT - Machine - 01', 'Inspection Table - 01', 'Welding Station - 01', 'DCM 05', 'KEEPER ASSY', 'DCM 16', 'Line - 01'
]

async function addWorkstations() {
  const pool = createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'nobalcasting',
    port: process.env.DB_PORT || 3306,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
  })

  const conn = await pool.getConnection()

  try {
    console.log('Adding workstations to the database...')
    
    let addedCount = 0
    let duplicateCount = 0
    
    for (const name of workstations) {
      try {
        await conn.execute(
          'INSERT INTO workstation (name, workstation_name, is_active, status) VALUES (?, ?, ?, ?)',
          [name, name, 1, 'active']
        )
        console.log(`✓ Added: ${name}`)
        addedCount++
      } catch (error) {
        if (error.code === 'ER_DUP_ENTRY') {
          console.log(`✓ Already exists: ${name}`)
          duplicateCount++
        } else {
          throw error
        }
      }
    }
    
    console.log(`\nSummary: Added ${addedCount}, Already exists ${duplicateCount}`)
    process.exit(0)
  } catch (error) {
    console.error('Error:', error.message)
    process.exit(1)
  } finally {
    conn.release()
    await pool.end()
  }
}

addWorkstations()
