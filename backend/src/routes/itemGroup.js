import express from 'express'
import * as controller from '../controllers/ItemGroupController.js'

const router = express.Router()

router.get('/', controller.getAll)
router.get('/:id', controller.getById)
router.post('/', controller.create)
router.put('/:id', controller.update)
router.delete('/:id', controller.deleteItemGroup)

export default router
