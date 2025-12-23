class MastersController {
  static getDb() {
    const db = global.db
    if (!db) {
      console.error('[MastersController] global.db is undefined!')
    }
    return db
  }

  static async getDepartments(req, res) {
    try {
      const database = this.getDb()
      const [departments] = await database.query(
        `SELECT DISTINCT department FROM users WHERE department IS NOT NULL ORDER BY department`
      )
      
      const deptList = departments.map(d => d.department).filter(Boolean)
      
      res.json({
        success: true,
        data: deptList,
        message: 'Departments fetched successfully'
      })
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message
      })
    }
  }

  static async getUsersByDepartment(req, res) {
    try {
      const { department } = req.params
      const database = this.getDb()
      
      const [users] = await database.query(
        `SELECT user_id, email, full_name, department, role, is_active 
         FROM users 
         WHERE department = ? AND is_active = TRUE
         ORDER BY full_name`,
        [department]
      )
      
      res.json({
        success: true,
        data: users,
        message: 'Users fetched successfully'
      })
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message
      })
    }
  }

  static async getWarehousesByDepartment(req, res) {
    try {
      const { department } = req.params
      const database = this.getDb()
      
      const [warehouses] = await database.query(
        `SELECT * FROM warehouses 
         WHERE (department = ? OR department = 'all') AND is_active = TRUE
         ORDER BY warehouse_code`,
        [department]
      )
      
      res.json({
        success: true,
        data: warehouses,
        message: 'Warehouses fetched successfully'
      })
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message
      })
    }
  }

  static async getMachines(req, res) {
    try {
      const database = this.getDb()
      const [machines] = await database.query(
        `SELECT machine_id, name, type, model, capacity, status 
         FROM machine_master 
         WHERE status = 'active'
         ORDER BY name`
      )
      
      res.json({
        success: true,
        data: machines || [],
        message: 'Machines fetched successfully'
      })
    } catch (error) {
      res.json({
        success: true,
        data: [],
        message: 'Machine data not yet configured'
      })
    }
  }

  static async getOperators(req, res) {
    try {
      const database = this.getDb()
      const [operators] = await database.query(
        `SELECT operator_id, name, experience_years, status 
         FROM operator_master 
         WHERE status = 'active'
         ORDER BY name`
      )
      
      res.json({
        success: true,
        data: operators || [],
        message: 'Operators fetched successfully'
      })
    } catch (error) {
      res.json({
        success: true,
        data: [],
        message: 'Operator data not yet configured'
      })
    }
  }

  static async getTools(req, res) {
    try {
      const database = this.getDb()
      const [tools] = await database.query(
        `SELECT tool_id, name, tool_type, location, status 
         FROM tool_master 
         WHERE status = 'active'
         ORDER BY name`
      )
      
      res.json({
        success: true,
        data: tools || [],
        message: 'Tools fetched successfully'
      })
    } catch (error) {
      res.json({
        success: true,
        data: [],
        message: 'Tool data not yet configured'
      })
    }
  }

  static async getInspectionChecklists(req, res) {
    try {
      const database = this.getDb()
      const [checklists] = await database.query(
        `SELECT checklist_id, name, inspection_type, parameters 
         FROM inspection_checklist 
         ORDER BY name`
      )
      
      res.json({
        success: true,
        data: checklists || [],
        message: 'Inspection checklists fetched successfully'
      })
    } catch (error) {
      res.json({
        success: true,
        data: [],
        message: 'Inspection checklist data not yet configured'
      })
    }
  }

  static async getSystemStats(req, res) {
    try {
      const database = this.getDb()
      
      const [[{ userCount }]] = await database.query(`SELECT COUNT(*) as userCount FROM users WHERE is_active = TRUE`)
      const [[{ warehouseCount }]] = await database.query(`SELECT COUNT(*) as warehouseCount FROM warehouses WHERE is_active = TRUE`)
      const [[{ itemCount }]] = await database.query(`SELECT COUNT(*) as itemCount FROM item`)
      
      res.json({
        success: true,
        data: {
          users: parseInt(userCount) || 0,
          warehouses: parseInt(warehouseCount) || 0,
          items: parseInt(itemCount) || 0
        },
        message: 'System stats fetched successfully'
      })
    } catch (error) {
      res.json({
        success: true,
        data: {
          users: 0,
          warehouses: 0,
          items: 0
        },
        message: 'Stats temporarily unavailable'
      })
    }
  }

  static async getMachineStats(req, res) {
    try {
      const database = this.getDb()
      
      const [[{ totalMachines }]] = await database.query(
        `SELECT COUNT(*) as totalMachines FROM machine_master WHERE status != 'retired'`
      )
      const [[{ operational }]] = await database.query(
        `SELECT COUNT(*) as operational FROM machine_master WHERE status = 'active'`
      )
      const [[{ maintenance }]] = await database.query(
        `SELECT COUNT(*) as maintenance FROM machine_master WHERE status = 'maintenance'`
      )
      
      const [machines] = await database.query(
        `SELECT machine_id as id, name, status, 
                DATEDIFF(NOW(), last_maintenance_date) as days_since_maintenance
         FROM machine_master WHERE status != 'retired' ORDER BY name`
      )
      
      res.json({
        success: true,
        data: {
          total: parseInt(totalMachines) || 0,
          operational: parseInt(operational) || 0,
          maintenance: parseInt(maintenance) || 0,
          machines: machines || []
        },
        message: 'Machine stats fetched successfully'
      })
    } catch (error) {
      res.json({
        success: true,
        data: { total: 0, operational: 0, maintenance: 0, machines: [] },
        message: 'Machine stats not available'
      })
    }
  }

  static async getProjectStats(req, res) {
    try {
      const database = this.getDb()
      
      const [[{ totalProjects }]] = await database.query(
        `SELECT COUNT(DISTINCT wo_id) as totalProjects FROM work_order`
      )
      const [[{ running }]] = await database.query(
        `SELECT COUNT(DISTINCT wo_id) as running FROM work_order WHERE status IN ('approved', 'in_progress')`
      )
      const [[{ completed }]] = await database.query(
        `SELECT COUNT(DISTINCT wo_id) as completed FROM work_order WHERE status = 'completed'`
      )
      
      const [runningProjects] = await database.query(
        `SELECT wo_id as id, so_id as name, status, 
                quantity, DATEDIFF(required_date, NOW()) as days_left,
                ROUND((SELECT SUM(quantity_produced) FROM production_entry 
                       WHERE work_order_id = wo_id) / quantity * 100, 0) as progress
         FROM work_order 
         WHERE status IN ('approved', 'in_progress')
         ORDER BY required_date ASC
         LIMIT 10`
      )
      
      res.json({
        success: true,
        data: {
          total: parseInt(totalProjects) || 0,
          running: parseInt(running) || 0,
          completed: parseInt(completed) || 0,
          projects: runningProjects || []
        },
        message: 'Project stats fetched successfully'
      })
    } catch (error) {
      res.json({
        success: true,
        data: { total: 0, running: 0, completed: 0, projects: [] },
        message: 'Project stats not available'
      })
    }
  }

  static async getProductionReports(req, res) {
    try {
      const database = this.getDb()
      const { period = 'daily' } = req.query
      
      let dateGroup = '%Y-%m-%d'
      let daysBack = 1
      
      if (period === 'weekly') {
        dateGroup = '%Y-%u'
        daysBack = 7
      } else if (period === 'monthly') {
        dateGroup = '%Y-%m'
        daysBack = 30
      } else if (period === 'yearly') {
        dateGroup = '%Y-%m'
        daysBack = 365
      }
      
      const [productionData] = await database.query(
        `SELECT DATE_FORMAT(entry_date, ?) as period,
                SUM(quantity_produced) as produced,
                SUM(quantity_rejected) as rejected,
                SUM(hours_worked) as hours,
                COUNT(DISTINCT machine_id) as machines_used
         FROM production_entry
         WHERE entry_date >= DATE_SUB(NOW(), INTERVAL ? DAY)
         GROUP BY DATE_FORMAT(entry_date, ?)
         ORDER BY entry_date DESC`,
        [dateGroup, daysBack, dateGroup]
      )
      
      const [[{ totalProduced }]] = await database.query(
        `SELECT SUM(quantity_produced) as totalProduced FROM production_entry
         WHERE entry_date >= DATE_SUB(NOW(), INTERVAL ? DAY)`,
        [daysBack]
      )
      
      const [[{ totalRejected }]] = await database.query(
        `SELECT SUM(quantity_rejected) as totalRejected FROM production_entry
         WHERE entry_date >= DATE_SUB(NOW(), INTERVAL ? DAY)`,
        [daysBack]
      )
      
      const qualityScore = totalProduced > 0 
        ? Math.round((totalProduced - totalRejected) / totalProduced * 100) 
        : 0
      
      res.json({
        success: true,
        data: {
          period,
          totalProduced: parseInt(totalProduced) || 0,
          totalRejected: parseInt(totalRejected) || 0,
          qualityScore,
          reports: productionData || []
        },
        message: 'Production reports fetched successfully'
      })
    } catch (error) {
      res.json({
        success: true,
        data: { period: 'daily', totalProduced: 0, totalRejected: 0, qualityScore: 0, reports: [] },
        message: 'Production reports not available'
      })
    }
  }

  static async getProjectAnalysis(req, res) {
    try {
      const database = this.getDb()
      
      const [[{ total }]] = await database.query(
        `SELECT COUNT(DISTINCT wo_id) as total FROM work_order`
      )
      
      const [statusCounts] = await database.query(
        `SELECT status, COUNT(*) as count FROM work_order GROUP BY status`
      )
      
      const [allProjects] = await database.query(
        `SELECT wo_id as id, so_id as name, status, quantity,
                DATEDIFF(required_date, NOW()) as daysLeft,
                COALESCE(ROUND((SELECT SUM(quantity_produced) FROM production_entry 
                       WHERE work_order_id = wo_id) / quantity * 100, 0), 0) as progress
         FROM work_order 
         ORDER BY required_date ASC`
      )
      
      const [monthlyTimeline] = await database.query(
        `SELECT DATE_FORMAT(order_date, '%b') as month, 
                COUNT(*) as total_projects,
                SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed
         FROM work_order
         WHERE order_date >= DATE_SUB(NOW(), INTERVAL 6 MONTH)
         GROUP BY DATE_FORMAT(order_date, '%Y-%m')
         ORDER BY order_date DESC
         LIMIT 6`
      )
      
      res.json({
        success: true,
        data: {
          total: parseInt(total) || 0,
          statusCounts: statusCounts || [],
          projects: allProjects || [],
          monthlyTimeline: monthlyTimeline || []
        },
        message: 'Project analysis fetched successfully'
      })
    } catch (error) {
      res.json({
        success: true,
        data: { total: 0, statusCounts: [], projects: [], monthlyTimeline: [] },
        message: 'Project analysis not available'
      })
    }
  }

  static async getSalesOrdersAsProjects(req, res) {
    try {
      const database = MastersController.getDb()
      console.log('[getSalesOrdersAsProjects] Database instance:', !!database)
      
      const [[{ total }]] = await database.query(
        `SELECT COUNT(*) as total FROM selling_sales_order WHERE deleted_at IS NULL`
      )
      console.log('[getSalesOrdersAsProjects] Total:', total)
      
      const [statusCounts] = await database.query(
        `SELECT status, COUNT(*) as count FROM selling_sales_order WHERE deleted_at IS NULL GROUP BY status`
      )
      console.log('[getSalesOrdersAsProjects] StatusCounts:', statusCounts)
      
      const [allProjects] = await database.query(
        `SELECT sales_order_id as id, 
                CONCAT(sales_order_id, ' - SO') as name, 
                status, 
                order_amount as revenue,
                COALESCE(DATEDIFF(delivery_date, NOW()), 0) as daysLeft,
                delivery_date as dueDate,
                customer_id as customer,
                customer_name,
                created_at as order_date,
                CASE 
                  WHEN status = 'delivered' THEN 100
                  WHEN status = 'dispatched' THEN 75
                  WHEN status = 'complete' THEN 75
                  WHEN status = 'production' THEN 50
                  WHEN status = 'draft' THEN 25
                  WHEN status = 'on_hold' THEN 25
                  ELSE 0
                END as progress
         FROM selling_sales_order
         WHERE deleted_at IS NULL
         ORDER BY created_at DESC`
      )
      console.log('[getSalesOrdersAsProjects] Projects:', allProjects?.length || 0)
      
      const [monthlyTimeline] = await database.query(
        `SELECT DATE_FORMAT(created_at, '%Y-%m') as month_key,
                DATE_FORMAT(created_at, '%b %Y') as month, 
                COUNT(*) as total_projects,
                SUM(CASE WHEN status IN ('delivered', 'complete') THEN 1 ELSE 0 END) as completed,
                SUM(order_amount) as revenue
         FROM selling_sales_order
         WHERE deleted_at IS NULL AND created_at >= DATE_SUB(NOW(), INTERVAL 6 MONTH)
         GROUP BY DATE_FORMAT(created_at, '%Y-%m'), DATE_FORMAT(created_at, '%b %Y')
         ORDER BY month_key DESC
         LIMIT 6`
      )
      console.log('[getSalesOrdersAsProjects] Timeline:', monthlyTimeline?.length || 0)
      
      const [[{ totalRevenue }]] = await database.query(
        `SELECT COALESCE(SUM(order_amount), 0) as totalRevenue FROM selling_sales_order WHERE deleted_at IS NULL`
      )
      
      const [[{ completionRate }]] = await database.query(
        `SELECT COALESCE(ROUND(SUM(CASE WHEN status IN ('delivered', 'complete') THEN 1 ELSE 0 END) / COUNT(*) * 100, 2), 0) as completionRate 
         FROM selling_sales_order WHERE deleted_at IS NULL`
      )
      
      res.json({
        success: true,
        data: {
          total: parseInt(total) || 0,
          totalRevenue: parseFloat(totalRevenue) || 0,
          completionRate: parseFloat(completionRate) || 0,
          statusCounts: statusCounts || [],
          projects: allProjects || [],
          monthlyTimeline: monthlyTimeline || []
        },
        message: 'Sales orders as projects fetched successfully'
      })
    } catch (error) {
      console.error('[getSalesOrdersAsProjects] ERROR:', error.message, error.stack)
      res.json({
        success: true,
        data: { total: 0, totalRevenue: 0, completionRate: 0, statusCounts: [], projects: [], monthlyTimeline: [] },
        message: 'Sales orders analysis not available'
      })
    }
  }
}

export default MastersController
