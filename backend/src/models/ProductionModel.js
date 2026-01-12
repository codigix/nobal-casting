class ProductionModel {
  constructor(db) {
    this.db = db
  }

  // ============= OPERATIONS =============

  async createOperation(data) {
    try {
      const existing = await this.getOperationById(data.name)
      if (existing) {
        throw new Error(`Operation '${data.name}' already exists`)
      }
      
      await this.db.query(
        `INSERT INTO operation (name, operation_name, default_workstation, is_corrective_operation, create_job_card_based_on_batch_size, batch_size, quality_inspection_template, description, operation_type)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [data.name, data.operation_name, data.default_workstation, data.is_corrective_operation, 
         data.create_job_card_based_on_batch_size, data.batch_size, data.quality_inspection_template, data.description, data.operation_type || 'IN_HOUSE']
      )
      return data
    } catch (error) {
      throw error
    }
  }

  async getOperations() {
    try {
      const [operations] = await this.db.query('SELECT * FROM operation')
      
      for (const operation of operations) {
        const [subOps] = await this.db.query('SELECT * FROM operation_sub_operation WHERE operation_name = ? ORDER BY no', [operation.name])
        operation.sub_operations = subOps || []
      }
      
      return operations
    } catch (error) {
      throw error
    }
  }

  async getOperationById(operation_id) {
    try {
      const [operations] = await this.db.query('SELECT * FROM operation WHERE name = ?', [operation_id])
      const operation = operations[0] || null
      
      if (operation) {
        const [subOps] = await this.db.query('SELECT * FROM operation_sub_operation WHERE operation_name = ? ORDER BY no', [operation_id])
        operation.sub_operations = subOps || []
      }
      
      return operation
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
      if (data.operation_type) { fields.push('operation_type = ?'); values.push(data.operation_type) }

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
        `INSERT INTO operation_sub_operation (operation_name, no, operation, operation_time)
         VALUES (?, ?, ?, ?)`,
        [operation_id, subOp.no, subOp.operation, subOp.operation_time]
      )
    } catch (error) {
      throw error
    }
  }

  async deleteSubOperations(operation_id) {
    try {
      await this.db.query('DELETE FROM operation_sub_operation WHERE operation_name = ?', [operation_id])
    } catch (error) {
      throw error
    }
  }

  // ============= WORK ORDERS =============

  async createWorkOrder(data) {
    try {
      await this.db.query(
        `INSERT INTO work_order (wo_id, item_code, quantity, priority, notes, status, sales_order_id, bom_no, planned_start_date, planned_end_date, actual_start_date, actual_end_date, expected_delivery_date)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [data.wo_id, data.item_code, data.quantity, data.priority || 'medium', data.notes || '', data.status, data.sales_order_id || null, data.bom_no || null, data.planned_start_date || null, data.planned_end_date || null, data.actual_start_date || null, data.actual_end_date || null, data.expected_delivery_date || null]
      )
      return { wo_id: data.wo_id, ...data }
    } catch (error) {
      throw error
    }
  }

  async getWorkOrders(filters = {}) {
    try {
      let query = `
        SELECT 
          wo.*, 
          i.name as item_name,
          i.valuation_rate,
          COALESCE(i.valuation_rate, 0) as unit_cost,
          COALESCE(i.valuation_rate, 0) * wo.quantity as total_cost
        FROM work_order wo
        LEFT JOIN item i ON wo.item_code = i.item_code
        WHERE 1=1
      `
      const params = []

      if (filters.status) {
        query += ' AND wo.status = ?'
        params.push(filters.status)
      }
      if (filters.search) {
        query += ' AND (wo.wo_id LIKE ? OR wo.item_code LIKE ?)'
        params.push(`%${filters.search}%`, `%${filters.search}%`)
      }
      if (filters.assigned_to_id) {
        query += ' AND wo.assigned_to_id = ?'
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
      const [workOrders] = await this.db.query(
        `SELECT 
          wo.*, 
          i.name as item_name,
          i.valuation_rate,
          COALESCE(i.valuation_rate, 0) as unit_cost,
          COALESCE(i.valuation_rate, 0) * wo.quantity as total_cost
        FROM work_order wo
        LEFT JOIN item i ON wo.item_code = i.item_code
        WHERE wo.wo_id = ?`,
        [wo_id]
      )
      if (!workOrders || workOrders.length === 0) return null

      const workOrder = workOrders[0]

      const [operations] = await this.db.query(
        'SELECT * FROM work_order_operation WHERE wo_id = ? ORDER BY sequence ASC',
        [wo_id]
      )
      
      const [items] = await this.db.query(
        'SELECT * FROM work_order_item WHERE wo_id = ? ORDER BY sequence ASC',
        [wo_id]
      )

      return {
        ...workOrder,
        operations: operations || [],
        items: items || []
      }
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
      if (data.notes !== undefined) { fields.push('notes = ?'); values.push(data.notes) }
      if (data.sales_order_id !== undefined) { fields.push('sales_order_id = ?'); values.push(data.sales_order_id) }
      if (data.planned_start_date !== undefined) { fields.push('planned_start_date = ?'); values.push(data.planned_start_date) }
      if (data.planned_end_date !== undefined) { fields.push('planned_end_date = ?'); values.push(data.planned_end_date) }
      if (data.actual_start_date !== undefined) { fields.push('actual_start_date = ?'); values.push(data.actual_start_date) }
      if (data.actual_end_date !== undefined) { fields.push('actual_end_date = ?'); values.push(data.actual_end_date) }
      if (data.expected_delivery_date !== undefined) { fields.push('expected_delivery_date = ?'); values.push(data.expected_delivery_date) }

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
      const requiredQty = item.required_qty || item.required_quantity || item.qty || item.quantity || 0
      
      await this.db.query(
        `INSERT INTO work_order_item (wo_id, item_code, source_warehouse, required_qty, transferred_qty, consumed_qty, returned_qty, sequence)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [wo_id, item.item_code, item.source_warehouse || '', requiredQty, 
         item.transferred_qty || 0, item.consumed_qty || 0, item.returned_qty || 0, item.sequence || 0]
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
      const operationName = operation.operation_name || operation.operation || ''
      const workstation = operation.workstation_type || operation.workstation || ''
      const time = operation.operation_time || operation.time || 0
      
      await this.db.query(
        `INSERT INTO work_order_operation (wo_id, operation, workstation, time, completed_qty, process_loss_qty, sequence)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [wo_id, operationName, workstation, time, 
         operation.completed_qty || 0, operation.process_loss_qty || 0, operation.sequence || 0]
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
      let query = 'SELECT b.*, i.name as product_name, i.item_group FROM bom b LEFT JOIN item i ON b.item_code = i.item_code WHERE 1=1'
      const params = []

      if (filters.status) {
        query += ' AND b.status = ?'
        params.push(filters.status)
      }
      if (filters.item_code) {
        query += ' AND b.item_code = ?'
        params.push(filters.item_code)
      }
      if (filters.search) {
        query += ' AND (b.bom_id LIKE ? OR b.item_code LIKE ?)'
        params.push(`%${filters.search}%`, `%${filters.search}%`)
      }

      const [boms] = await this.db.query(query, params)
      
      // Calculate total_cost for each BOM from bom_line items
     
      return boms
    } catch (error) {
      throw error
    }
  }

  async getBOMDetails(bom_id) {
  try {
    const [bom] = await this.db.query('SELECT * FROM bom WHERE bom_id = ?', [bom_id])
    if (!bom || bom.length === 0) return null

    const [lines] = await this.db.query(
      `SELECT bl.*, i.name as component_name, i.item_group, i.loss_percentage as item_loss_percentage
       FROM bom_line bl
       LEFT JOIN item i ON bl.component_code = i.item_code
       WHERE bl.bom_id = ? 
       ORDER BY bl.sequence`, 
      [bom_id]
    )
    const [operations] = await this.db.query('SELECT * FROM bom_operation WHERE bom_id = ? ORDER BY sequence', [bom_id])
    const [scrapItems] = await this.db.query('SELECT * FROM bom_scrap WHERE bom_id = ? ORDER BY sequence', [bom_id])
    
    let rawMaterials = []
    try {
      const [rawMats] = await this.db.query(`
        SELECT brm.*, i.item_group 
        FROM bom_raw_material brm 
        LEFT JOIN item i ON brm.item_code = i.item_code 
        WHERE brm.bom_id = ? 
        ORDER BY brm.sequence
      `, [bom_id])
      rawMaterials = rawMats || []
    } catch (err) {
      rawMaterials = []
    }

    return {
      ...bom[0],
      lines: lines || [],
      operations: operations || [],
      scrapItems: scrapItems || [],
      rawMaterials: rawMaterials
    }
  } catch (error) {
    throw error
  }
}
async getBOMRawMaterials(bom_id) {
  try {
    const [materials] = await this.db.query(
      `SELECT brm.*, i.item_group FROM bom_raw_material brm LEFT JOIN item i ON brm.item_code = i.item_code WHERE brm.bom_id = ? ORDER BY brm.sequence`,
      [bom_id]
    )
    return materials || []
  } catch (error) {
    return []
  }
}

async addBOMRawMaterial(bom_id, material) {
  try {
    await this.db.query(
      `INSERT INTO bom_raw_material (bom_id, item_code, item_name, item_group, component_type, qty, uom, rate, amount, source_warehouse, operation, sequence)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [bom_id, material.item_code, material.item_name, material.item_group || null, material.component_type || null, material.qty, material.uom, 
       material.rate, material.amount, material.source_warehouse, material.operation, material.sequence]
    )
  } catch (error) {
    return null
  }
}

async deleteAllBOMRawMaterials(bom_id) {
  try {
    await this.db.query('DELETE FROM bom_raw_material WHERE bom_id = ?', [bom_id])
    return true
  } catch (error) {
    return false
  }
}


  async createBOM(data) {
    try {
      const query = `INSERT INTO bom (bom_id, item_code, product_name, item_group, items_group, description, quantity, uom, status, revision, effective_date, total_cost, created_by)
                     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      await this.db.query(
        query,
        [data.bom_id, data.item_code, data.product_name, data.item_group, data.items_group || 'Finished Goods', data.description, data.quantity || 1, 
         data.uom, data.status, data.revision, data.effective_date, data.total_cost || 0, data.created_by]
      )
      return data
    } catch (error) {
      if (error.code !== 'ER_BAD_FIELD_ERROR') {
        throw error
      }
      try {
        await this.db.query(
          `INSERT INTO bom (bom_id, item_code, description, quantity, uom, status, revision, effective_date, total_cost, created_by)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [data.bom_id, data.item_code, data.description, data.quantity || 1, 
           data.uom, data.status, data.revision, data.effective_date, data.total_cost || 0, data.created_by]
        )
      } catch (innerError) {
        if (innerError.code === 'ER_BAD_FIELD_ERROR') {
          await this.db.query(
            `INSERT INTO bom (bom_id, item_code, product_name, item_group, items_group, description, quantity, uom, status, revision, effective_date, total_cost, created_by)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [data.bom_id, data.item_code, data.product_name || '', data.item_group || '', data.items_group || 'Finished Goods', data.description, data.quantity || 1, 
             data.uom, data.status, data.revision, data.effective_date, data.total_cost || 0, data.created_by]
          )
        } else {
          throw innerError
        }
      }
      return data
    }
  }

  async addBOMLine(bom_id, line) {
    try {
      const quantity = parseFloat(line.qty || line.quantity || 0)
      const rate = parseFloat(line.rate || 0)
      const amount = quantity * rate
      
      let lossPercentage = parseFloat(line.loss_percentage || 0)
      
      if (!lossPercentage && line.component_code) {
        const [item] = await this.db.query(
          'SELECT loss_percentage FROM item WHERE item_code = ?',
          [line.component_code]
        )
        if (item && item.length > 0) {
          lossPercentage = parseFloat(item[0].loss_percentage || 0)
        }
      }
      
      const scrapQty = (quantity * lossPercentage) / 100
      
      await this.db.query(
        `INSERT INTO bom_line (bom_id, component_code, quantity, uom, rate, amount, component_description, component_type, sequence, notes, loss_percentage, scrap_qty)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [bom_id, line.component_code, quantity, line.uom, rate, amount,
         line.component_name || line.component_description, line.type || line.component_type, line.sequence, line.notes, lossPercentage, scrapQty]
      )
    } catch (error) {
      throw error
    }
  }

  async updateBOMLine(line_id, line) {
    try {
      const quantity = parseFloat(line.qty || line.quantity || 0)
      const rate = parseFloat(line.rate || 0)
      const amount = quantity * rate
      
      let lossPercentage = parseFloat(line.loss_percentage || 0)
      
      if (!lossPercentage && line.component_code) {
        const [item] = await this.db.query(
          'SELECT loss_percentage FROM item WHERE item_code = ?',
          [line.component_code]
        )
        if (item && item.length > 0) {
          lossPercentage = parseFloat(item[0].loss_percentage || 0)
        }
      }
      
      const scrapQty = (quantity * lossPercentage) / 100
      
      const fields = []
      const values = []
      
      if (line.component_code) { fields.push('component_code = ?'); values.push(line.component_code) }
      if (quantity) { fields.push('quantity = ?'); values.push(quantity) }
      if (line.uom) { fields.push('uom = ?'); values.push(line.uom) }
      if (rate) { fields.push('rate = ?'); values.push(rate) }
      fields.push('amount = ?'); values.push(amount)
      if (line.component_name || line.component_description) { fields.push('component_description = ?'); values.push(line.component_name || line.component_description) }
      if (line.type || line.component_type) { fields.push('component_type = ?'); values.push(line.type || line.component_type) }
      if (line.sequence) { fields.push('sequence = ?'); values.push(line.sequence) }
      if (line.notes !== undefined) { fields.push('notes = ?'); values.push(line.notes) }
      fields.push('loss_percentage = ?'); values.push(lossPercentage)
      fields.push('scrap_qty = ?'); values.push(scrapQty)
      
      values.push(line_id)
      
      const query = `UPDATE bom_line SET ${fields.join(', ')} WHERE line_id = ?`
      await this.db.query(query, values)
      
      return { line_id, loss_percentage: lossPercentage, scrap_qty: scrapQty, ...line }
    } catch (error) {
      throw error
    }
  }

  async updateBOM(bom_id, data) {
    try {
      const fields = []
      const values = []

      if (data.item_code) { fields.push('item_code = ?'); values.push(data.item_code) }
      if (data.product_name) { fields.push('product_name = ?'); values.push(data.product_name) }
      if (data.item_group) { fields.push('item_group = ?'); values.push(data.item_group) }
      if (data.description) { fields.push('description = ?'); values.push(data.description) }
      if (data.quantity) { fields.push('quantity = ?'); values.push(data.quantity) }
      if (data.uom) { fields.push('uom = ?'); values.push(data.uom) }
      if (data.status) { fields.push('status = ?'); values.push(data.status) }
      if (data.revision) { fields.push('revision = ?'); values.push(data.revision) }
      if (data.effective_date) { fields.push('effective_date = ?'); values.push(data.effective_date) }
      if (data.total_cost !== undefined) { fields.push('total_cost = ?'); values.push(data.total_cost) }

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
        `INSERT INTO bom_operation (bom_id, operation_name, workstation_type, operation_time, hourly_rate, fixed_time, operating_cost, operation_type, sequence, notes)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [bom_id, operation.operation_name, operation.workstation_type, operation.operation_time, 
         operation.hourly_rate || 0, operation.fixed_time, operation.operating_cost || 0, operation.operation_type || 'IN_HOUSE', operation.sequence, operation.notes]
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
        `INSERT INTO bom_scrap (bom_id, item_code, item_name, input_quantity, loss_percentage, rate, sequence)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [bom_id, item.item_code, item.item_name, item.input_quantity || item.quantity || 0, item.loss_percentage || 0, item.rate || 0, item.sequence]
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
        `INSERT INTO job_card (job_card_id, work_order_id, machine_id, operator_id, operation, operation_sequence, planned_quantity, operation_time, scheduled_start_date, scheduled_end_date, status, created_by, notes)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [data.job_card_id, data.work_order_id, data.machine_id, data.operator_id, data.operation || null, data.operation_sequence || null,
         data.planned_quantity, data.operation_time || 0, data.scheduled_start_date, data.scheduled_end_date, (data.status || 'draft').toLowerCase(), data.created_by, data.notes]
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

      if (data.operation) { fields.push('operation = ?'); values.push(data.operation) }
      if (data.operation_sequence) { fields.push('operation_sequence = ?'); values.push(data.operation_sequence) }
      if (data.status !== undefined) { 
        const statusValue = (data.status || '').toLowerCase()
        if (statusValue.length > 50) {
          throw new Error(`Status value too long: "${statusValue}" (${statusValue.length} characters, max 50 allowed)`)
        }
        fields.push('status = ?')
        values.push(statusValue)
      }
      if (data.operator_id) { fields.push('operator_id = ?'); values.push(data.operator_id) }
      if (data.machine_id) { fields.push('machine_id = ?'); values.push(data.machine_id) }
      if (data.planned_quantity !== undefined && data.planned_quantity !== null) { fields.push('planned_quantity = ?'); values.push(data.planned_quantity) }
      if (data.produced_quantity !== undefined && data.produced_quantity !== null) { fields.push('produced_quantity = ?'); values.push(data.produced_quantity) }
      if (data.rejected_quantity !== undefined && data.rejected_quantity !== null) { fields.push('rejected_quantity = ?'); values.push(data.rejected_quantity) }
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

  async checkAndUpdateWorkOrderProgress(work_order_id) {
    try {
      const [jobCards] = await this.db.query(
        'SELECT * FROM job_card WHERE work_order_id = ? ORDER BY operation_sequence ASC',
        [work_order_id]
      )

      if (!jobCards || jobCards.length === 0) {
        return false
      }

      const firstJobCard = jobCards[0]
      const firstJobStatus = (firstJobCard.status || '').toLowerCase()

      if (firstJobStatus === 'in-progress' || firstJobStatus === 'completed') {
        const workOrder = await this.getWorkOrderById(work_order_id)
        const workOrderStatus = (workOrder?.status || '').toLowerCase()
        
        if (workOrderStatus !== 'in-progress' && workOrderStatus !== 'in_progress' && workOrderStatus !== 'completed') {
          await this.updateWorkOrder(work_order_id, { status: 'in_progress' })
          return true
        }
      }

      return false
    } catch (error) {
      throw error
    }
  }

  async checkAndUpdateWorkOrderCompletion(work_order_id) {
    try {
      const [jobCards] = await this.db.query(
        'SELECT status FROM job_card WHERE work_order_id = ?',
        [work_order_id]
      )

      if (!jobCards || jobCards.length === 0) {
        return false
      }

      const allCompleted = jobCards.every(card => (card.status || '').toLowerCase() === 'completed')
      
      if (allCompleted) {
        await this.updateWorkOrder(work_order_id, { status: 'completed' })
        return true
      }

      return false
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

  async deleteJobCardsByWorkOrder(work_order_id) {
    try {
      await this.db.query('DELETE FROM job_card WHERE work_order_id = ?', [work_order_id])
      return true
    } catch (error) {
      throw error
    }
  }

  async generateJobCardsForWorkOrder(work_order_id, created_by = 'system') {
    try {
      const workOrder = await this.getWorkOrderById(work_order_id)
      if (!workOrder) {
        throw new Error('Work order not found')
      }

      if (!workOrder.operations || workOrder.operations.length === 0) {
        throw new Error('No operations found for this work order')
      }

      const createdCards = []
      const plannedQty = parseFloat(workOrder.quantity || workOrder.qty_to_manufacture || 0)

      for (const operation of workOrder.operations) {
        const job_card_id = `JC-${Date.now()}-${operation.sequence}`
        const jobCardData = {
          job_card_id,
          work_order_id,
          operation: operation.operation_name || operation.name || operation.operation || '',
          operation_sequence: operation.sequence || 0,
          machine_id: operation.default_workstation || operation.workstation || '',
          operator_id: null,
          planned_quantity: plannedQty,
          operation_time: operation.operation_time || 0,
          scheduled_start_date: null,
          scheduled_end_date: null,
          status: 'draft',
          created_by,
          notes: null
        }

        await this.createJobCard(jobCardData)
        createdCards.push(jobCardData)
      }

      return createdCards
    } catch (error) {
      throw error
    }
  }

  async validateJobCardStatusTransition(job_card_id, newStatus) {
    try {
      const jobCard = await this.getJobCardDetails(job_card_id)
      if (!jobCard) {
        throw new Error('Job card not found')
      }

      const statusWorkflow = {
        'draft': ['in-progress', 'hold', 'completed'],
        'in-progress': ['completed', 'hold'],
        'hold': ['in-progress', 'completed'],
        'completed': ['completed'],
        'open': ['in-progress', 'hold', 'completed'],
        'pending': ['in-progress', 'hold', 'completed'],
        'cancelled': ['cancelled']
      }

      const currentStatusNormalized = (jobCard.status || '').toLowerCase()
      const newStatusNormalized = (newStatus || '').toLowerCase()
      const allowedNextStatuses = statusWorkflow[currentStatusNormalized] || []
      if (!allowedNextStatuses.includes(newStatusNormalized)) {
        const statusLabels = {
          'draft': 'Draft',
          'pending': 'Pending',
          'in-progress': 'In Progress',
          'hold': 'Hold',
          'completed': 'Completed',
          'cancelled': 'Cancelled',
          'open': 'Open'
        }
        const currentLabel = statusLabels[currentStatusNormalized] || jobCard.status
        const allowedLabels = allowedNextStatuses.map(s => statusLabels[s] || s)
        throw new Error(`Job Card Status Error: Cannot transition from "${currentLabel}" to "${newStatus}". Allowed next statuses: ${allowedLabels.join(', ')}. Please follow the proper workflow sequence.`)
      }

      if (newStatusNormalized === 'in-progress') {
        const [previousCards] = await this.db.query(
          'SELECT * FROM job_card WHERE work_order_id = ? AND operation_sequence < ? ORDER BY operation_sequence DESC',
          [jobCard.work_order_id, jobCard.operation_sequence || 0]
        )

        if (previousCards && previousCards.length > 0) {
          const previousCard = previousCards[0]
          const prevStatusNormalized = (previousCard.status || '').toLowerCase()
          if (prevStatusNormalized !== 'completed') {
            throw new Error(`Operation Sequence Error: Cannot start operation "${jobCard.operation}" (Sequence ${jobCard.operation_sequence}). The previous operation "${previousCard.operation}" (Sequence ${previousCard.operation_sequence}) must be completed first. Current status: ${(previousCard.status || 'Unknown').toUpperCase()}.`)
          }
        }
      }

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
        [data.name, data.workstation_name, data.description, data.location, data.capacity_per_hour, data.is_active !== false, 'active']
      )
      return { ...data }
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

      if (data.workstation_name) { fields.push('workstation_name = ?'); values.push(data.workstation_name) }
      if (data.description) { fields.push('description = ?'); values.push(data.description) }
      if (data.location) { fields.push('location = ?'); values.push(data.location) }
      if (data.capacity_per_hour !== undefined) { fields.push('capacity_per_hour = ?'); values.push(data.capacity_per_hour) }
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

  // ============= ANALYTICS =============

  async getProductionDashboard(date) {
    try {
      const targetDate = date || new Date().toISOString().split('T')[0]
      
      const [workOrders] = await this.db.query(
        `SELECT COUNT(*) as total, 
                SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed,
                SUM(CASE WHEN status = 'in-progress' THEN 1 ELSE 0 END) as in_progress,
                SUM(CASE WHEN status = 'draft' THEN 1 ELSE 0 END) as draft
         FROM work_order WHERE DATE(created_at) = ?`,
        [targetDate]
      )

      const [jobCards] = await this.db.query(
        `SELECT COUNT(*) as total FROM job_card WHERE DATE(created_at) = ?`,
        [targetDate]
      )

      const [rejections] = await this.db.query(
        `SELECT COUNT(*) as total, SUM(quantity) as total_qty FROM rejection WHERE DATE(created_at) = ?`,
        [targetDate]
      )

      return {
        date: targetDate,
        work_orders: workOrders[0] || {},
        job_cards: jobCards[0] || {},
        rejections: rejections[0] || {}
      }
    } catch (error) {
      throw error
    }
  }

  async getMachineUtilization(dateFrom, dateTo) {
    try {
      const [machines] = await this.db.query(
        `SELECT 
          jc.machine as machine_id,
          jc.machine as machine_name,
          COUNT(DISTINCT jc.job_card_id) as production_days,
          COALESCE(SUM(CASE WHEN jc.actual_end_time IS NOT NULL AND jc.actual_start_time IS NOT NULL 
                       THEN HOUR(TIMEDIFF(jc.actual_end_time, jc.actual_start_time)) 
                       ELSE 0 END), 0) as total_hours,
          COALESCE(SUM(jc.quantity), 0) as total_produced,
          CASE 
            WHEN DATEDIFF(?, ?) > 0 THEN ROUND((COALESCE(SUM(CASE WHEN jc.actual_end_time IS NOT NULL AND jc.actual_start_time IS NOT NULL 
                       THEN HOUR(TIMEDIFF(jc.actual_end_time, jc.actual_start_time)) 
                       ELSE 0 END), 0) / (DATEDIFF(?, ?) * 8)) * 100, 2)
            ELSE 0
          END as utilization_percent
         FROM job_card jc
         WHERE jc.machine IS NOT NULL AND DATE(jc.created_at) BETWEEN ? AND ?
         GROUP BY jc.machine`,
        [dateTo, dateFrom, dateTo, dateFrom, dateFrom, dateTo]
      )
      return machines || []
    } catch (error) {
      throw error
    }
  }

  async getOperatorEfficiency(dateFrom, dateTo) {
    try {
      const [operators] = await this.db.query(
        `SELECT 
          jc.operator_name,
          jc.operator_name as operator_id,
          COUNT(DISTINCT jc.job_card_id) as production_days,
          CASE 
            WHEN DATEDIFF(?, ?) > 0 THEN ROUND(COALESCE(SUM(jc.quantity) / (DATEDIFF(?, ?) * 8), 0), 2)
            ELSE 0
          END as units_per_hour,
          COALESCE(SUM(jc.quantity), 0) as total_produced,
          CASE
            WHEN COALESCE(SUM(jc.quantity), 0) > 0 THEN ROUND((100 - (COALESCE(SUM(r.quantity), 0) / COALESCE(SUM(jc.quantity), 1)) * 100), 2)
            ELSE 100
          END as quality_score
         FROM job_card jc
         LEFT JOIN rejection r ON jc.job_card_id = r.job_card_id AND DATE(r.created_at) BETWEEN ? AND ?
         WHERE jc.operator_name IS NOT NULL AND DATE(jc.created_at) BETWEEN ? AND ?
         GROUP BY jc.operator_name`,
        [dateTo, dateFrom, dateTo, dateFrom, dateFrom, dateTo, dateFrom, dateTo]
      )
      return operators || []
    } catch (error) {
      throw error
    }
  }

  async recordRejection(data) {
    try {
      const rejectionId = `REJ-${Date.now()}`
      await this.db.query(
        `INSERT INTO rejection_entry (rejection_id, job_card_id, rejection_reason, rejected_qty, notes)
         VALUES (?, ?, ?, ?, ?)`,
        [rejectionId, data.job_card_id, data.rejection_reason, data.rejected_qty, data.notes]
      )
      return { rejection_id: rejectionId, ...data }
    } catch (error) {
      throw error
    }
  }

  async getRejectionAnalysis(dateFrom, dateTo) {
    try {
      const [analysis] = await this.db.query(
        `SELECT 
          rejection_reason,
          COUNT(*) as count,
          SUM(quantity) as total_quantity,
          ROUND(AVG(quantity), 2) as avg_quantity
         FROM rejection
         WHERE DATE(created_at) BETWEEN ? AND ?
         GROUP BY rejection_reason
         ORDER BY count DESC`,
        [dateFrom, dateTo]
      )
      return analysis || []
    } catch (error) {
      throw error
    }
  }

  async createTimeLog(data) {
    try {
      const timeLogId = `TL-${Date.now()}`
      const query = `INSERT INTO time_log (time_log_id, job_card_id, employee_id, operator_name, workstation_name, shift, from_time, to_time, time_in_minutes, completed_qty, accepted_qty, rejected_qty, scrap_qty, inhouse, outsource)
                     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      await this.db.query(query, [
        timeLogId,
        data.job_card_id,
        data.employee_id || null,
        data.operator_name || null,
        data.workstation_name || null,
        data.shift || 'A',
        data.from_time || null,
        data.to_time || null,
        data.time_in_minutes || 0,
        data.completed_qty || 0,
        data.accepted_qty || 0,
        data.rejected_qty || 0,
        data.scrap_qty || 0,
        data.inhouse ? 1 : 0,
        data.outsource ? 1 : 0
      ])
      return { time_log_id: timeLogId, ...data }
    } catch (error) {
      throw error
    }
  }

  async getTimeLogs(jobCardId) {
    try {
      const [timeLogs] = await this.db.query('SELECT * FROM time_log WHERE job_card_id = ? ORDER BY created_at DESC', [jobCardId])
      return timeLogs || []
    } catch (error) {
      return []
    }
  }

  async deleteTimeLog(timeLogId) {
    try {
      await this.db.query('DELETE FROM time_log WHERE time_log_id = ?', [timeLogId])
      return true
    } catch (error) {
      throw error
    }
  }

  async createRejection(data) {
    try {
      const rejectionId = `REJ-${Date.now()}`
      const query = `INSERT INTO rejection_entry (rejection_id, job_card_id, rejection_reason, rejected_qty, notes)
                     VALUES (?, ?, ?, ?, ?)`
      await this.db.query(query, [
        rejectionId,
        data.job_card_id,
        data.rejection_reason || null,
        data.rejected_qty || 0,
        data.notes || null
      ])
      return { id: rejectionId, ...data }
    } catch (error) {
      throw error
    }
  }

  async getRejections(jobCardId) {
    try {
      const [rejections] = await this.db.query('SELECT * FROM rejection_entry WHERE job_card_id = ? ORDER BY created_at DESC', [jobCardId])
      return rejections || []
    } catch (error) {
      return []
    }
  }

  async deleteRejection(rejectionId) {
    try {
      await this.db.query('DELETE FROM rejection_entry WHERE rejection_id = ?', [rejectionId])
      return true
    } catch (error) {
      throw error
    }
  }

  async createDowntime(data) {
    try {
      const downtimeId = `DT-${Date.now()}`
      const query = `INSERT INTO downtime_entry (downtime_id, job_card_id, downtime_type, downtime_reason, from_time, to_time, duration_minutes)
                     VALUES (?, ?, ?, ?, ?, ?, ?)`
      await this.db.query(query, [
        downtimeId,
        data.job_card_id,
        data.downtime_type || null,
        data.downtime_reason || null,
        data.from_time || null,
        data.to_time || null,
        data.duration_minutes || 0
      ])
      return { id: downtimeId, ...data }
    } catch (error) {
      throw error
    }
  }

  async getDowntimes(jobCardId) {
    try {
      const [downtimes] = await this.db.query('SELECT * FROM downtime_entry WHERE job_card_id = ? ORDER BY created_at DESC', [jobCardId])
      return downtimes || []
    } catch (error) {
      return []
    }
  }

  async deleteDowntime(downtimeId) {
    try {
      await this.db.query('DELETE FROM downtime_entry WHERE downtime_id = ?', [downtimeId])
      return true
    } catch (error) {
      throw error
    }
  }

  async startOperation(jobCardId, data) {
    try {
      const { actual_start_date, workstation_id, employee_id, start_date, start_time, inhouse, outsource, notes, created_by } = data

      const eventTimestamp = new Date(actual_start_date).toISOString().replace('Z', '').replace('T', ' ')
      await this.db.query(
        `INSERT INTO operation_execution_log 
          (job_card_id, event_type, event_timestamp, workstation_id, operator_id, start_date, start_time, notes, created_by)
         VALUES (?, 'START', ?, ?, ?, ?, ?, ?, ?)`,
        [jobCardId, eventTimestamp, workstation_id || null, employee_id || null, start_date || null, start_time || null, notes || null, created_by || 'system']
      )

      await this.db.query(
        `UPDATE job_card SET actual_start_date = ?, status = 'in-progress', assigned_workstation_id = ?, operator_id = ?, inhouse = ?, outsource = ? WHERE job_card_id = ?`,
        [eventTimestamp, workstation_id || null, employee_id || null, inhouse ? 1 : 0, outsource ? 1 : 0, jobCardId]
      )

      return { success: true, message: 'Operation started successfully' }
    } catch (error) {
      throw error
    }
  }

  async endOperation(jobCardId, data) {
    try {
      const { actual_end_date, next_operation_id, notes, created_by } = data

      const eventTimestamp = new Date(actual_end_date).toISOString().replace('Z', '').replace('T', ' ')
      await this.db.query(
        `INSERT INTO operation_execution_log 
          (job_card_id, event_type, event_timestamp, notes, created_by)
         VALUES (?, 'END', ?, ?, ?)`,
        [jobCardId, eventTimestamp, notes || null, created_by || 'system']
      )

      await this.db.query(
        `UPDATE job_card SET actual_end_date = ?, status = 'completed', next_operation_id = ? WHERE job_card_id = ?`,
        [eventTimestamp, next_operation_id || null, jobCardId]
      )

      return { success: true, message: 'Operation ended successfully' }
    } catch (error) {
      throw error
    }
  }

  async getOperationLogs(jobCardId) {
    try {
      const [logs] = await this.db.query(
        `SELECT * FROM operation_execution_log 
         WHERE job_card_id = ? 
         ORDER BY event_timestamp ASC`,
        [jobCardId]
      )
      return logs || []
    } catch (error) {
      throw error
    }
  }

  async createOutwardChallan(data) {
    try {
      const challanNumber = `OC-${Date.now()}`
      const query = `INSERT INTO outward_challan (challan_number, job_card_id, vendor_id, vendor_name, expected_return_date, notes, status, created_by)
                     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
      await this.db.query(query, [
        challanNumber,
        data.job_card_id,
        data.vendor_id || null,
        data.vendor_name || null,
        data.expected_return_date || null,
        data.notes || null,
        'issued',
        data.created_by || null
      ])
      return { challan_number: challanNumber, ...data }
    } catch (error) {
      throw error
    }
  }

  async getOutwardChallans(jobCardId) {
    try {
      const [challans] = await this.db.query('SELECT * FROM outward_challan WHERE job_card_id = ? ORDER BY challan_date DESC', [jobCardId])
      return challans || []
    } catch (error) {
      return []
    }
  }

  async createInwardChallan(data) {
    try {
      const challanNumber = `IC-${Date.now()}`
      const query = `INSERT INTO inward_challan (challan_number, outward_challan_id, job_card_id, vendor_id, vendor_name, quantity_received, quantity_accepted, quantity_rejected, notes, status, created_by)
                     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      await this.db.query(query, [
        challanNumber,
        data.outward_challan_id || null,
        data.job_card_id,
        data.vendor_id || null,
        data.vendor_name || null,
        data.quantity_received || 0,
        data.quantity_accepted || 0,
        data.quantity_rejected || 0,
        data.notes || null,
        'received',
        data.created_by || null
      ])
      return { challan_number: challanNumber, ...data }
    } catch (error) {
      throw error
    }
  }

  async getInwardChallans(jobCardId) {
    try {
      const [challans] = await this.db.query('SELECT * FROM inward_challan WHERE job_card_id = ? ORDER BY received_date DESC', [jobCardId])
      return challans || []
    } catch (error) {
      return []
    }
  }

  async updateInwardChallan(id, data) {
    try {
      const updateFields = []
      const values = []
      
      for (const [key, value] of Object.entries(data)) {
        updateFields.push(`${key} = ?`)
        values.push(value)
      }
      
      values.push(id)
      
      const query = `UPDATE inward_challan SET ${updateFields.join(', ')}, updated_at = NOW() WHERE id = ?`
      await this.db.query(query, values)
      return true
    } catch (error) {
      throw error
    }
  }

  async deleteOutwardChallan(challanNumber) {
    try {
      await this.db.query('DELETE FROM outward_challan WHERE challan_number = ?', [challanNumber])
      return true
    } catch (error) {
      throw error
    }
  }

  async truncateBOMs() {
    try {
      await this.db.query('DELETE FROM bom_line')
      await this.db.query('DELETE FROM bom_operation')
      await this.db.query('DELETE FROM bom_scrap')
      await this.db.query('DELETE FROM bom')
    } catch (error) {
      throw error
    }
  }

  async truncateWorkOrders() {
    try {
      await this.db.query('DELETE FROM work_order_item')
      await this.db.query('DELETE FROM work_order')
    } catch (error) {
      throw error
    }
  }

  async truncateJobCards() {
    try {
      await this.db.query('DELETE FROM job_card')
    } catch (error) {
      throw error
    }
  }

  async updateJobCardStatus(jobCardId, newStatus) {
    try {
      const normalizedStatus = (newStatus || '').toLowerCase().trim()
      await this.db.query(
        'UPDATE job_card SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE job_card_id = ?',
        [normalizedStatus, jobCardId]
      )

      const [jobCard] = await this.db.query(
        'SELECT work_order_id FROM job_card WHERE job_card_id = ?',
        [jobCardId]
      )

      if (!jobCard || jobCard.length === 0) {
        return
      }

      const workOrderId = jobCard[0].work_order_id

      const [jobCards] = await this.db.query(
        'SELECT status FROM job_card WHERE work_order_id = ? ORDER BY updated_at DESC LIMIT 1',
        [workOrderId]
      )

      let workOrderStatus = normalizedStatus
      if (jobCards && jobCards.length > 0) {
        workOrderStatus = (jobCards[0].status || '').toLowerCase().trim()
      }

      await this.db.query(
        'UPDATE work_order SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE wo_id = ?',
        [workOrderStatus, workOrderId]
      )

      const [workOrder] = await this.db.query(
        'SELECT sales_order_id, bom_no FROM work_order WHERE wo_id = ?',
        [workOrderId]
      )

      if (workOrder && workOrder.length > 0) {
        const salesOrderId = workOrder[0].sales_order_id
        const bomNo = workOrder[0].bom_no

        if (salesOrderId) {
          await this.db.query(
            'UPDATE sales_order SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE so_id = ?',
            [workOrderStatus, salesOrderId]
          )
        }

        const [productionPlans] = await this.db.query(
          'SELECT plan_id FROM production_plan WHERE sales_order_id = ?',
          [salesOrderId]
        )

        if (productionPlans && productionPlans.length > 0) {
          for (const plan of productionPlans) {
            await this.db.query(
              'UPDATE production_plan SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE plan_id = ?',
              [workOrderStatus, plan.plan_id]
            )
          }
        }

        if (bomNo) {
          await this.db.query(
            'UPDATE bom SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE bom_id = ?',
            [workOrderStatus, bomNo]
          )
        }
      }

      return { success: true, newStatus: workOrderStatus }
    } catch (error) {
      throw error
    }
  }
}

export default ProductionModel
