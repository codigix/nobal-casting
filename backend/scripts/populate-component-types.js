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
  database: process.env.DB_NAME || 'nobalcasting'
})

async function populateComponentTypes() {
  const connection = await pool.getConnection()
  
  try {
    console.log('Starting Component Type Population...\n')

    // Step 1: Check current state
    console.log('Step 1: Checking current component_type and fg_sub_assembly values...')
    
    const [beforeUpdate] = await connection.execute(`
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN component_type IS NULL THEN 1 ELSE 0 END) as null_component_type,
        SUM(CASE WHEN fg_sub_assembly IS NULL THEN 1 ELSE 0 END) as null_fg_sub_assembly
      FROM bom_raw_material
    `)
    
    const before = beforeUpdate[0]
    console.log(`Total items: ${before.total}`)
    console.log(`Items with NULL component_type: ${before.null_component_type}`)
    console.log(`Items with NULL fg_sub_assembly: ${before.null_fg_sub_assembly}\n`)

    // Step 2: Identify Sub-Assemblies based on item_group name
    console.log('Step 2: Identifying and updating Sub-Assemblies...')
    
    const [subAssemblyUpdate] = await connection.execute(`
      UPDATE bom_raw_material
      SET 
        component_type = 'Sub-assembly',
        fg_sub_assembly = 'Sub-assembly'
      WHERE 
        (component_type IS NULL OR component_type = '')
        AND (fg_sub_assembly IS NULL OR fg_sub_assembly = '')
        AND (item_group LIKE '%Sub%Assembly%' OR item_group = 'Sub Assemblies')
    `)
    
    console.log(`✓ Updated ${subAssemblyUpdate.affectedRows} sub-assembly items`)

    // Step 3: Identify Raw Materials based on item_group name
    console.log('Step 3: Identifying and updating Raw Materials...')
    
    const [rawMaterialUpdate] = await connection.execute(`
      UPDATE bom_raw_material
      SET 
        component_type = 'Raw-Material',
        fg_sub_assembly = NULL
      WHERE 
        (component_type IS NULL OR component_type = '')
        AND item_group LIKE '%Raw%Material%'
    `)
    
    console.log(`✓ Updated ${rawMaterialUpdate.affectedRows} raw material items\n`)

    // Step 4: Verify by checking item masters for items without determined type
    console.log('Step 4: Checking for items that need manual classification...')
    
    const [unclassified] = await connection.execute(`
      SELECT 
        raw_material_id,
        item_code,
        item_name,
        item_group,
        component_type
      FROM bom_raw_material
      WHERE (component_type IS NULL OR component_type = '')
    `)
    
    if (unclassified.length > 0) {
      console.log(`Found ${unclassified.length} items that need classification:`)
      unclassified.forEach(item => {
        console.log(`  - ${item.item_code}: ${item.item_name} (Group: ${item.item_group})`)
      })
      console.log('')
    } else {
      console.log('✓ All items have been classified\n')
    }

    // Step 5: Final summary
    console.log('Step 5: Final Organization Summary:\n')
    
    const [finalStats] = await connection.execute(`
      SELECT 
        COUNT(*) as total_items,
        SUM(CASE WHEN component_type = 'Sub-assembly' THEN 1 ELSE 0 END) as sub_assemblies,
        SUM(CASE WHEN component_type = 'Raw-Material' THEN 1 ELSE 0 END) as raw_materials,
        SUM(CASE WHEN component_type IS NULL OR component_type = '' THEN 1 ELSE 0 END) as unclassified
      FROM bom_raw_material
    `)
    
    const stats = finalStats[0]
    console.log(`Total Items: ${stats.total_items}`)
    console.log(`Sub-Assemblies: ${stats.sub_assemblies}`)
    console.log(`Raw Materials: ${stats.raw_materials}`)
    console.log(`Unclassified: ${stats.unclassified}\n`)

    // Step 6: Display organized items by item_group
    console.log('Step 6: Items Organized by Item Group:\n')
    
    const [organized] = await connection.execute(`
      SELECT 
        item_group,
        COUNT(*) as total,
        SUM(CASE WHEN component_type = 'Sub-assembly' THEN 1 ELSE 0 END) as sub_assemblies,
        SUM(CASE WHEN component_type = 'Raw-Material' THEN 1 ELSE 0 END) as raw_materials,
        GROUP_CONCAT(DISTINCT item_code ORDER BY item_code SEPARATOR ', ') as items
      FROM bom_raw_material
      GROUP BY item_group
      ORDER BY item_group
    `)
    
    organized.forEach(group => {
      console.log(`\n${group.item_group}:`)
      console.log(`  Total: ${group.total} | Sub-Assemblies: ${group.sub_assemblies} | Raw Materials: ${group.raw_materials}`)
      console.log(`  Items: ${group.items}`)
    })
    
    console.log('\n✓ Component Type Population completed successfully!')
  } catch (error) {
    console.error('✗ Error during population:', error.message)
    throw error
  } finally {
    await connection.release()
    await pool.end()
  }
}

populateComponentTypes()
  .then(() => {
    console.log('\nAll tasks completed!')
    process.exit(0)
  })
  .catch((error) => {
    console.error('Populating failed:', error)
    process.exit(1)
  })
