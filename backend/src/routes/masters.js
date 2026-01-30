import express from 'express'
import MastersController from '../controllers/MastersController.js'

const router = express.Router()

router.get('/departments', MastersController.getDepartments)
router.get('/users/department/:department', MastersController.getUsersByDepartment)
router.get('/warehouses/department/:department', MastersController.getWarehousesByDepartment)
router.get('/machines', MastersController.getMachines)
router.get('/operators', MastersController.getOperators)
router.get('/tools', MastersController.getTools)
router.get('/inspections/checklists', MastersController.getInspectionChecklists)
router.get('/system-stats', MastersController.getSystemStats)
router.get('/machine-stats', MastersController.getMachineStats)
router.get('/project-stats', MastersController.getProjectStats)
router.get('/production-reports', MastersController.getProductionReports)
router.get('/project-analysis', MastersController.getProjectAnalysis)
router.get('/project-analysis/:id', MastersController.getDetailedProjectAnalysis)
router.get('/sales-orders-analysis', MastersController.getSalesOrdersAsProjects)
router.get('/customer-stats', MastersController.getCustomerStatistics)
router.get('/customer-stats/:id', MastersController.getCustomerDetailedStats)

export default router
