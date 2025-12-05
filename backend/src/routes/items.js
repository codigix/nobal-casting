import express from 'express'
import * as controller from '../controllers/itemController.js'

const router = express.Router()

// CRUD Operations
router.post('/', controller.createItem)
router.get('/', controller.listItems)
router.get('/groups', controller.getItemGroups)
router.get('/:item_code', controller.getItem)
router.put('/:item_code', controller.updateItem)
router.delete('/:item_code', controller.deleteItem)

// Stock information
router.get('/:item_code/stock', controller.getItemStock)

export default router