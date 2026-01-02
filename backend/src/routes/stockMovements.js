import express from 'express'
import * as StockMovementController from '../controllers/StockMovementController.js'

const router = express.Router()

// Stock Movement routes
router.get('/', StockMovementController.getAllStockMovements)
router.get('/pending', StockMovementController.getPendingMovements)
router.post('/', StockMovementController.createStockMovement)
router.get('/:id', StockMovementController.getStockMovement)
router.post('/:id/approve', StockMovementController.approveStockMovement)
router.post('/:id/reject', StockMovementController.rejectStockMovement)

export default router
