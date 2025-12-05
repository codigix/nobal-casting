import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import mysql from 'mysql2/promise'
import dotenv from 'dotenv'

dotenv.config()

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

async function runMigration() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: 'aluminium_erp',
    port: process.env.DB_PORT || 3306,
    multipleStatements: true
  })

  try {
    console.log('🔄 Running database migration...')

    // First, run any necessary ALTER TABLE statements to fix existing schema
    console.log('🔧 Checking for schema updates...')
    const alterStatements = [
      `ALTER TABLE supplier_quotation ADD COLUMN IF NOT EXISTS status ENUM('draft', 'received', 'evaluated', 'accepted', 'rejected') DEFAULT 'draft' AFTER quote_date`
    ]
    
    for (const statement of alterStatements) {
      try {
        await connection.execute(statement)
        console.log('✓ Schema updated: ' + statement.substring(0, 50))
      } catch (err) {
        // Silently fail on alter statements if columns already exist
        if (!err.message.includes('Duplicate')) {
          console.log(`ℹ️  ${err.message.substring(0, 80)}`)
        }
      }
    }

    // Read and execute schema file
    const schemaPath = path.join(__dirname, 'database.sql')
    const schemaSql = fs.readFileSync(schemaPath, 'utf8')
    
    // Split by semicolon and execute individual statements
    const statements = schemaSql
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--') && !stmt.toUpperCase().startsWith('USE') && !stmt.toUpperCase().startsWith('CREATE DATABASE'))

    for (const statement of statements) {
      try {
        await connection.execute(statement)
      } catch (err) {
        // Skip errors for already existing objects (tables, indexes, etc)
        if (err.message.includes('already exists') || err.message.includes('Duplicate key name')) {
          console.log(`ℹ️  Skipping (already exists): ${statement.substring(0, 60)}...`)
        } else {
          console.error('Error executing statement:', statement.substring(0, 100))
          throw err
        }
      }
    }

    console.log('✓ Database schema created successfully')

    // Insert sample data
    await insertSampleData(connection)

    console.log('✓ Migration completed successfully!')
  } catch (error) {
    console.error('❌ Migration failed:', error.message)
    process.exit(1)
  } finally {
    await connection.end()
  }
}

async function insertSampleData(connection) {
  console.log('📦 Loading sample data...')

  try {
    // Company
    await connection.execute(
      `INSERT IGNORE INTO company (company_id, name, display_name, currency, fiscal_year_start)
       VALUES (?, ?, ?, ?, ?)`,
      ['COMP001', 'Aluminium Precision Casting Ltd.', 'Aluminium Precision Casting ERP', 'INR', '2025-04-01']
    )

    // Supplier Groups
    const supplierGroups = [
      ['Raw Materials', 'Suppliers of raw aluminium and ingots'],
      ['Components', 'Suppliers of components and sub-assemblies'],
      ['Services', 'Service providers and vendors'],
      ['Tools & Equipment', 'Suppliers of tools and equipment']
    ]

    for (const [name, desc] of supplierGroups) {
      await connection.execute(
        `INSERT IGNORE INTO supplier_group (name, description) VALUES (?, ?)`,
        [name, desc]
      )
    }

    // Warehouses
    const warehouses = [
      ['WH001', 'Main Warehouse', 'Chennai'],
      ['WH002', 'Secondary Warehouse', 'Bangalore'],
      ['WH003', 'Quality Control Store', 'Chennai']
    ]

    for (const [code, name, city] of warehouses) {
      await connection.execute(
        `INSERT IGNORE INTO warehouse (warehouse_code, name, is_active)
         VALUES (?, ?, 1)`,
        [code, name]
      )
    }

    // Sample Contacts
    const contacts = [
      ['CONT001', 'Rajesh Kumar', '9876543210', 'rajesh@supplier.com', 'Purchase Manager'],
      ['CONT002', 'Priya Sharma', '9876543211', 'priya@supplier.com', 'Sales Manager'],
      ['CONT003', 'Amit Patel', '9876543212', 'amit@supplier.com', 'Owner']
    ]

    for (const [id, name, phone, email, role] of contacts) {
      await connection.execute(
        `INSERT IGNORE INTO contact (contact_id, name, phone, email, role)
         VALUES (?, ?, ?, ?, ?)`,
        [id, name, phone, email, role]
      )
    }

    // Sample Addresses
    const addresses = [
      ['ADDR001', '123 Business Park', 'Suite 100', 'Chennai', 'Tamil Nadu', '600001', 'India'],
      ['ADDR002', '456 Industrial Area', 'Block A', 'Bangalore', 'Karnataka', '560001', 'India'],
      ['ADDR003', '789 Trade Center', 'Floor 5', 'Pune', 'Maharashtra', '411001', 'India']
    ]

    for (const [id, line1, line2, city, state, pincode, country] of addresses) {
      await connection.execute(
        `INSERT IGNORE INTO address (address_id, address_line1, address_line2, city, state, pincode, country)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [id, line1, line2, city, state, pincode, country]
      )
    }

    // Sample Suppliers
    const suppliers = [
      ['SUP001', 'ABC Aluminium Ltd.', 'Raw Materials', 'AAAAT1234F', 'CONT001', 'ADDR001', 30, 7, true],
      ['SUP002', 'XYZ Components', 'Components', 'XYZCK5678H', 'CONT002', 'ADDR002', 45, 5, true],
      ['SUP003', 'PQR Services', 'Services', 'PQRST9012K', 'CONT003', 'ADDR003', 15, 3, true]
    ]

    for (const [id, name, group, gstin, contact, addr, terms, leadtime, active] of suppliers) {
      await connection.execute(
        `INSERT IGNORE INTO supplier (supplier_id, name, supplier_group, gstin, contact_person_id, address_id, payment_terms_days, lead_time_days, is_active)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [id, name, group, gstin, contact, addr, terms, leadtime, active]
      )
    }

    // Sample Items
    const items = [
      ['ITEM001', 'Aluminium Ingot A380', 'Raw Materials', 'High purity aluminium ingot', 'KG', '760711', 18],
      ['ITEM002', 'Casting Mould - Type A', 'Components', 'Standard casting mould', 'PCS', '842199', 18],
      ['ITEM003', 'Quality Inspection - Service', 'Services', 'Third party quality check', 'SVC', '998399', 18],
      ['ITEM004', 'CNC Machining Service', 'Services', 'Machine shop services', 'SVC', '998300', 18],
      ['ITEM005', 'Heating Oil', 'Raw Materials', 'Furnace heating oil', 'LTR', '271019', 18]
    ]

    for (const [code, name, group, desc, uom, hsn, gst] of items) {
      await connection.execute(
        `INSERT IGNORE INTO item (item_code, name, item_group, description, uom, hsn_code, gst_rate, is_active)
         VALUES (?, ?, ?, ?, ?, ?, ?, 1)`,
        [code, name, group, desc, uom, hsn, gst]
      )
    }

    // Sample Tax Template
    await connection.execute(
      `INSERT IGNORE INTO taxes_and_charges_template (template_id, name, is_active)
       VALUES (?, ?, 1)`,
      ['TAX001', 'Standard GST @ 18%']
    )

    await connection.execute(
      `INSERT IGNORE INTO tax_item (tax_item_id, template_id, tax_head, rate)
       VALUES (?, ?, ?, ?)`,
      ['TAXITEM001', 'TAX001', 'IGST', 18]
    )

    console.log('✓ Sample data inserted successfully')
  } catch (error) {
    console.error('Error inserting sample data:', error.message)
    // Continue even if sample data fails
  }
}

// Run migration
runMigration().catch(err => {
  console.error('Migration script failed:', err)
  process.exit(1)
})