import express from 'express'
import AccountsFinanceController from '../controllers/AccountsFinanceController.js'
import AccountsFinanceModel from '../models/AccountsFinanceModel.js'
import authMiddleware from '../middleware/authMiddleware.js'

export function createFinanceRoutes(db) {
  const router = express.Router()
  const accountsFinanceModel = new AccountsFinanceModel(db)
  const accountsFinanceController = new AccountsFinanceController(accountsFinanceModel)

  // ============= ACCOUNT LEDGER =============
  router.post(
    '/ledger',
    authMiddleware,
    accountsFinanceController.recordLedgerEntry.bind(accountsFinanceController)
  )
  router.get(
    '/ledger',
    authMiddleware,
    accountsFinanceController.getLedgerEntries.bind(accountsFinanceController)
  )

  // ============= VENDOR PAYMENTS =============
  router.post(
    '/vendor-payments',
    authMiddleware,
    accountsFinanceController.recordVendorPayment.bind(accountsFinanceController)
  )
  router.get(
    '/vendor-payments',
    authMiddleware,
    accountsFinanceController.getVendorPayments.bind(accountsFinanceController)
  )
  router.put(
    '/vendor-payments/:payment_id/status',
    authMiddleware,
    accountsFinanceController.updateVendorPaymentStatus.bind(accountsFinanceController)
  )

  // ============= CUSTOMER PAYMENTS =============
  router.post(
    '/customer-payments',
    authMiddleware,
    accountsFinanceController.recordCustomerPayment.bind(accountsFinanceController)
  )
  router.get(
    '/customer-payments',
    authMiddleware,
    accountsFinanceController.getCustomerPayments.bind(accountsFinanceController)
  )
  router.put(
    '/customer-payments/:payment_id/status',
    authMiddleware,
    accountsFinanceController.updateCustomerPaymentStatus.bind(accountsFinanceController)
  )

  // ============= EXPENSE MASTER =============
  router.post(
    '/expenses',
    authMiddleware,
    accountsFinanceController.recordExpense.bind(accountsFinanceController)
  )
  router.get(
    '/expenses',
    authMiddleware,
    accountsFinanceController.getExpenses.bind(accountsFinanceController)
  )
  router.put(
    '/expenses/:expense_id/status',
    authMiddleware,
    accountsFinanceController.updateExpenseStatus.bind(accountsFinanceController)
  )

  // ============= FINANCIAL ANALYTICS =============
  router.get(
    '/analytics/dashboard',
    authMiddleware,
    accountsFinanceController.getDashboard.bind(accountsFinanceController)
  )
  router.get(
    '/analytics/revenue-report',
    authMiddleware,
    accountsFinanceController.getRevenueReport.bind(accountsFinanceController)
  )
  router.get(
    '/analytics/expense-report',
    authMiddleware,
    accountsFinanceController.getExpenseReport.bind(accountsFinanceController)
  )
  router.get(
    '/analytics/costing-report',
    authMiddleware,
    accountsFinanceController.getCostingReport.bind(accountsFinanceController)
  )
  router.get(
    '/analytics/vendor-analysis',
    authMiddleware,
    accountsFinanceController.getVendorPaymentAnalysis.bind(accountsFinanceController)
  )
  router.get(
    '/analytics/profit-loss',
    authMiddleware,
    accountsFinanceController.getProfitLossStatement.bind(accountsFinanceController)
  )
  router.get(
    '/analytics/cash-flow',
    authMiddleware,
    accountsFinanceController.getCashFlowAnalysis.bind(accountsFinanceController)
  )
  router.get(
    '/analytics/ageing-analysis',
    authMiddleware,
    accountsFinanceController.getAgeingAnalysis.bind(accountsFinanceController)
  )

  return router
}