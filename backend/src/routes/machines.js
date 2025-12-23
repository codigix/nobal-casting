import express from 'express'
import MachinesController from '../controllers/MachinesController.js'

const router = express.Router()

router.get('/machines-analysis', MachinesController.getMachinesAnalysis)
router.get('/:id/historical-metrics', MachinesController.getWorkstationHistoricalMetrics)
router.get('/:id', MachinesController.getMachineById)
router.put('/:id', MachinesController.updateMachine)

export default router
