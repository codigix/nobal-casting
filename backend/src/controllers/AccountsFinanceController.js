class AccountsFinanceController {
  constructor(accountsFinanceModel) {
    this.accountsFinanceModel = accountsFinanceModel
  }

  // ============= ACCOUNT LEDGER =============

  async recordLedgerEntry(req, res) {
    try {
      const { transaction_date, account_type, account_id, debit, credit, description, reference_doctype, reference_id } = req.body

      // Validation
      if (!transaction_date || !account_type || !account_id || (!debit && !credit)) {
        return res.status(400).json({
          success: false,
          message: 'Missing required fields: transaction_date, account_type, account_id, debit or credit'
        })
      }

      const entry = await this.accountsFinanceModel.recordLedgerEntry({
        transaction_date,
        account_type,
        account_id,
        debit,
        credit,
        description,
        reference_doctype,
        reference_id
      })

      res.status(201).json({
        success: true,
        message: 'Ledger entry recorded successfully',
        data: entry
      })
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error recording ledger entry',
        error: error.message
      })
    }
  }

  async getLedgerEntries(req, res) {
    try {
      const { account_type, account_id, date_from, date_to } = req.query

      const entries = await this.accountsFinanceModel.getLedgerEntries({
        account_type,
        account_id,
        date_from,
        date_to
      })

      res.status(200).json({
        success: true,
        data: entries,
        count: entries.length
      })
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error fetching ledger entries',
        error: error.message
      })
    }
  }

  // ============= VENDOR PAYMENTS =============

  async recordVendorPayment(req, res) {
    try {
      const { vendor_id, purchase_order_id, payment_date, amount, payment_method, payment_reference } = req.body

      // Validation
      if (!vendor_id || !payment_date || !amount) {
        return res.status(400).json({
          success: false,
          message: 'Missing required fields: vendor_id, payment_date, amount'
        })
      }

      const payment = await this.accountsFinanceModel.recordVendorPayment({
        vendor_id,
        purchase_order_id,
        payment_date,
        amount,
        payment_method,
        payment_reference
      })

      res.status(201).json({
        success: true,
        message: 'Vendor payment recorded successfully',
        data: payment
      })
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error recording vendor payment',
        error: error.message
      })
    }
  }

  async getVendorPayments(req, res) {
    try {
      const { status, vendor_id, date_from, date_to } = req.query

      const payments = await this.accountsFinanceModel.getVendorPayments({
        status,
        vendor_id,
        date_from,
        date_to
      })

      res.status(200).json({
        success: true,
        data: payments,
        count: payments.length
      })
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error fetching vendor payments',
        error: error.message
      })
    }
  }

  async updateVendorPaymentStatus(req, res) {
    try {
      const { payment_id } = req.params
      const { status } = req.body

      if (!payment_id || !status) {
        return res.status(400).json({
          success: false,
          message: 'Missing required fields: payment_id, status'
        })
      }

      const success = await this.accountsFinanceModel.updateVendorPaymentStatus(payment_id, status)

      if (!success) {
        return res.status(404).json({
          success: false,
          message: 'Payment not found'
        })
      }

      res.status(200).json({
        success: true,
        message: 'Vendor payment status updated successfully'
      })
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error updating vendor payment status',
        error: error.message
      })
    }
  }

  // ============= CUSTOMER PAYMENTS =============

  async recordCustomerPayment(req, res) {
    try {
      const { customer_id, sales_order_id, payment_date, amount, payment_method, payment_reference } = req.body

      // Validation
      if (!customer_id || !payment_date || !amount) {
        return res.status(400).json({
          success: false,
          message: 'Missing required fields: customer_id, payment_date, amount'
        })
      }

      const payment = await this.accountsFinanceModel.recordCustomerPayment({
        customer_id,
        sales_order_id,
        payment_date,
        amount,
        payment_method,
        payment_reference
      })

      res.status(201).json({
        success: true,
        message: 'Customer payment recorded successfully',
        data: payment
      })
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error recording customer payment',
        error: error.message
      })
    }
  }

  async getCustomerPayments(req, res) {
    try {
      const { status, customer_id, date_from, date_to } = req.query

      const payments = await this.accountsFinanceModel.getCustomerPayments({
        status,
        customer_id,
        date_from,
        date_to
      })

      res.status(200).json({
        success: true,
        data: payments,
        count: payments.length
      })
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error fetching customer payments',
        error: error.message
      })
    }
  }

  async updateCustomerPaymentStatus(req, res) {
    try {
      const { payment_id } = req.params
      const { status } = req.body

      if (!payment_id || !status) {
        return res.status(400).json({
          success: false,
          message: 'Missing required fields: payment_id, status'
        })
      }

      const success = await this.accountsFinanceModel.updateCustomerPaymentStatus(payment_id, status)

      if (!success) {
        return res.status(404).json({
          success: false,
          message: 'Payment not found'
        })
      }

      res.status(200).json({
        success: true,
        message: 'Customer payment status updated successfully'
      })
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error updating customer payment status',
        error: error.message
      })
    }
  }

  // ============= EXPENSE MASTER =============

  async recordExpense(req, res) {
    try {
      const { expense_date, category, description, amount, department, expense_type, payment_method } = req.body

      // Validation
      if (!expense_date || !category || !amount || !department) {
        return res.status(400).json({
          success: false,
          message: 'Missing required fields: expense_date, category, amount, department'
        })
      }

      const expense = await this.accountsFinanceModel.recordExpense({
        expense_date,
        category,
        description,
        amount,
        department,
        expense_type,
        payment_method
      })

      res.status(201).json({
        success: true,
        message: 'Expense recorded successfully',
        data: expense
      })
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error recording expense',
        error: error.message
      })
    }
  }

  async getExpenses(req, res) {
    try {
      const { status, category, department, date_from, date_to } = req.query

      const expenses = await this.accountsFinanceModel.getExpenses({
        status,
        category,
        department,
        date_from,
        date_to
      })

      res.status(200).json({
        success: true,
        data: expenses,
        count: expenses.length
      })
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error fetching expenses',
        error: error.message
      })
    }
  }

  async updateExpenseStatus(req, res) {
    try {
      const { expense_id } = req.params
      const { status } = req.body

      if (!expense_id || !status) {
        return res.status(400).json({
          success: false,
          message: 'Missing required fields: expense_id, status'
        })
      }

      const success = await this.accountsFinanceModel.updateExpenseStatus(expense_id, status)

      if (!success) {
        return res.status(404).json({
          success: false,
          message: 'Expense not found'
        })
      }

      res.status(200).json({
        success: true,
        message: 'Expense status updated successfully'
      })
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error updating expense status',
        error: error.message
      })
    }
  }

  // ============= FINANCIAL ANALYTICS =============

  async getDashboard(req, res) {
    try {
      const dashboard = await this.accountsFinanceModel.getFinancialDashboard()

      res.status(200).json({
        success: true,
        data: dashboard
      })
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error fetching financial dashboard',
        error: error.message
      })
    }
  }

  async getRevenueReport(req, res) {
    try {
      const { date_from, date_to } = req.query

      if (!date_from || !date_to) {
        return res.status(400).json({
          success: false,
          message: 'Missing required parameters: date_from, date_to'
        })
      }

      const report = await this.accountsFinanceModel.getRevenueReport(date_from, date_to)

      res.status(200).json({
        success: true,
        data: report,
        count: report.length
      })
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error fetching revenue report',
        error: error.message
      })
    }
  }

  async getExpenseReport(req, res) {
    try {
      const { date_from, date_to } = req.query

      if (!date_from || !date_to) {
        return res.status(400).json({
          success: false,
          message: 'Missing required parameters: date_from, date_to'
        })
      }

      const report = await this.accountsFinanceModel.getExpenseReport(date_from, date_to)

      res.status(200).json({
        success: true,
        data: report,
        count: report.length
      })
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error fetching expense report',
        error: error.message
      })
    }
  }

  async getCostingReport(req, res) {
    try {
      const { date_from, date_to } = req.query

      if (!date_from || !date_to) {
        return res.status(400).json({
          success: false,
          message: 'Missing required parameters: date_from, date_to'
        })
      }

      const report = await this.accountsFinanceModel.getCostingReport(date_from, date_to)

      res.status(200).json({
        success: true,
        data: report,
        count: report.length
      })
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error fetching costing report',
        error: error.message
      })
    }
  }

  async getVendorPaymentAnalysis(req, res) {
    try {
      const { date_from, date_to } = req.query

      if (!date_from || !date_to) {
        return res.status(400).json({
          success: false,
          message: 'Missing required parameters: date_from, date_to'
        })
      }

      const analysis = await this.accountsFinanceModel.getVendorPaymentAnalysis(date_from, date_to)

      res.status(200).json({
        success: true,
        data: analysis,
        count: analysis.length
      })
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error fetching vendor payment analysis',
        error: error.message
      })
    }
  }

  async getProfitLossStatement(req, res) {
    try {
      const { date_from, date_to } = req.query

      if (!date_from || !date_to) {
        return res.status(400).json({
          success: false,
          message: 'Missing required parameters: date_from, date_to'
        })
      }

      const statement = await this.accountsFinanceModel.getProfitLossStatement(date_from, date_to)

      res.status(200).json({
        success: true,
        data: statement
      })
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error fetching profit/loss statement',
        error: error.message
      })
    }
  }

  async getCashFlowAnalysis(req, res) {
    try {
      const { date_from, date_to } = req.query

      if (!date_from || !date_to) {
        return res.status(400).json({
          success: false,
          message: 'Missing required parameters: date_from, date_to'
        })
      }

      const analysis = await this.accountsFinanceModel.getCashFlowAnalysis(date_from, date_to)

      res.status(200).json({
        success: true,
        data: analysis
      })
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error fetching cash flow analysis',
        error: error.message
      })
    }
  }

  async getAgeingAnalysis(req, res) {
    try {
      const analysis = await this.accountsFinanceModel.getAgeingAnalysis()

      res.status(200).json({
        success: true,
        data: analysis,
        count: analysis.length
      })
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error fetching ageing analysis',
        error: error.message
      })
    }
  }
}

export default AccountsFinanceController