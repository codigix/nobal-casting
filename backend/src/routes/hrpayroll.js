import express from 'express'
import HRPayrollController from '../controllers/HRPayrollController.js'
import HRPayrollModel from '../models/HRPayrollModel.js'
import authMiddleware from '../middleware/authMiddleware.js'

export function createHRPayrollRoutes(db) {
  const router = express.Router()
  const hrPayrollModel = new HRPayrollModel(db)
  const hrPayrollController = new HRPayrollController(hrPayrollModel)

  // ============= EMPLOYEE MASTER =============
  router.post(
    '/employees',
    authMiddleware,
    hrPayrollController.createEmployee.bind(hrPayrollController)
  )
  router.get(
    '/employees',
    authMiddleware,
    hrPayrollController.getEmployees.bind(hrPayrollController)
  )
  router.get(
    '/employees/:employee_id',
    authMiddleware,
    hrPayrollController.getEmployee.bind(hrPayrollController)
  )
  router.put(
    '/employees/:employee_id',
    authMiddleware,
    hrPayrollController.updateEmployee.bind(hrPayrollController)
  )

  // ============= ATTENDANCE LOG =============
  router.post(
    '/attendance',
    authMiddleware,
    hrPayrollController.recordAttendance.bind(hrPayrollController)
  )
  router.get(
    '/attendance',
    authMiddleware,
    hrPayrollController.getAttendance.bind(hrPayrollController)
  )
  router.put(
    '/attendance/:attendance_id',
    authMiddleware,
    hrPayrollController.updateAttendance.bind(hrPayrollController)
  )

  // ============= SHIFT ALLOCATION =============
  router.post(
    '/shifts',
    authMiddleware,
    hrPayrollController.allocateShift.bind(hrPayrollController)
  )
  router.get(
    '/shifts',
    authMiddleware,
    hrPayrollController.getShiftAllocations.bind(hrPayrollController)
  )
  router.put(
    '/shifts/:allocation_id',
    authMiddleware,
    hrPayrollController.updateShiftAllocation.bind(hrPayrollController)
  )

  // ============= PAYROLL =============
  router.post(
    '/payroll',
    authMiddleware,
    hrPayrollController.createPayroll.bind(hrPayrollController)
  )
  router.get(
    '/payroll',
    authMiddleware,
    hrPayrollController.getPayrolls.bind(hrPayrollController)
  )
  router.get(
    '/payroll/:payroll_id',
    authMiddleware,
    hrPayrollController.getPayroll.bind(hrPayrollController)
  )
  router.put(
    '/payroll/:payroll_id',
    authMiddleware,
    hrPayrollController.updatePayroll.bind(hrPayrollController)
  )

  // ============= HR ANALYTICS =============
  router.get(
    '/analytics/dashboard',
    authMiddleware,
    hrPayrollController.getDashboard.bind(hrPayrollController)
  )
  router.get(
    '/analytics/attendance-report',
    authMiddleware,
    hrPayrollController.getAttendanceReport.bind(hrPayrollController)
  )
  router.get(
    '/analytics/payroll-summary',
    authMiddleware,
    hrPayrollController.getPayrollSummary.bind(hrPayrollController)
  )
  router.get(
    '/analytics/employee-tenure',
    authMiddleware,
    hrPayrollController.getEmployeeTenure.bind(hrPayrollController)
  )
  router.get(
    '/analytics/department-stats',
    authMiddleware,
    hrPayrollController.getDepartmentStats.bind(hrPayrollController)
  )

  return router
}