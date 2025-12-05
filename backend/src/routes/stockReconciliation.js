import express from 'express'
import * as StockReconciliationController from '../controllers/StockReconciliationController.js'

const router = express.Router()

// Stock Reconciliation routes
router.get('/', StockReconciliationController.getAllReconciliations)
router.post('/', StockReconciliationController.createReconciliation)
router.get('/next-number', StockReconciliationController.getNextReconciliationNumber)
router.get('/reports/variance-summary', StockReconciliationController.getVarianceSummary)
router.get('/reports/statistics', StockReconciliationController.getReconciliationStatistics)
router.get('/:id', StockReconciliationController.getReconciliation)
router.post('/:id/items', StockReconciliationController.addReconciliationItems)
router.post('/:id/submit', StockReconciliationController.submitReconciliation)
router.post('/:id/approve', StockReconciliationController.approveReconciliation)
router.post('/:id/cancel', StockReconciliationController.cancelReconciliation)

export default router