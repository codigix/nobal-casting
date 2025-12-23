import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import { createPool } from 'mysql2/promise'
import authRoutes from './routes/auth.js'
import itemRoutes from './routes/items.js'
import purchaseReceiptRoutes from './routes/purchaseReceipts.js'
import purchaseOrderRoutes from './routes/purchaseOrders.js'
import grnRequestRoutes from './routes/grnRequests.js'
import analyticsRoutes from './routes/analyticsRoutes.js'
import stockWarehouseRoutes from './routes/stockWarehouses.js'
import stockBalanceRoutes from './routes/stockBalance.js'
import stockLedgerRoutes from './routes/stockLedger.js'
import stockEntryRoutes from './routes/stockEntries.js'
import suppliersRoutes from './routes/suppliers.js'
import { createProductionRoutes } from './routes/production.js'
import { createProductionPlanningRoutes } from './routes/productionPlanning.js'
import { createHRPayrollRoutes } from './routes/hrpayroll.js'
import customerRoutes from './routes/customers.js'
import sellingRoutes from './routes/selling.js'
import uomRoutes from './routes/uom.js'
import itemGroupRoutes from './routes/itemGroup.js'
import materialRequestRoutes from './routes/materialRequests.js'
import mastersRoutes from './routes/masters.js'
import machinesRoutes from './routes/machines.js'

// Load environment variables
dotenv.config()

const app = express()

// CORS Configuration - Handle multiple origins properly
const allowedOrigins = process.env.CORS_ORIGIN 
  ? process.env.CORS_ORIGIN.split(',').map(origin => origin.trim())
  : ['http://localhost:5174', 'http://localhost:3000', 'http://localhost:3001']

const corsOptions = {
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps, curl requests, etc)
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true)
    } else {
      callback(new Error('CORS not allowed for this origin'))
    }
  },
  credentials: true,
  optionsSuccessStatus: 200
}

// Middleware
app.use(cors(corsOptions))
app.use(express.json())

// Database pool
let db = null

async function initializeDatabase() {
  try {
    db = createPool({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'nobalcasting',
      port: process.env.DB_PORT || 3306,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0
    })

    // Test the database connection
    await db.execute('SELECT 1')
    console.log('✓ Database connected successfully')

    // Create customer tables if they don't exist
    await createCustomerTables()
    
    // Create UOM table if it doesn't exist
    await createUOMTable()

    // Create Item Group table if it doesn't exist
    await createItemGroupTable()

    // Create Production Planning tables if they don't exist
    await createProductionPlanningTables()

    // Create HR Payroll tables if they don't exist
    await createHRPayrollTables()

    // Store db in app locals for route handlers
    app.locals.db = db

    // Make db available globally for models
    global.db = db

    console.log('✓ Database pool created successfully')
  } catch (error) {
    console.error('Database connection failed:', error)
    process.exit(1)
  }
}

async function createCustomerTables() {
  try {
    await db.execute(`
      CREATE TABLE IF NOT EXISTS customer (
        customer_id VARCHAR(50) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255),
        phone VARCHAR(20),
        address TEXT,
        city VARCHAR(100),
        state VARCHAR(100),
        postal_code VARCHAR(20),
        country VARCHAR(100),
        customer_group VARCHAR(100),
        gstin VARCHAR(20),
        contact_person_id VARCHAR(50),
        address_id VARCHAR(50),
        billing_address_id VARCHAR(50),
        shipping_address_id VARCHAR(50),
        pan VARCHAR(20),
        credit_limit DECIMAL(15, 2) DEFAULT 0,
        payment_terms_days INT DEFAULT 30,
        is_active TINYINT(1) DEFAULT 1,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        deleted_at TIMESTAMP NULL,
        INDEX idx_name (name),
        INDEX idx_email (email),
        INDEX idx_customer_group (customer_group),
        INDEX idx_is_active (is_active)
      )
    `)
    console.log('✓ Customer table ready')

    await db.execute(`
      CREATE TABLE IF NOT EXISTS customer_group (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(100) NOT NULL UNIQUE,
        description TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        deleted_at TIMESTAMP NULL
      )
    `)
    console.log('✓ Customer group table ready')

    await db.execute(`
      CREATE TABLE IF NOT EXISTS customer_scorecard (
        id INT AUTO_INCREMENT PRIMARY KEY,
        customer_id VARCHAR(50),
        quality_rating DECIMAL(3, 1),
        delivery_rating DECIMAL(3, 1),
        communication_rating DECIMAL(3, 1),
        overall_rating DECIMAL(3, 1),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (customer_id) REFERENCES customer(customer_id)
      )
    `)
    console.log('✓ Customer scorecard table ready')
  } catch (error) {
    console.log('Note:', error.message)
  }
}

async function createUOMTable() {
  try {
    await db.execute(`
      CREATE TABLE IF NOT EXISTS uom (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(100) NOT NULL UNIQUE,
        description TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        deleted_at TIMESTAMP NULL,
        INDEX idx_name (name)
      )
    `)
    console.log('✓ UOM table ready')
  } catch (error) {
    console.log('Note:', error.message)
  }
}

async function createItemGroupTable() {
  try {
    await db.execute(`
      CREATE TABLE IF NOT EXISTS item_group (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(100) NOT NULL UNIQUE,
        description TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        deleted_at TIMESTAMP NULL,
        INDEX idx_name (name)
      )
    `)
    console.log('✓ Item Group table ready')

    const defaultGroups = [
      { name: 'hh', description: 'hh' },
      { name: 'SET', description: 'SET' },
      { name: 'Mould', description: 'Mould' },
      { name: 'EF; 1.5" UNIV TRUN RTV FREE', description: 'EF; 1.5" UNIV TRUN RTV FREE' },
      { name: 'Finished Goods', description: 'Finished Goods' },
      { name: 'Consumable', description: 'Consumable' },
      { name: 'Sub Assemblies', description: 'Sub Assemblies' },
      { name: 'Services', description: 'Services' },
      { name: 'Raw Material', description: 'Raw Material' },
      { name: 'Products', description: 'Products' }
    ]

    for (const group of defaultGroups) {
      try {
        await db.execute(
          `INSERT INTO item_group (name, description) VALUES (?, ?)`,
          [group.name, group.description]
        )
      } catch (err) {
        if (err.code !== 'ER_DUP_ENTRY') {
          console.error(`Error inserting item group ${group.name}:`, err.message)
        }
      }
    }
    console.log('✓ Item groups populated')
  } catch (error) {
    console.log('Note:', error.message)
  }
}

async function createProductionPlanningTables() {
  try {
    await db.execute(`
      CREATE TABLE IF NOT EXISTS production_planning_header (
        plan_id VARCHAR(100) PRIMARY KEY,
        naming_series VARCHAR(50),
        company VARCHAR(100),
        posting_date DATE NOT NULL,
        sales_order_id VARCHAR(100),
        status VARCHAR(50) DEFAULT 'draft',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        deleted_at TIMESTAMP NULL,
        INDEX idx_status (status),
        INDEX idx_posting_date (posting_date),
        INDEX idx_sales_order_id (sales_order_id)
      )
    `)
    console.log('✓ Production planning header table ready')

    await db.execute(`
      CREATE TABLE IF NOT EXISTS production_plan_fg (
        id INT AUTO_INCREMENT PRIMARY KEY,
        plan_id VARCHAR(100) NOT NULL,
        item_code VARCHAR(100) NOT NULL,
        item_name VARCHAR(255),
        bom_no VARCHAR(100),
        planned_qty DECIMAL(18,6) NOT NULL,
        uom VARCHAR(50),
        planned_start_date DATE,
        fg_warehouse VARCHAR(100),
        revision VARCHAR(50),
        material_grade VARCHAR(100),
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (plan_id) REFERENCES production_planning_header(plan_id) ON DELETE CASCADE,
        INDEX idx_plan_id (plan_id),
        INDEX idx_item_code (item_code)
      )
    `)
    console.log('✓ Production plan FG items table ready')

    await db.execute(`
      CREATE TABLE IF NOT EXISTS production_plan_sub_assembly (
        id INT AUTO_INCREMENT PRIMARY KEY,
        plan_id VARCHAR(100) NOT NULL,
        item_code VARCHAR(100) NOT NULL,
        item_name VARCHAR(255),
        target_warehouse VARCHAR(100),
        schedule_date DATE,
        required_qty DECIMAL(18,6),
        manufacturing_type VARCHAR(50),
        bom_no VARCHAR(100),
        revision VARCHAR(50),
        material_grade VARCHAR(100),
        drawing_no VARCHAR(100),
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (plan_id) REFERENCES production_planning_header(plan_id) ON DELETE CASCADE,
        INDEX idx_plan_id (plan_id),
        INDEX idx_item_code (item_code)
      )
    `)
    console.log('✓ Production plan sub-assembly items table ready')

    await db.execute(`
      CREATE TABLE IF NOT EXISTS production_plan_raw_material (
        id INT AUTO_INCREMENT PRIMARY KEY,
        plan_id VARCHAR(100) NOT NULL,
        item_code VARCHAR(100) NOT NULL,
        item_name VARCHAR(255),
        item_type VARCHAR(50),
        plan_to_request_qty DECIMAL(18,6),
        qty_as_per_bom DECIMAL(18,6),
        required_by DATE,
        bom_no VARCHAR(100),
        revision VARCHAR(50),
        material_grade VARCHAR(100),
        drawing_no VARCHAR(100),
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (plan_id) REFERENCES production_planning_header(plan_id) ON DELETE CASCADE,
        INDEX idx_plan_id (plan_id),
        INDEX idx_item_code (item_code)
      )
    `)
    console.log('✓ Production plan raw material items table ready')
  } catch (error) {
    console.log('Note:', error.message)
  }
}

async function createHRPayrollTables() {
  try {
    await db.execute(`
      CREATE TABLE IF NOT EXISTS employee_master (
        employee_id VARCHAR(50) PRIMARY KEY,
        first_name VARCHAR(100) NOT NULL,
        last_name VARCHAR(100),
        email VARCHAR(255) NOT NULL UNIQUE,
        phone VARCHAR(20),
        date_of_birth DATE,
        gender VARCHAR(20),
        department VARCHAR(100),
        designation VARCHAR(100),
        joining_date DATE NOT NULL,
        salary DECIMAL(15, 2),
        bank_account VARCHAR(50),
        uan_number VARCHAR(50),
        status VARCHAR(50) DEFAULT 'active',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        deleted_at TIMESTAMP NULL,
        INDEX idx_email (email),
        INDEX idx_department (department),
        INDEX idx_status (status)
      )
    `)
    console.log('✓ Employee master table ready')

    await db.execute(`
      CREATE TABLE IF NOT EXISTS designation_master (
        designation_id VARCHAR(50) PRIMARY KEY,
        name VARCHAR(100) NOT NULL UNIQUE,
        description TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        deleted_at TIMESTAMP NULL,
        INDEX idx_name (name)
      )
    `)
    console.log('✓ Designation master table ready')
  } catch (error) {
    console.log('Note:', error.message)
  }
}

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

// Setup routes function - called after DB initialization
function setupRoutes() {
  // API Routes - Authentication (requires db)
  app.use('/api/auth', authRoutes(db))
  
  // API Routes - Inventory Module
  app.use('/api/items', itemRoutes)
  app.use('/api/item-groups', itemGroupRoutes)
  app.use('/api/uom', uomRoutes)
  app.use('/api/purchase-orders', purchaseOrderRoutes)
  app.use('/api/purchase-receipts', purchaseReceiptRoutes)
  app.use('/api/grn-requests', grnRequestRoutes)
  app.use('/api/stock/warehouses', stockWarehouseRoutes)
  app.use('/api/stock/stock-balance', stockBalanceRoutes)
  app.use('/api/stock/ledger', stockLedgerRoutes)
  app.use('/api/stock/entries', stockEntryRoutes)
  app.use('/api/suppliers', suppliersRoutes)
  
  // API Routes - Manufacturing Module
  app.use('/api/production', createProductionRoutes(db))
  app.use('/api/production-planning', createProductionPlanningRoutes(db))
  app.use('/api/customers', customerRoutes)
  app.use('/api/material-requests', materialRequestRoutes)
  
  // API Routes - HR & Payroll Module
  app.use('/api/hr', createHRPayrollRoutes(db))
  
  // API Routes - Selling Module
  app.use('/api/selling', sellingRoutes)
  
  // API Routes - Analytics (for all departments)
  app.use('/api/analytics', analyticsRoutes)
  
  // API Routes - Masters Data
  app.use('/api/masters', mastersRoutes)
  
  // API Routes - Machines Analysis
  app.use('/api/machines', machinesRoutes)
  
  // Error handling middleware (must be after all routes)
  app.use((err, req, res, next) => {
    console.error(err.stack)
    res.status(500).json({ 
      error: 'Internal server error',
      message: process.env.NODE_ENV === 'development' ? err.message : undefined
    })
  })

  // 404 handler (must be last)
  app.use((req, res) => {
    res.status(404).json({ error: 'Endpoint not found' })
  })
}

const PORT = process.env.PORT || 5000

// Start server
async function start() {
  await initializeDatabase()
  setupRoutes() // Setup routes after DB is initialized
  
  app.listen(PORT, () => {
    console.log(`✓ Server running on http://localhost:${PORT}`)
    console.log(`✓ API Base URL: http://localhost:${PORT}/api`)
    console.log('Environment:', process.env.NODE_ENV || 'development')
  })
}

start().catch(err => {
  console.error('Failed to start server:', err)
  process.exit(1)
})

export { app, db }
