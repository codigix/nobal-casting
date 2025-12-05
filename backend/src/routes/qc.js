import express from 'express'
import QCController from '../controllers/QCController.js'
import QCModel from '../models/QCModel.js'
import authMiddleware from '../middleware/authMiddleware.js'

export function createQCRoutes(db) {
  const router = express.Router()
  const qcModel = new QCModel(db)
  const qcController = new QCController(qcModel)

  // ============= INSPECTIONS =============
  router.post(
    '/inspections',
    authMiddleware,
    qcController.createInspection.bind(qcController)
  )
  router.get(
    '/inspections',
    authMiddleware,
    qcController.getInspections.bind(qcController)
  )

  // ============= INSPECTION CHECKLISTS =============
  router.post(
    '/checklists',
    authMiddleware,
    qcController.createChecklist.bind(qcController)
  )
  router.get(
    '/checklists',
    authMiddleware,
    qcController.getChecklists.bind(qcController)
  )

  // ============= REJECTION REASONS =============
  router.post(
    '/rejection-reasons',
    authMiddleware,
    qcController.recordRejectionReason.bind(qcController)
  )
  router.get(
    '/rejection-reasons/:inspection_id',
    authMiddleware,
    qcController.getRejectionReasons.bind(qcController)
  )

  // ============= CUSTOMER COMPLAINTS =============
  router.post(
    '/complaints',
    authMiddleware,
    qcController.createComplaint.bind(qcController)
  )
  router.get(
    '/complaints',
    authMiddleware,
    qcController.getComplaints.bind(qcController)
  )
  router.put(
    '/complaints/:complaint_id/status',
    authMiddleware,
    qcController.updateComplaintStatus.bind(qcController)
  )

  // ============= CAPA (Corrective and Preventive Action) =============
  router.post(
    '/capa',
    authMiddleware,
    qcController.createCAPAAction.bind(qcController)
  )
  router.get(
    '/capa',
    authMiddleware,
    qcController.getCAPAActions.bind(qcController)
  )
  router.put(
    '/capa/:capa_id/status',
    authMiddleware,
    qcController.updateCAPAStatus.bind(qcController)
  )

  // ============= QC ANALYTICS =============
  router.get(
    '/analytics/dashboard',
    authMiddleware,
    qcController.getDashboard.bind(qcController)
  )
  router.get(
    '/analytics/rejection-trend',
    authMiddleware,
    qcController.getRejectionTrend.bind(qcController)
  )
  router.get(
    '/analytics/complaint-analysis',
    authMiddleware,
    qcController.getComplaintAnalysis.bind(qcController)
  )
  router.get(
    '/analytics/capa-closure-rate',
    authMiddleware,
    qcController.getCAPAClosureRate.bind(qcController)
  )

  return router
}