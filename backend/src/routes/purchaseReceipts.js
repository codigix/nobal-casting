import express from 'express'
import * as controller from '../controllers/purchaseReceiptController.js'

const router = express.Router()

// CRUD Operations
router.post('/', controller.createGRN)
router.get('/', controller.listGRNs)
router.get('/:grn_no', controller.getGRN)
router.delete('/:grn_no', controller.deleteGRN)

// Item operations
router.put('/:grn_no/items/:grn_item_id', controller.updateGRNItem)

// Actions
router.post('/:grn_no/accept', controller.acceptGRN)
router.post('/:grn_no/reject', controller.rejectGRN)

export default router