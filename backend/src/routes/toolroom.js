import express from 'express'
import ToolRoomController from '../controllers/ToolRoomController.js'
import ToolRoomModel from '../models/ToolRoomModel.js'
import authMiddleware from '../middleware/authMiddleware.js'

export function createToolRoomRoutes(db) {
  const router = express.Router()
  const toolRoomModel = new ToolRoomModel(db)
  const toolRoomController = new ToolRoomController(toolRoomModel)

  // ============= TOOL MASTER =============
  router.post(
    '/tools',
    authMiddleware,
    toolRoomController.createTool.bind(toolRoomController)
  )
  router.get(
    '/tools',
    authMiddleware,
    toolRoomController.getTools.bind(toolRoomController)
  )
  router.get(
    '/tools/:tool_id',
    authMiddleware,
    toolRoomController.getTool.bind(toolRoomController)
  )
  router.put(
    '/tools/:tool_id',
    authMiddleware,
    toolRoomController.updateTool.bind(toolRoomController)
  )
  router.delete(
    '/tools/:tool_id',
    authMiddleware,
    toolRoomController.deleteTool.bind(toolRoomController)
  )

  // ============= DIE REGISTER =============
  router.post(
    '/dies',
    authMiddleware,
    toolRoomController.createDie.bind(toolRoomController)
  )
  router.get(
    '/dies',
    authMiddleware,
    toolRoomController.getDies.bind(toolRoomController)
  )
  router.get(
    '/dies/:die_id',
    authMiddleware,
    toolRoomController.getDie.bind(toolRoomController)
  )
  router.put(
    '/dies/:die_id',
    authMiddleware,
    toolRoomController.updateDie.bind(toolRoomController)
  )

  // ============= DIE REWORK =============
  router.post(
    '/reworks',
    authMiddleware,
    toolRoomController.createRework.bind(toolRoomController)
  )
  router.get(
    '/reworks',
    authMiddleware,
    toolRoomController.getReworks.bind(toolRoomController)
  )
  router.put(
    '/reworks/:rework_id',
    authMiddleware,
    toolRoomController.updateRework.bind(toolRoomController)
  )

  // ============= MAINTENANCE SCHEDULE =============
  router.post(
    '/maintenance/schedule',
    authMiddleware,
    toolRoomController.createMaintenanceSchedule.bind(toolRoomController)
  )
  router.get(
    '/maintenance/schedule',
    authMiddleware,
    toolRoomController.getMaintenanceSchedules.bind(toolRoomController)
  )
  router.put(
    '/maintenance/schedule/:schedule_id',
    authMiddleware,
    toolRoomController.updateMaintenanceSchedule.bind(toolRoomController)
  )

  // ============= MAINTENANCE HISTORY =============
  router.post(
    '/maintenance/history',
    authMiddleware,
    toolRoomController.recordMaintenance.bind(toolRoomController)
  )
  router.get(
    '/maintenance/history',
    authMiddleware,
    toolRoomController.getMaintenanceHistory.bind(toolRoomController)
  )

  // ============= ANALYTICS =============
  router.get(
    '/analytics/dashboard',
    authMiddleware,
    toolRoomController.getDashboard.bind(toolRoomController)
  )
  router.get(
    '/analytics/die-utilization',
    authMiddleware,
    toolRoomController.getDieUtilization.bind(toolRoomController)
  )
  router.get(
    '/analytics/maintenance-costs',
    authMiddleware,
    toolRoomController.getMaintenanceCosts.bind(toolRoomController)
  )
  router.get(
    '/analytics/downtime-analysis',
    authMiddleware,
    toolRoomController.getDowntimeAnalysis.bind(toolRoomController)
  )

  return router
}