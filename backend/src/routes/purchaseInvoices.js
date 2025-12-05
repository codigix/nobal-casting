import express from 'express'
import * as controller from '../controllers/purchaseInvoiceController.js'

const router = express.Router()

// CRUD Operations
router.post('/', controller.createInvoice)
router.get('/', controller.listInvoices)
router.get('/:invoice_no', controller.getInvoice)
router.delete('/:invoice_no', controller.deleteInvoice)

// Actions
router.post('/:invoice_no/submit', controller.submitInvoice)
router.post('/:invoice_no/mark-paid', controller.markAsPaid)

export default router