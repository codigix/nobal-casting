import express from 'express'
import * as BatchTrackingController from '../controllers/BatchTrackingController.js'

const router = express.Router()

// Batch Tracking routes
router.get('/', BatchTrackingController.getAllBatches)
router.post('/', BatchTrackingController.createBatch)
router.get('/alerts/expired', BatchTrackingController.getExpiredBatches)
router.get('/alerts/near-expiry', BatchTrackingController.getNearExpiryBatches)
router.get('/:id', BatchTrackingController.getBatch)
router.post('/:id/update-qty', BatchTrackingController.updateBatchQty)
router.post('/:id/mark-expired', BatchTrackingController.markBatchExpired)
router.post('/:id/mark-scrapped', BatchTrackingController.markBatchScrapped)
router.get('/:batchNo/traceability', BatchTrackingController.getBatchTraceability)
router.get('/:itemId/:warehouseId/summary', BatchTrackingController.getItemBatchSummary)

export default router