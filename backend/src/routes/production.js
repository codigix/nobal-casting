import express from 'express'
import ProductionController from '../controllers/ProductionController.js'
import ProductionModel from '../models/ProductionModel.js'
import authMiddleware from '../middleware/authMiddleware.js'

export function createProductionRoutes(db) {
  const router = express.Router()
  const productionModel = new ProductionModel(db)
  const productionController = new ProductionController(productionModel)

  // ============= OPERATIONS =============
  router.post(
    '/operations',
    authMiddleware,
    productionController.createOperation.bind(productionController)
  )
  router.get(
    '/operations',
    authMiddleware,
    productionController.getOperations.bind(productionController)
  )
  router.get(
    '/operations/:operation_id',
    authMiddleware,
    productionController.getOperationById.bind(productionController)
  )
  router.put(
    '/operations/:operation_id',
    authMiddleware,
    productionController.updateOperation.bind(productionController)
  )
  router.delete(
    '/operations/:operation_id',
    authMiddleware,
    productionController.deleteOperation.bind(productionController)
  )

  // ============= WORK ORDERS =============
  router.post(
    '/work-orders',
    authMiddleware,
    productionController.createWorkOrder.bind(productionController)
  )
  router.get(
    '/work-orders',
    authMiddleware,
    productionController.getWorkOrders.bind(productionController)
  )
  router.get(
    '/work-orders/:wo_id',
    authMiddleware,
    productionController.getWorkOrder.bind(productionController)
  )
  router.put(
    '/work-orders/:wo_id',
    authMiddleware,
    productionController.updateWorkOrder.bind(productionController)
  )

  // ============= PRODUCTION PLANS =============
  router.post(
    '/plans',
    authMiddleware,
    productionController.createProductionPlan.bind(productionController)
  )
  router.get(
    '/plans',
    authMiddleware,
    productionController.getProductionPlans.bind(productionController)
  )
router.get(
  '/plans/:plan_id',
  authMiddleware,
  productionController.getProductionPlanDetails.bind(productionController)
)
router.put(
  '/plans/:plan_id',
  authMiddleware,
  productionController.updateProductionPlan.bind(productionController)
)
router.delete(
  '/plans/:plan_id',
  authMiddleware,
  productionController.deleteProductionPlan.bind(productionController)
)

  // ============= PRODUCTION ENTRIES =============
  router.post(
    '/entries',
    authMiddleware,
    productionController.createProductionEntry.bind(productionController)
  )
  router.get(
    '/entries',
    authMiddleware,
    productionController.getProductionEntries.bind(productionController)
  )

  // ============= REJECTIONS =============
  router.post(
    '/rejections',
    authMiddleware,
    productionController.recordRejection.bind(productionController)
  )
  router.get(
    '/rejections/analysis',
    authMiddleware,
    productionController.getRejectionAnalysis.bind(productionController)
  )

  // ============= MACHINES =============
  router.post(
    '/machines',
    authMiddleware,
    productionController.createMachine.bind(productionController)
  )
  router.get(
    '/machines',
    authMiddleware,
    productionController.getMachines.bind(productionController)
  )

  // ============= OPERATORS =============
  router.post(
    '/operators',
    authMiddleware,
    productionController.createOperator.bind(productionController)
  )
  router.get(
    '/operators',
    authMiddleware,
    productionController.getOperators.bind(productionController)
  )

  // ============= BILLS OF MATERIALS (BOM) =============
  router.get(
    '/boms',
    authMiddleware,
    productionController.getBOMs.bind(productionController)
  )
  router.get(
    '/boms/:bom_id',
    authMiddleware,
    productionController.getBOMDetails.bind(productionController)
  )
  router.post(
    '/boms',
    authMiddleware,
    productionController.createBOM.bind(productionController)
  )
  router.put(
    '/boms/:bom_id',
    authMiddleware,
    productionController.updateBOM.bind(productionController)
  )
  router.delete(
    '/boms/:bom_id',
    authMiddleware,
    productionController.deleteBOM.bind(productionController)
  )

  // ============= JOB CARDS =============
  router.get(
    '/job-cards',
    authMiddleware,
    productionController.getJobCards.bind(productionController)
  )
  router.get(
    '/job-cards/:job_card_id',
    authMiddleware,
    productionController.getJobCardDetails.bind(productionController)
  )
  router.post(
    '/job-cards',
    authMiddleware,
    productionController.createJobCard.bind(productionController)
  )
  router.put(
    '/job-cards/:job_card_id',
    authMiddleware,
    productionController.updateJobCard.bind(productionController)
  )
  router.delete(
    '/job-cards/:job_card_id',
    authMiddleware,
    productionController.deleteJobCard.bind(productionController)
  )

  // ============= WORKSTATIONS =============
  router.post(
    '/workstations',
    authMiddleware,
    productionController.createWorkstation.bind(productionController)
  )
  router.get(
    '/workstations',
    authMiddleware,
    productionController.getWorkstations.bind(productionController)
  )
  router.get(
    '/workstations/:workstation_id',
    authMiddleware,
    productionController.getWorkstationById.bind(productionController)
  )
  router.put(
    '/workstations/:workstation_id',
    authMiddleware,
    productionController.updateWorkstation.bind(productionController)
  )
  router.delete(
    '/workstations/:workstation_id',
    authMiddleware,
    productionController.deleteWorkstation.bind(productionController)
  )

  // ============= ANALYTICS =============
  router.get(
    '/analytics/dashboard',
    authMiddleware,
    productionController.getProductionDashboard.bind(productionController)
  )
  router.get(
    '/analytics/machine-utilization',
    authMiddleware,
    productionController.getMachineUtilization.bind(productionController)
  )
  router.get(
    '/analytics/operator-efficiency',
    authMiddleware,
    productionController.getOperatorEfficiency.bind(productionController)
  )

  return router
}

export default createProductionRoutes