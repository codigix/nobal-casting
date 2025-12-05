import express from 'express'
import * as ReorderManagementController from '../controllers/ReorderManagementController.js'

const router = express.Router()

// Reorder Management routes
router.get('/', ReorderManagementController.getAllReorderRequests)
router.post('/generate', ReorderManagementController.generateReorderRequest)
router.get('/reports/low-stock', ReorderManagementController.getLowStockSummary)
router.get('/reports/statistics', ReorderManagementController.getReorderStatistics)
router.get('/dashboard', ReorderManagementController.getDashboardData)
router.get('/:id', ReorderManagementController.getReorderRequest)
router.post('/:id/create-mr', ReorderManagementController.createMaterialRequestFromReorder)
router.post('/:id/mark-received', ReorderManagementController.markReorderReceived)

export default router