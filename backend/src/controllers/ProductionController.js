class ProductionController {
  constructor(productionModel) {
    this.productionModel = productionModel
  }

  // ============= OPERATIONS =============

  // Create operation
  async createOperation(req, res) {
    try {
      const { name, operation_name, default_workstation, is_corrective_operation, create_job_card_based_on_batch_size, batch_size, quality_inspection_template, description, sub_operations } = req.body

      if (!name || !operation_name) {
        return res.status(400).json({
          success: false,
          message: 'Missing required fields: name, operation_name'
        })
      }

      const operation = await this.productionModel.createOperation({
        name,
        operation_name,
        default_workstation,
        is_corrective_operation,
        create_job_card_based_on_batch_size,
        batch_size,
        quality_inspection_template,
        description
      })

      if (sub_operations && Array.isArray(sub_operations)) {
        for (const subOp of sub_operations) {
          await this.productionModel.addSubOperation(name, subOp)
        }
      }

      res.status(201).json({
        success: true,
        message: 'Operation created successfully',
        data: operation
      })
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error creating operation',
        error: error.message
      })
    }
  }

  // Get all operations
  async getOperations(req, res) {
    try {
      const operations = await this.productionModel.getOperations()
      res.status(200).json({
        success: true,
        data: operations,
        count: operations.length
      })
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error fetching operations',
        error: error.message
      })
    }
  }

  // Get operation by ID
  async getOperationById(req, res) {
    try {
      const { operation_id } = req.params
      const operation = await this.productionModel.getOperationById(operation_id)

      if (!operation) {
        return res.status(404).json({
          success: false,
          message: 'Operation not found'
        })
      }

      res.status(200).json({
        success: true,
        data: operation
      })
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error fetching operation',
        error: error.message
      })
    }
  }

  // Update operation
  async updateOperation(req, res) {
    try {
      const { operation_id } = req.params
      const data = req.body

      const success = await this.productionModel.updateOperation(operation_id, data)

      if (success) {
        if (data.sub_operations && Array.isArray(data.sub_operations)) {
          await this.productionModel.deleteSubOperations(operation_id)
          for (const subOp of data.sub_operations) {
            await this.productionModel.addSubOperation(operation_id, subOp)
          }
        }

        res.status(200).json({
          success: true,
          message: 'Operation updated successfully'
        })
      } else {
        res.status(404).json({
          success: false,
          message: 'Operation not found'
        })
      }
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error updating operation',
        error: error.message
      })
    }
  }

  // Delete operation
  async deleteOperation(req, res) {
    try {
      const { operation_id } = req.params

      const success = await this.productionModel.deleteOperation(operation_id)

      if (success) {
        res.status(200).json({
          success: true,
          message: 'Operation deleted successfully'
        })
      } else {
        res.status(404).json({
          success: false,
          message: 'Operation not found'
        })
      }
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error deleting operation',
        error: error.message
      })
    }
  }

  // ============= WORK ORDERS =============

  // Create work order
  async createWorkOrder(req, res) {
    try {
      const { item_code, bom_no, quantity, priority, notes, planned_start_date, planned_end_date, actual_start_date, actual_end_date, expected_delivery_date, required_items, operations } = req.body

      if (!item_code || !bom_no || !quantity) {
        return res.status(400).json({
          success: false,
          message: 'Missing required fields: item_code, bom_no, quantity'
        })
      }

      const wo_id = `WO-${Date.now()}`
      const workOrder = await this.productionModel.createWorkOrder({
        wo_id,
        item_code,
        bom_no,
        quantity,
        priority,
        notes,
        planned_start_date,
        planned_end_date,
        actual_start_date,
        actual_end_date,
        expected_delivery_date,
        status: 'Draft'
      })

      if (required_items && Array.isArray(required_items) && required_items.length > 0) {
        for (let i = 0; i < required_items.length; i++) {
          await this.productionModel.addWorkOrderItem(wo_id, { ...required_items[i], sequence: i + 1 })
        }
      }

      if (operations && Array.isArray(operations) && operations.length > 0) {
        for (let i = 0; i < operations.length; i++) {
          await this.productionModel.addWorkOrderOperation(wo_id, { ...operations[i], sequence: i + 1 })
        }

        for (let i = 0; i < operations.length; i++) {
          const operation = operations[i]
          const jc_id = `JC-${Date.now()}-${i + 1}`
          await this.productionModel.createJobCard({
            job_card_id: jc_id,
            work_order_id: wo_id,
            machine_id: null,
            operator_id: null,
            planned_quantity: quantity,
            scheduled_start_date: planned_start_date,
            scheduled_end_date: planned_end_date,
            status: 'Open',
            created_by: req.user?.username || 'system',
            notes: `Operation: ${operation.operation}, Workstation: ${operation.workstation || 'N/A'}, Time: ${operation.time || 0}h`
          })
        }
      }

      res.status(201).json({
        success: true,
        message: 'Work order and job cards created successfully',
        data: workOrder
      })
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error creating work order',
        error: error.message
      })
    }
  }

  // Get work orders
  async getWorkOrders(req, res) {
    try {
      const { status, search, assigned_to_id } = req.query

      const workOrders = await this.productionModel.getWorkOrders({
        status,
        search,
        assigned_to_id
      })

      res.status(200).json({
        success: true,
        data: workOrders,
        count: workOrders.length
      })
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error fetching work orders',
        error: error.message
      })
    }
  }

  // Get single work order
  async getWorkOrder(req, res) {
    try {
      const { wo_id } = req.params
      const workOrder = await this.productionModel.getWorkOrderById(wo_id)

      if (!workOrder) {
        return res.status(404).json({
          success: false,
          message: 'Work order not found'
        })
      }

      res.status(200).json({
        success: true,
        data: workOrder
      })
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error fetching work order',
        error: error.message
      })
    }
  }

  // Update work order
  async updateWorkOrder(req, res) {
    try {
      const { wo_id } = req.params
      const { item_code, bom_no, quantity, priority, notes, planned_start_date, planned_end_date, actual_start_date, actual_end_date, expected_delivery_date, required_items, operations } = req.body

      const success = await this.productionModel.updateWorkOrder(wo_id, {
        item_code,
        bom_no,
        quantity,
        priority,
        notes,
        planned_start_date,
        planned_end_date,
        actual_start_date,
        actual_end_date,
        expected_delivery_date
      })

      if (!success) {
        return res.status(404).json({
          success: false,
          message: 'Work order not found'
        })
      }

      if (required_items && Array.isArray(required_items)) {
        await this.productionModel.deleteAllWorkOrderItems(wo_id)
        if (required_items.length > 0) {
          for (let i = 0; i < required_items.length; i++) {
            await this.productionModel.addWorkOrderItem(wo_id, { ...required_items[i], sequence: i + 1 })
          }
        }
      }

      if (operations && Array.isArray(operations)) {
        await this.productionModel.deleteAllWorkOrderOperations(wo_id)
        if (operations.length > 0) {
          for (let i = 0; i < operations.length; i++) {
            await this.productionModel.addWorkOrderOperation(wo_id, { ...operations[i], sequence: i + 1 })
          }
        }
      }

      res.status(200).json({
        success: true,
        message: 'Work order updated successfully'
      })
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error updating work order',
        error: error.message
      })
    }
  }

  // ============= PRODUCTION PLANS =============

  // Create production plan
  async createProductionPlan(req, res) {
    try {
      const { items } = req.body

      const plan = await this.productionModel.createProductionPlan({
        plan_date: new Date(),
        week_number: Math.ceil((new Date().getDate()) / 7),
        planned_by_id: req.user?.id || 'system'
      })

      // Add items if provided
      if (items && Array.isArray(items)) {
        for (const item of items) {
          await this.productionModel.addPlanItem(plan.plan_id, item)
        }
      }

      res.status(201).json({
        success: true,
        message: 'Production plan created successfully',
        data: plan
      })
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error creating production plan',
        error: error.message
      })
    }
  }

  // Get all production plans
  async getProductionPlans(req, res) {
    try {
      const plans = await this.productionModel.getProductionPlans()
      res.status(200).json({
        success: true,
        data: plans,
        count: plans.length
      })
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error fetching production plans',
        error: error.message
      })
    }
  }

  // Get production plan details
  async getProductionPlanDetails(req, res) {
    try {
      const { plan_id } = req.params
      const plan = await this.productionModel.getProductionPlanDetails(plan_id)

      if (!plan) {
        return res.status(404).json({
          success: false,
          message: 'Production plan not found'
        })
      }

      res.status(200).json({
        success: true,
        data: plan
      })
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error fetching production plan',
        error: error.message
      })
    }
  }

  // Update production plan
  async updateProductionPlan(req, res) {
    try {
      const { plan_id } = req.params
      const success = await this.productionModel.updateProductionPlan(plan_id, req.body)

      if (!success) {
        return res.status(404).json({
          success: false,
          message: 'Production plan not found'
        })
      }

      res.status(200).json({
        success: true,
        message: 'Production plan updated successfully'
      })
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error updating production plan',
        error: error.message
      })
    }
  }

  // Delete production plan
  async deleteProductionPlan(req, res) {
    try {
      const { plan_id } = req.params
      const success = await this.productionModel.deleteProductionPlan(plan_id)

      if (!success) {
        return res.status(404).json({
          success: false,
          message: 'Production plan not found'
        })
      }

      res.status(200).json({
        success: true,
        message: 'Production plan deleted successfully'
      })
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error deleting production plan',
        error: error.message
      })
    }
  }

  // ============= PRODUCTION ENTRIES =============

  // Create production entry (daily production)
  async createProductionEntry(req, res) {
    try {
      const { work_order_id, machine_id, operator_id, entry_date, shift_no, quantity_produced, quantity_rejected, hours_worked, remarks } = req.body

      if (!work_order_id || !entry_date || !quantity_produced) {
        return res.status(400).json({
          success: false,
          message: 'Missing required fields: work_order_id, entry_date, quantity_produced'
        })
      }

      const entry = await this.productionModel.createProductionEntry({
        work_order_id,
        machine_id,
        operator_id,
        entry_date,
        shift_no,
        quantity_produced,
        quantity_rejected: quantity_rejected || 0,
        hours_worked: hours_worked || 0,
        remarks
      })

      res.status(201).json({
        success: true,
        message: 'Production entry created successfully',
        data: entry
      })
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error creating production entry',
        error: error.message
      })
    }
  }

  // Get production entries
  async getProductionEntries(req, res) {
    try {
      const { entry_date, machine_id, work_order_id } = req.query

      const entries = await this.productionModel.getProductionEntries({
        entry_date,
        machine_id,
        work_order_id
      })

      res.status(200).json({
        success: true,
        data: entries,
        count: entries.length
      })
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error fetching production entries',
        error: error.message
      })
    }
  }

  // ============= REJECTIONS =============

  // Record rejection
  async recordRejection(req, res) {
    try {
      const { production_entry_id, rejection_reason, rejection_count, root_cause, corrective_action, reported_by_id } = req.body

      if (!production_entry_id || !rejection_reason || !rejection_count) {
        return res.status(400).json({
          success: false,
          message: 'Missing required fields: production_entry_id, rejection_reason, rejection_count'
        })
      }

      const rejection = await this.productionModel.recordRejection({
        production_entry_id,
        rejection_reason,
        rejection_count,
        root_cause,
        corrective_action,
        reported_by_id
      })

      res.status(201).json({
        success: true,
        message: 'Rejection recorded successfully',
        data: rejection
      })
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error recording rejection',
        error: error.message
      })
    }
  }

  // Get rejection analysis
  async getRejectionAnalysis(req, res) {
    try {
      const { date_from, date_to } = req.query

      const analysis = await this.productionModel.getRejectionAnalysis({
        date_from,
        date_to
      })

      res.status(200).json({
        success: true,
        data: analysis
      })
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error fetching rejection analysis',
        error: error.message
      })
    }
  }

  // ============= MACHINES =============

  // Create machine
  async createMachine(req, res) {
    try {
      const { name, type, model, capacity, purchase_date, cost, maintenance_interval } = req.body

      if (!name || !type) {
        return res.status(400).json({
          success: false,
          message: 'Missing required fields: name, type'
        })
      }

      const machine = await this.productionModel.createMachine({
        name,
        type,
        model,
        capacity,
        purchase_date,
        cost,
        maintenance_interval
      })

      res.status(201).json({
        success: true,
        message: 'Machine created successfully',
        data: machine
      })
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error creating machine',
        error: error.message
      })
    }
  }

  // Get machines
  async getMachines(req, res) {
    try {
      const { status, type } = req.query

      const machines = await this.productionModel.getMachines({
        status,
        type
      })

      res.status(200).json({
        success: true,
        data: machines,
        count: machines.length
      })
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error fetching machines',
        error: error.message
      })
    }
  }

  // ============= OPERATORS =============

  // Create operator
  async createOperator(req, res) {
    try {
      const { employee_id, name, qualification, experience_years, machines_skilled_on } = req.body

      if (!name) {
        return res.status(400).json({
          success: false,
          message: 'Missing required field: name'
        })
      }

      const operator = await this.productionModel.createOperator({
        employee_id,
        name,
        qualification,
        experience_years,
        machines_skilled_on
      })

      res.status(201).json({
        success: true,
        message: 'Operator created successfully',
        data: operator
      })
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error creating operator',
        error: error.message
      })
    }
  }

  // Get operators
  async getOperators(req, res) {
    try {
      const { status } = req.query

      const operators = await this.productionModel.getOperators({
        status
      })

      res.status(200).json({
        success: true,
        data: operators,
        count: operators.length
      })
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error fetching operators',
        error: error.message
      })
    }
  }

  // ============= ANALYTICS =============

  // Get production dashboard
  async getProductionDashboard(req, res) {
    try {
      const { date } = req.query
      const dashboardDate = date || new Date().toISOString().split('T')[0]

      const dashboard = await this.productionModel.getProductionDashboard(dashboardDate)

      res.status(200).json({
        success: true,
        data: dashboard
      })
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error fetching production dashboard',
        error: error.message
      })
    }
  }

  // Get machine utilization
  async getMachineUtilization(req, res) {
    try {
      const { date_from, date_to } = req.query

      if (!date_from || !date_to) {
        return res.status(400).json({
          success: false,
          message: 'date_from and date_to are required'
        })
      }

      const utilization = await this.productionModel.getMachineUtilization(date_from, date_to)

      res.status(200).json({
        success: true,
        data: utilization
      })
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error fetching machine utilization',
        error: error.message
      })
    }
  }

  // Get operator efficiency
  async getOperatorEfficiency(req, res) {
    try {
      const { date_from, date_to } = req.query

      if (!date_from || !date_to) {
        return res.status(400).json({
          success: false,
          message: 'date_from and date_to are required'
        })
      }

      const efficiency = await this.productionModel.getOperatorEfficiency(date_from, date_to)

      res.status(200).json({
        success: true,
        data: efficiency
      })
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error fetching operator efficiency',
        error: error.message
      })
    }
  }

  // ============= BILLS OF MATERIALS (BOM) =============

  async getBOMs(req, res) {
    try {
      const { status = '', search = '', item_code = '' } = req.query
      const boms = await this.productionModel.getBOMs({ status, search, item_code })
      res.status(200).json({
        success: true,
        data: boms
      })
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error fetching BOMs',
        error: error.message
      })
    }
  }

  async getBOMDetails(req, res) {
    try {
      const { bom_id } = req.params
      const bom = await this.productionModel.getBOMDetails(bom_id)
      if (!bom) {
        return res.status(404).json({
          success: false,
          message: 'BOM not found'
        })
      }
      res.status(200).json({
        success: true,
        data: bom
      })
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error fetching BOM details',
        error: error.message
      })
    }
  }

  async createBOM(req, res) {
    try {
      const { item_code, product_name, description, quantity, uom, status, revision, effective_date, lines, operations, scrapItems } = req.body

      if (!item_code) {
        return res.status(400).json({
          success: false,
          message: 'item_code is required'
        })
      }

      const bom_id = `BOM-${Date.now()}`
      const bom = await this.productionModel.createBOM({
        bom_id,
        item_code,
        product_name,
        description,
        quantity,
        uom,
        status: status || 'Draft',
        revision: revision || 1,
        effective_date,
        created_by: req.user?.username || 'system'
      })

      if (lines && lines.length > 0) {
        for (let i = 0; i < lines.length; i++) {
          await this.productionModel.addBOMLine(bom_id, { ...lines[i], sequence: i + 1 })
        }
      }

      if (operations && operations.length > 0) {
        for (let i = 0; i < operations.length; i++) {
          await this.productionModel.addBOMOperation(bom_id, { ...operations[i], sequence: i + 1 })
        }
      }

      if (scrapItems && scrapItems.length > 0) {
        for (let i = 0; i < scrapItems.length; i++) {
          await this.productionModel.addBOMScrapItem(bom_id, { ...scrapItems[i], sequence: i + 1 })
        }
      }

      res.status(201).json({
        success: true,
        message: 'BOM created successfully',
        data: bom
      })
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error creating BOM',
        error: error.message
      })
    }
  }

  async updateBOM(req, res) {
    try {
      const { bom_id } = req.params
      const { item_code, description, quantity, uom, status, revision, effective_date, lines, operations, scrapItems } = req.body

      const bom = await this.productionModel.updateBOM(bom_id, {
        item_code,
        description,
        quantity,
        uom,
        status,
        revision,
        effective_date
      })

      if (lines && Array.isArray(lines) && lines.length > 0) {
        await this.productionModel.deleteAllBOMLines(bom_id)
        for (let i = 0; i < lines.length; i++) {
          await this.productionModel.addBOMLine(bom_id, { ...lines[i], sequence: i + 1 })
        }
      }

      if (operations && Array.isArray(operations) && operations.length > 0) {
        await this.productionModel.deleteAllBOMOperations(bom_id)
        for (let i = 0; i < operations.length; i++) {
          await this.productionModel.addBOMOperation(bom_id, { ...operations[i], sequence: i + 1 })
        }
      }

      if (scrapItems && Array.isArray(scrapItems) && scrapItems.length > 0) {
        await this.productionModel.deleteAllBOMScrapItems(bom_id)
        for (let i = 0; i < scrapItems.length; i++) {
          await this.productionModel.addBOMScrapItem(bom_id, { ...scrapItems[i], sequence: i + 1 })
        }
      }

      res.status(200).json({
        success: true,
        message: 'BOM updated successfully',
        data: bom
      })
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error updating BOM',
        error: error.message
      })
    }
  }

  async deleteBOM(req, res) {
    try {
      const { bom_id } = req.params
      await this.productionModel.deleteBOM(bom_id)

      res.status(200).json({
        success: true,
        message: 'BOM deleted successfully'
      })
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error deleting BOM',
        error: error.message
      })
    }
  }

  // ============= JOB CARDS =============

  async getJobCards(req, res) {
    try {
      const { status = '', search = '', work_order_id = '' } = req.query
      const jobCards = await this.productionModel.getJobCards(status, search, work_order_id)
      res.status(200).json({
        success: true,
        data: jobCards
      })
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error fetching job cards',
        error: error.message
      })
    }
  }

  async getJobCardDetails(req, res) {
    try {
      const { job_card_id } = req.params
      const jobCard = await this.productionModel.getJobCardDetails(job_card_id)
      if (!jobCard) {
        return res.status(404).json({
          success: false,
          message: 'Job card not found'
        })
      }
      res.status(200).json({
        success: true,
        data: jobCard
      })
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error fetching job card details',
        error: error.message
      })
    }
  }

  async createJobCard(req, res) {
    try {
      const { work_order_id, machine_id, operator_id, planned_quantity, scheduled_start_date, scheduled_end_date, notes } = req.body

      if (!work_order_id || !machine_id || !planned_quantity) {
        return res.status(400).json({
          success: false,
          message: 'work_order_id, machine_id, and planned_quantity are required'
        })
      }

      const job_card_id = `JC-${Date.now()}`
      const jobCard = await this.productionModel.createJobCard({
        job_card_id,
        work_order_id,
        machine_id,
        operator_id,
        planned_quantity,
        scheduled_start_date,
        scheduled_end_date,
        status: 'Open',
        created_by: req.user?.username || 'system',
        notes
      })

      res.status(201).json({
        success: true,
        message: 'Job card created successfully',
        data: jobCard
      })
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error creating job card',
        error: error.message
      })
    }
  }

  async updateJobCard(req, res) {
    try {
      const { job_card_id } = req.params
      const { machine_id, operator_id, planned_quantity, produced_quantity, rejected_quantity, scheduled_start_date, scheduled_end_date, actual_start_date, actual_end_date, status, notes } = req.body

      const success = await this.productionModel.updateJobCard(job_card_id, {
        machine_id,
        operator_id,
        planned_quantity,
        produced_quantity,
        rejected_quantity,
        scheduled_start_date,
        scheduled_end_date,
        actual_start_date,
        actual_end_date,
        status,
        notes
      })

      if (success) {
        res.status(200).json({
          success: true,
          message: 'Job card updated successfully'
        })
      } else {
        res.status(404).json({
          success: false,
          message: 'Job card not found'
        })
      }
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error updating job card',
        error: error.message
      })
    }
  }

  async deleteJobCard(req, res) {
    try {
      const { job_card_id } = req.params
      await this.productionModel.deleteJobCard(job_card_id)

      res.status(200).json({
        success: true,
        message: 'Job card deleted successfully'
      })
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error deleting job card',
        error: error.message
      })
    }
  }

  // ============= WORKSTATIONS =============

  async createWorkstation(req, res) {
    try {
      const { name, workstation_name, description, location, capacity_per_hour, is_active } = req.body

      if (!name || !workstation_name) {
        return res.status(400).json({
          success: false,
          message: 'Missing required fields: name, workstation_name'
        })
      }

      const workstation = await this.productionModel.createWorkstation({
        name,
        workstation_name,
        description: description || '',
        location: location || '',
        capacity_per_hour: capacity_per_hour || 0,
        is_active: is_active !== false ? true : false
      })

      res.status(201).json({
        success: true,
        message: 'Workstation created successfully',
        data: workstation
      })
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error creating workstation',
        error: error.message
      })
    }
  }

  async getWorkstations(req, res) {
    try {
      const workstations = await this.productionModel.getWorkstations()
      res.status(200).json({
        success: true,
        data: workstations,
        count: workstations.length
      })
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error fetching workstations',
        error: error.message
      })
    }
  }

  async getWorkstationById(req, res) {
    try {
      const { workstation_id } = req.params
      const workstation = await this.productionModel.getWorkstationById(workstation_id)

      if (!workstation) {
        return res.status(404).json({
          success: false,
          message: 'Workstation not found'
        })
      }

      res.status(200).json({
        success: true,
        data: workstation
      })
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error fetching workstation',
        error: error.message
      })
    }
  }

  async updateWorkstation(req, res) {
    try {
      const { workstation_id } = req.params
      const data = req.body

      const success = await this.productionModel.updateWorkstation(workstation_id, data)

      if (!success) {
        return res.status(404).json({
          success: false,
          message: 'Workstation not found'
        })
      }

      res.status(200).json({
        success: true,
        message: 'Workstation updated successfully'
      })
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error updating workstation',
        error: error.message
      })
    }
  }

  async deleteWorkstation(req, res) {
    try {
      const { workstation_id } = req.params

      const success = await this.productionModel.deleteWorkstation(workstation_id)

      if (!success) {
        return res.status(404).json({
          success: false,
          message: 'Workstation not found'
        })
      }

      res.status(200).json({
        success: true,
        message: 'Workstation deleted successfully'
      })
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error deleting workstation',
        error: error.message
      })
    }
  }
}

export default ProductionController
