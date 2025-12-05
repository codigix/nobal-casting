import express from 'express'
import * as MaterialTransferController from '../controllers/MaterialTransferController.js'

const router = express.Router()

// Material Transfer routes
router.get('/', MaterialTransferController.getAllMaterialTransfers)
router.post('/', MaterialTransferController.createMaterialTransfer)
router.get('/next-number', MaterialTransferController.getNextTransferNumber)
router.get('/reports/register', MaterialTransferController.getTransferRegister)
router.get('/statistics', MaterialTransferController.getTransferStatistics)
router.get('/:id', MaterialTransferController.getMaterialTransfer)
router.post('/:id/send', MaterialTransferController.sendMaterialTransfer)
router.post('/:id/receive', MaterialTransferController.receiveMaterialTransfer)

export default router