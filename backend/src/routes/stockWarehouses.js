import express from 'express'
import * as StockWarehouseController from '../controllers/StockWarehouseController.js'

const router = express.Router()

// Warehouse routes
router.get('/', StockWarehouseController.getAllWarehouses)
router.post('/', StockWarehouseController.createWarehouse)
router.get('/hierarchy', StockWarehouseController.getWarehouseHierarchy)
router.get('/:id', StockWarehouseController.getWarehouse)
router.put('/:id', StockWarehouseController.updateWarehouse)
router.delete('/:id', StockWarehouseController.deleteWarehouse)
router.get('/:id/capacity', StockWarehouseController.getWarehouseCapacity)

export default router