import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import { createPool } from 'mysql2/promise'
import authRoutes from './routes/auth.js'
import itemRoutes from './routes/items.js'
import purchaseReceiptRoutes from './routes/purchaseReceipts.js'
import purchaseOrderRoutes from './routes/purchaseOrders.js'
import purchaseInvoiceRoutes from './routes/purchaseInvoices.js'
import grnRequestRoutes from './routes/grnRequests.js'
import analyticsRoutes from './routes/analyticsRoutes.js'
import stockWarehouseRoutes from './routes/stockWarehouses.js'
import stockBalanceRoutes from './routes/stockBalance.js'
import stockLedgerRoutes from './routes/stockLedger.js'
import stockEntryRoutes from './routes/stockEntries.js'
import stockMovementRoutes from './routes/stockMovements.js'
import productionStagesRoutes from './routes/productionStages.js'
import suppliersRoutes from './routes/suppliers.js'
import { createProductionRoutes } from './routes/production.js'
import { createProductionPlanningRoutes } from './routes/productionPlanning.js'
import { createHRPayrollRoutes } from './routes/hrpayroll.js'
import customerRoutes from './routes/customers.js'
import sellingRoutes from './routes/selling.js'
import uomRoutes from './routes/uom.js'
import itemGroupRoutes from './routes/itemGroup.js'
import materialRequestRoutes from './routes/materialRequests.js'
import quotationRoutes from './routes/quotations.js'
import rfqRoutes from './routes/rfqs.js'
import taxTemplateRoutes from './routes/taxTemplates.js'
import mastersRoutes from './routes/masters.js'
import machinesRoutes from './routes/machines.js'
import notificationRoutes from './routes/notifications.js'
import { createFinanceRoutes } from './routes/finance.js'
import { createOEERoutes } from './routes/oee.js'

dotenv.config()

const app = express()

const corsOptions = {
  origin: process.env.CORS_ORIGIN 
    ? process.env.CORS_ORIGIN.split(',').map(item => item.trim())
    : ['http://localhost:5173', 'http://localhost:5174', 'http://localhost:5175', 'http://localhost:3000', 'http://localhost:3001', 'http://127.0.0.1:5174', 'http://127.0.0.1:5175'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  optionsSuccessStatus: 200
}

app.use(cors(corsOptions))
app.use(express.json())

let db = null

async function initializeDatabase() {
  try {
    db = createPool({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'nobalcasting',
      port: parseInt(process.env.DB_PORT || '3306'),
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
      charset: 'utf8mb4',
      enableKeepAlive: true,
      keepAliveInitialDelay: 10000,
      connectTimeout: 10000,
      acquireTimeout: 10000
    })

    // Add error handler to the pool
    db.on('error', (err) => {
      console.error('Unexpected error on idle database connection:', err)
      if (err.code === 'PROTOCOL_CONNECTION_LOST') {
        console.error('Database connection was closed. Attempting to reconnect...')
        // The pool handles individual connection drops, but if the whole pool is bad, we might need more
      }
    })

    await db.execute('SELECT 1')
    console.log('✓ Database connected successfully')

    await createCustomerTables()
    
    await createUOMTable()

    await createItemGroupTable()

    await createProductionPlanningTables()

    await createHRPayrollTables()

    await createStockMovementTable()
    
    await enhanceJobCardTable()
    
    await createTimeLogTable()
    
    await createRejectionTable()
    
    await createRejectionEntryTable()
    
    await enhanceTimeLogTable()
    
    await createProductionStagesTable()
    await fixOperationExecutionLogTable()
    await createOperationExecutionLogTable()
    await createBomMaterialRequestLinkTable()
    await createOutwardChallanTable()
    await createInwardChallanTable()
    await createDocumentSequencesTable()

    app.locals.db = db

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
      CREATE TABLE IF NOT EXISTS production_plan (
        plan_id VARCHAR(100) PRIMARY KEY,
        naming_series VARCHAR(50),
        company VARCHAR(100),
        posting_date DATE NOT NULL,
        sales_order_id VARCHAR(100),
        bom_id VARCHAR(100),
        status VARCHAR(50) DEFAULT 'draft',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        deleted_at TIMESTAMP NULL,
        INDEX idx_status (status),
        INDEX idx_posting_date (posting_date),
        INDEX idx_sales_order_id (sales_order_id)
      )
    `)
    console.log('✓ Production plan table ready')

    await db.execute(`
      CREATE TABLE IF NOT EXISTS production_plan_fg (
        id INT AUTO_INCREMENT PRIMARY KEY,
        plan_id VARCHAR(100) NOT NULL,
        item_code VARCHAR(100) NOT NULL,
        item_name VARCHAR(255),
        bom_no VARCHAR(100),
        planned_qty DECIMAL(18,6) NOT NULL,
        uom VARCHAR(50),
        item_group VARCHAR(100),
        planned_start_date DATE,
        fg_warehouse VARCHAR(100),
        revision VARCHAR(50),
        material_grade VARCHAR(100),
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (plan_id) REFERENCES production_plan(plan_id) ON DELETE CASCADE,
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
        planned_qty DECIMAL(18,6),
        planned_qty_before_scrap DECIMAL(18,6),
        scrap_percentage DECIMAL(5,2) DEFAULT 0,
        manufacturing_type VARCHAR(50),
        item_group VARCHAR(100),
        bom_no VARCHAR(100),
        revision VARCHAR(50),
        material_grade VARCHAR(100),
        drawing_no VARCHAR(100),
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (plan_id) REFERENCES production_plan(plan_id) ON DELETE CASCADE,
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
        item_group VARCHAR(100),
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
        FOREIGN KEY (plan_id) REFERENCES production_plan(plan_id) ON DELETE CASCADE,
        INDEX idx_plan_id (plan_id),
        INDEX idx_item_code (item_code)
      )
    `)
    console.log('✓ Production plan raw material items table ready')

    await db.execute(`
      CREATE TABLE IF NOT EXISTS production_plan_operations (
        id INT AUTO_INCREMENT PRIMARY KEY,
        plan_id VARCHAR(100) NOT NULL,
        operation_name VARCHAR(255),
        total_time_minutes DECIMAL(18,6),
        total_hours DECIMAL(18,6),
        hourly_rate DECIMAL(15,2),
        total_cost DECIMAL(15,2),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (plan_id) REFERENCES production_plan(plan_id) ON DELETE CASCADE,
        INDEX idx_plan_id (plan_id)
      )
    `)
    console.log('✓ Production plan operations table ready')
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

async function createStockMovementTable() {
  try {
    await db.execute(`
      CREATE TABLE IF NOT EXISTS stock_movements (
        id INT AUTO_INCREMENT PRIMARY KEY,
        transaction_no VARCHAR(50) NOT NULL UNIQUE,
        item_code VARCHAR(100) NOT NULL,
        warehouse_id INT NOT NULL,
        movement_type ENUM('IN', 'OUT') NOT NULL,
        quantity DECIMAL(18, 6) NOT NULL,
        reference_type VARCHAR(50),
        reference_name VARCHAR(100),
        notes TEXT,
        status ENUM('Pending', 'Approved', 'Completed', 'Cancelled') DEFAULT 'Pending',
        created_by VARCHAR(50),
        approved_by VARCHAR(50),
        rejection_reason TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        approved_at TIMESTAMP NULL,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_transaction_no (transaction_no),
        INDEX idx_item_code (item_code),
        INDEX idx_warehouse_id (warehouse_id),
        INDEX idx_status (status),
        INDEX idx_movement_type (movement_type),
        INDEX idx_created_at (created_at)
      )
    `)
    console.log('✓ Stock movements table ready')
  } catch (error) {
    console.log('Note:', error.message)
  }
}

async function enhanceJobCardTable() {
  try {
    const columnsToAdd = [
      { name: 'operation_sequence', sql: 'operation_sequence INT DEFAULT NULL' },
      { name: 'planned_start_date', sql: 'planned_start_date DATETIME DEFAULT NULL' },
      { name: 'planned_end_date', sql: 'planned_end_date DATETIME DEFAULT NULL' },
      { name: 'actual_start_date', sql: 'actual_start_date DATETIME DEFAULT NULL' },
      { name: 'actual_end_date', sql: 'actual_end_date DATETIME DEFAULT NULL' },
      { name: 'is_delayed', sql: 'is_delayed TINYINT(1) DEFAULT 0' },
      { name: 'next_operation_id', sql: 'next_operation_id INT DEFAULT NULL' },
      { name: 'assigned_workstation_id', sql: 'assigned_workstation_id VARCHAR(50) DEFAULT NULL' },
      { name: 'assignment_notes', sql: 'assignment_notes TEXT DEFAULT NULL' },
      { name: 'inhouse', sql: 'inhouse TINYINT(1) DEFAULT 0' },
      { name: 'outsource', sql: 'outsource TINYINT(1) DEFAULT 0' }
    ]

    for (const column of columnsToAdd) {
      try {
        await db.execute(`ALTER TABLE job_card ADD COLUMN ${column.sql}`)
        console.log(`✓ Added column ${column.name} to job_card`)
      } catch (error) {
        if (error.message.includes('Duplicate column')) {
          console.log(`→ Column ${column.name} already exists in job_card`)
        } else {
          throw error
        }
      }
    }

    await db.execute(`
      ALTER TABLE job_card ADD INDEX idx_operation_sequence (operation_sequence),
      ADD INDEX idx_planned_dates (planned_start_date, planned_end_date),
      ADD INDEX idx_is_delayed (is_delayed)
    `)
  } catch (error) {
    console.log('Note:', error.message)
  }
}

async function enhanceTimeLogTable() {
  try {
    const columnsToAdd = [
      { name: 'log_date', sql: 'log_date DATE' },
      { name: 'day_number', sql: 'day_number INT DEFAULT 1' },
      { name: 'workstation_name', sql: 'workstation_name VARCHAR(100) DEFAULT NULL' },
      { name: 'inhouse', sql: 'inhouse TINYINT(1) DEFAULT 0' },
      { name: 'outsource', sql: 'outsource TINYINT(1) DEFAULT 0' }
    ]

    for (const column of columnsToAdd) {
      try {
        await db.execute(`ALTER TABLE time_log ADD COLUMN ${column.sql}`)
        console.log(`✓ Added column ${column.name} to time_log`)
      } catch (error) {
        if (error.message.includes('Duplicate column')) {
          console.log(`→ Column ${column.name} already exists in time_log`)
        } else if (error.message.includes('Unknown table')) {
          console.log('Note: time_log table does not exist yet')
          return
        } else {
          throw error
        }
      }
    }
  } catch (error) {
    console.log('Note:', error.message)
  }
}

async function createProductionStagesTable() {
  try {
    await db.execute(`
      CREATE TABLE IF NOT EXISTS production_stages (
        id INT AUTO_INCREMENT PRIMARY KEY,
        stage_code VARCHAR(50) NOT NULL UNIQUE,
        stage_name VARCHAR(100) NOT NULL,
        stage_sequence INT NOT NULL,
        description TEXT,
        is_active TINYINT(1) DEFAULT 1,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_stage_code (stage_code),
        INDEX idx_is_active (is_active),
        INDEX idx_stage_sequence (stage_sequence)
      )
    `)
    console.log('✓ Production stages table ready')
  } catch (error) {
    console.log('Note:', error.message)
  }
}

async function createTimeLogTable() {
  try {
    await db.execute(`
      CREATE TABLE IF NOT EXISTS time_log (
        id INT AUTO_INCREMENT PRIMARY KEY,
        time_log_id VARCHAR(50) UNIQUE NOT NULL,
        job_card_id VARCHAR(50) NOT NULL,
        employee_id VARCHAR(50),
        operator_name VARCHAR(255),
        workstation_name VARCHAR(100),
        shift VARCHAR(10),
        from_time TIME,
        to_time TIME,
        time_in_minutes INT DEFAULT 0,
        completed_qty DECIMAL(18,6) DEFAULT 0,
        accepted_qty DECIMAL(18,6) DEFAULT 0,
        rejected_qty DECIMAL(18,6) DEFAULT 0,
        scrap_qty DECIMAL(18,6) DEFAULT 0,
        inhouse TINYINT(1) DEFAULT 0,
        outsource TINYINT(1) DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_job_card_id (job_card_id),
        INDEX idx_employee_id (employee_id),
        INDEX idx_time_log_id (time_log_id),
        FOREIGN KEY (job_card_id) REFERENCES job_card(job_card_id) ON DELETE CASCADE
      )
    `)
    console.log('✓ Time log table ready')
  } catch (error) {
    console.log('Note:', error.message)
  }
}

async function createRejectionTable() {
  try {
    await db.execute(`
      CREATE TABLE IF NOT EXISTS rejection (
        id INT AUTO_INCREMENT PRIMARY KEY,
        job_card_id VARCHAR(50) NOT NULL,
        operator_name VARCHAR(255),
        machine VARCHAR(255),
        rejection_reason VARCHAR(255),
        quantity DECIMAL(18,6) DEFAULT 0,
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_job_card_id (job_card_id),
        FOREIGN KEY (job_card_id) REFERENCES job_card(job_card_id) ON DELETE CASCADE
      )
    `)
    console.log('✓ Rejection table ready')
  } catch (error) {
    console.log('Note:', error.message)
  }
}

async function createRejectionEntryTable() {
  try {
    await db.execute(`
      CREATE TABLE IF NOT EXISTS rejection_entry (
        id INT AUTO_INCREMENT PRIMARY KEY,
        rejection_id VARCHAR(50) UNIQUE NOT NULL,
        job_card_id VARCHAR(50) NOT NULL,
        day_number INT DEFAULT 1,
        log_date DATE,
        shift VARCHAR(20),
        accepted_qty DECIMAL(18,6) DEFAULT 0,
        rejection_reason VARCHAR(255),
        rejected_qty DECIMAL(18,6) DEFAULT 0,
        scrap_qty DECIMAL(18,6) DEFAULT 0,
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_job_card_id (job_card_id),
        INDEX idx_rejection_id (rejection_id),
        FOREIGN KEY (job_card_id) REFERENCES job_card(job_card_id) ON DELETE CASCADE
      )
    `)
    console.log('✓ Rejection entry table ready')
  } catch (error) {
    console.log('Note:', error.message)
  }
}

async function fixOperationExecutionLogTable() {
  try {
    await db.execute(`
      ALTER TABLE operation_execution_log MODIFY COLUMN event_timestamp DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3)
    `)
    await db.execute(`
      ALTER TABLE operation_execution_log MODIFY COLUMN workstation_id VARCHAR(50)
    `)
    console.log('✓ Operation execution log table schema updated')
  } catch (error) {
    if (error.message.includes('Unknown table')) {
      console.log('Note: operation_execution_log table does not exist yet')
    } else {
      console.log('Note:', error.message)
    }
  }
}

async function createOperationExecutionLogTable() {
  try {
    await db.execute(`
      CREATE TABLE IF NOT EXISTS operation_execution_log (
        id INT AUTO_INCREMENT PRIMARY KEY,
        job_card_id VARCHAR(50) NOT NULL,
        event_type VARCHAR(50) NOT NULL,
        event_timestamp DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3),
        workstation_id VARCHAR(50),
        operator_id VARCHAR(100),
        start_date DATE,
        start_time TIME,
        notes TEXT,
        created_by VARCHAR(50),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_job_card_id (job_card_id),
        INDEX idx_event_type (event_type),
        INDEX idx_event_timestamp (event_timestamp),
        FOREIGN KEY (job_card_id) REFERENCES job_card(job_card_id) ON DELETE CASCADE
      )
    `)
    console.log('✓ Operation execution log table ready')
  } catch (error) {
    console.log('Note:', error.message)
  }
}

async function createBomMaterialRequestLinkTable() {
  try {
    await db.execute(`
      CREATE TABLE IF NOT EXISTS bom_material_request_link (
        id INT AUTO_INCREMENT PRIMARY KEY,
        bom_id INT NOT NULL,
        material_request_id INT NOT NULL,
        link_timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        created_by VARCHAR(50),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_bom_id (bom_id),
        INDEX idx_material_request_id (material_request_id),
        INDEX idx_link_timestamp (link_timestamp),
        UNIQUE KEY unique_bom_mr (bom_id, material_request_id)
      )
    `)
    console.log('✓ BOM Material Request link table ready')
  } catch (error) {
    console.log('Note:', error.message)
  }
}

async function createOutwardChallanTable() {
  try {
    await db.execute(`
      CREATE TABLE IF NOT EXISTS outward_challan (
        id INT AUTO_INCREMENT PRIMARY KEY,
        challan_number VARCHAR(50) UNIQUE NOT NULL,
        job_card_id VARCHAR(50) NOT NULL,
        vendor_id VARCHAR(50),
        vendor_name VARCHAR(255),
        challan_date DATETIME DEFAULT CURRENT_TIMESTAMP,
        expected_return_date DATE,
        notes TEXT,
        status VARCHAR(50) DEFAULT 'issued',
        created_by VARCHAR(50),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_job_card_id (job_card_id),
        INDEX idx_vendor_id (vendor_id),
        INDEX idx_challan_date (challan_date),
        INDEX idx_status (status),
        FOREIGN KEY (job_card_id) REFERENCES job_card(job_card_id) ON DELETE CASCADE
      )
    `)
    console.log('✓ Outward challan table ready')
  } catch (error) {
    console.log('Note:', error.message)
  }
}

async function createInwardChallanTable() {
  try {
    await db.execute(`
      CREATE TABLE IF NOT EXISTS inward_challan (
        id INT AUTO_INCREMENT PRIMARY KEY,
        challan_number VARCHAR(50) UNIQUE NOT NULL,
        outward_challan_id INT,
        job_card_id VARCHAR(50) NOT NULL,
        vendor_id VARCHAR(50),
        vendor_name VARCHAR(255),
        received_date DATETIME DEFAULT CURRENT_TIMESTAMP,
        quantity_received DECIMAL(18,6) DEFAULT 0,
        quantity_accepted DECIMAL(18,6) DEFAULT 0,
        quantity_rejected DECIMAL(18,6) DEFAULT 0,
        notes TEXT,
        status VARCHAR(50) DEFAULT 'received',
        created_by VARCHAR(50),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_job_card_id (job_card_id),
        INDEX idx_outward_challan_id (outward_challan_id),
        INDEX idx_vendor_id (vendor_id),
        INDEX idx_received_date (received_date),
        INDEX idx_status (status),
        FOREIGN KEY (job_card_id) REFERENCES job_card(job_card_id) ON DELETE CASCADE,
        FOREIGN KEY (outward_challan_id) REFERENCES outward_challan(id) ON DELETE SET NULL
      )
    `)
    console.log('✓ Inward challan table ready')
  } catch (error) {
    console.log('Note:', error.message)
  }
}

async function createDocumentSequencesTable() {
  try {
    await db.execute(`
      CREATE TABLE IF NOT EXISTS document_sequences (
        id INT AUTO_INCREMENT PRIMARY KEY,
        document_type VARCHAR(50) NOT NULL,
        sequence_date DATE NOT NULL,
        next_number INT NOT NULL DEFAULT 1,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY uk_doc_date (document_type, sequence_date),
        INDEX idx_document_type (document_type),
        INDEX idx_sequence_date (sequence_date)
      )
    `)
    console.log('✓ Document sequences table ready')
  } catch (error) {
    console.log('Note:', error.message)
  }
}

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

function setupRoutes() {
  app.use('/api/auth', authRoutes(db))
  
  app.use('/api/items', itemRoutes)
  app.use('/api/item-groups', itemGroupRoutes)
  app.use('/api/uom', uomRoutes)
  app.use('/api/purchase-orders', purchaseOrderRoutes)
  app.use('/api/purchase-invoices', purchaseInvoiceRoutes)
  app.use('/api/purchase-receipts', purchaseReceiptRoutes)
  app.use('/api/grn-requests', grnRequestRoutes)
  app.use('/api/stock/grns', grnRequestRoutes)
  app.use('/api/warehouses', stockWarehouseRoutes)
  app.use('/api/stock/warehouses', stockWarehouseRoutes)
  app.use('/api/stock/stock-balance', stockBalanceRoutes)
  app.use('/api/stock/ledger', stockLedgerRoutes)
  app.use('/api/stock/entries', stockEntryRoutes)
  app.use('/api/stock/movements', stockMovementRoutes)
  app.use('/api/suppliers', suppliersRoutes)
  
  app.use('/api/production-stages', productionStagesRoutes)
  app.use('/api/production', createProductionRoutes(db))
  app.use('/api/production-planning', createProductionPlanningRoutes(db))
  app.use('/api/customers', customerRoutes)
  app.use('/api/material-requests', materialRequestRoutes)
  app.use('/api/rfqs', rfqRoutes)
  app.use('/api/quotations', quotationRoutes)
  app.use('/api/tax-templates', taxTemplateRoutes)
  
  app.use('/api/hr', createHRPayrollRoutes(db))
  
  app.use('/api/selling', sellingRoutes)
  
  app.use('/api/finance', createFinanceRoutes(db))
  
  app.use('/api/analytics', analyticsRoutes)
  
  app.use('/api/masters', mastersRoutes)
  
  app.use('/api/machines', machinesRoutes)
  
  app.use('/api/oee', createOEERoutes(db))
  
  app.use('/api/notifications', notificationRoutes)
  
  app.use((err, req, res, next) => {
    console.error(err.stack)
    res.status(500).json({ 
      error: 'Internal server error',
      message: process.env.NODE_ENV === 'development' ? err.message : undefined
    })
  })

  app.use((req, res) => {
    res.status(404).json({ error: 'Endpoint not found' })
  })
}

const PORT = process.env.PORT || 5001

async function start() {
  await initializeDatabase()
  setupRoutes()
  
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