class AdminAnalyticsModel {
  constructor(db) {
    this.db = db
  }

  // ============= DASHBOARD METRICS =============

  async getGlobalDashboard() {
    try {
      // Get key metrics from all modules
      const [results] = await this.db.query(
        `SELECT 
         'Users' as metric, COUNT(*) as value FROM users WHERE is_active = TRUE
         UNION ALL
         SELECT 'Active Work Orders', COUNT(*) FROM work_order WHERE status IN ('approved', 'in_progress')
         UNION ALL
         SELECT 'Pending Purchase Orders', COUNT(*) FROM purchase_order WHERE status IN ('draft', 'approved')
         UNION ALL
         SELECT 'Pending Dispatch', COUNT(*) FROM dispatch_order WHERE status IN ('pending', 'ready')
         UNION ALL
         SELECT 'Open Complaints', COUNT(*) FROM customer_complaint WHERE status = 'open'
         UNION ALL
         SELECT 'Open CAPA', COUNT(*) FROM capa_action WHERE status IN ('open', 'in_progress')`
      )
      return results
    } catch (error) {
      throw error
    }
  }

  // ============= USER MANAGEMENT =============

  async getAllUsers() {
    try {
      const [users] = await this.db.query(
        `SELECT user_id, email, full_name, department, role, is_active, created_at 
         FROM users ORDER BY created_at DESC`
      )
      return users
    } catch (error) {
      throw error
    }
  }

  async getUsersByDepartment() {
    try {
      const [results] = await this.db.query(
        `SELECT department, role, COUNT(*) as count 
         FROM users 
         WHERE is_active = TRUE
         GROUP BY department, role 
         ORDER BY department, role`
      )
      return results
    } catch (error) {
      throw error
    }
  }

  async getInactiveUsers() {
    try {
      const [users] = await this.db.query(
        `SELECT user_id, email, full_name, department, role, updated_at 
         FROM users 
         WHERE is_active = FALSE 
         ORDER BY updated_at DESC`
      )
      return users
    } catch (error) {
      throw error
    }
  }

  // ============= DEPARTMENT ANALYTICS =============

  async getDepartmentKPIs() {
    try {
      const [results] = await this.db.query(
        `SELECT 
         'Buying' as department,
         COUNT(DISTINCT supplier_id) as vendors,
         COUNT(DISTINCT po_id) as purchase_orders,
         SUM(total_amount) as total_spent
         FROM purchase_order
         WHERE created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
         UNION ALL
         SELECT 
         'Selling' as department,
         COUNT(DISTINCT customer_id) as vendors,
         COUNT(DISTINCT so_id) as purchase_orders,
         SUM(total_amount) as total_spent
         FROM sales_order
         WHERE created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
         UNION ALL
         SELECT 
         'Production' as department,
         COUNT(DISTINCT machine_id) as vendors,
         COUNT(DISTINCT wo_id) as purchase_orders,
         SUM(total_cost) as total_spent
         FROM work_order
         WHERE created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
         UNION ALL
         SELECT 
         'Quality' as department,
         COUNT(DISTINCT inspection_id) as vendors,
         COUNT(DISTINCT complaint_id) as purchase_orders,
         SUM(quantity_rejected) as total_spent
         FROM inspection_result
         WHERE inspection_date >= DATE_SUB(NOW(), INTERVAL 30 DAY)`
      )
      return results
    } catch (error) {
      throw error
    }
  }

  // ============= BUYING ANALYTICS =============

  async getBuyingAnalytics() {
    try {
      const [results] = await this.db.query(
        `SELECT 
         'Total POs' as metric, COUNT(*) as value FROM purchase_order
         UNION ALL
         SELECT 'Total Suppliers', COUNT(DISTINCT supplier_id) FROM purchase_order
         UNION ALL
         SELECT 'Avg Lead Time (Days)', AVG(DATEDIFF(receipt_date, po_date)) FROM purchase_receipt
         UNION ALL
         SELECT 'Total Spent', ROUND(SUM(total_amount), 2) FROM purchase_order
         UNION ALL
         SELECT 'Pending POs', COUNT(*) FROM purchase_order WHERE status IN ('draft', 'approved')`
      )
      return results
    } catch (error) {
      throw error
    }
  }

  async getSupplierPerformance(days = 90) {
    try {
      const [results] = await this.db.query(
        `SELECT 
         s.name,
         COUNT(po.po_id) as total_orders,
         SUM(po.total_amount) as total_amount,
         ROUND(AVG(DATEDIFF(pr.receipt_date, po.po_date)), 2) as avg_delivery_days,
         ROUND(AVG(DATEDIFF(DATE(po.created_at), DATE_SUB(NOW(), INTERVAL ? DAY))), 2) as quality_rating
         FROM supplier s
         LEFT JOIN purchase_order po ON s.supplier_id = po.supplier_id 
         AND po.created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
         LEFT JOIN purchase_receipt pr ON po.po_id = pr.po_id
         GROUP BY s.supplier_id, s.name
         ORDER BY total_amount DESC`,
        [days, days]
      )
      return results
    } catch (error) {
      throw error
    }
  }

  // ============= SELLING ANALYTICS =============

  async getSellingAnalytics() {
    try {
      const [results] = await this.db.query(
        `SELECT 
         'Total Sales Orders' as metric, COUNT(*) as value FROM sales_order
         UNION ALL
         SELECT 'Total Customers', COUNT(DISTINCT customer_id) FROM sales_order
         UNION ALL
         SELECT 'Total Revenue', ROUND(SUM(total_amount), 2) FROM sales_order
         UNION ALL
         SELECT 'Pending Orders', COUNT(*) FROM sales_order WHERE status IN ('draft', 'submitted')
         UNION ALL
         SELECT 'Delivered Orders', COUNT(*) FROM sales_order WHERE status = 'completed'`
      )
      return results
    } catch (error) {
      throw error
    }
  }

  async getCustomerPerformance(days = 90) {
    try {
      const [results] = await this.db.query(
        `SELECT 
         c.name,
         COUNT(so.so_id) as total_orders,
         SUM(so.total_amount) as total_revenue,
         COUNT(cc.complaint_id) as complaints,
         ROUND(SUM(so.total_amount) / COUNT(so.so_id), 2) as avg_order_value
         FROM customer_master c
         LEFT JOIN sales_order so ON c.customer_id = so.customer_id 
         AND so.created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
         LEFT JOIN customer_complaint cc ON c.customer_id = cc.customer_id
         AND cc.complaint_date >= DATE_SUB(NOW(), INTERVAL ? DAY)
         GROUP BY c.customer_id, c.name
         ORDER BY total_revenue DESC`,
        [days, days]
      )
      return results
    } catch (error) {
      throw error
    }
  }

  // ============= INVENTORY ANALYTICS =============

  async getInventoryAnalytics() {
    try {
      const [results] = await this.db.query(
        `SELECT 
         'Total Items' as metric, COUNT(DISTINCT item_code) as value FROM item
         UNION ALL
         SELECT 'Total Warehouses', COUNT(*) FROM warehouse
         UNION ALL
         SELECT 'Total Stock Value', ROUND(SUM(quantity * unit_cost), 2) FROM stock_balance
         UNION ALL
         SELECT 'Low Stock Items', COUNT(*) FROM stock_balance WHERE quantity <= reorder_level
         UNION ALL
         SELECT 'Warehouses Utilized', ROUND(SUM(quantity) / SUM(capacity) * 100, 2) 
         FROM (SELECT warehouse_id, SUM(quantity) as quantity FROM stock_balance GROUP BY warehouse_id) sb
         JOIN warehouse w ON sb.warehouse_id = w.warehouse_id`
      )
      return results
    } catch (error) {
      throw error
    }
  }

  async getInventoryTurnaround(days = 90) {
    try {
      const [results] = await this.db.query(
        `SELECT 
         i.name as item_name,
         sb.quantity as current_stock,
         ROUND(SUM(mr.quantity_issued) / (? / 30), 2) as monthly_turnover,
         ROUND(sb.quantity / (SUM(mr.quantity_issued) / (? / 30)), 2) as days_on_hand
         FROM item i
         LEFT JOIN stock_balance sb ON i.item_code = sb.item_code
         LEFT JOIN material_request mr ON i.item_code = mr.item_code 
         AND mr.created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
         GROUP BY i.item_code, i.name, sb.quantity
         ORDER BY monthly_turnover DESC`,
        [days, days, days]
      )
      return results
    } catch (error) {
      throw error
    }
  }

  // ============= PRODUCTION ANALYTICS =============

  async getProductionAnalytics() {
    try {
      const [results] = await this.db.query(
        `SELECT 
         'Active Work Orders' as metric, COUNT(*) as value FROM work_order WHERE status IN ('approved', 'in_progress')
         UNION ALL
         SELECT 'Total Produced', SUM(quantity_produced) FROM production_entry
         UNION ALL
         SELECT 'Total Rejected', SUM(quantity_rejected) FROM production_entry
         UNION ALL
         SELECT 'Rejection Rate %', ROUND(SUM(quantity_rejected) / SUM(quantity_produced) * 100, 2) 
         FROM production_entry
         UNION ALL
         SELECT 'Machine Downtime Hours', SUM(downtime_hours) FROM maintenance_history
         WHERE maintenance_date >= DATE_SUB(NOW(), INTERVAL 30 DAY)`
      )
      return results
    } catch (error) {
      throw error
    }
  }

  // ============= QC & QUALITY ANALYTICS =============

  async getQCAnalytics() {
    try {
      const [results] = await this.db.query(
        `SELECT 
         'Total Inspections' as metric, COUNT(*) as value FROM inspection_result
         UNION ALL
         SELECT 'Passed', COUNT(*) FROM inspection_result WHERE result = 'pass'
         UNION ALL
         SELECT 'Failed', COUNT(*) FROM inspection_result WHERE result = 'fail'
         UNION ALL
         SELECT 'Open Complaints', COUNT(*) FROM customer_complaint WHERE status = 'open'
         UNION ALL
         SELECT 'CAPA Closure Rate %', ROUND(SUM(CASE WHEN status IN ('verified', 'completed') THEN 1 ELSE 0 END) / COUNT(*) * 100, 2)
         FROM capa_action`
      )
      return results
    } catch (error) {
      throw error
    }
  }

  // ============= FINANCIAL ANALYTICS =============

  async getFinancialAnalytics() {
    try {
      const [results] = await this.db.query(
        `SELECT 
         'Total Expenses' as metric, ROUND(SUM(amount), 2) as value FROM expense_master 
         WHERE created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
         UNION ALL
         SELECT 'Pending Payments', ROUND(SUM(amount), 2) FROM vendor_payment WHERE status = 'pending'
         UNION ALL
         SELECT 'Outstanding Customer Amount', ROUND(SUM(amount), 2) FROM customer_payment WHERE status IN ('pending', 'approved')
         UNION ALL
         SELECT 'Total Payroll (Month)', ROUND(SUM(gross_salary), 2) FROM payroll 
         WHERE payroll_date >= DATE_SUB(NOW(), INTERVAL 30 DAY)`
      )
      return results
    } catch (error) {
      throw error
    }
  }

  async getMonthlyRevenue(months = 12) {
    try {
      const [results] = await this.db.query(
        `SELECT 
         DATE_FORMAT(so.created_at, '%Y-%m') as month,
         ROUND(SUM(so.total_amount), 2) as revenue,
         COUNT(DISTINCT so.customer_id) as unique_customers,
         COUNT(DISTINCT so.so_id) as order_count
         FROM sales_order so
         WHERE so.created_at >= DATE_SUB(NOW(), INTERVAL ? MONTH)
         GROUP BY DATE_FORMAT(so.created_at, '%Y-%m')
         ORDER BY month DESC`,
        [months]
      )
      return results
    } catch (error) {
      throw error
    }
  }

  // ============= AUDIT LOG =============

  async getAuditLog(filters = {}) {
    try {
      let query = `SELECT al.*, u.email as user_email, u.full_name 
                   FROM audit_log al
                   LEFT JOIN users u ON al.user_id = u.user_id
                   WHERE 1=1`
      const params = []

      if (filters.user_id) {
        query += ' AND al.user_id = ?'
        params.push(filters.user_id)
      }
      if (filters.table_name) {
        query += ' AND al.table_name = ?'
        params.push(filters.table_name)
      }
      if (filters.date_from) {
        query += ' AND DATE(al.timestamp) >= ?'
        params.push(filters.date_from)
      }

      query += ' ORDER BY al.timestamp DESC LIMIT 1000'
      const [results] = await this.db.query(query, params)
      return results
    } catch (error) {
      throw error
    }
  }

  // ============= SYSTEM SETTINGS =============

  async getSystemSettings() {
    try {
      const [settings] = await this.db.query(
        'SELECT setting_id, setting_value, setting_type, description FROM system_settings WHERE is_active = TRUE'
      )
      return settings
    } catch (error) {
      throw error
    }
  }

  async updateSystemSetting(setting_id, setting_value) {
    try {
      const [result] = await this.db.query(
        'UPDATE system_settings SET setting_value = ? WHERE setting_id = ?',
        [setting_value, setting_id]
      )
      return result.affectedRows > 0
    } catch (error) {
      throw error
    }
  }

  // ============= ROLE MANAGEMENT =============

  async getRoles() {
    try {
      const [roles] = await this.db.query(
        'SELECT role_id, role_name, description, is_active FROM role_master ORDER BY role_name'
      )
      return roles
    } catch (error) {
      throw error
    }
  }

  async getPermissions(role_id) {
    try {
      const [permissions] = await this.db.query(
        'SELECT * FROM permission_matrix WHERE role_id = ? ORDER BY module, action',
        [role_id]
      )
      return permissions
    } catch (error) {
      throw error
    }
  }

  async updatePermission(permission_id, is_allowed) {
    try {
      const [result] = await this.db.query(
        'UPDATE permission_matrix SET is_allowed = ? WHERE permission_id = ?',
        [is_allowed, permission_id]
      )
      return result.affectedRows > 0
    } catch (error) {
      throw error
    }
  }
}

export default AdminAnalyticsModel