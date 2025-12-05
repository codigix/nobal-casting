import express from 'express'
import { RFQController } from '../controllers/RFQController.js'

const router = express.Router()

// More specific routes first
router.get('/pending', RFQController.getPending)
router.get('/open', RFQController.getOpen)

// RFQ detail and action routes
router.get('/:id/responses', RFQController.getResponses)
router.patch('/:id/send', RFQController.send)
router.patch('/:id/receive-responses', RFQController.receiveResponses)
router.patch('/:id/close', RFQController.close)

// General CRUD routes
router.get('/:id', RFQController.getById)
router.post('/', RFQController.create)
router.put('/:id', RFQController.update)
router.delete('/:id', RFQController.delete)

// Main list endpoint
router.get('/', RFQController.getAll)

export default router