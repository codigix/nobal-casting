import express from 'express'
import { CustomerController } from '../controllers/CustomerController.js'

const router = express.Router()

router.get('/', CustomerController.getAll)
router.post('/', CustomerController.create)
router.get('/:id', CustomerController.getById)
router.put('/:id', CustomerController.update)
router.delete('/:id', CustomerController.delete)

export default router
