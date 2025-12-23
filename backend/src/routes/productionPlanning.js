import express from 'express'
import { ProductionPlanningController } from '../controllers/ProductionPlanningController.js'
import { ProductionPlanningModel } from '../models/ProductionPlanningModel.js'
import authMiddleware from '../middleware/authMiddleware.js'

export function createProductionPlanningRoutes(db) {
  const router = express.Router()
  const model = new ProductionPlanningModel(db)
  const controller = new ProductionPlanningController(model)

  router.post('/', authMiddleware, controller.createPlan.bind(controller))
  router.get('/', authMiddleware, controller.getAllPlans.bind(controller))
  router.get('/item/:itemCode', authMiddleware, controller.getByItemCode.bind(controller))
  router.get('/:plan_id', authMiddleware, controller.getPlan.bind(controller))
  router.patch('/:plan_id', authMiddleware, controller.updatePlan.bind(controller))

  router.post('/:plan_id/fg-items', authMiddleware, controller.addFGItems.bind(controller))
  router.post('/:plan_id/sub-assembly-items', authMiddleware, controller.addSubAssemblyItems.bind(controller))
  router.post('/:plan_id/raw-material-items', authMiddleware, controller.addRawMaterialItems.bind(controller))

  router.delete('/fg/:id', authMiddleware, controller.deleteFGItem.bind(controller))
  router.delete('/sub-assembly/:id', authMiddleware, controller.deleteSubAssemblyItem.bind(controller))
  router.delete('/raw-material/:id', authMiddleware, controller.deleteRawMaterialItem.bind(controller))

  router.patch('/:plan_id/submit', authMiddleware, controller.submitPlan.bind(controller))
  router.delete('/:plan_id', authMiddleware, controller.deletePlan.bind(controller))

  return router
}

export default createProductionPlanningRoutes
