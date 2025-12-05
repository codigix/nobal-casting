import express from 'express'
import { SellingController } from '../controllers/SellingController.js'

const router = express.Router()

// ============================================
// CUSTOMER ROUTES
// ============================================
router.post('/customers', SellingController.createCustomer)
router.get('/customers', SellingController.getCustomers)
router.get('/customers/:id', SellingController.getCustomerById)

// ============================================
// QUOTATION ROUTES
// ============================================
router.post('/quotations', SellingController.createQuotation)
router.get('/quotations', SellingController.getQuotations)
router.put('/quotations/:id/send', SellingController.sendQuotation)
router.delete('/quotations/:id', SellingController.deleteQuotation)

// ============================================
// SALES ORDER ROUTES
// ============================================
router.post('/sales-orders', SellingController.createSalesOrder)
router.get('/sales-orders', SellingController.getSalesOrders)
router.get('/orders/confirmed', SellingController.getConfirmedOrders)
// Specific routes must come before generic :id routes
router.put('/sales-orders/:id/confirm', SellingController.confirmSalesOrder)
// Generic :id routes
router.get('/sales-orders/:id', SellingController.getSalesOrderById)
router.put('/sales-orders/:id', SellingController.updateSalesOrder)
router.delete('/sales-orders/:id', SellingController.deleteSalesOrder)

// ============================================
// DELIVERY NOTE ROUTES
// ============================================
router.post('/delivery-notes', SellingController.createDeliveryNote)
router.get('/delivery-notes', SellingController.getDeliveryNotes)
router.get('/delivery-notes/delivered', SellingController.getDeliveredNotes)
router.put('/delivery-notes/:id/submit', SellingController.submitDeliveryNote)
router.delete('/delivery-notes/:id', SellingController.deleteDeliveryNote)

// ============================================
// INVOICE ROUTES
// ============================================
router.post('/invoices', SellingController.createInvoice)
router.post('/sales-invoices', SellingController.createInvoice) // Alias for compatibility
router.get('/invoices', SellingController.getInvoices)
router.get('/sales-invoices', SellingController.getInvoices) // Alias for compatibility
router.put('/invoices/:id/submit', SellingController.submitInvoice)
router.put('/sales-invoices/:id/submit', SellingController.submitInvoice) // Alias for compatibility
router.delete('/invoices/:id', SellingController.deleteInvoice)
router.delete('/sales-invoices/:id', SellingController.deleteInvoice) // Alias for compatibility

export default router