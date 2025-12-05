class AccountsFinanceModel {
  constructor(db) {
    this.db = db
  }

  // ============= ACCOUNT LEDGER =============

  async recordLedgerEntry(data) {
    try {
      const entry_id = `LGR-${Date.now()}`
      const [result] = await this.db.query(
        `INSERT INTO account_ledger 
        (entry_id, transaction_date, account_type, account_id, debit, credit, description, reference_doctype, reference_id)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [entry_id, data.transaction_date, data.account_type, data.account_id,
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
    try {
      const payment_id = `VPAY-${Date.now()}`
      const [result] = await this.db.query(
        `INSERT INTO vendor_payment 
        (payment_id, vendor_id, purchase_order_id, payment_date, amount, payment_method, payment_reference, status)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [payment_id, data.vendor_id, data.purchase_order_id, data.payment_date,
         data.amount, data.payment_method || 'transfer', data.payment_reference, data.status || 'pending']
      )
      return { payment_id, ...data }
    } catch (error) {
      throw error
    }
  }

  async getVendorPayments(filters = {}) {
    try {
      let query = `SELECT vp.*, s.name as vendor_name, po.po_id as purchase_order_no
                   FROM vendor_payment vp
                   LEFT JOIN supplier s ON vp.vendor_id = s.supplier_id
                   LEFT JOIN purchase_order po ON vp.purchase_order_id = po.po_id
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

  async updateVendorPaymentStatus(payment_id, status) {
    try {
      const [result] = await this.db.query(
        'UPDATE vendor_payment SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE payment_id = ?',
        [status, payment_id]
      )
      return result.affectedRows > 0
    } catch (error) {
      throw error
    }
  }

  // ============= CUSTOMER PAYMENTS =============

  async recordCustomerPayment(data) {
    try {
      const payment_id = `CPAY-${Date.now()}`
      const [result] = await this.db.query(
        `INSERT INTO customer_payment 
        (payment_id, customer_id, sales_order_id, payment_date, amount, payment_method, payment_reference, status)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [payment_id, data.customer_id, data.sales_order_id, data.payment_date,
         data.amount, data.payment_method || 'transfer', data.payment_reference, data.status || 'pending']
      )
      return { payment_id, ...data }
    } catch (error) {
      throw error
    }
  }

  async getCustomerPayments(filters = {}) {
    try {
      let query = `SELECT cp.*, c.name as customer_name, so.so_id as sales_order_no
                   FROM customer_payment cp
                   LEFT JOIN customer c ON cp.customer_id = c.customer_id
                   LEFT JOIN sales_order so ON cp.sales_order_id = so.sales_order_id
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

  async updateCustomerPaymentStatus(payment_id, status) {
    try {
      const [result] = await this.db.query(
        'UPDATE customer_payment SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE payment_id = ?',
        [status, payment_id]
      )
      return result.affectedRows > 0
    } catch (error) {
      throw error
    }
  }

  // ============= EXPENSE MASTER =============

  async recordExpense(data) {
    try {
      const expense_id = `EXP-${Date.now()}`
      const [result] = await this.db.query(
        `INSERT INTO expense_master 
        (expense_id, expense_date, category, description, amount, department, expense_type, payment_method, status)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [expense_id, data.expense_date, data.category, data.description, data.amount,
         data.department, data.expense_type || 'other', data.payment_method, data.status || 'draft']
      )
      return { expense_id, ...data }
    } catch (error) {
      throw error
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

  async updateExpenseStatus(expense_id, status) {
    try {
      const [result] = await this.db.query(
        'UPDATE expense_master SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE expense_id = ?',
        [status, expense_id]
      )
      return result.affectedRows > 0
    } catch (error) {
      throw error
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

      const [pending] = await this.db.query(
        `SELECT SUM(amount) as pending_customer_payments
         FROM customer_payment
         WHERE status = 'pending' AND payment_date >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)`
      )

      return {
        revenue: revenue[0]?.total_revenue || 0,
        expenses: expenses[0]?.total_expenses || 0,
        vendor_payments: payments[0]?.total_payments || 0,
        pending_customer_payments: pending[0]?.pending_customer_payments || 0
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
         JOIN customer c ON cp.customer_id = c.customer_id
         WHERE cp.status = 'pending'
         GROUP BY cp.customer_id, c.name
         ORDER BY total DESC`
      )
      return results
    } catch (error) {
      throw error
    }
  }
}

export default AccountsFinanceModel