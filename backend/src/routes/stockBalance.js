import express from 'express'
import * as StockBalanceController from '../controllers/StockBalanceController.js'

const router = express.Router()

// Stock Balance routes
router.get('/', StockBalanceController.getAllStockBalance)
router.get('/dashboard/summary', StockBalanceController.getDashboardSummary)
router.get('/low-stock', StockBalanceController.getLowStockItems)
router.get('/summary', StockBalanceController.getStockValueSummary)
router.get('/:itemId/:warehouseId', StockBalanceController.getStockBalanceDetail)
router.put('/:itemId/:warehouseId', StockBalanceController.updateStockBalance)
router.post('/:warehouseId/lock', StockBalanceController.lockWarehouseStock)
router.post('/:warehouseId/unlock', StockBalanceController.unlockWarehouseStock)
router.post('/:itemId/:warehouseId/update-qty', StockBalanceController.updateAvailableQty)

export default router