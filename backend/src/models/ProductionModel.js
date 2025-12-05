class ProductionModel {
  constructor(db) {
    this.db = db
  }

  // ============= OPERATIONS =============

  async createOperation(data) {
    try {
      await this.db.query(
        `INSERT INTO operation (name, operation_name, default_workstation, is_corrective_operation, create_job_card_based_on_batch_size, batch_size, quality_inspection_template, description)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [data.name, data.operation_name, data.default_workstation, data.is_corrective_operation, 
         data.create_job_card_based_on_batch_size, data.batch_size, data.quality_inspection_template, data.description]
      )
      return data
    } catch (error) {
      throw error
    }
  }

  async getOperations() {
    try {
      const [operations] = await this.db.query('SELECT * FROM operation')
      return operations
    } catch (error) {
      throw error
    }
  }

  async getOperationById(operation_id) {
    try {
      const [operations] = await this.db.query('SELECT * FROM operation WHERE name = ?', [operation_id])
      return operations[0] || null
    } catch (error) {
      throw error
    }
  }

  async updateOperation(operation_id, data) {
    try {
      const fields = []
      const values = []

      if (data.operation_name) { fields.push('operation_name = ?'); values.push(data.operation_name) }
      if (data.default_workstation) { fields.push('default_workstation = ?'); values.push(data.default_workstation) }
      if (data.is_corrective_operation !== undefined) { fields.push('is_corrective_operation = ?'); values.push(data.is_corrective_operation) }
      if (data.create_job_card_based_on_batch_size !== undefined) { fields.push('create_job_card_based_on_batch_size = ?'); values.push(data.create_job_card_based_on_batch_size) }
      if (data.batch_size) { fields.push('batch_size = ?'); values.push(data.batch_size) }
      if (data.quality_inspection_template) { fields.push('quality_inspection_template = ?'); values.push(data.quality_inspection_template) }
      if (data.description) { fields.push('description = ?'); values.push(data.description) }

      if (fields.length === 0) return false

      values.push(operation_id)
      const query = `UPDATE operation SET ${fields.join(', ')} WHERE name = ?`
      await this.db.query(query, values)

      return true
    } catch (error) {
      throw error
    }
  }

  async deleteOperation(operation_id) {
    try {
      await this.db.query('DELETE FROM operation WHERE name = ?', [operation_id])
      return true
    } catch (error) {
      throw error
    }
  }

  async addSubOperation(operation_id, subOp) {
    try {
      await this.db.query(
        `INSERT INTO sub_operation (operation_id, operation_no, sub_operation_code, op_time)
         VALUES (?, ?, ?, ?)`,
        [operation_id, subOp.no, subOp.operation, subOp.operation_time]
      )
    } catch (error) {
      throw error
    }
  }

  async deleteSubOperations(operation_id) {
    try {
      await this.db.query('DELETE FROM sub_operation WHERE operation_id = ?', [operation_id])
    } catch (error) {
      throw error
    }
  }

  // ============= WORK ORDERS =============

  async createWorkOrder(data) {
    try {
      await this.db.query(
        `INSERT INTO work_order (wo_id, item_code, bom_no, quantity, priority, notes, planned_start_date, planned_end_date, actual_start_date, actual_end_date, expected_delivery_date, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [data.wo_id, data.item_code, data.bom_no, data.quantity, data.priority, data.notes, 
         data.planned_start_date || null, data.planned_end_date || null, data.actual_start_date || null, data.actual_end_date || null, data.expected_delivery_date || null, data.status]
      )
      return { wo_id: data.wo_id, ...data }
    } catch (error) {
      throw error
    }
  }

  async getWorkOrders(filters = {}) {
    try {
      let query = 'SELECT * FROM work_order WHERE 1=1'
      const params = []

      if (filters.status) {
        query += ' AND status = ?'
        params.push(filters.status)
      }
      if (filters.search) {
        query += ' AND (wo_id LIKE ? OR item_code LIKE ?)'
        params.push(`%${filters.search}%`, `%${filters.search}%`)
      }
      if (filters.assigned_to_id) {
        query += ' AND assigned_to_id = ?'
        params.push(filters.assigned_to_id)
      }

      const [workOrders] = await this.db.query(query, params)
      return workOrders
    } catch (error) {
      throw error
    }
  }

  async getWorkOrderById(wo_id) {
    try {
      const [workOrders] = await this.db.query('SELECT * FROM work_order WHERE wo_id = ?', [wo_id])
      return workOrders && workOrders.length > 0 ? workOrders[0] : null
    } catch (error) {
      throw error
    }
  }

  async updateWorkOrder(wo_id, data) {
    try {
      const fields = []
      const values = []

      if (data.item_code) { fields.push('item_code = ?'); values.push(data.item_code) }
      if (data.bom_no) { fields.push('bom_no = ?'); values.push(data.bom_no) }
      if (data.quantity) { fields.push('quantity = ?'); values.push(data.quantity) }
      if (data.status) { fields.push('status = ?'); values.push(data.status) }
      if (data.priority) { fields.push('priority = ?'); values.push(data.priority) }
      if (data.notes) { fields.push('notes = ?'); values.push(data.notes) }
      if (data.planned_start_date) { fields.push('planned_start_date = ?'); values.push(data.planned_start_date) }
      if (data.planned_end_date) { fields.push('planned_end_date = ?'); values.push(data.planned_end_date) }
      if (data.actual_start_date) { fields.push('actual_start_date = ?'); values.push(data.actual_start_date) }
      if (data.actual_end_date) { fields.push('actual_end_date = ?'); values.push(data.actual_end_date) }
      if (data.expected_delivery_date) { fields.push('expected_delivery_date = ?'); values.push(data.expected_delivery_date) }

      if (fields.length === 0) return false

      values.push(wo_id)
      const query = `UPDATE work_order SET ${fields.join(', ')} WHERE wo_id = ?`
      await this.db.query(query, values)

      return true
    } catch (error) {
      throw error
    }
  }

  async deleteWorkOrder(wo_id) {
    try {
      await this.db.query('DELETE FROM work_order WHERE wo_id = ?', [wo_id])
      return true
    } catch (error) {
      throw error
    }
  }

  async addWorkOrderItem(wo_id, item) {
    try {
      await this.db.query(
        `INSERT INTO work_order_item (wo_id, item_code, source_warehouse, required_qty, transferred_qty, consumed_qty, returned_qty, sequence)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [wo_id, item.item_code, item.source_warehouse, item.required_qty || item.required_quantity, 
         item.transferred_qty || 0, item.consumed_qty || 0, item.returned_qty || 0, item.sequence]
      )
    } catch (error) {
      throw error
    }
  }

  async deleteAllWorkOrderItems(wo_id) {
    try {
      await this.db.query('DELETE FROM work_order_item WHERE wo_id = ?', [wo_id])
      return true
    } catch (error) {
      throw error
    }
  }

  async addWorkOrderOperation(wo_id, operation) {
    try {
      await this.db.query(
        `INSERT INTO work_order_operation (wo_id, operation, workstation, time, completed_qty, process_loss_qty, sequence)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [wo_id, operation.operation, operation.workstation, operation.time, 
         operation.completed_qty || 0, operation.process_loss_qty || 0, operation.sequence]
      )
    } catch (error) {
      throw error
    }
  }

  async deleteAllWorkOrderOperations(wo_id) {
    try {
      await this.db.query('DELETE FROM work_order_operation WHERE wo_id = ?', [wo_id])
      return true
    } catch (error) {
      throw error
    }
  }

  // ============= PRODUCTION PLANS =============

  async createProductionPlan(data) {
    try {
      const plan_id = `PLAN-${Date.now()}`
      await this.db.query(
        `INSERT INTO production_plan (plan_id, plan_date, week_number, planned_by_id, status)
         VALUES (?, ?, ?, ?, ?)`,
        [plan_id, data.plan_date, data.week_number, data.planned_by_id, 'draft']
      )
      return { plan_id, ...data }
    } catch (error) {
      throw error
    }
  }

  async getProductionPlans(filters = {}) {
    try {
      let query = 'SELECT * FROM production_plan WHERE 1=1'
      const params = []

      if (filters.status) {
        query += ' AND status = ?'
        params.push(filters.status)
      }
      if (filters.week_number) {
        query += ' AND week_number = ?'
        params.push(filters.week_number)
      }

      const [plans] = await this.db.query(query, params)
      return plans
    } catch (error) {
      throw error
    }
  }

  async getProductionPlanDetails(plan_id) {
    try {
      const [plans] = await this.db.query('SELECT * FROM production_plan WHERE plan_id = ?', [plan_id])
      return plans[0] || null
    } catch (error) {
      throw error
    }
  }

  async updateProductionPlan(plan_id, data) {
    try {
      const fields = []
      const values = []

      if (data.plan_date) { fields.push('plan_date = ?'); values.push(data.plan_date) }
      if (data.week_number) { fields.push('week_number = ?'); values.push(data.week_number) }
      if (data.status) { fields.push('status = ?'); values.push(data.status) }

      if (fields.length === 0) return false

      values.push(plan_id)
      const query = `UPDATE production_plan SET ${fields.join(', ')} WHERE plan_id = ?`
      await this.db.query(query, values)

      return true
    } catch (error) {
      throw error
    }
  }

  async deleteProductionPlan(plan_id) {
    try {
      await this.db.query('DELETE FROM production_plan WHERE plan_id = ?', [plan_id])
      return true
    } catch (error) {
      throw error
    }
  }

  async addPlanItem(plan_id, item) {
    try {
      await this.db.query(
        `INSERT INTO production_plan_item (plan_id, item_code, quantity, planned_date)
         VALUES (?, ?, ?, ?)`,
        [plan_id, item.item_code, item.quantity, item.planned_date]
      )
    } catch (error) {
      throw error
    }
  }

  // ============= PRODUCTION ENTRIES =============

  async createProductionEntry(data) {
    try {
      const entry_id = `ENTRY-${Date.now()}`
      await this.db.query(
        `INSERT INTO production_entry (entry_id, work_order_id, machine_id, operator_id, entry_date, shift_no, quantity_produced, quantity_rejected, hours_worked, remarks)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [entry_id, data.work_order_id, data.machine_id, data.operator_id, data.entry_date, data.shift_no, 
         data.quantity_produced, data.quantity_rejected, data.hours_worked, data.remarks]
      )
      return { entry_id, ...data }
    } catch (error) {
      throw error
    }
  }

  async getProductionEntries(filters = {}) {
    try {
      let query = 'SELECT * FROM production_entry WHERE 1=1'
      const params = []

      if (filters.entry_date) {
        query += ' AND DATE(entry_date) = ?'
        params.push(filters.entry_date)
      }
      if (filters.machine_id) {
        query += ' AND machine_id = ?'
        params.push(filters.machine_id)
      }
      if (filters.work_order_id) {
        query += ' AND work_order_id = ?'
        params.push(filters.work_order_id)
      }

      const [entries] = await this.db.query(query, params)
      return entries
    } catch (error) {
      throw error
    }
  }

  // ============= REJECTIONS =============

  async recordRejection(data) {
    try {
      const rejection_id = `REJ-${Date.now()}`
      await this.db.query(
        `INSERT INTO rejection (rejection_id, production_entry_id, rejection_reason, rejection_count, root_cause, corrective_action, reported_by_id)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [rejection_id, data.production_entry_id, data.rejection_reason, data.rejection_count, 
         data.root_cause, data.corrective_action, data.reported_by_id]
      )
      return { rejection_id, ...data }
    } catch (error) {
      throw error
    }
  }

  async getRejectionAnalysis(filters = {}) {
    try {
      let query = `SELECT rejection_reason, COUNT(*) as count, SUM(rejection_count) as total_rejected 
                   FROM rejection WHERE 1=1`
      const params = []

      if (filters.date_from) {
        query += ' AND DATE(created_at) >= ?'
        params.push(filters.date_from)
      }
      if (filters.date_to) {
        query += ' AND DATE(created_at) <= ?'
        params.push(filters.date_to)
      }

      query += ' GROUP BY rejection_reason'
      const [results] = await this.db.query(query, params)
      return results
    } catch (error) {
      throw error
    }
  }

  // ============= MACHINES =============

  async getMachines(filters = {}) {
    try {
      let query = 'SELECT * FROM machine_master WHERE 1=1'
      const params = []

      if (filters.search) {
        query += ' AND (machine_id LIKE ? OR name LIKE ?)'
        params.push(`%${filters.search}%`, `%${filters.search}%`)
      }

      const [machines] = await this.db.query(query, params)
      return machines
    } catch (error) {
      throw error
    }
  }

  async createMachine(data) {
    try {
      const machine_id = `MACH-${Date.now()}`
      await this.db.query(
        `INSERT INTO machine_master (machine_id, name, type, model, capacity, status, purchase_date, cost, maintenance_interval, last_maintenance_date)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [machine_id, data.name, data.type, data.model, data.capacity, data.status || 'active', data.purchase_date, data.cost, data.maintenance_interval, data.last_maintenance_date]
      )
      return { machine_id, ...data }
    } catch (error) {
      throw error
    }
  }

  // ============= OPERATORS =============

  async getOperators(filters = {}) {
    try {
      let query = 'SELECT * FROM operator_master WHERE 1=1'
      const params = []

      if (filters.search) {
        query += ' AND (operator_id LIKE ? OR name LIKE ?)'
        params.push(`%${filters.search}%`, `%${filters.search}%`)
      }

      const [operators] = await this.db.query(query, params)
      return operators
    } catch (error) {
      throw error
    }
  }

  async createOperator(data) {
    try {
      const operator_id = `OP-${Date.now()}`
      await this.db.query(
        `INSERT INTO operator_master (operator_id, employee_id, name, qualification, experience_years, machines_skilled_on, status)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [operator_id, data.employee_id, data.name, data.qualification, data.experience_years, data.machines_skilled_on, data.status || 'active']
      )
      return { operator_id, ...data }
    } catch (error) {
      throw error
    }
  }

  // ============= BOMs =============

  async getBOMs(filters = {}) {
    try {
      let query = 'SELECT * FROM bom WHERE 1=1'
      const params = []

      if (filters.status) {
        query += ' AND status = ?'
        params.push(filters.status)
      }
      if (filters.item_code) {
        query += ' AND item_code = ?'
        params.push(filters.item_code)
      }
      if (filters.search) {
        query += ' AND (bom_id LIKE ? OR item_code LIKE ?)'
        params.push(`%${filters.search}%`, `%${filters.search}%`)
      }

      const [boms] = await this.db.query(query, params)
      
      // Calculate total_cost for each BOM from bom_line items
      for (let bom of boms) {
        const [lines] = await this.db.query(
          `SELECT bl.quantity, i.valuation_rate 
           FROM bom_line bl
           LEFT JOIN item i ON bl.component_code = i.item_code
           WHERE bl.bom_id = ?`,
          [bom.bom_id]
        )
        
        let totalCost = 0
        if (lines) {
          totalCost = lines.reduce((sum, line) => {
            const cost = (line.quantity || 0) * (line.valuation_rate || 0)
            return sum + cost
          }, 0)
        }
        bom.total_cost = totalCost
      }
      
      return boms
    } catch (error) {
      throw error
    }
  }

  async getBOMDetails(bom_id) {
    try {
      const [bom] = await this.db.query('SELECT * FROM bom WHERE bom_id = ?', [bom_id])
      if (!bom || bom.length === 0) return null

      const [lines] = await this.db.query('SELECT * FROM bom_line WHERE bom_id = ? ORDER BY sequence', [bom_id])
      const [operations] = await this.db.query('SELECT * FROM bom_operation WHERE bom_id = ? ORDER BY sequence', [bom_id])
      const [scrapItems] = await this.db.query('SELECT * FROM bom_scrap WHERE bom_id = ? ORDER BY sequence', [bom_id])

      // Calculate total_cost from bom_line items
      let totalCost = 0
      if (lines && lines.length > 0) {
        const [costData] = await this.db.query(
          `SELECT COALESCE(SUM(bl.quantity * COALESCE(i.valuation_rate, 0)), 0) as total
           FROM bom_line bl
           LEFT JOIN item i ON bl.component_code = i.item_code
           WHERE bl.bom_id = ?`,
          [bom_id]
        )
        totalCost = costData && costData[0] ? costData[0].total : 0
      }

      return {
        ...bom[0],
        total_cost: totalCost,
        lines: lines || [],
        operations: operations || [],
        scrapItems: scrapItems || []
      }
    } catch (error) {
      throw error
    }
  }

  async createBOM(data) {
    try {
      const query = `INSERT INTO bom (bom_id, item_code, product_name, description, quantity, uom, status, revision, effective_date, created_by)
                     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      await this.db.query(
        query,
        [data.bom_id, data.item_code, data.product_name, data.description, data.quantity || 1, 
         data.uom, data.status, data.revision, data.effective_date, data.created_by]
      )
      return data
    } catch (error) {
      if (error.code !== 'ER_BAD_FIELD_ERROR') {
        throw error
      }
      await this.db.query(
        `INSERT INTO bom (bom_id, item_code, description, quantity, uom, status, revision, effective_date, created_by)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [data.bom_id, data.item_code, data.description, data.quantity || 1, 
         data.uom, data.status, data.revision, data.effective_date, data.created_by]
      )
      return data
    }
  }

  async addBOMLine(bom_id, line) {
    try {
      await this.db.query(
        `INSERT INTO bom_line (bom_id, component_code, quantity, uom, component_description, component_type, sequence, notes)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [bom_id, line.component_code, line.qty || line.quantity, line.uom, 
         line.component_name || line.component_description, line.type || line.component_type, line.sequence, line.notes]
      )
    } catch (error) {
      throw error
    }
  }

  async updateBOM(bom_id, data) {
    try {
      const fields = []
      const values = []

      if (data.item_code) { fields.push('item_code = ?'); values.push(data.item_code) }
      if (data.description) { fields.push('description = ?'); values.push(data.description) }
      if (data.quantity) { fields.push('quantity = ?'); values.push(data.quantity) }
      if (data.uom) { fields.push('uom = ?'); values.push(data.uom) }
      if (data.status) { fields.push('status = ?'); values.push(data.status) }
      if (data.revision) { fields.push('revision = ?'); values.push(data.revision) }
      if (data.effective_date) { fields.push('effective_date = ?'); values.push(data.effective_date) }

      fields.push('updated_at = NOW()')
      values.push(bom_id)

      const query = `UPDATE bom SET ${fields.join(', ')} WHERE bom_id = ?`
      await this.db.query(query, values)

      return { bom_id, ...data }
    } catch (error) {
      throw error
    }
  }

  async deleteBOM(bom_id) {
    try {
      await this.db.query('DELETE FROM bom_line WHERE bom_id = ?', [bom_id])
      await this.db.query('DELETE FROM bom_operation WHERE bom_id = ?', [bom_id])
      await this.db.query('DELETE FROM bom_scrap WHERE bom_id = ?', [bom_id])
      await this.db.query('DELETE FROM bom WHERE bom_id = ?', [bom_id])
    } catch (error) {
      throw error
    }
  }

  // Get BOM Operations
  async getBOMOperations(bom_id) {
    try {
      const [operations] = await this.db.query(
        `SELECT * FROM bom_operation WHERE bom_id = ? ORDER BY sequence`,
        [bom_id]
      )
      return operations || []
    } catch (error) {
      throw error
    }
  }

  // Add BOM Operation
  async addBOMOperation(bom_id, operation) {
    try {
      await this.db.query(
        `INSERT INTO bom_operation (bom_id, operation_name, workstation_type, operation_time, fixed_time, operating_cost, sequence, notes)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [bom_id, operation.operation_name, operation.workstation_type, operation.operation_time, 
         operation.fixed_time, operation.operating_cost, operation.sequence, operation.notes]
      )
    } catch (error) {
      throw error
    }
  }

  // Get BOM Scrap Items
  async getBOMScrapItems(bom_id) {
    try {
      const [items] = await this.db.query(
        `SELECT * FROM bom_scrap WHERE bom_id = ? ORDER BY sequence`,
        [bom_id]
      )
      return items || []
    } catch (error) {
      throw error
    }
  }

  // Add BOM Scrap Item
  async addBOMScrapItem(bom_id, item) {
    try {
      await this.db.query(
        `INSERT INTO bom_scrap (bom_id, item_code, item_name, quantity, rate, sequence)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [bom_id, item.item_code, item.item_name, item.quantity, item.rate, item.sequence]
      )
    } catch (error) {
      throw error
    }
  }

  // Delete all BOM Lines for a BOM
  async deleteAllBOMLines(bom_id) {
    try {
      await this.db.query('DELETE FROM bom_line WHERE bom_id = ?', [bom_id])
      return true
    } catch (error) {
      throw error
    }
  }

  // Delete all BOM Operations for a BOM
  async deleteAllBOMOperations(bom_id) {
    try {
      await this.db.query('DELETE FROM bom_operation WHERE bom_id = ?', [bom_id])
      return true
    } catch (error) {
      throw error
    }
  }

  // Delete all BOM Scrap Items for a BOM
  async deleteAllBOMScrapItems(bom_id) {
    try {
      await this.db.query('DELETE FROM bom_scrap WHERE bom_id = ?', [bom_id])
      return true
    } catch (error) {
      throw error
    }
  }

  // ============= JOB CARDS =============

  async getJobCards(status = '', search = '', work_order_id = '') {
    try {
      let query = 'SELECT * FROM job_card WHERE 1=1'
      const params = []

      if (status) {
        query += ' AND status = ?'
        params.push(status)
      }
      if (search) {
        query += ' AND (job_card_id LIKE ? OR work_order_id LIKE ?)'
        params.push(`%${search}%`, `%${search}%`)
      }
      if (work_order_id) {
        query += ' AND work_order_id = ?'
        params.push(work_order_id)
      }

      query += ' ORDER BY created_at DESC'
      const [jobCards] = await this.db.query(query, params)
      return jobCards || []
    } catch (error) {
      throw error
    }
  }

  async getJobCardDetails(job_card_id) {
    try {
      const [jobCards] = await this.db.query('SELECT * FROM job_card WHERE job_card_id = ?', [job_card_id])
      return jobCards && jobCards.length > 0 ? jobCards[0] : null
    } catch (error) {
      throw error
    }
  }

  async createJobCard(data) {
    try {
      await this.db.query(
        `INSERT INTO job_card (job_card_id, work_order_id, machine_id, operator_id, planned_quantity, scheduled_start_date, scheduled_end_date, status, created_by, notes)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [data.job_card_id, data.work_order_id, data.machine_id, data.operator_id, 
         data.planned_quantity, data.scheduled_start_date, data.scheduled_end_date, data.status, data.created_by, data.notes]
      )
      return data
    } catch (error) {
      throw error
    }
  }

  async updateJobCard(job_card_id, data) {
    try {
      const fields = []
      const values = []

      if (data.status) { fields.push('status = ?'); values.push(data.status) }
      if (data.operator_id) { fields.push('operator_id = ?'); values.push(data.operator_id) }
      if (data.machine_id) { fields.push('machine_id = ?'); values.push(data.machine_id) }
      if (data.planned_quantity) { fields.push('planned_quantity = ?'); values.push(data.planned_quantity) }
      if (data.produced_quantity) { fields.push('produced_quantity = ?'); values.push(data.produced_quantity) }
      if (data.rejected_quantity) { fields.push('rejected_quantity = ?'); values.push(data.rejected_quantity) }
      if (data.scheduled_start_date) { fields.push('scheduled_start_date = ?'); values.push(data.scheduled_start_date) }
      if (data.scheduled_end_date) { fields.push('scheduled_end_date = ?'); values.push(data.scheduled_end_date) }
      if (data.actual_start_date) { fields.push('actual_start_date = ?'); values.push(data.actual_start_date) }
      if (data.actual_end_date) { fields.push('actual_end_date = ?'); values.push(data.actual_end_date) }
      if (data.notes) { fields.push('notes = ?'); values.push(data.notes) }

      if (fields.length === 0) return false

      values.push(job_card_id)
      const query = `UPDATE job_card SET ${fields.join(', ')} WHERE job_card_id = ?`
      await this.db.query(query, values)

      return true
    } catch (error) {
      throw error
    }
  }

  async deleteJobCard(job_card_id) {
    try {
      await this.db.query('DELETE FROM job_card WHERE job_card_id = ?', [job_card_id])
      return true
    } catch (error) {
      throw error
    }
  }

  // ============= WORKSTATIONS =============

  async createWorkstation(data) {
    try {
      const response = await this.db.query(
        `INSERT INTO workstation (name, workstation_name, description, location, capacity_per_hour, is_active, status)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [data.id, data.name, data.description, data.location, data.capacity_per_hour, data.is_active !== false, 'active']
      )
      return { id: data.id, ...data }
    } catch (error) {
      throw error
    }
  }

  async getWorkstations() {
    try {
      const [workstations] = await this.db.query('SELECT * FROM workstation ORDER BY workstation_name')
      return workstations || []
    } catch (error) {
      throw error
    }
  }

  async getWorkstationById(id) {
    try {
      const [workstation] = await this.db.query('SELECT * FROM workstation WHERE name = ?', [id])
      return workstation && workstation.length > 0 ? workstation[0] : null
    } catch (error) {
      throw error
    }
  }

  async updateWorkstation(id, data) {
    try {
      const fields = []
      const values = []

      if (data.name) { fields.push('workstation_name = ?'); values.push(data.name) }
      if (data.description) { fields.push('description = ?'); values.push(data.description) }
      if (data.location) { fields.push('location = ?'); values.push(data.location) }
      if (data.capacity_per_hour) { fields.push('capacity_per_hour = ?'); values.push(data.capacity_per_hour) }
      if (data.is_active !== undefined) { fields.push('is_active = ?'); values.push(data.is_active) }

      if (fields.length === 0) return false

      fields.push('status = ?')
      values.push(data.is_active ? 'active' : 'inactive')
      values.push(id)

      const query = `UPDATE workstation SET ${fields.join(', ')} WHERE name = ?`
      await this.db.query(query, values)

      return true
    } catch (error) {
      throw error
    }
  }

  async deleteWorkstation(id) {
    try {
      await this.db.query('DELETE FROM workstation WHERE name = ?', [id])
      return true
    } catch (error) {
      throw error
    }
  }

  // ============= ANALYTICS =============

  async getProductionDashboard(date) {
    try {
      const results = await Promise.all([
        this.getWorkOrdersByDate(date),
        this.getProductionEntriesByDate(date),
        this.getJobCardsByDate(date),
        this.getRejectionsByDate(date)
      ])

      const [workOrders, productionEntries, jobCards, rejections] = results

      const totalOrders = workOrders.length
      const inProgressOrders = workOrders.filter(wo => wo.status === 'in-progress').length
      const completedOrders = workOrders.filter(wo => wo.status === 'completed').length
      const totalQuantityProduced = productionEntries.reduce((sum, pe) => sum + (pe.quantity_produced || 0), 0)
      const totalQuantityRejected = productionEntries.reduce((sum, pe) => sum + (pe.quantity_rejected || 0), 0)
      const totalActiveJobCards = jobCards.filter(jc => jc.status !== 'completed').length
      const totalRejections = rejections.length

      return {
        date,
        summary: {
          totalOrders,
          inProgressOrders,
          completedOrders,
          totalQuantityProduced,
          totalQuantityRejected,
          totalActiveJobCards,
          totalRejections
        },
        workOrders,
        productionEntries,
        jobCards,
        rejections
      }
    } catch (error) {
      throw error
    }
  }

  async getWorkOrdersByDate(date) {
    try {
      const [workOrders] = await this.db.query(
        `SELECT * FROM work_order WHERE DATE(planned_start_date) = ? OR DATE(actual_start_date) = ?`,
        [date, date]
      )
      return workOrders || []
    } catch (error) {
      throw error
    }
  }

  async getProductionEntriesByDate(date) {
    try {
      const [entries] = await this.db.query(
        `SELECT * FROM production_entry WHERE DATE(entry_date) = ?`,
        [date]
      )
      return entries || []
    } catch (error) {
      throw error
    }
  }

  async getJobCardsByDate(date) {
    try {
      const [jobCards] = await this.db.query(
        `SELECT * FROM job_card WHERE DATE(scheduled_start_date) = ? OR DATE(actual_start_date) = ?`,
        [date, date]
      )
      return jobCards || []
    } catch (error) {
      throw error
    }
  }

  async getRejectionsByDate(date) {
    try {
      const [rejections] = await this.db.query(
        `SELECT * FROM rejection WHERE DATE(created_at) = ?`,
        [date]
      )
      return rejections || []
    } catch (error) {
      throw error
    }
  }
}

export default ProductionModel
