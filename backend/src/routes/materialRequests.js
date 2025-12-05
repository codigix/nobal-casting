import express from 'express'
import { MaterialRequestController } from '../controllers/MaterialRequestController.js'

const router = express.Router()

// More specific routes first
router.get('/pending', MaterialRequestController.getPending)
router.get('/approved', MaterialRequestController.getApproved)
router.get('/departments', MaterialRequestController.getDepartments)

// General CRUD routes
router.get('/:id', MaterialRequestController.getById)
router.post('/', MaterialRequestController.create)
router.put('/:id', MaterialRequestController.update)
router.patch('/:id/approve', MaterialRequestController.approve)
router.patch('/:id/reject', MaterialRequestController.reject)
router.patch('/:id/convert-to-po', MaterialRequestController.convertToPO)
router.delete('/:id', MaterialRequestController.delete)

// Main list endpoint
router.get('/', MaterialRequestController.getAll)

export default router