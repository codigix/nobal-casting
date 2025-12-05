import express from 'express'
import * as StockLedgerController from '../controllers/StockLedgerController.js'

const router = express.Router()

// Stock Ledger routes
router.get('/', StockLedgerController.getAllStockLedger)
router.get('/reports/consumption', StockLedgerController.getDailyConsumptionReport)
router.get('/reports/valuation', StockLedgerController.getStockValuationReport)
router.get('/reports/summary', StockLedgerController.getTransactionSummary)
router.get('/reports/monthly-chart', StockLedgerController.getMonthlyConsumptionChart)
router.get('/:id', StockLedgerController.getStockLedgerDetail)
router.get('/:itemId/:warehouseId/history', StockLedgerController.getItemMovementHistory)

export default router