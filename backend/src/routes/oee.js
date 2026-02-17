
import express from 'express'
import OEEController from '../controllers/OEEController.js'

export const createOEERoutes = (db) => {
  const router = express.Router()
  const oeeController = new OEEController(db)

  router.get('/dashboard', (req, res) => oeeController.getOEEDashboardData(req, res))
  router.get('/all-machines-analysis', (req, res) => oeeController.getAllMachinesAnalysis(req, res))
  router.get('/machine/:machine_id', (req, res) => oeeController.getMachineOEE(req, res))
  router.get('/machine/:machine_id/historical-metrics', (req, res) => oeeController.getMachineHistoricalMetrics(req, res))

  return router
}
