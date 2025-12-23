import express from 'express'
import { UOMController } from '../controllers/UOMController.js'

const router = express.Router()

router.get('/', UOMController.getAll)
router.get('/:id', UOMController.getById)
router.post('/', UOMController.create)
router.put('/:id', UOMController.update)
router.delete('/:id', UOMController.delete)

export default router
