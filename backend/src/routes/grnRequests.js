import express from 'express'
import * as GRNRequestController from '../controllers/GRNRequestController.js'

const router = express.Router()

router.post('/', GRNRequestController.createGRNRequest)
router.get('/', GRNRequestController.getAllGRNRequests)
router.get('/:id', GRNRequestController.getGRNRequest)
router.post('/:id/start-inspection', GRNRequestController.startInspection)
router.post('/:id/approve', GRNRequestController.approveGRNRequest)
router.post('/:id/send-to-inventory', GRNRequestController.sendToInventory)
router.post('/:id/inventory-approve', GRNRequestController.inventoryApproveGRN)
router.post('/:id/reject', GRNRequestController.rejectGRNRequest)
router.post('/:id/send-back', GRNRequestController.sendBackGRNRequest)
router.post('/:id/items/inspect', GRNRequestController.inspectItem)
router.put('/items/:itemId', GRNRequestController.updateItemStatus)

export default router
