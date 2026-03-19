import express from 'express'
import * as StockEntryController from '../controllers/StockEntryController.js'
import authMiddleware from '../middleware/authMiddleware.js'

const router = express.Router()

// Apply authMiddleware to all routes
router.use(authMiddleware)

// Stock Entry routes
router.get('/', StockEntryController.getAllStockEntries)
router.post('/', StockEntryController.createStockEntry)
router.get('/next-number', StockEntryController.getNextEntryNumber)
router.get('/statistics', StockEntryController.getStockEntryStatistics)
router.get('/:id', StockEntryController.getStockEntry)
router.put('/:id', StockEntryController.updateStockEntry)
router.post('/:id/submit', StockEntryController.submitStockEntry)
router.post('/:id/cancel', StockEntryController.cancelStockEntry)
router.delete('/:id', StockEntryController.deleteStockEntry)

export default router