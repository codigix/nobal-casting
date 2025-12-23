#!/usr/bin/env node
import { createPool } from 'mysql2/promise'
import dotenv from 'dotenv'

dotenv.config()

async function main() {
  const db = createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'nobalcasting',
    port: process.env.DB_PORT || 3306
  })

  try {
    console.log('🔧 Adding Sample Workstations\n')

    const sampleWorkstations = [
      {
        name: 'WS001',
        workstation_name: 'Furnace - Section A',
        description: 'Main melting and casting furnace',
        location: 'Building 1, Floor 1',
        capacity_per_hour: 500
      },
      {
        name: 'WS002',
        workstation_name: 'CNC Lathe - Station 1',
        description: 'Precision CNC lathe machine',
        location: 'Building 2, Floor 2',
        capacity_per_hour: 200
      },
      {
        name: 'WS003',
        workstation_name: 'Assembly Line - A',
        description: 'Manual assembly workstation',
        location: 'Building 1, Floor 2',
        capacity_per_hour: 150
      },
      {
        name: 'WS004',
        workstation_name: 'Quality Inspection - Lab',
        description: 'Testing and quality control lab',
        location: 'Building 3, Floor 1',
        capacity_per_hour: 100
      },
      {
        name: 'WS005',
        workstation_name: 'Packaging Station',
        description: 'Final packaging and dispatch',
        location: 'Building 1, Floor 3',
        capacity_per_hour: 300
      },
      {
        name: 'WS006',
        workstation_name: 'CNC Milling - Station 2',
        description: 'CNC milling machine for precision work',
        location: 'Building 2, Floor 1',
        capacity_per_hour: 250
      }
    ]

    console.log(`📋 Inserting ${sampleWorkstations.length} workstations...\n`)

    for (const ws of sampleWorkstations) {
      try {
        await db.execute(
          `INSERT INTO workstation (name, workstation_name, description, location, capacity_per_hour, is_active, status)
           VALUES (?, ?, ?, ?, ?, 1, 'active')
           ON DUPLICATE KEY UPDATE
           workstation_name = VALUES(workstation_name),
           description = VALUES(description),
           location = VALUES(location),
           capacity_per_hour = VALUES(capacity_per_hour),
           is_active = 1,
           status = 'active'`,
          [ws.name, ws.workstation_name, ws.description, ws.location, ws.capacity_per_hour]
        )
        console.log(`✓ ${ws.name} - ${ws.workstation_name}`)
      } catch (err) {
        console.error(`✗ Error inserting ${ws.name}:`, err.message)
      }
    }

    console.log('\n✓ Sample workstations added/updated successfully!')

    const [[{ count }]] = await db.query('SELECT COUNT(*) as count FROM workstation WHERE is_active = 1')
    console.log(`📊 Total active workstations: ${count}`)

    process.exit(0)
  } catch (err) {
    console.error('❌ Fatal error:', err.message)
    process.exit(1)
  } finally {
    await db.end()
  }
}

main()
