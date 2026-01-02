import express from 'express'
import * as ProductionStageController from '../controllers/ProductionStageController.js'
import authMiddleware from '../middleware/authMiddleware.js'

const router = express.Router()

router.get('/', authMiddleware, ProductionStageController.getAllProductionStages)
router.get('/active', authMiddleware, ProductionStageController.getActiveProductionStages)
router.post('/', authMiddleware, ProductionStageController.createProductionStage)
router.get('/:id', authMiddleware, ProductionStageController.getProductionStage)
router.put('/:id', authMiddleware, ProductionStageController.updateProductionStage)
router.delete('/:id', authMiddleware, ProductionStageController.deleteProductionStage)

export default router
