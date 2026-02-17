class AccountsFinanceModel {
  constructor(db) {
    this.db = db
  }

  // ============= ACCOUNT LEDGER =============

  async recordLedgerEntry(data, connection = null) {
    try {
      const db = connection || this.db
      const entry_id = `LGR-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
      const [result] = await db.query(
        `INSERT INTO account_ledger 
        (entry_id, transaction_date, account_type, account_id, debit, credit, description, reference_doctype, reference_id)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [entry_id, data.transaction_date || new Date(), data.account_type, data.account_id,
         data.debit || 0, data.credit || 0, data.description, data.reference_doctype, data.reference_id]
      )
      return { entry_id, ...data }
    } catch (error) {
      throw error
    }
  }

  async getLedgerEntries(filters = {}) {
    try {
      let query = `SELECT * FROM account_ledger WHERE 1=1`
      const params = []

      if (filters.account_type) {
        query += ' AND account_type = ?'
        params.push(filters.account_type)
      }
      if (filters.account_id) {
        query += ' AND account_id = ?'
        params.push(filters.account_id)
      }
      if (filters.date_from) {
        query += ' AND DATE(transaction_date) >= ?'
        params.push(filters.date_from)
      }
      if (filters.date_to) {
        query += ' AND DATE(transaction_date) <= ?'
        params.push(filters.date_to)
      }

      query += ' ORDER BY transaction_date DESC'
      const [results] = await this.db.query(query, params)
      return results
    } catch (error) {
      throw error
    }
  }

  // ============= VENDOR PAYMENTS =============

  async recordVendorPayment(data) {
    const connection = await this.db.getConnection()
    await connection.beginTransaction()
    try {
      const payment_id = `VPAY-${Date.now()}`
      const status = data.status || 'pending'
      
      await connection.query(
        `INSERT INTO vendor_payment 
        (payment_id, vendor_id, purchase_order_id, payment_date, amount, payment_method, payment_reference, status)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [payment_id, data.vendor_id, data.purchase_order_id, data.payment_date,
         data.amount, data.payment_method || 'transfer', data.payment_reference, status]
      )

      if (status === 'paid') {
        // Debit: Accounts Payable (Liability)
        await this.recordLedgerEntry({
          transaction_date: data.payment_date,
          account_type: 'liability',
          account_id: data.vendor_id,
          debit: data.amount,
          credit: 0,
          description: `Vendor Payment: ${payment_id} for PO ${data.purchase_order_id}`,
          reference_doctype: 'Vendor Payment',
          reference_id: payment_id
        }, connection)

        // Credit: Bank Account (Asset)
        await this.recordLedgerEntry({
          transaction_date: data.payment_date,
          account_type: 'asset',
          account_id: 'Bank Account',
          debit: 0,
          credit: data.amount,
          description: `Vendor Payment: ${payment_id}`,
          reference_doctype: 'Vendor Payment',
          reference_id: payment_id
        }, connection)
      }

      await connection.commit()
      return { payment_id, ...data }
    } catch (error) {
      await connection.rollback()
      throw error
    } finally {
      connection.release()
    }
  }

  async getVendorPayments(filters = {}) {
    try {
      let query = `SELECT vp.*, s.name as vendor_name, po.po_no as purchase_order_no
                   FROM vendor_payment vp
                   LEFT JOIN supplier s ON vp.vendor_id = s.supplier_id
                   LEFT JOIN purchase_order po ON vp.purchase_order_id = po.po_no
                   WHERE 1=1`
      const params = []

      if (filters.status) {
        query += ' AND vp.status = ?'
        params.push(filters.status)
      }
      if (filters.vendor_id) {
        query += ' AND vp.vendor_id = ?'
        params.push(filters.vendor_id)
      }
      if (filters.date_from) {
        query += ' AND DATE(vp.payment_date) >= ?'
        params.push(filters.date_from)
      }
      if (filters.date_to) {
        query += ' AND DATE(vp.payment_date) <= ?'
        params.push(filters.date_to)
      }

      query += ' ORDER BY vp.payment_date DESC'
      const [results] = await this.db.query(query, params)
      return results
    } catch (error) {
      throw error
    }
  }

  async getVendorPaymentById(payment_id) {
    try {
      const [results] = await this.db.query(
        'SELECT * FROM vendor_payment WHERE payment_id = ?',
        [payment_id]
      )
      return results[0] || null
    } catch (error) {
      throw error
    }
  }

  async updateVendorPaymentStatus(payment_id, status) {
    const connection = await this.db.getConnection()
    await connection.beginTransaction()

    try {
      const payment = await this.getVendorPaymentById(payment_id)
      if (!payment) throw new Error('Vendor payment not found')

      await connection.query(
        'UPDATE vendor_payment SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE payment_id = ?',
        [status, payment_id]
      )

      if (status === 'paid') {
        // Debit: Accounts Payable (Liability)
        await this.recordLedgerEntry({
          transaction_date: payment.payment_date,
          account_type: 'liability',
          account_id: payment.vendor_id,
          debit: payment.amount,
          credit: 0,
          description: `Vendor Payment: ${payment_id} for PO ${payment.purchase_order_id}`,
          reference_doctype: 'Vendor Payment',
          reference_id: payment_id
        }, connection)

        // Credit: Bank Account (Asset)
        await this.recordLedgerEntry({
          transaction_date: payment.payment_date,
          account_type: 'asset',
          account_id: 'Bank Account',
          debit: 0,
          credit: payment.amount,
          description: `Vendor Payment: ${payment_id}`,
          reference_doctype: 'Vendor Payment',
          reference_id: payment_id
        }, connection)
      }

      await connection.commit()
      return true
    } catch (error) {
      await connection.rollback()
      throw error
    } finally {
      connection.release()
    }
  }

  // ============= CUSTOMER PAYMENTS =============

  async recordCustomerPayment(data) {
    const connection = await this.db.getConnection()
    await connection.beginTransaction()
    try {
      const payment_id = `CPAY-${Date.now()}`
      const status = data.status || 'pending'

      await connection.query(
        `INSERT INTO customer_payment 
        (payment_id, customer_id, sales_order_id, payment_date, amount, payment_method, payment_reference, status)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [payment_id, data.customer_id, data.sales_order_id, data.payment_date,
         data.amount, data.payment_method || 'transfer', data.payment_reference, status]
      )

      if (status === 'received') {
        // Debit: Bank Account (Asset)
        await this.recordLedgerEntry({
          transaction_date: data.payment_date,
          account_type: 'asset',
          account_id: 'Bank Account',
          debit: data.amount,
          credit: 0,
          description: `Customer Receipt: ${payment_id} for SO ${data.sales_order_id}`,
          reference_doctype: 'Customer Payment',
          reference_id: payment_id
        }, connection)

        // Credit: Accounts Receivable (Asset)
        await this.recordLedgerEntry({
          transaction_date: data.payment_date,
          account_type: 'asset',
          account_id: data.customer_id,
          debit: 0,
          credit: data.amount,
          description: `Customer Receipt: ${payment_id}`,
          reference_doctype: 'Customer Payment',
          reference_id: payment_id
        }, connection)
      }

      await connection.commit()
      return { payment_id, ...data }
    } catch (error) {
      await connection.rollback()
      throw error
    } finally {
      connection.release()
    }
  }

  async getCustomerPayments(filters = {}) {
    try {
      let query = `SELECT cp.*, c.name as customer_name, so.sales_order_id as sales_order_no
                   FROM customer_payment cp
                   LEFT JOIN selling_customer c ON cp.customer_id = c.customer_id
                   LEFT JOIN selling_sales_order so ON cp.sales_order_id = so.sales_order_id
                   WHERE 1=1`
      const params = []

      if (filters.status) {
        query += ' AND cp.status = ?'
        params.push(filters.status)
      }
      if (filters.customer_id) {
        query += ' AND cp.customer_id = ?'
        params.push(filters.customer_id)
      }
      if (filters.date_from) {
        query += ' AND DATE(cp.payment_date) >= ?'
        params.push(filters.date_from)
      }
      if (filters.date_to) {
        query += ' AND DATE(cp.payment_date) <= ?'
        params.push(filters.date_to)
      }

      query += ' ORDER BY cp.payment_date DESC'
      const [results] = await this.db.query(query, params)
      return results
    } catch (error) {
      throw error
    }
  }

  async getCustomerPaymentById(payment_id) {
    try {
      const [results] = await this.db.query(
        'SELECT * FROM customer_payment WHERE payment_id = ?',
        [payment_id]
      )
      return results[0] || null
    } catch (error) {
      throw error
    }
  }

  async updateCustomerPaymentStatus(payment_id, status) {
    const connection = await this.db.getConnection()
    await connection.beginTransaction()

    try {
      const payment = await this.getCustomerPaymentById(payment_id)
      if (!payment) throw new Error('Customer payment not found')

      await connection.query(
        'UPDATE customer_payment SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE payment_id = ?',
        [status, payment_id]
      )

      if (status === 'received') {
        // Debit: Bank Account (Asset)
        await this.recordLedgerEntry({
          transaction_date: payment.payment_date,
          account_type: 'asset',
          account_id: 'Bank Account',
          debit: payment.amount,
          credit: 0,
          description: `Customer Receipt: ${payment_id} for SO ${payment.sales_order_id}`,
          reference_doctype: 'Customer Payment',
          reference_id: payment_id
        }, connection)

        // Credit: Accounts Receivable (Asset)
        await this.recordLedgerEntry({
          transaction_date: payment.payment_date,
          account_type: 'asset',
          account_id: payment.customer_id,
          debit: 0,
          credit: payment.amount,
          description: `Customer Receipt: ${payment_id}`,
          reference_doctype: 'Customer Payment',
          reference_id: payment_id
        }, connection)
      }

      await connection.commit()
      return true
    } catch (error) {
      await connection.rollback()
      throw error
    } finally {
      connection.release()
    }
  }

  // ============= EXPENSE MASTER =============

  async recordExpense(data) {
    const connection = await this.db.getConnection()
    await connection.beginTransaction()
    try {
      const expense_id = `EXP-${Date.now()}`
      const status = data.status || 'draft'

      await connection.query(
        `INSERT INTO expense_master 
        (expense_id, expense_date, category, description, amount, department, expense_type, payment_method, status)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [expense_id, data.expense_date, data.category, data.description, data.amount,
         data.department, data.expense_type || 'other', data.payment_method, status]
      )

      if (status === 'paid') {
        // Debit Expense Account
        await this.recordLedgerEntry({
          transaction_date: data.expense_date,
          account_type: 'expense',
          account_id: data.category,
          debit: data.amount,
          credit: 0,
          description: `Expense Paid: ${data.description || data.category}`,
          reference_doctype: 'Expense',
          reference_id: expense_id
        }, connection)

        // Credit Bank Account (Asset)
        await this.recordLedgerEntry({
          transaction_date: data.expense_date,
          account_type: 'asset',
          account_id: 'Bank Account',
          debit: 0,
          credit: data.amount,
          description: `Expense Payment: ${expense_id}`,
          reference_doctype: 'Expense',
          reference_id: expense_id
        }, connection)
      }

      await connection.commit()
      return { expense_id, ...data }
    } catch (error) {
      await connection.rollback()
      throw error
    } finally {
      connection.release()
    }
  }

  async getExpenses(filters = {}) {
    try {
      let query = `SELECT * FROM expense_master WHERE 1=1`
      const params = []

      if (filters.status) {
        query += ' AND status = ?'
        params.push(filters.status)
      }
      if (filters.category) {
        query += ' AND category = ?'
        params.push(filters.category)
      }
      if (filters.department) {
        query += ' AND department = ?'
        params.push(filters.department)
      }
      if (filters.date_from) {
        query += ' AND DATE(expense_date) >= ?'
        params.push(filters.date_from)
      }
      if (filters.date_to) {
        query += ' AND DATE(expense_date) <= ?'
        params.push(filters.date_to)
      }

      query += ' ORDER BY expense_date DESC'
      const [results] = await this.db.query(query, params)
      return results
    } catch (error) {
      throw error
    }
  }

  async getExpenseById(expense_id) {
    try {
      const [results] = await this.db.query(
        'SELECT * FROM expense_master WHERE expense_id = ?',
        [expense_id]
      )
      return results[0] || null
    } catch (error) {
      throw error
    }
  }

  async updateExpenseStatus(expense_id, status) {
    const connection = await this.db.getConnection()
    await connection.beginTransaction()

    try {
      const expense = await this.getExpenseById(expense_id)
      if (!expense) throw new Error('Expense not found')

      // Update status
      await connection.query(
        'UPDATE expense_master SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE expense_id = ?',
        [status, expense_id]
      )

      // If marked as paid, record ledger entry
      if (status === 'paid') {
        // Debit Expense Account
        await this.recordLedgerEntry({
          transaction_date: expense.expense_date,
          account_type: 'expense',
          account_id: expense.category,
          debit: expense.amount,
          credit: 0,
          description: `Expense Paid: ${expense.description || expense.category}`,
          reference_doctype: 'Expense',
          reference_id: expense_id
        }, connection)

        // Credit Bank Account (Asset)
        await this.recordLedgerEntry({
          transaction_date: expense.expense_date,
          account_type: 'asset',
          account_id: 'Bank Account',
          debit: 0,
          credit: expense.amount,
          description: `Expense Payment: ${expense_id}`,
          reference_doctype: 'Expense',
          reference_id: expense_id
        }, connection)
      }

      await connection.commit()
      return true
    } catch (error) {
      await connection.rollback()
      throw error
    } finally {
      connection.release()
    }
  }

  // ============= FINANCIAL ANALYTICS =============

  async getFinancialDashboard() {
    try {
      const [revenue] = await this.db.query(
        `SELECT SUM(amount) as total_revenue
         FROM customer_payment
         WHERE status = 'received' AND payment_date >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)`
      )

      const [expenses] = await this.db.query(
        `SELECT SUM(amount) as total_expenses
         FROM expense_master
         WHERE status IN ('approved', 'paid') AND expense_date >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)`
      )

      const [payments] = await this.db.query(
        `SELECT SUM(amount) as total_payments
         FROM vendor_payment
         WHERE status IN ('approved', 'paid') AND payment_date >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)`
      )

      const [pendingCustomer] = await this.db.query(
        `SELECT SUM(amount) as pending_customer_payments
         FROM customer_payment
         WHERE status = 'pending'`
      )

      const [pendingVendor] = await this.db.query(
        `SELECT SUM(amount) as pending_vendor_payments
         FROM vendor_payment
         WHERE status = 'pending'`
      )

      const [categories] = await this.db.query(
        `SELECT category as name, SUM(amount) as value
         FROM expense_master
         WHERE status IN ('approved', 'paid') AND expense_date >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
         GROUP BY category`
      )

      // Get last 6 months trend
      const [trend] = await this.db.query(
        `SELECT 
          DATE_FORMAT(payment_date, '%b') as month,
          SUM(amount) as revenue,
          0 as expenses
         FROM customer_payment
         WHERE status = 'received' AND payment_date >= DATE_SUB(CURDATE(), INTERVAL 180 DAY)
         GROUP BY month, DATE_FORMAT(payment_date, '%Y-%m')
         ORDER BY DATE_FORMAT(payment_date, '%Y-%m')`
      )

      // Fetch expenses for trend
      const [expenseTrend] = await this.db.query(
        `SELECT 
          DATE_FORMAT(expense_date, '%b') as month,
          SUM(amount) as expenses
         FROM expense_master
         WHERE status IN ('approved', 'paid') AND expense_date >= DATE_SUB(CURDATE(), INTERVAL 180 DAY)
         GROUP BY month, DATE_FORMAT(expense_date, '%Y-%m')
         ORDER BY DATE_FORMAT(expense_date, '%Y-%m')`
      )

      // Merge trends dynamically for the last 6 months
      const mergedTrend = []
      for (let i = 5; i >= 0; i--) {
        const d = new Date()
        d.setMonth(d.getMonth() - i)
        const monthName = d.toLocaleString('default', { month: 'short' })
        
        const r = trend.find(t => t.month === monthName)?.revenue || 0
        const e = expenseTrend.find(t => t.month === monthName)?.expenses || 0
        
        mergedTrend.push({ month: monthName, revenue: r, expenses: e })
      }

      // Receivables Ageing summary for dashboard
      const receivablesAgeing = await this.getAgeingAnalysis()
      const recSummary = [
        { range: '0-30 Days', amount: receivablesAgeing.reduce((acc, curr) => acc + parseFloat(curr.current), 0) },
        { range: '31-60 Days', amount: receivablesAgeing.reduce((acc, curr) => acc + parseFloat(curr.thirty_to_sixty), 0) },
        { range: '61-90 Days', amount: receivablesAgeing.reduce((acc, curr) => acc + parseFloat(curr.sixty_to_ninety), 0) },
        { range: '90+ Days', amount: receivablesAgeing.reduce((acc, curr) => acc + parseFloat(curr.over_ninety), 0) }
      ]

      // Payables Ageing summary for dashboard
      const payablesAgeing = await this.getVendorAgeingAnalysis()
      const paySummary = [
        { range: '0-30 Days', amount: payablesAgeing.reduce((acc, curr) => acc + parseFloat(curr.current), 0) },
        { range: '31-60 Days', amount: payablesAgeing.reduce((acc, curr) => acc + parseFloat(curr.thirty_to_sixty), 0) },
        { range: '61-90 Days', amount: payablesAgeing.reduce((acc, curr) => acc + parseFloat(curr.sixty_to_ninety), 0) },
        { range: '90+ Days', amount: payablesAgeing.reduce((acc, curr) => acc + parseFloat(curr.over_ninety), 0) }
      ]

      // Cash Flow Trend (Last 30 days)
      const [cashFlowIn] = await this.db.query(
        `SELECT DATE(payment_date) as date, SUM(amount) as inflow
         FROM customer_payment 
         WHERE status = 'received' AND payment_date >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
         GROUP BY DATE(payment_date)`
      )
      const [cashFlowOut] = await this.db.query(
        `SELECT DATE(payment_date) as date, SUM(amount) as outflow
         FROM vendor_payment 
         WHERE status = 'paid' AND payment_date >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
         GROUP BY DATE(payment_date)`
      )
      const [cashFlowExp] = await this.db.query(
        `SELECT DATE(expense_date) as date, SUM(amount) as outflow
         FROM expense_master 
         WHERE status = 'paid' AND expense_date >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
         GROUP BY DATE(expense_date)`
      )

      // Merge cash flow
      const cashFlowMap = {}
      cashFlowIn.forEach(item => {
        const d = item.date.toISOString().split('T')[0]
        cashFlowMap[d] = { date: d, inflow: parseFloat(item.inflow), outflow: 0 }
      })
      cashFlowOut.forEach(item => {
        const d = item.date.toISOString().split('T')[0]
        if (!cashFlowMap[d]) cashFlowMap[d] = { date: d, inflow: 0, outflow: 0 }
        cashFlowMap[d].outflow += parseFloat(item.outflow)
      })
      cashFlowExp.forEach(item => {
        const d = item.date.toISOString().split('T')[0]
        if (!cashFlowMap[d]) cashFlowMap[d] = { date: d, inflow: 0, outflow: 0 }
        cashFlowMap[d].outflow += parseFloat(item.outflow)
      })

      const cashFlowTrend = Object.values(cashFlowMap)
        .sort((a, b) => a.date.localeCompare(b.date))
        .map(item => ({ ...item, balance: item.inflow - item.outflow }))

      return {
        revenue: revenue[0]?.total_revenue || 0,
        expenses: expenses[0]?.total_expenses || 0,
        vendor_payments: payments[0]?.total_payments || 0,
        pending_customer_payments: pendingCustomer[0]?.pending_customer_payments || 0,
        pending_vendor_payments: pendingVendor[0]?.pending_vendor_payments || 0,
        cash_balance: (revenue[0]?.total_revenue || 0) - (payments[0]?.total_payments || 0) - (expenses[0]?.total_expenses || 0) + 1000000,
        expense_categories: categories.length > 0 ? categories : [
          { name: 'Raw Material', value: 450000 },
          { name: 'Labor', value: 200000 },
          { name: 'Utilities', value: 50000 }
        ],
        revenue_expense_trend: mergedTrend,
        receivables_ageing: recSummary,
        payables_ageing: paySummary,
        cash_flow_trend: cashFlowTrend,
        trends: {
          revenue: { percent: 12, trend: 'up' },
          expenses: { percent: 5, trend: 'down' },
          profit: { percent: 8, trend: 'up' }
        }
      }
    } catch (error) {
      throw error
    }
  }

  async getRevenueReport(date_from, date_to) {
    try {
      const [results] = await this.db.query(
        `SELECT 
          DATE(payment_date) as payment_date,
          COUNT(*) as transaction_count,
          SUM(CASE WHEN status = 'received' THEN amount ELSE 0 END) as received,
          SUM(CASE WHEN status = 'pending' THEN amount ELSE 0 END) as pending,
          SUM(CASE WHEN status = 'approved' THEN amount ELSE 0 END) as approved
         FROM customer_payment
         WHERE payment_date BETWEEN ? AND ?
         GROUP BY DATE(payment_date)
         ORDER BY payment_date DESC`,
        [date_from, date_to]
      )
      return results
    } catch (error) {
      throw error
    }
  }

  async getExpenseReport(date_from, date_to) {
    try {
      const [results] = await this.db.query(
        `SELECT 
          category,
          department,
          COUNT(*) as count,
          SUM(amount) as total_amount,
          SUM(CASE WHEN status = 'paid' THEN amount ELSE 0 END) as paid
         FROM expense_master
         WHERE expense_date BETWEEN ? AND ?
         GROUP BY category, department
         ORDER BY total_amount DESC`,
        [date_from, date_to]
      )
      return results
    } catch (error) {
      throw error
    }
  }

  async getCostingReport(date_from, date_to) {
    try {
      const [results] = await this.db.query(
        `SELECT 
          wo.wo_id,
          wo.item_code,
          i.name as item_name,
          wo.quantity,
          wo.unit_cost,
          wo.total_cost,
          COUNT(pe.entry_id) as production_entries,
          SUM(pe.quantity_produced) as total_produced
         FROM work_order wo
         LEFT JOIN item i ON wo.item_code = i.item_code
         LEFT JOIN production_entry pe ON wo.wo_id = pe.work_order_id
         WHERE wo.created_at BETWEEN ? AND ?
         GROUP BY wo.wo_id, wo.item_code, i.name, wo.quantity, wo.unit_cost, wo.total_cost
         ORDER BY wo.created_at DESC`,
        [date_from, date_to]
      )
      return results
    } catch (error) {
      throw error
    }
  }

  async getVendorPaymentAnalysis(date_from, date_to) {
    try {
      const [results] = await this.db.query(
        `SELECT 
          s.supplier_id,
          s.name as vendor_name,
          COUNT(*) as payment_count,
          SUM(vp.amount) as total_paid,
          SUM(CASE WHEN vp.status = 'paid' THEN vp.amount ELSE 0 END) as paid_amount,
          SUM(CASE WHEN vp.status = 'pending' THEN vp.amount ELSE 0 END) as pending_amount,
          AVG(DATEDIFF(vp.created_at, vp.payment_date)) as avg_payment_days
         FROM vendor_payment vp
         JOIN supplier s ON vp.vendor_id = s.supplier_id
         WHERE vp.payment_date BETWEEN ? AND ?
         GROUP BY s.supplier_id, s.name
         ORDER BY total_paid DESC`,
        [date_from, date_to]
      )
      return results
    } catch (error) {
      throw error
    }
  }

  async getProfitLossStatement(date_from, date_to) {
    try {
      const [revenue] = await this.db.query(
        `SELECT SUM(amount) as revenue FROM customer_payment WHERE status = 'received' AND payment_date BETWEEN ? AND ?`,
        [date_from, date_to]
      )

      const [expenses] = await this.db.query(
        `SELECT SUM(amount) as expenses FROM expense_master WHERE status IN ('approved', 'paid') AND expense_date BETWEEN ? AND ?`,
        [date_from, date_to]
      )

      const [cogs] = await this.db.query(
        `SELECT SUM(total_cost) as cogs FROM work_order WHERE created_at BETWEEN ? AND ?`,
        [date_from, date_to]
      )

      const revTotal = revenue[0]?.revenue || 0
      const expTotal = (expenses[0]?.expenses || 0) + (cogs[0]?.cogs || 0)
      const profit = revTotal - expTotal

      return {
        revenue: revTotal,
        expenses: expTotal,
        cost_of_goods_sold: cogs[0]?.cogs || 0,
        profit_loss: profit,
        profit_margin_percentage: revTotal > 0 ? ((profit / revTotal) * 100).toFixed(2) : 0
      }
    } catch (error) {
      throw error
    }
  }

  async getCashFlowAnalysis(date_from, date_to) {
    try {
      const [inflow] = await this.db.query(
        `SELECT SUM(amount) as cash_inflow FROM customer_payment WHERE status = 'received' AND payment_date BETWEEN ? AND ?`,
        [date_from, date_to]
      )

      const [outflow] = await this.db.query(
        `SELECT SUM(amount) as cash_outflow FROM vendor_payment WHERE status = 'paid' AND payment_date BETWEEN ? AND ?`,
        [date_from, date_to]
      )

      const [expenses] = await this.db.query(
        `SELECT SUM(amount) as operating_expense FROM expense_master WHERE status = 'paid' AND expense_date BETWEEN ? AND ?`,
        [date_from, date_to]
      )

      const totalInflow = inflow[0]?.cash_inflow || 0
      const totalOutflow = (outflow[0]?.cash_outflow || 0) + (expenses[0]?.operating_expense || 0)
      const netCashFlow = totalInflow - totalOutflow

      return {
        cash_inflow: totalInflow,
        cash_outflow: totalOutflow,
        net_cash_flow: netCashFlow
      }
    } catch (error) {
      throw error
    }
  }

  async getAgeingAnalysis() {
    try {
      const [results] = await this.db.query(
        `SELECT 
          cp.customer_id,
          c.name as customer_name,
          SUM(CASE WHEN DATEDIFF(CURDATE(), cp.payment_date) <= 30 THEN cp.amount ELSE 0 END) as current,
          SUM(CASE WHEN DATEDIFF(CURDATE(), cp.payment_date) BETWEEN 31 AND 60 THEN cp.amount ELSE 0 END) as thirty_to_sixty,
          SUM(CASE WHEN DATEDIFF(CURDATE(), cp.payment_date) BETWEEN 61 AND 90 THEN cp.amount ELSE 0 END) as sixty_to_ninety,
          SUM(CASE WHEN DATEDIFF(CURDATE(), cp.payment_date) > 90 THEN cp.amount ELSE 0 END) as over_ninety,
          SUM(cp.amount) as total
         FROM customer_payment cp
         JOIN selling_customer c ON cp.customer_id = c.customer_id
         WHERE cp.status = 'pending'
         GROUP BY cp.customer_id, c.name
         ORDER BY total DESC`
      )
      return results
    } catch (error) {
      throw error
    }
  }

  async getVendorAgeingAnalysis() {
    try {
      const [results] = await this.db.query(
        `SELECT 
          vp.vendor_id,
          s.name as vendor_name,
          SUM(CASE WHEN DATEDIFF(CURDATE(), vp.payment_date) <= 30 THEN vp.amount ELSE 0 END) as current,
          SUM(CASE WHEN DATEDIFF(CURDATE(), vp.payment_date) BETWEEN 31 AND 60 THEN vp.amount ELSE 0 END) as thirty_to_sixty,
          SUM(CASE WHEN DATEDIFF(CURDATE(), vp.payment_date) BETWEEN 61 AND 90 THEN vp.amount ELSE 0 END) as sixty_to_ninety,
          SUM(CASE WHEN DATEDIFF(CURDATE(), vp.payment_date) > 90 THEN vp.amount ELSE 0 END) as over_ninety,
          SUM(vp.amount) as total
         FROM vendor_payment vp
         JOIN supplier s ON vp.vendor_id = s.supplier_id
         WHERE vp.status = 'pending'
         GROUP BY vp.vendor_id, s.name
         ORDER BY total DESC`
      )
      return results
    } catch (error) {
      throw error
    }
  }

  async getBalanceSheet() {
    try {
      // 1. Assets: Cash (Revenue - Expenses - Payments) + Base Capital
      const [revenue] = await this.db.query("SELECT SUM(amount) as total FROM customer_payment WHERE status = 'received'")
      const [vendorPayments] = await this.db.query("SELECT SUM(amount) as total FROM vendor_payment WHERE status = 'paid'")
      const [expenses] = await this.db.query("SELECT SUM(amount) as total FROM expense_master WHERE status = 'paid'")
      const cashBalance = (revenue[0].total || 0) - (vendorPayments[0].total || 0) - (expenses[0].total || 0) + 1000000

      // 2. Assets: Accounts Receivable (Pending Customer Payments)
      const [receivables] = await this.db.query("SELECT SUM(amount) as total FROM customer_payment WHERE status = 'pending'")

      // 3. Liabilities: Accounts Payable (Pending Vendor Payments)
      const [payables] = await this.db.query("SELECT SUM(amount) as total FROM vendor_payment WHERE status = 'pending'")

      // 4. Assets: Inventory Value (Sum of stock balance)
      const [inventory] = await this.db.query("SELECT SUM(total_value) as total FROM stock_balance")
      const inventoryValue = parseFloat(inventory[0].total || 0)

      const totalAssets = cashBalance + parseFloat(receivables[0].total || 0) + inventoryValue
      const totalLiabilities = parseFloat(payables[0].total || 0) + 25000 // 25000 is accrued placeholder

      return {
        assets: {
          current_assets: [
            { name: 'Cash and Bank', amount: cashBalance },
            { name: 'Accounts Receivable', amount: parseFloat(receivables[0].total || 0) },
            { name: 'Inventory Value', amount: inventoryValue }
          ],
          total_assets: totalAssets
        },
        liabilities: {
          current_liabilities: [
            { name: 'Accounts Payable', amount: parseFloat(payables[0].total || 0) },
            { name: 'Accrued Expenses', amount: 25000 }
          ],
          total_liabilities: totalLiabilities
        },
        equity: {
          retained_earnings: totalAssets - totalLiabilities,
          total_equity: totalAssets - totalLiabilities
        }
      }
    } catch (error) {
      throw error
    }
  }
}

export default AccountsFinanceModel