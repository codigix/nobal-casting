import express from 'express'
import { SupplierController } from '../controllers/SupplierController.js'

const router = express.Router()

// More specific routes (must come before general /:id routes)
router.get('/statistics', SupplierController.getStatistics)
router.get('/active', SupplierController.getActive)
router.get('/groups', SupplierController.getGroups)
router.get('/search', SupplierController.search)
router.get('/contacts/all', SupplierController.getAllContacts)
router.get('/group/:groupName', SupplierController.getByGroup)

// Supplier detail routes
router.get('/:id/contacts', SupplierController.getContacts)
router.get('/:id/addresses', SupplierController.getAddresses)
router.get('/:id/scorecard', SupplierController.getScorecard)

// General CRUD routes (less specific routes come last)
router.get('/:id', SupplierController.getById)
router.post('/', SupplierController.create)
router.put('/:id', SupplierController.update)
router.patch('/:id/deactivate', SupplierController.deactivate)
router.delete('/:id', SupplierController.delete)

// Main list endpoint
router.get('/', SupplierController.getAll)

export default router
