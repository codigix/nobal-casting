class ProductionController {
  constructor(productionModel) {
    this.productionModel = productionModel
  }

  // ============= OPERATIONS =============

  // Create operation
  async createOperation(req, res) {
    try {
      const { name, operation_name, default_workstation, is_corrective_operation, create_job_card_based_on_batch_size, batch_size, quality_inspection_template, description, operation_type, hourly_rate, sub_operations } = req.body

      if (!name) {
        return res.status(400).json({
          success: false,
          message: 'Missing required field: name'
        })
      }

      const operation = await this.productionModel.createOperation({
        name,
        operation_name: operation_name || name,
        default_workstation,
        is_corrective_operation,
        create_job_card_based_on_batch_size,
        batch_size,
        quality_inspection_template,
        description,
        operation_type,
        hourly_rate
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
      const { item_code, bom_no, quantity, priority, notes, sales_order_id, planned_start_date, planned_end_date, actual_start_date, actual_end_date, expected_delivery_date, required_items, operations } = req.body

      if (!item_code || !quantity) {
        return res.status(400).json({
          success: false,
          message: 'Missing required fields: item_code, quantity'
        })
      }

      const wo_id = `WO-${Date.now()}`
      const workOrder = await this.productionModel.createWorkOrder({
        wo_id,
        item_code,
        bom_no: bom_no || null,
        quantity,
        priority: priority || 'medium',
        notes: notes || '',
        sales_order_id: sales_order_id || null,
        planned_start_date: planned_start_date || null,
        planned_end_date: planned_end_date || null,
        actual_start_date: actual_start_date || null,
        actual_end_date: actual_end_date || null,
        expected_delivery_date: expected_delivery_date || null,
        status: 'Draft'
      })

      // NEW: Automatically allocate materials for the work order based on BOM
      if (required_items && Array.isArray(required_items) && required_items.length > 0) {
        try {
          const InventoryModel = (await import('../models/InventoryModel.js')).default;
          const inventoryModel = new InventoryModel(this.productionModel.db);
          await inventoryModel.allocateMaterialsForWorkOrder(
            wo_id,
            required_items,
            req.user?.username || 'system'
          );
        } catch (allocError) {
          console.error(`Material allocation failed for Work Order ${wo_id}:`, allocError.message);
          // We don't throw here to avoid failing WO creation, but we log it
        }
      }

      if (required_items && Array.isArray(required_items) && required_items.length > 0) {
        for (let i = 0; i < required_items.length; i++) {
          await this.productionModel.addWorkOrderItem(wo_id, { ...required_items[i], sequence: i + 1 })
        }
      }

      let createdJobCards = []
      
      // If operations are provided explicitly, use them
      if (operations && Array.isArray(operations) && operations.length > 0) {
        for (let i = 0; i < operations.length; i++) {
          await this.productionModel.addWorkOrderOperation(wo_id, { ...operations[i], sequence: i + 1 })
        }

        for (let i = 0; i < operations.length; i++) {
          const operation = operations[i]
          const jc_id = `JC-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
          const operationName = operation.operation_name || operation.operation || ''
          const workstationType = operation.workstation_type || operation.workstation || operation.machine_id || ''
          const operationTime = operation.operation_time || operation.time || operation.proportional_time || 0
          const hourlyRate = operation.hourly_rate || 0
          const operatingCost = operation.operating_cost || 0
          
          const jobCard = await this.productionModel.createJobCard({
            job_card_id: jc_id,
            work_order_id: wo_id,
            operation: operationName,
            operation_sequence: operation.sequence || (i + 1),
            machine_id: workstationType,
            operator_id: '',
            planned_quantity: quantity,
            operation_time: parseFloat(operationTime) || 0,
            hourly_rate: parseFloat(hourlyRate) || 0,
            operating_cost: parseFloat(operatingCost) || 0,
            operation_type: operation.operation_type || 'IN_HOUSE',
            scheduled_start_date: new Date(),
            scheduled_end_date: new Date(),
            status: 'draft',
            created_by: req.user?.username || 'system',
            notes: operation.notes || ''
          })
          createdJobCards.push(jobCard)
        }
      } else if (!operations || (Array.isArray(operations) && operations.length === 0)) {
        // Automatically generate job cards from BOM (or default) if operations not provided in payload or empty
        console.log(`Attempting to auto-generate job cards for work order ${wo_id}`)
        try {
          const generatedCards = await this.productionModel.generateJobCardsForWorkOrder(
            wo_id,
            req.user?.username || 'system'
          )
          createdJobCards = generatedCards || []
        } catch (genErr) {
          console.warn(`Could not auto-generate job cards for ${wo_id}:`, genErr.message)
        }
      }

      res.status(201).json({
        success: true,
        message: `Work order created successfully with ${createdJobCards.length} job card(s)`,
        data: workOrder,
        jobCardsCreated: createdJobCards.length,
        jobCards: createdJobCards
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
      const workOrders = await this.productionModel.getWorkOrders(req.query)

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
      const { item_code, bom_no, quantity, priority, notes, sales_order_id, planned_start_date, planned_end_date, actual_start_date, actual_end_date, expected_delivery_date, required_items, operations } = req.body

      const success = await this.productionModel.updateWorkOrder(wo_id, {
        item_code,
        bom_no,
        quantity,
        priority,
        notes,
        sales_order_id,
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
        
        // Delete existing job cards for this work order to recreate them
        await this.productionModel.deleteJobCardsByWorkOrder(wo_id)

        if (operations.length > 0) {
          for (let i = 0; i < operations.length; i++) {
            await this.productionModel.addWorkOrderOperation(wo_id, { ...operations[i], sequence: i + 1 })
          }

          // Recreate Job Cards
          for (let i = 0; i < operations.length; i++) {
            const operation = operations[i]
            const jc_id = `JC-${Date.now()}-${i + 1}`
            const opName = operation.operation || operation.operation_name || ''
            const wsType = operation.workstation || operation.workstation_type || ''
            const opTime = operation.time || operation.operation_time || 0
            const hRate = operation.hourly_rate || 0
            const opCost = operation.operating_cost || 0

            await this.productionModel.createJobCard({
              job_card_id: jc_id,
              work_order_id: wo_id,
              operation: opName,
              operation_sequence: operation.sequence || (i + 1),
              machine_id: wsType,
              operator_id: '',
              planned_quantity: quantity,
              operation_time: parseFloat(opTime) || 0,
              hourly_rate: parseFloat(hRate) || 0,
              operating_cost: parseFloat(opCost) || 0,
              operation_type: operation.operation_type || 'IN_HOUSE',
              scheduled_start_date: planned_start_date,
              scheduled_end_date: planned_end_date,
              status: 'draft',
              created_by: req.user?.username || 'system',
              notes: operation.notes || ''
            })
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

  async deleteWorkOrder(req, res) {
    try {
      const { wo_id } = req.params

      const success = await this.productionModel.deleteWorkOrder(wo_id)

      if (!success) {
        return res.status(404).json({
          success: false,
          message: 'Work order not found'
        })
      }

      res.status(200).json({
        success: true,
        message: 'Work order deleted successfully'
      })
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error deleting work order',
        error: error.message
      })
    }
  }

  async truncateWorkOrders(req, res) {
    try {
      await this.productionModel.truncateWorkOrders()
      res.status(200).json({
        success: true,
        message: 'All work orders truncated successfully'
      })
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error truncating work orders',
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

  async syncBOMStatuses(req, res) {
    try {
      const result = await this.productionModel.syncAllBOMStatuses()
      res.status(200).json({
        success: true,
        message: 'BOM statuses synchronized with Job Card activity',
        data: result
      })
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error synchronizing BOM statuses',
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
      const { item_code, product_name, description, quantity, uom, status, revision, effective_date, lines, operations, scrapItems, rawMaterials, total_cost, selling_rate, item_group, items_group } = req.body

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
        description,
        quantity,
        uom,
        status: status || 'Draft',
        revision: revision || 1,
        effective_date,
        created_by: req.user?.username || 'system',
        total_cost: total_cost || 0,
        selling_rate: selling_rate || 0
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

      if (rawMaterials && rawMaterials.length > 0) {
        for (let i = 0; i < rawMaterials.length; i++) {
          await this.productionModel.addBOMRawMaterial(bom_id, { ...rawMaterials[i], sequence: i + 1 })
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
    const db = req.app.locals.db
    try {
      const { bom_id } = req.params
      const { item_code, description, quantity, uom, status, revision, effective_date, lines, operations, scrapItems, rawMaterials, total_cost, selling_rate } = req.body

      const bom = await this.productionModel.updateBOM(bom_id, {
        item_code,
        description,
        quantity,
        uom,
        status,
        revision,
        effective_date,
        total_cost: total_cost || 0,
        selling_rate: selling_rate || 0
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

      if (rawMaterials && Array.isArray(rawMaterials) && rawMaterials.length > 0) {
        await this.productionModel.deleteAllBOMRawMaterials(bom_id)
        for (let i = 0; i < rawMaterials.length; i++) {
          await this.productionModel.addBOMRawMaterial(bom_id, { ...rawMaterials[i], sequence: i + 1 })
        }
      }

      // Update all related sales orders with the new BOM data
      try {
        const [salesOrders] = await db.execute(
          'SELECT sales_order_id FROM selling_sales_order WHERE bom_id = ? AND deleted_at IS NULL',
          [bom_id]
        )

        if (salesOrders && salesOrders.length > 0) {
          const updatedBOM = await this.productionModel.getBOMDetails(bom_id)
          const bomFinishedGoods = (updatedBOM.lines || []).filter(item => 
            item.component_type === 'FG' || item.fg_sub_assembly === 'FG'
          )
          const bomRawMaterials = updatedBOM.rawMaterials || []
          const bomOperations = updatedBOM.operations || []

          // Convert BOM raw materials to sales order items format
          const salesOrderItems = (bomRawMaterials || []).map(material => ({
            item_code: material.item_code || material.component_code || '',
            item_name: material.item_name || material.component_description || '',
            field_description: material.component_description || material.description || '',
            qty: material.quantity || 0,
            rate: material.rate || 0,
            amount: (material.quantity || 0) * (material.rate || 0),
            item_group: material.item_group || 'Uncategorized',
            warehouse: material.warehouse || ''
          }))

          for (const so of salesOrders) {
            await db.execute(
              `UPDATE selling_sales_order SET 
                bom_finished_goods = ?, 
                bom_raw_materials = ?, 
                bom_operations = ?,
                items = ?,
                updated_at = NOW()
               WHERE sales_order_id = ?`,
              [
                JSON.stringify(bomFinishedGoods),
                JSON.stringify(bomRawMaterials),
                JSON.stringify(bomOperations),
                JSON.stringify(salesOrderItems),
                so.sales_order_id
              ]
            )
          }
        }
      } catch (syncErr) {
        console.error('Error syncing BOM to sales orders:', syncErr)
      }

      res.status(200).json({
        success: true,
        message: 'BOM updated successfully and synced to all related sales orders',
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

  async truncateBOMs(req, res) {
    try {
      await this.productionModel.truncateBOMs()
      res.status(200).json({
        success: true,
        message: 'All BOMs truncated successfully'
      })
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error truncating BOMs',
        error: error.message
      })
    }
  }

  // ============= JOB CARDS =============

  async getJobCards(req, res) {
    try {
      const jobCards = await this.productionModel.getJobCards(req.query)
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
      const { work_order_id, machine_id, operator_id, operation, operation_sequence, planned_quantity, operation_time, hourly_rate, scheduled_start_date, scheduled_end_date, status, notes } = req.body

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
        operation,
        operation_sequence,
        planned_quantity,
        operation_time: parseFloat(operation_time) || 0,
        hourly_rate: parseFloat(hourly_rate) || 0,
        scheduled_start_date,
        scheduled_end_date,
        status: status || 'draft',
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

  async generateJobCardsForWorkOrder(req, res) {
    try {
      const { work_order_id } = req.params

      if (!work_order_id) {
        return res.status(400).json({
          success: false,
          message: 'work_order_id is required'
        })
      }

      const createdCards = await this.productionModel.generateJobCardsForWorkOrder(
        work_order_id,
        req.user?.username || 'system'
      )

      res.status(201).json({
        success: true,
        message: `${createdCards.length} job cards generated successfully`,
        data: createdCards
      })
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error generating job cards',
        error: error.message
      })
    }
  }

  async updateJobCard(req, res) {
    try {
      const { job_card_id } = req.params
      const { machine_id, operator_id, operation, operation_sequence, planned_quantity, produced_quantity, rejected_quantity, operation_time, hourly_rate, scheduled_start_date, scheduled_end_date, actual_start_date, actual_end_date, status, notes } = req.body

      if (status) {
        await this.productionModel.validateJobCardStatusTransition(job_card_id, status)
      }

      const success = await this.productionModel.updateJobCard(job_card_id, {
        machine_id,
        operator_id,
        operation,
        operation_sequence,
        planned_quantity,
        produced_quantity,
        rejected_quantity,
        operation_time: operation_time !== undefined ? parseFloat(operation_time) : undefined,
        hourly_rate: hourly_rate !== undefined ? parseFloat(hourly_rate) : undefined,
        scheduled_start_date,
        scheduled_end_date,
        actual_start_date,
        actual_end_date,
        status,
        notes
      })

      if (success) {
        const jobCard = await this.productionModel.getJobCardDetails(job_card_id)
        if (jobCard?.work_order_id) {
          const statusNormalized = (status || '').toLowerCase()
          
          if (statusNormalized === 'in-progress' || statusNormalized === 'pending') {
            await this.productionModel.checkAndUpdateWorkOrderProgress(jobCard.work_order_id)
          }
          
          if (statusNormalized === 'completed') {
            await this.productionModel.checkAndUpdateWorkOrderCompletion(jobCard.work_order_id)
          }
        }

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
      res.status(400).json({
        success: false,
        message: 'Error updating job card',
        error: error.message
      })
    }
  }

  async updateJobCardStatus(req, res) {
    try {
      const { job_card_id } = req.params
      const { status } = req.body

      if (!status) {
        return res.status(400).json({
          success: false,
          message: 'Status is required'
        })
      }

      const result = await this.productionModel.updateJobCardStatus(job_card_id, status)

      res.status(200).json({
        success: true,
        message: 'Job card status and related entities updated successfully',
        data: result
      })
    } catch (error) {
      res.status(400).json({
        success: false,
        message: 'Error updating job card status',
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

  async truncateJobCards(req, res) {
    try {
      await this.productionModel.truncateJobCards()
      res.status(200).json({
        success: true,
        message: 'All job cards truncated successfully'
      })
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error truncating job cards',
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

  // ============= ANALYTICS =============

  async getProductionDashboard(req, res) {
    try {
      const { date } = req.query
      const dashboard = await this.productionModel.getProductionDashboard(date)
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

  async getMachineUtilization(req, res) {
    try {
      const { date_from, date_to } = req.query
      const machineUtilization = await this.productionModel.getMachineUtilization(date_from, date_to)
      res.status(200).json({
        success: true,
        data: machineUtilization
      })
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error fetching machine utilization',
        error: error.message
      })
    }
  }

  async getOperatorEfficiency(req, res) {
    try {
      const { date_from, date_to } = req.query
      const operatorEfficiency = await this.productionModel.getOperatorEfficiency(date_from, date_to)
      res.status(200).json({
        success: true,
        data: operatorEfficiency
      })
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error fetching operator efficiency',
        error: error.message
      })
    }
  }

  async recordRejection(req, res) {
    try {
      const { job_card_id, operator_name, machine, rejection_reason, rejected_qty, notes } = req.body

      if (!job_card_id || !rejection_reason || rejected_qty === undefined) {
        return res.status(400).json({
          success: false,
          message: 'Missing required fields: job_card_id, rejection_reason, rejected_qty'
        })
      }

      const rejection = await this.productionModel.recordRejection({
        job_card_id,
        operator_name,
        machine,
        rejection_reason,
        rejected_qty,
        notes
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

  async getRejectionAnalysis(req, res) {
    try {
      const { date_from, date_to } = req.query
      const analysis = await this.productionModel.getRejectionAnalysis(date_from, date_to)
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

  async createTimeLog(req, res) {
    try {
      const { 
        job_card_id, 
        day_number, 
        log_date, 
        employee_id, 
        operator_name, 
        workstation_name, 
        shift, 
        from_time, 
        to_time, 
        completed_qty, 
        accepted_qty, 
        rejected_qty, 
        scrap_qty, 
        time_in_minutes,
        inhouse,
        outsource
      } = req.body

      if (!job_card_id) {
        return res.status(400).json({
          success: false,
          message: 'Missing required field: job_card_id'
        })
      }

      const timeLog = await this.productionModel.createTimeLog({
        job_card_id,
        day_number,
        log_date,
        employee_id,
        operator_name,
        workstation_name,
        shift,
        from_time,
        to_time,
        completed_qty,
        accepted_qty,
        rejected_qty,
        scrap_qty,
        time_in_minutes,
        inhouse,
        outsource
      })

      res.status(201).json({
        success: true,
        message: 'Time log created successfully',
        data: timeLog
      })
    } catch (error) {
      const statusCode = error.message.includes('Quantity Validation Error') ? 400 : 500;
      res.status(statusCode).json({
        success: false,
        message: 'Error creating time log',
        error: error.message
      })
    }
  }

  async getTimeLogs(req, res) {
    try {
      const { job_card_id } = req.query

      const timeLogs = await this.productionModel.getTimeLogs(job_card_id)

      res.json({
        success: true,
        data: timeLogs || []
      })
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error fetching time logs',
        error: error.message
      })
    }
  }

  async deleteTimeLog(req, res) {
    try {
      const { id } = req.params

      await this.productionModel.deleteTimeLog(id)

      res.json({
        success: true,
        message: 'Time log deleted successfully'
      })
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error deleting time log',
        error: error.message
      })
    }
  }

  async createRejection(req, res) {
    try {
      const { job_card_id, day_number, log_date, accepted_qty, rejection_reason, rejected_qty, scrap_qty, notes } = req.body

      if (!job_card_id) {
        return res.status(400).json({
          success: false,
          message: 'Missing required field: job_card_id'
        })
      }

      const rejection = await this.productionModel.createRejection({
        job_card_id,
        day_number,
        log_date,
        accepted_qty,
        rejection_reason,
        rejected_qty,
        scrap_qty,
        notes
      })

      res.status(201).json({
        success: true,
        message: 'Rejection entry created successfully',
        data: rejection
      })
    } catch (error) {
      const statusCode = error.message.includes('Quantity Validation Error') ? 400 : 500;
      res.status(statusCode).json({
        success: false,
        message: 'Error creating rejection',
        error: error.message
      })
    }
  }

  async getRejections(req, res) {
    try {
      const { job_card_id } = req.query

      const rejections = await this.productionModel.getRejections(job_card_id)

      res.json({
        success: true,
        data: rejections || []
      })
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error fetching rejections',
        error: error.message
      })
    }
  }

  async deleteRejection(req, res) {
    try {
      const { id } = req.params

      await this.productionModel.deleteRejection(id)

      res.json({
        success: true,
        message: 'Rejection entry deleted successfully'
      })
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error deleting rejection',
        error: error.message
      })
    }
  }

  async createDowntime(req, res) {
    try {
      const { job_card_id, day_number, log_date, downtime_type, downtime_reason, from_time, to_time, duration_minutes } = req.body

      if (!job_card_id || !downtime_type || !from_time || !to_time) {
        return res.status(400).json({
          success: false,
          message: 'Missing required fields: job_card_id, downtime_type, from_time, to_time'
        })
      }

      const downtime = await this.productionModel.createDowntime({
        job_card_id,
        day_number,
        log_date,
        downtime_type,
        downtime_reason,
        from_time,
        to_time,
        duration_minutes
      })

      res.status(201).json({
        success: true,
        message: 'Downtime entry created successfully',
        data: downtime
      })
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error creating downtime',
        error: error.message
      })
    }
  }

  async getDowntimes(req, res) {
    try {
      const { job_card_id } = req.query

      const downtimes = await this.productionModel.getDowntimes(job_card_id)

      res.json({
        success: true,
        data: downtimes || []
      })
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error fetching downtimes',
        error: error.message
      })
    }
  }

  async deleteDowntime(req, res) {
    try {
      const { id } = req.params

      await this.productionModel.deleteDowntime(id)

      res.json({
        success: true,
        message: 'Downtime entry deleted successfully'
      })
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error deleting downtime',
        error: error.message
      })
    }
  }

  async startOperation(req, res) {
    try {
      const { job_card_id } = req.params
      const { actual_start_date, workstation_id, employee_id, start_date, start_time, inhouse, outsource, notes } = req.body

      if (!actual_start_date) {
        return res.status(400).json({
          success: false,
          error: 'actual_start_date is required'
        })
      }

      if (!employee_id) {
        return res.status(400).json({
          success: false,
          error: 'employee_id is required'
        })
      }

      const userId = req.user?.user_id || 'system'

      const result = await this.productionModel.startOperation(job_card_id, {
        actual_start_date,
        workstation_id,
        employee_id,
        start_date,
        start_time,
        inhouse,
        outsource,
        notes,
        created_by: userId
      })

      res.json({
        success: true,
        data: result,
        message: 'Operation started successfully'
      })
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message
      })
    }
  }

  async endOperation(req, res) {
    try {
      const { job_card_id } = req.params
      const { actual_end_date, next_operation_id, notes } = req.body

      if (!actual_end_date) {
        return res.status(400).json({
          success: false,
          error: 'actual_end_date is required'
        })
      }

      const userId = req.user?.user_id || 'system'

      const result = await this.productionModel.endOperation(job_card_id, {
        actual_end_date,
        next_operation_id,
        notes,
        created_by: userId
      })

      res.json({
        success: true,
        data: result,
        message: 'Operation ended successfully'
      })
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message
      })
    }
  }

  async getOperationLogs(req, res) {
    try {
      const { job_card_id } = req.params

      const logs = await this.productionModel.getOperationLogs(job_card_id)

      res.json({
        success: true,
        data: logs
      })
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message
      })
    }
  }

  async createOutwardChallan(req, res) {
    try {
      const { job_card_id, vendor_id, vendor_name, expected_return_date, notes } = req.body

      if (!job_card_id) {
        return res.status(400).json({
          success: false,
          message: 'Missing required field: job_card_id'
        })
      }

      const challan = await this.productionModel.createOutwardChallan({
        job_card_id,
        vendor_id,
        vendor_name,
        expected_return_date,
        notes,
        created_by: req.user?.id || 'system'
      })

      res.status(201).json({
        success: true,
        message: 'Outward challan created successfully',
        data: challan
      })
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error creating outward challan',
        error: error.message
      })
    }
  }

  async getOutwardChallans(req, res) {
    try {
      const { job_card_id } = req.query

      if (!job_card_id) {
        return res.status(400).json({
          success: false,
          message: 'Missing required parameter: job_card_id'
        })
      }

      const challans = await this.productionModel.getOutwardChallans(job_card_id)
      res.json({
        success: true,
        data: challans || []
      })
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error fetching outward challans',
        error: error.message
      })
    }
  }

  async createInwardChallan(req, res) {
    try {
      const { job_card_id, outward_challan_id, vendor_id, vendor_name, quantity_received, quantity_accepted, quantity_rejected, notes } = req.body

      if (!job_card_id) {
        return res.status(400).json({
          success: false,
          message: 'Missing required field: job_card_id'
        })
      }

      const challan = await this.productionModel.createInwardChallan({
        job_card_id,
        outward_challan_id,
        vendor_id,
        vendor_name,
        quantity_received,
        quantity_accepted,
        quantity_rejected,
        notes,
        created_by: req.user?.id || 'system'
      })

      res.status(201).json({
        success: true,
        message: 'Inward challan created successfully',
        data: challan
      })
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error creating inward challan',
        error: error.message
      })
    }
  }

  async getInwardChallans(req, res) {
    try {
      const { job_card_id } = req.query

      if (!job_card_id) {
        return res.status(400).json({
          success: false,
          message: 'Missing required parameter: job_card_id'
        })
      }

      const challans = await this.productionModel.getInwardChallans(job_card_id)
      res.json({
        success: true,
        data: challans || []
      })
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error fetching inward challans',
        error: error.message
      })
    }
  }

  async updateInwardChallan(req, res) {
    try {
      const { id } = req.params
      const { quantity_received, quantity_accepted, quantity_rejected, notes, status } = req.body

      await this.productionModel.updateInwardChallan(id, {
        quantity_received,
        quantity_accepted,
        quantity_rejected,
        notes,
        status
      })

      res.json({
        success: true,
        message: 'Inward challan updated successfully'
      })
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error updating inward challan',
        error: error.message
      })
    }
  }

  async createMaterialRequestFromBOM(bom_id, rawMaterials) {
    const db = this.productionModel.db
    
    if (!rawMaterials || rawMaterials.length === 0) {
      return null
    }

    try {
      const mr_id = 'MR-' + Date.now()
      const request_date = new Date().toISOString().split('T')[0]

      await db.query(
        `INSERT INTO material_request 
         (mr_id, series_no, transition_date, requested_by_id, department, purpose, 
          request_date, required_by_date, target_warehouse, source_warehouse, items_notes, status) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [mr_id, `BOM-${bom_id}`, null, 'system', 'Production', 'purchase', 
         request_date, null, null, null, `Auto-created from BOM: ${bom_id}`, 'draft']
      )

      for (const material of rawMaterials) {
        const mr_item_id = 'MRI-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9)
        await db.query(
          'INSERT INTO material_request_item (mr_item_id, mr_id, item_code, qty, uom, purpose) VALUES (?, ?, ?, ?, ?, ?)',
          [mr_item_id, mr_id, material.item_code, parseFloat(material.qty) || 0, material.uom || 'Kg', null]
        )
      }

      return mr_id
    } catch (error) {
      console.error('Error creating material request from BOM:', error)
      return null
    }
  }

  async createStockMovementsFromBOM(bom_id, mr_id, rawMaterials) {
    const db = this.productionModel.db
    
    if (!rawMaterials || rawMaterials.length === 0) {
      return []
    }

    try {
      const movements = []
      
      for (const material of rawMaterials) {
        const transaction_no = 'SM-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9)
        
        await db.query(
          `INSERT INTO stock_movements (transaction_no, item_code, warehouse_id, movement_type, quantity, 
           reference_type, reference_name, notes, created_by) 
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [transaction_no, material.item_code, material.source_warehouse || 1, 'OUT', 
           parseFloat(material.qty) || 0, 'BOM', bom_id, 
           `Material request from BOM: ${bom_id} (MR: ${mr_id})`, 'system']
        )
        
        movements.push(transaction_no)
      }

      return movements
    } catch (error) {
      console.error('Error creating stock movements from BOM:', error)
      return []
    }
  }
}

export default ProductionController
