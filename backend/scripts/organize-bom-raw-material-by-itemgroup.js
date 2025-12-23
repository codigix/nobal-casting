import mysql from 'mysql2/promise'
import dotenv from 'dotenv'
import { fileURLToPath } from 'url'
import path from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

dotenv.config({ path: path.join(__dirname, '../.env') })

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'nobalcasting',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
})

async function organizeBOMRawMaterials() {
  const connection = await pool.getConnection()
  
  try {
    console.log('Starting BOM Raw Materials Organization...\n')

    // Step 1: Check if bom_raw_material table exists and has necessary columns
    console.log('Step 1: Checking bom_raw_material table structure...')
    
    const [columns] = await connection.execute(
      `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS 
       WHERE TABLE_NAME = 'bom_raw_material'`
    )

    const columnNames = columns.map(c => c.COLUMN_NAME)
    console.log(`Current columns: ${columnNames.join(', ')}\n`)

    // Step 2: Ensure bom_raw_material table exists with proper structure
    console.log('Step 2: Creating/Verifying bom_raw_material table with proper schema...')
    
    try {
      await connection.execute(`
        CREATE TABLE IF NOT EXISTS bom_raw_material (
          raw_material_id INT AUTO_INCREMENT PRIMARY KEY,
          bom_id VARCHAR(50) NOT NULL,
          item_code VARCHAR(100) NOT NULL,
          item_name VARCHAR(255),
          item_group VARCHAR(100),
          component_type VARCHAR(50),
          qty DECIMAL(18,6) NOT NULL,
          uom VARCHAR(50),
          rate DECIMAL(18,6),
          amount DECIMAL(18,6),
          source_warehouse VARCHAR(100),
          operation VARCHAR(255),
          sequence INT,
          fg_sub_assembly VARCHAR(50),
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (bom_id) REFERENCES bom(bom_id) ON DELETE CASCADE,
          INDEX idx_bom_id (bom_id),
          INDEX idx_item_code (item_code),
          INDEX idx_item_group (item_group),
          INDEX idx_component_type (component_type)
        )
      `)
      console.log('✓ bom_raw_material table verified/created\n')
    } catch (e) {
      if (!e.message.includes('already exists')) {
        console.log(`Note: ${e.message}\n`)
      } else {
        console.log('✓ Table already exists\n')
      }
    }

    // Step 3: Add missing columns if needed
    console.log('Step 3: Adding missing columns if needed...')
    
    if (!columnNames.includes('fg_sub_assembly')) {
      try {
        await connection.execute(
          `ALTER TABLE bom_raw_material ADD COLUMN fg_sub_assembly VARCHAR(50) AFTER component_type`
        )
        console.log('✓ Added fg_sub_assembly column')
      } catch (e) {
        console.log(`fg_sub_assembly column: ${e.message}`)
      }
    }

    if (!columnNames.includes('item_name')) {
      try {
        await connection.execute(
          `ALTER TABLE bom_raw_material ADD COLUMN item_name VARCHAR(255) AFTER item_code`
        )
        console.log('✓ Added item_name column')
      } catch (e) {
        console.log(`item_name column: ${e.message}`)
      }
    }

    console.log('')

    // Step 4: Populate item_group and item_name from item master
    console.log('Step 4: Populating item_group and item_name from item master...')
    
    const [missingItemGroup] = await connection.execute(
      `SELECT COUNT(*) as count FROM bom_raw_material 
       WHERE (item_group IS NULL OR item_group = '') AND item_code IS NOT NULL`
    )
    
    const countMissing = missingItemGroup[0].count
    if (countMissing > 0) {
      await connection.execute(`
        UPDATE bom_raw_material brm
        SET 
          item_group = COALESCE(i.item_group, 'Unknown'),
          item_name = COALESCE(i.name, brm.item_name)
        WHERE 
          (brm.item_group IS NULL OR brm.item_group = '') 
          AND brm.item_code IS NOT NULL
          AND EXISTS (SELECT 1 FROM item i WHERE i.item_code = brm.item_code)
      `)
      console.log(`✓ Updated ${countMissing} items with missing item_group`)
    } else {
      console.log('✓ All items have item_group populated')
    }
    console.log('')

    // Step 5: Get current data grouped by item_group
    console.log('Step 5: Current BOM Raw Materials Organization:\n')
    
    const [groupedData] = await connection.execute(`
      SELECT 
        item_group,
        COUNT(*) as total_items,
        SUM(CASE WHEN component_type = 'Sub-assembly' OR fg_sub_assembly = 'Sub-assembly' THEN 1 ELSE 0 END) as sub_assemblies,
        SUM(CASE WHEN component_type = 'Raw-Material' THEN 1 ELSE 0 END) as raw_materials
      FROM bom_raw_material
      GROUP BY item_group
      ORDER BY item_group
    `)

    console.log('Item Group | Total Items | Sub-Assemblies | Raw Materials')
    console.log('---------|-------------|----------------|------------------')
    
    groupedData.forEach(row => {
      const itemGroup = row.item_group || 'Unknown'
      console.log(`${itemGroup.padEnd(20)} | ${String(row.total_items).padEnd(11)} | ${String(row.sub_assemblies).padEnd(14)} | ${String(row.raw_materials).padEnd(14)}`)
    })
    console.log('')

    // Step 6: Display sample data by item_group
    console.log('Step 6: Sample Items by Item Group:\n')
    
    const [sampleData] = await connection.execute(`
      SELECT 
        item_group,
        item_code,
        item_name,
        component_type,
        fg_sub_assembly,
        qty,
        uom
      FROM bom_raw_material
      WHERE item_group IS NOT NULL
      ORDER BY item_group, item_code
      LIMIT 10
    `)

    sampleData.forEach(row => {
      const type = row.component_type === 'Sub-assembly' || row.fg_sub_assembly === 'Sub-assembly' ? '[SUB-ASSEMBLY]' : '[RAW-MATERIAL]'
      console.log(`${type} ${row.item_group || 'Unknown'}: ${row.item_code} - ${row.item_name} (${row.qty} ${row.uom})`)
    })
    console.log('')

    // Step 7: Verify bom_raw_material and create separate summary if needed
    console.log('Step 7: Complete Data Summary:\n')
    
    const [totalStats] = await connection.execute(`
      SELECT 
        COUNT(*) as total_items,
        COUNT(DISTINCT item_group) as total_item_groups,
        SUM(CASE WHEN component_type = 'Sub-assembly' OR fg_sub_assembly = 'Sub-assembly' THEN 1 ELSE 0 END) as total_sub_assemblies,
        SUM(CASE WHEN component_type = 'Raw-Material' THEN 1 ELSE 0 END) as total_raw_materials
      FROM bom_raw_material
    `)

    const stats = totalStats[0]
    console.log(`Total BOM Raw Material Items: ${stats.total_items}`)
    console.log(`Total Item Groups: ${stats.total_item_groups}`)
    console.log(`Total Sub-Assemblies: ${stats.total_sub_assemblies}`)
    console.log(`Total Raw Materials: ${stats.total_raw_materials}`)
    console.log('')

    console.log('✓ BOM Raw Materials organization completed successfully!')
  } catch (error) {
    console.error('✗ Error during organization:', error.message)
    throw error
  } finally {
    await connection.release()
    await pool.end()
  }
}

organizeBOMRawMaterials()
  .then(() => {
    console.log('\nAll tasks completed!')
    process.exit(0)
  })
  .catch((error) => {
    console.error('Organization failed:', error)
    process.exit(1)
  })
