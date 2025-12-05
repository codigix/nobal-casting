import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import { createPool } from 'mysql2/promise'
import authRoutes from './routes/auth.js'
import supplierRoutes from './routes/suppliers.js'
import itemRoutes from './routes/items.js'
import materialRequestRoutes from './routes/materialRequests.js'
import rfqRoutes from './routes/rfqs.js'
import quotationRoutes from './routes/quotations.js'
import purchaseOrderRoutes from './routes/purchaseOrders.js'
import purchaseReceiptRoutes from './routes/purchaseReceipts.js'
import purchaseInvoiceRoutes from './routes/purchaseInvoices.js'
import analyticsRoutes from './routes/analyticsRoutes.js'
import stockWarehouseRoutes from './routes/stockWarehouses.js'
import stockBalanceRoutes from './routes/stockBalance.js'
import stockLedgerRoutes from './routes/stockLedger.js'
import stockEntryRoutes from './routes/stockEntries.js'
import materialTransferRoutes from './routes/materialTransfers.js'
import batchTrackingRoutes from './routes/batchTracking.js'
import stockReconciliationRoutes from './routes/stockReconciliation.js'
import reorderManagementRoutes from './routes/reorderManagement.js'
import { createProductionRoutes } from './routes/production.js'
import { createToolRoomRoutes } from './routes/toolroom.js'
import { createQCRoutes } from './routes/qc.js'
import { createDispatchRoutes } from './routes/dispatch.js'
import { createHRPayrollRoutes } from './routes/hrpayroll.js'
import { createFinanceRoutes } from './routes/finance.js'
import sellingRoutes from './routes/selling.js'
import grnRequestRoutes from './routes/grnRequests.js'
import companyRoutes from './routes/company.js'
import taxTemplateRoutes from './routes/taxTemplates.js'

// Load environment variables
dotenv.config()

const app = express()

// CORS Configuration - Handle multiple origins properly
const allowedOrigins = process.env.CORS_ORIGIN 
  ? process.env.CORS_ORIGIN.split(',').map(origin => origin.trim())
  : ['http://localhost:5173', 'http://localhost:3000', 'http://localhost:3001']

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
      database: process.env.DB_NAME || 'aluminium_erp',
      port: process.env.DB_PORT || 3306,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0
    })

    // Test the database connection
    await db.execute('SELECT 1')
    console.log('✓ Database connected successfully')

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

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

// Setup routes function - called after DB initialization
function setupRoutes() {
  // API Routes - Authentication (requires db)
  app.use('/api/auth', authRoutes(db))
  
  // API Routes - Buying Module
  app.use('/api/suppliers', supplierRoutes)
  app.use('/api/items', itemRoutes)
  app.use('/api/material-requests', materialRequestRoutes)
  app.use('/api/rfqs', rfqRoutes)
  app.use('/api/quotations', quotationRoutes)
  app.use('/api/purchase-orders', purchaseOrderRoutes)
  app.use('/api/purchase-receipts', purchaseReceiptRoutes)
  app.use('/api/purchase-invoices', purchaseInvoiceRoutes)
  app.use('/api/tax-templates', taxTemplateRoutes)
  app.use('/api/analytics', analyticsRoutes)
  
  // API Routes - Stock Module
  app.use('/api/stock/warehouses', stockWarehouseRoutes)
  app.use('/api/stock/stock-balance', stockBalanceRoutes)
  app.use('/api/stock/ledger', stockLedgerRoutes)
  app.use('/api/stock/entries', stockEntryRoutes)
  app.use('/api/stock/transfers', materialTransferRoutes)
  app.use('/api/stock/batches', batchTrackingRoutes)
  app.use('/api/stock/reconciliation', stockReconciliationRoutes)
  app.use('/api/stock/reorder', reorderManagementRoutes)
  
  // API Routes - Production Module
  app.use('/api/production', createProductionRoutes(db))
  
  // API Routes - Tool Room Module
  app.use('/api/toolroom', createToolRoomRoutes(db))
  
  // API Routes - Quality Control Module
  app.use('/api/qc', createQCRoutes(db))
  
  // API Routes - Dispatch Module
  app.use('/api/dispatch', createDispatchRoutes(db))
  
  // API Routes - HR & Payroll Module
  app.use('/api/hr', createHRPayrollRoutes(db))
  
  // API Routes - Finance & Accounts Module
  app.use('/api/finance', createFinanceRoutes(db))
  
  // API Routes - Selling Module
  app.use('/api/selling', sellingRoutes)

  // API Routes - GRN Requests
  app.use('/api/grn-requests', grnRequestRoutes)

  // API Routes - Company Information
  app.use('/api/company-info', companyRoutes)
  
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
