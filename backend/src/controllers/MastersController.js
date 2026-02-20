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
      if (!database) {
        return res.json({
          success: true,
          data: ['Production', 'Inventory', 'Manufacturing', 'Quality', 'Maintenance', 'Purchase', 'Admin'],
          message: 'Default departments'
        })
      }
      
      try {
        // Fetch from users
        const [userDepts] = await database.query(
          `SELECT DISTINCT department FROM users WHERE department IS NOT NULL`
        )
        
        // Fetch from employee_master
        const [employeeDepts] = await database.query(
          `SELECT DISTINCT department FROM employee_master WHERE department IS NOT NULL`
        )
        
        // Combine and unique
        const allDepts = new Set()
        
        userDepts.forEach(d => {
          if (d.department) allDepts.add(d.department)
        })
        
        employeeDepts.forEach(d => {
          if (d.department) allDepts.add(d.department)
        })
        
        // Fallback to common ones if empty
        if (allDepts.size === 0) {
          ['Production', 'Inventory', 'Manufacturing', 'Quality', 'Maintenance', 'Purchase', 'Admin'].forEach(d => allDepts.add(d))
        }
        
        const deptList = Array.from(allDepts).sort()
        
        res.json({
          success: true,
          data: deptList,
          message: 'Departments fetched successfully'
        })
      } catch (queryError) {
        console.error('[MastersController.getDepartments] Query error:', queryError.message)
        res.json({
          success: true,
          data: ['Production', 'Inventory', 'Manufacturing', 'Quality', 'Maintenance', 'Purchase', 'Admin'],
          message: 'Using default departments due to query error'
        })
      }
    } catch (error) {
      console.error('[MastersController.getDepartments] Unexpected error:', error.message)
      res.json({
        success: true,
        data: ['Production', 'Inventory', 'Manufacturing', 'Quality', 'Maintenance', 'Purchase', 'Admin'],
        message: 'Using default departments'
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

  static async getDetailedProjectAnalysis(req, res) {
    try {
      const { id } = req.params
      const database = MastersController.getDb()
      
      // 1. Fetch Sales Order Details
      const [orderRows] = await database.query(
        `SELECT sso.sales_order_id as id,
                CONCAT(sso.sales_order_id, ' - SO') as name,
                sso.status,
                sso.order_amount as revenue,
                COALESCE(DATEDIFF(sso.delivery_date, NOW()), 0) as daysLeft,
                sso.delivery_date as dueDate,
                sso.customer_id as customer,
                COALESCE(c.name, sso.customer_name) as customer_name,
                c.email as customer_email,
                c.phone as customer_phone,
                sso.created_at as order_date
         FROM selling_sales_order sso
         LEFT JOIN selling_customer c ON sso.customer_id = c.customer_id
         WHERE sso.sales_order_id = ? AND sso.deleted_at IS NULL`,
        [id]
      )
      
      if (!orderRows.length) {
        return res.status(404).json({ success: false, message: 'Project not found' })
      }
      
      const project = orderRows[0]
      
      // 2. Fetch Production Plan
      const [planRows] = await database.query(
        `SELECT * FROM production_plan WHERE sales_order_id = ?`,
        [id]
      )
      const productionPlan = planRows[0] || null
      
      // 3. Fetch Work Orders
      const [workOrders] = await database.query(
        `SELECT wo.*, i.name as item_name,
                COALESCE(
                  (SELECT accepted_quantity FROM job_card WHERE work_order_id = wo.wo_id ORDER BY operation_sequence DESC LIMIT 1),
                  (SELECT SUM(pe.quantity_produced) FROM production_entry pe WHERE pe.work_order_id = wo.wo_id),
                  0
                ) as produced_qty
         FROM work_order wo 
         LEFT JOIN item i ON wo.item_code = i.item_code
         WHERE wo.sales_order_id = ?
         ORDER BY 
           CASE WHEN wo.wo_id LIKE '%-SA-%' THEN 0 ELSE 1 END,
           wo.created_at ASC`,
        [id]
      )
      
      const woIds = workOrders.map(wo => wo.wo_id)
      let stages = []
      let entries = []
      let operations = []
      
      if (productionPlan) {
        const [planOps] = await database.query(
          `SELECT * FROM production_plan_operations WHERE plan_id = ?`,
          [productionPlan.plan_id]
        )
        operations = planOps
      }
      
      if (woIds.length > 0) {
        // 4. Fetch Job Cards (Stages)
        const [jobCards] = await database.query(
          `SELECT jc.*, wo.sales_order_id, wo.item_code, i.name as item_name
           FROM job_card jc
           JOIN work_order wo ON jc.work_order_id = wo.wo_id
           LEFT JOIN item i ON wo.item_code = i.item_code
           WHERE wo.sales_order_id = ?`,
          [id]
        )
        
        // Group by item and then by operation to get stages per item
        const stagesByItem = jobCards.reduce((acc, jc) => {
          const itemName = jc.item_name || jc.item_code || 'General';
          if (!acc[itemName]) acc[itemName] = {};
          
          const stageName = jc.operation || 'Unknown';
          if (!acc[itemName][stageName]) {
            acc[itemName][stageName] = {
              stage_name: stageName,
              planned_qty: 0,
              produced_qty: 0,
              accepted_qty: 0,
              rejected_qty: 0,
              scrap_qty: 0,
              status: 'pending',
              job_cards_count: 0,
              planned_time: 0,
              actual_time: 0,
              start_date: jc.actual_start_date || jc.scheduled_start_date,
              end_date: jc.actual_end_date || jc.scheduled_end_date,
              sequence: jc.operation_sequence || (Object.keys(acc[itemName]).length + 1)
            };
          }
          
          const stage = acc[itemName][stageName];
          stage.planned_qty += parseFloat(jc.planned_quantity || 0);
          stage.produced_qty += parseFloat(jc.produced_quantity || 0);
          stage.accepted_qty += parseFloat(jc.accepted_quantity || 0);
          stage.rejected_qty += parseFloat(jc.rejected_quantity || 0);
          stage.scrap_qty += parseFloat(jc.scrap_quantity || 0);
          stage.job_cards_count += 1;
          
          stage.planned_time = (stage.planned_time || 0) + parseFloat(jc.operation_time || 0);
          
          // Update dates to cover the whole range for the stage
          if (jc.actual_start_date || jc.scheduled_start_date) {
            const currentStart = new Date(jc.actual_start_date || jc.scheduled_start_date);
            if (!stage.start_date || currentStart < new Date(stage.start_date)) {
              stage.start_date = jc.actual_start_date || jc.scheduled_start_date;
            }
          }
          if (jc.actual_end_date || jc.scheduled_end_date) {
            const currentEnd = new Date(jc.actual_end_date || jc.scheduled_end_date);
            if (!stage.end_date || currentEnd > new Date(stage.end_date)) {
              stage.end_date = jc.actual_end_date || jc.scheduled_end_date;
            }
          }

          const jcStatus = (jc.status || '').toLowerCase().replace(/\s+/g, '-').trim();
          
          if (!stage.jcStatuses) stage.jcStatuses = [];
          stage.jcStatuses.push(jcStatus);

          // Determine aggregate status
          const hasInProgress = stage.jcStatuses.some(s => s === 'in-progress');
          const hasCompleted = stage.jcStatuses.some(s => s === 'completed');
          const hasPending = stage.jcStatuses.some(s => s === 'pending' || s === 'draft' || s === 'ready');
          const allCompleted = stage.jcStatuses.every(s => s === 'completed');

          if (hasInProgress || (hasCompleted && hasPending)) {
            stage.status = 'in_progress';
          } else if (allCompleted && stage.produced_qty >= stage.planned_qty) {
            stage.status = 'completed';
          } else if (hasCompleted || hasInProgress) {
            stage.status = 'in_progress';
          } else {
            stage.status = 'pending';
          }
          
          return acc;
        }, {});

        // Format stagesByItem into arrays
        const formattedStagesByItem = {};
        Object.keys(stagesByItem).forEach(item => {
          formattedStagesByItem[item] = Object.values(stagesByItem[item]).sort((a, b) => a.sequence - b.sequence);
        });

        // Maintain the global stages for backward compatibility
        const groupedStages = jobCards.reduce((acc, jc) => {
          const stageName = jc.operation || 'Unknown'
          if (!acc[stageName]) {
            acc[stageName] = {
              stage_name: stageName,
              planned_qty: 0,
              produced_qty: 0,
              accepted_qty: 0,
              rejected_qty: 0,
              scrap_qty: 0,
              status: 'pending',
              job_cards_count: 0,
              planned_time: 0,
              actual_time: 0,
              start_date: jc.actual_start_date || jc.scheduled_start_date,
              end_date: jc.actual_end_date || jc.scheduled_end_date,
              sequence: jc.operation_sequence || (Object.keys(acc).length + 1)
            }
          }
          const stage = acc[stageName]
          stage.planned_qty += parseFloat(jc.planned_quantity || 0)
          stage.produced_qty += parseFloat(jc.produced_quantity || 0)
          stage.accepted_qty += parseFloat(jc.accepted_quantity || 0)
          stage.rejected_qty += parseFloat(jc.rejected_quantity || 0)
          stage.scrap_qty += parseFloat(jc.scrap_quantity || 0)
          stage.job_cards_count += 1
          
          stage.planned_time = (stage.planned_time || 0) + parseFloat(jc.operation_time || 0)
          if (jc.actual_start_date && jc.actual_end_date) {
            const start = new Date(jc.actual_start_date)
            const end = new Date(jc.actual_end_date)
            stage.actual_time = (stage.actual_time || 0) + (end - start) / (1000 * 60 * 60)
          }

          // Update dates to cover the whole range for the stage
          if (jc.actual_start_date || jc.scheduled_start_date) {
            const currentStart = new Date(jc.actual_start_date || jc.scheduled_start_date);
            if (!stage.start_date || currentStart < new Date(stage.start_date)) {
              stage.start_date = jc.actual_start_date || jc.scheduled_start_date;
            }
          }
          if (jc.actual_end_date || jc.scheduled_end_date) {
            const currentEnd = new Date(jc.actual_end_date || jc.scheduled_end_date);
            if (!stage.end_date || currentEnd > new Date(stage.end_date)) {
              stage.end_date = jc.actual_end_date || jc.scheduled_end_date;
            }
          }
          
          const jcStatus = (jc.status || '').toLowerCase().replace(/\s+/g, '-').trim();
          
          if (!stage.jcStatuses) stage.jcStatuses = [];
          stage.jcStatuses.push(jcStatus);

          // Determine aggregate status
          const hasInProgress = stage.jcStatuses.some(s => s === 'in-progress');
          const hasCompleted = stage.jcStatuses.some(s => s === 'completed');
          const hasPending = stage.jcStatuses.some(s => s === 'pending' || s === 'draft' || s === 'ready');
          const allCompleted = stage.jcStatuses.every(s => s === 'completed');

          if (hasInProgress || (hasCompleted && hasPending)) {
            stage.status = 'in_progress';
          } else if (allCompleted && stage.produced_qty >= stage.planned_qty) {
            stage.status = 'completed';
          } else if (hasCompleted || hasInProgress) {
            stage.status = 'in_progress';
          } else {
            stage.status = 'pending';
          }
          
          return acc
        }, {})
        
        stages = Object.values(groupedStages).sort((a, b) => a.sequence - b.sequence)
        project.stagesByItem = formattedStagesByItem;
        
        // 4. Fetch Production Entries
        const [productionEntries] = await database.query(
          `SELECT pe.*, pe.entry_id as pe_id, wo.item_code, COALESCE(jc.operation, 'N/A') as operation
           FROM production_entry pe
           JOIN work_order wo ON pe.work_order_id = wo.wo_id
           LEFT JOIN job_card jc ON pe.job_card_id = jc.job_card_id
           WHERE wo.sales_order_id = ?`,
          [id]
        )
        entries = productionEntries

        // 4.5 Fetch Machine Analysis (Time Logs & Downtime)
        const [machineStats] = await database.query(
          `SELECT 
            jc.machine_id, 
            COALESCE(mm.name, w.workstation_name, jc.machine_id) as machine_name,
            (
              SELECT COALESCE(SUM(tl.time_in_minutes), 0)
              FROM time_log tl
              JOIN job_card jc2 ON tl.job_card_id = jc2.job_card_id
              JOIN work_order wo2 ON jc2.work_order_id = wo2.wo_id
              WHERE jc2.machine_id = jc.machine_id AND wo2.sales_order_id = ?
            ) as total_working_minutes,
            (
              SELECT COALESCE(SUM(de.duration_minutes), 0)
              FROM downtime_entry de
              JOIN job_card jc3 ON de.job_card_id = jc3.job_card_id
              JOIN work_order wo3 ON jc3.work_order_id = wo3.wo_id
              WHERE jc3.machine_id = jc.machine_id AND wo3.sales_order_id = ?
            ) as downtime_minutes
           FROM job_card jc
           JOIN work_order wo ON jc.work_order_id = wo.wo_id
           LEFT JOIN machine_master mm ON jc.machine_id = mm.machine_id
           LEFT JOIN workstation w ON jc.machine_id = w.name
           WHERE wo.sales_order_id = ? AND jc.machine_id IS NOT NULL
           GROUP BY jc.machine_id, mm.name, w.workstation_name`,
          [id, id, id]
        )
        
        project.machine_stats = machineStats.map(row => {
          const working_time = parseFloat(row.total_working_minutes || 0);
          const downtime = parseFloat(row.downtime_minutes || 0);
          return {
            machine_id: row.machine_id,
            machine_name: row.machine_name || row.machine_id || 'Manual / Unassigned',
            working_time,
            downtime,
            efficiency: (working_time + downtime) > 0 
              ? Math.round((working_time / (working_time + downtime)) * 100) 
              : 100
          };
        });

        // 4.6 Fetch Daily Production for Chart Data
        const [dailyProduction] = await database.query(
          `SELECT 
             DATE(pe.entry_date) as date,
             wo.item_code,
             i.name as item_name,
             SUM(pe.quantity_produced) as actual
           FROM production_entry pe
           JOIN work_order wo ON pe.work_order_id = wo.wo_id
           LEFT JOIN item i ON wo.item_code = i.item_code
           WHERE wo.sales_order_id = ?
           GROUP BY DATE(pe.entry_date), wo.item_code, i.name
           ORDER BY DATE(pe.entry_date) ASC`,
          [id]
        );

        // Group daily production by item for the chart
        const chartDataMap = dailyProduction.reduce((acc, row) => {
          const itemName = row.item_name || row.item_code || 'General';
          if (!acc[itemName]) acc[itemName] = [];
          
          acc[itemName].push({
            date: new Date(row.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }),
            actual: parseFloat(row.actual || 0),
            planned: 0 // Daily planned is not explicitly tracked per date, using 0
          });
          return acc;
        }, {});

        project.chartData = Object.keys(chartDataMap).map(name => ({
          name,
          data: chartDataMap[name]
        }));
      }
      
      // 5. Fetch Material Readiness (Aggregated from material_allocation)
      const [materials] = await database.query(
        `SELECT 
           ma.item_code, 
           ma.item_name, 
           SUM(COALESCE(ma.allocated_qty, 0)) as required_qty, 
           SUM(COALESCE(ma.consumed_qty, 0)) as consumed_qty, 
           MAX(ma.status) as status, 
           i.uom,
           (SELECT COALESCE(SUM(current_qty), 0) FROM stock_balance WHERE item_code = ma.item_code) as stock_qty
         FROM material_allocation ma
         JOIN work_order wo ON ma.work_order_id = wo.wo_id
         LEFT JOIN item i ON ma.item_code = i.item_code
         WHERE wo.sales_order_id = ?
         GROUP BY ma.item_code, ma.item_name, i.uom`,
        [id]
      )

      let finalMaterials = materials || []

      // If no materials are allocated yet, fallback to production plan raw materials
      if (finalMaterials.length === 0 && productionPlan) {
        const [planMaterials] = await database.query(
          `SELECT 
             rm.item_code, 
             rm.item_name, 
             SUM(COALESCE(rm.plan_to_request_qty, 0)) as required_qty, 
             0 as consumed_qty, 
             'Planned' as status, 
             i.uom,
             (SELECT COALESCE(SUM(current_qty), 0) FROM stock_balance WHERE item_code = rm.item_code) as stock_qty
           FROM production_plan_raw_material rm
           LEFT JOIN item i ON rm.item_code = i.item_code
           WHERE rm.plan_id = ?
           GROUP BY rm.item_code, rm.item_name, i.uom`,
          [productionPlan.plan_id]
        )
        finalMaterials = planMaterials
      }
      
      // 6. Calculate Global Metrics
      const totalPlannedTime = stages.reduce((acc, s) => acc + (parseFloat(s.planned_time) || 0), 0);
      const totalActualTime = stages.reduce((acc, s) => acc + (parseFloat(s.actual_time) || 0), 0);
      const efficiency = totalActualTime > 0 ? Math.round((totalPlannedTime / totalActualTime) * 100) : 100;

      // Calculate progress based on average completion of stages
      const totalPlannedQty = stages.reduce((acc, s) => acc + (parseFloat(s.planned_qty) || 0), 0);
      const totalProducedQty = stages.reduce((acc, s) => acc + (parseFloat(s.produced_qty) || 0), 0);
      
      let calculatedProgress = 0;
      if (stages.length > 0) {
        const stageProgresses = stages.map(s => Math.min(1, (parseFloat(s.produced_qty) || 0) / (parseFloat(s.planned_qty) || 1)));
        calculatedProgress = Math.round((stageProgresses.reduce((acc, p) => acc + p, 0) / stages.length) * 100);
      }

      // 7. For now, return what we have
      res.json({
        success: true,
        data: {
          project: {
            ...project,
            progress: project.status === 'delivered' ? 100 : 
                     project.status === 'dispatched' ? 100 :
                     project.status === 'complete' ? 100 :
                     Math.max(calculatedProgress, (project.status === 'production' ? 25 : 10)),
            efficiency: Math.min(100, Math.max(0, efficiency))
          },
          productionPlan,
          workOrders: workOrders || [],
          operations: operations || [],
          stages,
          entries,
          materials: finalMaterials,
          chartData: project.chartData || []
        },
        message: 'Detailed project analysis fetched successfully'
      })
    } catch (error) {
      console.error('[getDetailedProjectAnalysis] ERROR:', error)
      res.status(500).json({
        success: false,
        error: error.message
      })
    }
  }

  static async getSalesOrdersAsProjects(req, res) {
    try {
      const database = MastersController.getDb()
      
      const [[{ total }]] = await database.query(
        `SELECT COUNT(*) as total FROM selling_sales_order WHERE deleted_at IS NULL`
      )
      
      const [statusCounts] = await database.query(
        `SELECT status, COUNT(*) as count FROM selling_sales_order WHERE deleted_at IS NULL GROUP BY status`
      )
      
      const revenueThreshold = 100000;
      
      const [allProjects] = await database.query(
        `SELECT sso.sales_order_id as id, 
                CONCAT(sso.sales_order_id, ' - SO') as name, 
                sso.status, 
                sso.order_amount as revenue,
                COALESCE(DATEDIFF(sso.delivery_date, NOW()), 0) as daysLeft,
                sso.delivery_date as dueDate,
                sso.customer_id as customer,
                sso.customer_name,
                sso.created_at as order_date,
                COALESCE(sso.quantity, 0) as planned_qty,
                COALESCE(
                  (SELECT SUM(produced_qty) FROM (
                    SELECT 
                      COALESCE(
                        (SELECT accepted_quantity FROM job_card jc WHERE jc.work_order_id = wo.wo_id ORDER BY operation_sequence DESC LIMIT 1),
                        (SELECT SUM(pe.quantity_produced) FROM production_entry pe WHERE pe.work_order_id = wo.wo_id),
                        0
                      ) as produced_qty
                    FROM work_order wo
                    WHERE wo.sales_order_id = sso.sales_order_id
                  ) as inner_produced),
                  0
                ) as produced_qty,
                COALESCE(
                  (SELECT ROUND(SUM(produced_qty) / SUM(ordered_qty) * 100, 0)
                   FROM (
                     SELECT wo.quantity as ordered_qty, 
                            COALESCE(
                              (SELECT accepted_quantity FROM job_card jc WHERE jc.work_order_id = wo.wo_id ORDER BY operation_sequence DESC LIMIT 1),
                              (SELECT SUM(pe.quantity_produced) FROM production_entry pe WHERE pe.work_order_id = wo.wo_id),
                              0
                            ) as produced_qty
                     FROM work_order wo
                     WHERE wo.sales_order_id = sso.sales_order_id
                   ) as wo_progress
                   WHERE ordered_qty > 0),
                  CASE 
                    WHEN sso.status = 'delivered' THEN 100
                    WHEN sso.status = 'dispatched' THEN 75
                    WHEN sso.status = 'complete' THEN 75
                    WHEN sso.status = 'under_production' THEN 50
                    WHEN sso.status = 'confirmed' THEN 25
                    WHEN sso.status = 'draft' THEN 15
                    WHEN sso.status = 'on_hold' THEN 15
                    ELSE 0
                  END
                ) as progress,
                (SELECT COUNT(*) FROM work_order WHERE sales_order_id = sso.sales_order_id) as work_order_count,
                (SELECT COUNT(*) FROM job_card jc JOIN work_order wo ON jc.work_order_id = wo.wo_id WHERE wo.sales_order_id = sso.sales_order_id) as job_card_count,
                (SELECT COUNT(*) FROM job_card jc JOIN work_order wo ON jc.work_order_id = wo.wo_id WHERE wo.sales_order_id = sso.sales_order_id AND jc.status != 'completed') as pending_job_card_count,
                (SELECT COUNT(*) 
                 FROM material_request mr 
                 LEFT JOIN production_plan pp ON mr.production_plan_id = pp.plan_id 
                 WHERE (pp.sales_order_id = sso.sales_order_id 
                    OR mr.mr_id LIKE CONCAT('MR-', sso.sales_order_id, '%'))
                    AND mr.status NOT IN ('approved', 'cancelled')) as pending_material_request_count,
                (SELECT COUNT(*) 
                 FROM material_request mr 
                 LEFT JOIN production_plan pp ON mr.production_plan_id = pp.plan_id 
                 WHERE pp.sales_order_id = sso.sales_order_id 
                    OR mr.mr_id LIKE CONCAT('MR-', sso.sales_order_id, '%')) as material_request_count,
                CASE WHEN cust_rev.total_rev >= ? THEN 'Premium' ELSE 'Other' END as segment
         FROM selling_sales_order sso
         LEFT JOIN (
           SELECT customer_id, SUM(order_amount) as total_rev 
           FROM selling_sales_order 
           WHERE status != 'draft' AND deleted_at IS NULL
           GROUP BY customer_id
         ) cust_rev ON sso.customer_id = cust_rev.customer_id
         WHERE sso.deleted_at IS NULL
         ORDER BY sso.created_at DESC`,
        [revenueThreshold]
      )
      
      const segmentDistribution = [
        { name: 'Premium', value: allProjects.filter(p => p.segment === 'Premium').length, color: '#fbbf24' },
        { name: 'Other', value: allProjects.filter(p => p.segment === 'Other').length, color: '#3b82f6' }
      ]
      
      const [monthlyTimeline] = await database.query(
        `SELECT DATE_FORMAT(sso.created_at, '%Y-%m') as month_key,
                DATE_FORMAT(sso.created_at, '%b %Y') as month, 
                COUNT(*) as total_projects,
                SUM(CASE WHEN sso.status IN ('delivered', 'complete') THEN 1 ELSE 0 END) as completed,
                SUM(sso.order_amount) as revenue,
                SUM(CASE WHEN cust_rev.total_rev >= ? THEN 1 ELSE 0 END) as premium_projects,
                SUM(CASE WHEN cust_rev.total_rev < ? THEN 1 ELSE 0 END) as other_projects
         FROM selling_sales_order sso
         LEFT JOIN (
           SELECT customer_id, SUM(order_amount) as total_rev 
           FROM selling_sales_order 
           WHERE status != 'draft' AND deleted_at IS NULL
           GROUP BY customer_id
         ) cust_rev ON sso.customer_id = cust_rev.customer_id
         WHERE sso.deleted_at IS NULL AND sso.created_at >= DATE_SUB(NOW(), INTERVAL 6 MONTH)
         GROUP BY DATE_FORMAT(sso.created_at, '%Y-%m'), DATE_FORMAT(sso.created_at, '%b %Y')
         ORDER BY month_key DESC
         LIMIT 6`,
        [revenueThreshold, revenueThreshold]
      )
      
      const [[{ totalRevenue }]] = await database.query(
        `SELECT COALESCE(SUM(order_amount), 0) as totalRevenue FROM selling_sales_order WHERE deleted_at IS NULL`
      )
      
      const [[{ completionRate }]] = await database.query(
        `SELECT COALESCE(ROUND(SUM(CASE WHEN status IN ('delivered', 'complete') THEN 1 ELSE 0 END) / COUNT(*) * 100, 2), 0) as completionRate 
         FROM selling_sales_order WHERE deleted_at IS NULL`
      )

      // Calculate Trends (Current Month vs Last Month)
      const currentMonth = monthlyTimeline[0] || { total_projects: 0, revenue: 0, completed: 0 };
      const lastMonth = monthlyTimeline[1] || { total_projects: 0, revenue: 0, completed: 0 };
      
      const currCompletionRate = currentMonth.total_projects > 0 ? (currentMonth.completed / currentMonth.total_projects * 100) : 0;
      const lastCompletionRate = lastMonth.total_projects > 0 ? (lastMonth.completed / lastMonth.total_projects * 100) : 0;

      const currAtRisk = allProjects.filter(p => p.daysLeft < 3 && p.status !== 'delivered').length;
      // For prevAtRisk, it's hard to calculate without historical daysLeft, so we'll use a heuristic or just 0 for now
      // but let's try to be better: maybe count projects that were due within a month but not delivered
      const prevAtRisk = allProjects.filter(p => {
        const dueDate = new Date(p.dueDate);
        const lastMonthDate = new Date();
        lastMonthDate.setMonth(lastMonthDate.getMonth() - 1);
        return dueDate < lastMonthDate && !['delivered', 'complete'].includes(p.status);
      }).length;

      const trends = {
        projects: {
          trend: currentMonth.total_projects >= lastMonth.total_projects ? 'up' : 'down',
          percent: lastMonth.total_projects > 0 ? Math.round(Math.abs(currentMonth.total_projects - lastMonth.total_projects) / lastMonth.total_projects * 100) : (currentMonth.total_projects > 0 ? 100 : 0)
        },
        revenue: {
          trend: currentMonth.revenue >= lastMonth.revenue ? 'up' : 'down',
          percent: lastMonth.revenue > 0 ? Math.round(Math.abs(currentMonth.revenue - lastMonth.revenue) / lastMonth.revenue * 100) : (currentMonth.revenue > 0 ? 100 : 0)
        },
        completion: {
          trend: currCompletionRate >= lastCompletionRate ? 'up' : 'down',
          percent: lastCompletionRate > 0 ? Math.round(Math.abs(currCompletionRate - lastCompletionRate) / lastCompletionRate * 100) : (currCompletionRate > 0 ? 100 : 0)
        },
        atRisk: {
          trend: currAtRisk <= prevAtRisk ? 'down' : 'up',
          percent: prevAtRisk > 0 ? Math.round(Math.abs(currAtRisk - prevAtRisk) / prevAtRisk * 100) : (currAtRisk > 0 ? 100 : 0)
        }
      }
      
      res.json({
        success: true,
        data: {
          total: parseInt(total) || 0,
          totalRevenue: parseFloat(totalRevenue) || 0,
          completionRate: parseFloat(completionRate) || 0,
          statusCounts: statusCounts || [],
          segmentDistribution: segmentDistribution || [],
          projects: allProjects || [],
          monthlyTimeline: monthlyTimeline || [],
          trends
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

  static async getCustomerStatistics(req, res) {
    try {
      const database = MastersController.getDb()
      
      // 1. Overall Metrics
      const [[{ totalCustomers }]] = await database.query(
        `SELECT COUNT(*) as totalCustomers FROM selling_customer WHERE status = 'active'`
      )
      
      const [[{ totalRevenue }]] = await database.query(
        `SELECT COALESCE(SUM(order_amount), 0) as totalRevenue FROM selling_sales_order WHERE status != 'draft' AND deleted_at IS NULL`
      )

      // 2. Customer Segmentation (Premium vs Regular based on revenue threshold)
      const revenueThreshold = 100000; // 1 Lakh threshold for premium
      
      const [customers] = await database.query(
        `SELECT c.customer_id as id, c.name, c.created_at,
                COALESCE(SUM(sso.order_amount), 0) as revenue,
                COUNT(sso.sales_order_id) as orders,
                CASE WHEN SUM(sso.order_amount) >= ? THEN 'Premium' ELSE 'Regular' END as segment
         FROM selling_customer c
         LEFT JOIN selling_sales_order sso ON c.customer_id = sso.customer_id AND sso.status != 'draft' AND sso.deleted_at IS NULL
         WHERE c.status = 'active'
         GROUP BY c.customer_id, c.name, c.created_at
         ORDER BY revenue DESC`,
        [revenueThreshold]
      )

      const premiumCustomers = customers.filter(c => c.segment === 'Premium')
      const regularClients = customers.filter(c => c.segment === 'Regular')

      // 3. Monthly Revenue Trend for both segments
      const [monthlyTrend] = await database.query(
        `SELECT DATE_FORMAT(sso.created_at, '%b') as month,
                DATE_FORMAT(sso.created_at, '%Y-%m') as month_key,
                SUM(CASE WHEN c_rev.total_rev >= ? THEN sso.order_amount ELSE 0 END) as premium,
                SUM(CASE WHEN c_rev.total_rev < ? THEN sso.order_amount ELSE 0 END) as regular
         FROM selling_sales_order sso
         JOIN (
           SELECT customer_id, SUM(order_amount) as total_rev 
           FROM selling_sales_order 
           WHERE status != 'draft' AND deleted_at IS NULL
           GROUP BY customer_id
         ) c_rev ON sso.customer_id = c_rev.customer_id
         WHERE sso.created_at >= DATE_SUB(NOW(), INTERVAL 6 MONTH)
           AND sso.status != 'draft' AND sso.deleted_at IS NULL
         GROUP BY month_key, month
         ORDER BY month_key ASC`,
        [revenueThreshold, revenueThreshold]
      )

      // 4. Performance Metrics (Comparison)
      const comparison = [
        { 
          name: 'Premium', 
          orders: premiumCustomers.reduce((acc, c) => acc + c.orders, 0),
          avgValue: premiumCustomers.length > 0 ? (premiumCustomers.reduce((acc, c) => acc + (parseFloat(c.revenue) || 0), 0) / (premiumCustomers.reduce((acc, c) => acc + (parseInt(c.orders) || 0), 0) || 1)) : 0,
          color: '#fbbf24'
        },
        { 
          name: 'Regular', 
          orders: regularClients.reduce((acc, c) => acc + c.orders, 0),
          avgValue: regularClients.length > 0 ? (regularClients.reduce((acc, c) => acc + (parseFloat(c.revenue) || 0), 0) / (regularClients.reduce((acc, c) => acc + (parseInt(c.orders) || 0), 0) || 1)) : 0,
          color: '#3b82f6'
        }
      ]

      // 5. Radar Chart Data (Segment Capabilities Normalized 0-100)
      const avgRevPremium = premiumCustomers.length > 0 ? (premiumCustomers.reduce((acc, c) => acc + (parseFloat(c.revenue) || 0), 0) / premiumCustomers.length) : 1;
      const avgRevRegular = regularClients.length > 0 ? (regularClients.reduce((acc, c) => acc + (parseFloat(c.revenue) || 0), 0) / regularClients.length) : 0;
      
      const avgOrdersPremium = premiumCustomers.length > 0 ? (premiumCustomers.reduce((acc, c) => acc + (parseInt(c.orders) || 0), 0) / premiumCustomers.length) : 1;
      const avgOrdersRegular = regularClients.length > 0 ? (regularClients.reduce((acc, c) => acc + (parseInt(c.orders) || 0), 0) / regularClients.length) : 0;

      const retentionPremium = premiumCustomers.length > 0 ? (premiumCustomers.filter(c => c.orders > 1).length / premiumCustomers.length * 100) : 0;
      const retentionRegular = regularClients.length > 0 ? (regularClients.filter(c => c.orders > 1).length / regularClients.length * 100) : 0;

      // Calculate Growth (Last 3 months vs previous 3 months)
      const midPoint = Math.floor(monthlyTrend.length / 2);
      const prevQuarterPremium = monthlyTrend.slice(0, midPoint).reduce((acc, m) => acc + parseFloat(m.premium || 0), 0);
      const currQuarterPremium = monthlyTrend.slice(midPoint).reduce((acc, m) => acc + parseFloat(m.premium || 0), 0);
      const growthPremium = prevQuarterPremium > 0 ? Math.round(((currQuarterPremium - prevQuarterPremium) / prevQuarterPremium) * 100) : (currQuarterPremium > 0 ? 100 : 0);

      const prevQuarterRegular = monthlyTrend.slice(0, midPoint).reduce((acc, m) => acc + parseFloat(m.regular || 0), 0);
      const currQuarterRegular = monthlyTrend.slice(midPoint).reduce((acc, m) => acc + parseFloat(m.regular || 0), 0);
      const growthRegular = prevQuarterRegular > 0 ? Math.round(((currQuarterRegular - prevQuarterRegular) / prevQuarterRegular) * 100) : (currQuarterRegular > 0 ? 100 : 0);

      const capabilities = [
        { subject: 'Revenue', A: 100, B: Math.round((avgRevRegular / avgRevPremium) * 100) },
        { subject: 'Volume', A: 100, B: Math.round((avgOrdersRegular / avgOrdersPremium) * 100) },
        { subject: 'Retention', A: Math.round(retentionPremium), B: Math.round(retentionRegular) },
        { subject: 'Growth', A: Math.min(100, Math.max(0, growthPremium)), B: Math.min(100, Math.max(0, growthRegular)) },
        { subject: 'LTV', A: 100, B: Math.round((avgRevRegular / avgRevPremium) * 100) }
      ]

      // 6. Calculate Trends for KPIs
      const currentMonthData = monthlyTrend[monthlyTrend.length - 1] || { premium: 0, regular: 0, month_key: '' };
      const lastMonthData = monthlyTrend[monthlyTrend.length - 2] || { premium: 0, regular: 0, month_key: '' };
      
      const totalCurr = (parseFloat(currentMonthData.premium) || 0) + (parseFloat(currentMonthData.regular) || 0);
      const totalLast = (parseFloat(lastMonthData.premium) || 0) + (parseFloat(lastMonthData.regular) || 0);
      
      // Calculate customer growth
      const [[{ prevTotalCustomers }]] = await database.query(
        `SELECT COUNT(*) as prevTotalCustomers FROM selling_customer WHERE status = 'active' AND created_at < DATE_SUB(NOW(), INTERVAL 1 MONTH)`
      );

      // Calculate Premium Share Trends
      const oneMonthAgo = new Date();
      oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);

      const currentPremiumShare = totalCustomers > 0 ? (premiumCustomers.length / totalCustomers * 100) : 0;
      const prevPremiumShare = parseInt(prevTotalCustomers) > 0 ? (premiumCustomers.filter(c => new Date(c.created_at) < oneMonthAgo).length / parseInt(prevTotalCustomers) * 100) : 0;

      // Calculate LTV (Average Revenue per Customer)
      const currentLTV = totalCustomers > 0 ? (totalRevenue / totalCustomers) : 0;
      // For prev LTV, we'd need prev total revenue, which we can get from monthlyTrend excluding last month
      const prevTotalRevenue = monthlyTrend.slice(0, -1).reduce((acc, m) => acc + (parseFloat(m.premium) || 0) + (parseFloat(m.regular) || 0), 0);
      const prevLTV = parseInt(prevTotalCustomers) > 0 ? (prevTotalRevenue / parseInt(prevTotalCustomers)) : 0;

      const kpiTrends = {
        revenue: {
          trend: totalCurr >= totalLast ? 'up' : 'down',
          percent: totalLast > 0 ? Math.round(Math.abs(totalCurr - totalLast) / totalLast * 100) : (totalCurr > 0 ? 100 : 0)
        },
        customers: {
          trend: totalCustomers >= parseInt(prevTotalCustomers) ? 'up' : 'down',
          percent: parseInt(prevTotalCustomers) > 0 ? Math.round(Math.abs(totalCustomers - parseInt(prevTotalCustomers)) / parseInt(prevTotalCustomers) * 100) : (totalCustomers > 0 ? 100 : 0)
        },
        premiumShare: {
          trend: currentPremiumShare >= prevPremiumShare ? 'up' : 'down',
          percent: prevPremiumShare > 0 ? Math.round(Math.abs(currentPremiumShare - prevPremiumShare) / prevPremiumShare * 100) : (currentPremiumShare > 0 ? 100 : 0)
        },
        ltv: {
          trend: currentLTV >= prevLTV ? 'up' : 'down',
          percent: prevLTV > 0 ? Math.round(Math.abs(currentLTV - prevLTV) / prevLTV * 100) : (currentLTV > 0 ? 100 : 0)
        }
      }

      res.json({
        success: true,
        data: {
          totalCustomers: parseInt(totalCustomers) || 0,
          totalRevenue: parseFloat(totalRevenue) || 0,
          customers: {
            premium: premiumCustomers,
            regular: regularClients
          },
          trends: monthlyTrend || [],
          comparison: comparison,
          capabilities: capabilities,
          kpiTrends: kpiTrends
        }
      })
    } catch (error) {
      console.error('[getCustomerStatistics] ERROR:', error)
      res.status(500).json({
        success: false,
        error: error.message
      })
    }
  }

  static async getCustomerDetailedStats(req, res) {
    try {
      const { id } = req.params
      const database = MastersController.getDb()
      
      // 1. Customer profile and summary
      const [customerProfile] = await database.query(
        `SELECT customer_id as id, name, email, phone, status, created_at, gstin, billing_address, shipping_address
         FROM selling_customer WHERE customer_id = ?`,
        [id]
      );

      if (!customerProfile.length) {
        return res.status(404).json({ success: false, message: 'Customer not found' });
      }

      // 2. Customer Monthly Revenue and Order Trend
      const [monthlyTrend] = await database.query(
        `SELECT DATE_FORMAT(created_at, '%b') as month,
                SUM(order_amount) as revenue,
                COUNT(sales_order_id) as orders
         FROM selling_sales_order
         WHERE customer_id = ? 
           AND status != 'draft' 
           AND deleted_at IS NULL
           AND created_at >= DATE_SUB(NOW(), INTERVAL 6 MONTH)
         GROUP BY DATE_FORMAT(created_at, '%m'), DATE_FORMAT(created_at, '%b')
         ORDER BY DATE_FORMAT(created_at, '%m') ASC`,
        [id]
      )

      // 3. Recent Sales Orders for this customer
      const [recentOrders] = await database.query(
        `SELECT sales_order_id as id, customer_name as name, order_amount as amount, status, created_at as date
         FROM selling_sales_order
         WHERE customer_id = ? AND deleted_at IS NULL
         ORDER BY created_at DESC
         LIMIT 10`,
        [id]
      )

      // 4. Status Distribution
      const [statusDistribution] = await database.query(
        `SELECT status as name, COUNT(*) as value
         FROM selling_sales_order
         WHERE customer_id = ? AND deleted_at IS NULL
         GROUP BY status`,
        [id]
      )

      // 5. Calculate Top Items from all orders (parsing JSON)
      const [allItemsRows] = await database.query(
        `SELECT items FROM selling_sales_order WHERE customer_id = ? AND deleted_at IS NULL`,
        [id]
      )

      const itemStats = {}
      allItemsRows.forEach(row => {
        if (!row.items) return
        try {
          const items = typeof row.items === 'string' ? JSON.parse(row.items) : row.items
          if (Array.isArray(items)) {
            items.forEach(item => {
              const code = item.item_code || 'Unknown'
              const name = item.item_name || item.name || code
              const qty = parseFloat(item.qty || item.bom_qty || 0)
              const amount = parseFloat(item.amount || 0)

              if (!itemStats[code]) {
                itemStats[code] = { code, name, qty: 0, revenue: 0 }
              }
              itemStats[code].qty += qty
              itemStats[code].revenue += amount
            })
          }
        } catch (e) {
          console.warn('Error parsing items for customer stats:', e)
        }
      })

      const topItems = Object.values(itemStats)
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 5)

      res.json({
        success: true,
        data: {
          profile: customerProfile[0],
          trends: monthlyTrend || [],
          recentOrders: recentOrders || [],
          statusDistribution: statusDistribution || [],
          topItems: topItems || []
        }
      })
    } catch (error) {
      console.error('[getCustomerDetailedStats] ERROR:', error)
      res.status(500).json({
        success: false,
        error: error.message
      })
    }
  }
}

export default MastersController
