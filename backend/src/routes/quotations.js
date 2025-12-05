import express from 'express'
import { SupplierQuotationController } from '../controllers/SupplierQuotationController.js'

const router = express.Router()

// More specific routes first
router.get('/pending', SupplierQuotationController.getPending)
router.get('/rfq/:rfqId/compare', SupplierQuotationController.compareForRFQ)
router.get('/rfq/:rfqId', SupplierQuotationController.getByRFQ)
router.get('/supplier/:supplierId', SupplierQuotationController.getBySupplier)

// Action routes
router.patch('/:id/submit', SupplierQuotationController.submit)
router.patch('/:id/accept', SupplierQuotationController.accept)
router.patch('/:id/reject', SupplierQuotationController.reject)

// General CRUD routes
router.get('/:id', SupplierQuotationController.getById)
router.post('/', SupplierQuotationController.create)
router.put('/:id', SupplierQuotationController.update)
router.delete('/:id', SupplierQuotationController.delete)

// Main list endpoint
router.get('/', SupplierQuotationController.getAll)

export default router