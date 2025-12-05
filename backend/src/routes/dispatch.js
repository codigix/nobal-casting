import express from 'express'
import DispatchController from '../controllers/DispatchController.js'
import DispatchModel from '../models/DispatchModel.js'
import authMiddleware from '../middleware/authMiddleware.js'

export function createDispatchRoutes(db) {
  const router = express.Router()
  const dispatchModel = new DispatchModel(db)
  const dispatchController = new DispatchController(dispatchModel)

  // ============= DISPATCH ORDERS =============
  router.post(
    '/orders',
    authMiddleware,
    dispatchController.createDispatchOrder.bind(dispatchController)
  )
  router.get(
    '/orders',
    authMiddleware,
    dispatchController.getDispatchOrders.bind(dispatchController)
  )
  router.get(
    '/orders/:dispatch_id',
    authMiddleware,
    dispatchController.getDispatchOrder.bind(dispatchController)
  )
  router.put(
    '/orders/:dispatch_id',
    authMiddleware,
    dispatchController.updateDispatchOrder.bind(dispatchController)
  )

  // ============= DISPATCH ITEMS =============
  router.post(
    '/items',
    authMiddleware,
    dispatchController.addDispatchItem.bind(dispatchController)
  )
  router.get(
    '/items/:dispatch_id',
    authMiddleware,
    dispatchController.getDispatchItems.bind(dispatchController)
  )
  router.put(
    '/items/:item_id',
    authMiddleware,
    dispatchController.updateDispatchItem.bind(dispatchController)
  )
  router.delete(
    '/items/:item_id',
    authMiddleware,
    dispatchController.deleteDispatchItem.bind(dispatchController)
  )

  // ============= DELIVERY CHALLANS =============
  router.post(
    '/challans',
    authMiddleware,
    dispatchController.createChallan.bind(dispatchController)
  )
  router.get(
    '/challans/:challan_id',
    authMiddleware,
    dispatchController.getChallan.bind(dispatchController)
  )
  router.get(
    '/challans/dispatch/:dispatch_id',
    authMiddleware,
    dispatchController.getChallansByDispatch.bind(dispatchController)
  )
  router.put(
    '/challans/:challan_id/status',
    authMiddleware,
    dispatchController.updateChallanStatus.bind(dispatchController)
  )

  // ============= SHIPMENT TRACKING =============
  router.post(
    '/tracking',
    authMiddleware,
    dispatchController.createTracking.bind(dispatchController)
  )
  router.get(
    '/tracking/:dispatch_id',
    authMiddleware,
    dispatchController.getTracking.bind(dispatchController)
  )
  router.get(
    '/tracking/:dispatch_id/latest',
    authMiddleware,
    dispatchController.getLatestTracking.bind(dispatchController)
  )
  router.put(
    '/tracking/:tracking_id',
    authMiddleware,
    dispatchController.updateTracking.bind(dispatchController)
  )

  // ============= DISPATCH ANALYTICS =============
  router.get(
    '/analytics/dashboard',
    authMiddleware,
    dispatchController.getDashboard.bind(dispatchController)
  )
  router.get(
    '/analytics/performance',
    authMiddleware,
    dispatchController.getDispatchPerformance.bind(dispatchController)
  )
  router.get(
    '/analytics/delivery-status',
    authMiddleware,
    dispatchController.getDeliveryStatus.bind(dispatchController)
  )
  router.get(
    '/analytics/carrier-performance',
    authMiddleware,
    dispatchController.getCarrierPerformance.bind(dispatchController)
  )
  router.get(
    '/analytics/delivery-time',
    authMiddleware,
    dispatchController.getAverageDeliveryTime.bind(dispatchController)
  )

  return router
}