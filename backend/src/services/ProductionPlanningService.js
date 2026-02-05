export class ProductionPlanningService {
  constructor(db) {
    this.db = db
  }

  async generateProductionPlanFromSalesOrder(salesOrderId) {
    try {
      const salesOrder = await this.getSalesOrderDetails(salesOrderId)
      if (!salesOrder) {
        throw new Error(`Sales Order ${salesOrderId} not found`)
      }

      const fgQuantity = this.extractFGQuantity(salesOrder)
      const bomId = salesOrder.bom_id || salesOrder.bom_no

      if (!bomId) {
        throw new Error('Sales Order does not have a BOM assigned')
      }

      const bomData = await this.getBOMDetails(bomId)
      if (!bomData) {
        throw new Error(`BOM ${bomId} not found`)
      }

      const plan = {
        plan_id: `PP-${Date.now()}`,
        bom_id: bomId,
        finished_goods: [],
        sub_assemblies: [],
        raw_materials: [],
        operations: [],
        fg_operations: []
      }

      await this.processFinishedGoodsBOM(bomData, fgQuantity, plan)

      return plan
    } catch (error) {
      throw error
    }
  }

  async getSalesOrderDetails(salesOrderId) {
    try {
      const [orders] = await this.db.execute(
        'SELECT * FROM selling_sales_order WHERE sales_order_id = ?',
        [salesOrderId]
      )
      
      if (!orders || orders.length === 0) return null

      const order = orders[0]
      
      try {
        if (order.items && typeof order.items === 'string') {
          order.items = JSON.parse(order.items)
        }
        if (order.bom_finished_goods && typeof order.bom_finished_goods === 'string') {
          order.bom_finished_goods = JSON.parse(order.bom_finished_goods)
        }
        if (order.bom_raw_materials && typeof order.bom_raw_materials === 'string') {
          order.bom_raw_materials = JSON.parse(order.bom_raw_materials)
        }
        if (order.bom_operations && typeof order.bom_operations === 'string') {
          order.bom_operations = JSON.parse(order.bom_operations)
        }
      } catch (parseErr) {
        console.warn('Warning: Could not parse JSON fields in sales order')
      }

      return order
    } catch (error) {
      throw error
    }
  }

  extractFGQuantity(salesOrder) {
    if (salesOrder.qty) {
      return parseFloat(salesOrder.qty)
    }

    if (salesOrder.items && Array.isArray(salesOrder.items) && salesOrder.items.length > 0) {
      const firstItem = salesOrder.items[0]
      return parseFloat(firstItem.qty || firstItem.quantity || firstItem.ordered_qty || 1)
    }

    return 1
  }

  async getBOMDetails(bomId) {
    try {
      const [boms] = await this.db.execute(
        `SELECT b.*, i.name as product_name 
         FROM bom b 
         LEFT JOIN item i ON b.item_code = i.item_code 
         WHERE b.bom_id = ?`,
        [bomId]
      )

      if (!boms || boms.length === 0) return null

      const bom = boms[0]

      const [bomLines] = await this.db.execute(
        `SELECT bl.*, i.item_group 
         FROM bom_line bl 
         LEFT JOIN item i ON bl.component_code = i.item_code 
         WHERE bl.bom_id = ? 
         ORDER BY bl.sequence`,
        [bomId]
      )

      const [bomOperations] = await this.db.execute(
        'SELECT * FROM bom_operation WHERE bom_id = ? ORDER BY sequence',
        [bomId]
      )

      const [bomRawMaterials] = await this.db.execute(
        `SELECT brm.*, i.item_group 
         FROM bom_raw_material brm 
         LEFT JOIN item i ON brm.item_code = i.item_code 
         WHERE brm.bom_id = ? 
         ORDER BY brm.sequence`,
        [bomId]
      )

      return {
        ...bom,
        lines: bomLines || [],
        operations: bomOperations || [],
        raw_materials: bomRawMaterials || []
      }
    } catch (error) {
      throw error
    }
  }

  isConsumable(line) {
    if (!line) return false
    const itemGroup = (line.item_group || '').toLowerCase()
    return itemGroup === 'consumable'
  }

  isSubAssembly(line) {
    if (!line) return false

    if (this.isConsumable(line)) return false

    const fgType = (line.component_type || line.fg_sub_assembly || '').toLowerCase()
    const itemGroup = (line.item_group || '').toLowerCase()
    const subAsmPatterns = ['subassembly', 'sub-assembly', 'subassemblies', 'assembly']
    
    return subAsmPatterns.some(pattern => 
      fgType.includes(pattern) || itemGroup.includes(pattern)
    )
  }

  async processFinishedGoodsBOM(bomData, fgQuantity, plan) {
    const { lines = [], operations = [], raw_materials = [] } = bomData

    plan.finished_goods.push({
      item_code: bomData.item_code,
      item_name: bomData.product_name || bomData.item_name || bomData.description || bomData.item_code,
      planned_qty: fgQuantity,
      status: 'pending'
    })

    for (const line of lines) {
      if (this.isSubAssembly(line)) {
        await this.processSubAssembly(line, fgQuantity, plan)
      } else {
        this.addRawMaterialToPlan(line, fgQuantity, plan, bomData.item_code)
      }
    }

    for (const rawMaterial of raw_materials) {
      this.addRawMaterialToPlan(rawMaterial, fgQuantity, plan, bomData.item_code)
    }

    for (const operation of operations) {
      const operationTimePerUnit = parseFloat(operation.operation_time || 0)
      const totalTime = operationTimePerUnit * fgQuantity
      const totalHours = totalTime / 60

      plan.fg_operations.push({
        operation_name: operation.operation_name,
        workstation_type: operation.workstation_type,
        operation_time_per_unit: operationTimePerUnit,
        total_time: totalTime,
        total_hours: totalHours,
        hourly_rate: parseFloat(operation.hourly_rate || 0),
        total_cost: totalHours * parseFloat(operation.hourly_rate || 0),
        operation_type: operation.operation_type || 'FG',
        notes: operation.notes || ''
      })
    }
  }

  addRawMaterialToPlan(item, plannedQty, plan, sourceBomCode) {
    const itemCode = item.item_code || item.component_code
    const itemName = item.item_name || item.component_description || item.description || itemCode
    const itemGroup = item.item_group || ''
    const qtyPerUnit = parseFloat(item.qty || item.quantity || 0)
    const totalRmQty = qtyPerUnit * plannedQty
    const rate = parseFloat(item.rate || 0)
    const uom = item.uom

    const existingRm = plan.raw_materials.find(
      rm => rm.item_code === itemCode
    )

    if (existingRm) {
      existingRm.total_qty += totalRmQty
      existingRm.total_amount = existingRm.total_qty * existingRm.rate
      existingRm.sources.push({
        source_bom: sourceBomCode,
        qty_per_unit: qtyPerUnit,
        planned_qty: plannedQty
      })
    } else {
      plan.raw_materials.push({
        item_code: itemCode,
        item_name: itemName,
        item_group: itemGroup,
        uom: uom,
        qty_per_unit: qtyPerUnit,
        total_qty: totalRmQty,
        rate: rate,
        total_amount: totalRmQty * rate,
        sources: [{
          source_bom: sourceBomCode,
          qty_per_unit: qtyPerUnit,
          planned_qty: plannedQty
        }]
      })
    }
  }

  async processSubAssembly(bomLine, fgQuantity, plan) {
    const subAsmCode = bomLine.component_code || bomLine.item_code
    const subAsmName = bomLine.component_description || bomLine.item_name
    const bomQtyPerFg = parseFloat(bomLine.quantity || bomLine.qty || 1)
    
    const item = await this.getItemDetails(subAsmCode)
    const scrapPercentage = item ? parseFloat(item.loss_percentage || 0) : 0

    const plannedQtyBeforeScrap = fgQuantity * bomQtyPerFg
    const plannedQty = this.calculateQtyWithScrap(plannedQtyBeforeScrap, scrapPercentage)

    const subBomData = await this.getSubAssemblyBOM(subAsmCode, bomLine.bom_no)

    plan.sub_assemblies.push({
      item_code: subAsmCode,
      item_name: subAsmName,
      bom_qty_per_fg: bomQtyPerFg,
      fg_quantity: fgQuantity,
      scrap_percentage: scrapPercentage,
      planned_qty_before_scrap: plannedQtyBeforeScrap,
      planned_qty: plannedQty,
      status: 'pending',
      bom_no: subBomData ? subBomData.bom_id : null
    })

    if (subBomData) {
      await this.processSubAssemblyBOM(subBomData, plannedQty, plan)
    }
  }

  async getItemDetails(itemCode) {
    try {
      const [items] = await this.db.execute(
        'SELECT * FROM item WHERE item_code = ?',
        [itemCode]
      )
      return items && items.length > 0 ? items[0] : null
    } catch (error) {
      console.warn(`Warning: Could not fetch item details for ${itemCode}:`, error.message)
      return null
    }
  }

  calculateQtyWithScrap(baseQty, scrapPercentage) {
    if (scrapPercentage <= 0) return baseQty

    const scrapFraction = scrapPercentage / 100
    const plannedQty = baseQty / (1 - scrapFraction)
    
    return Math.ceil(plannedQty * 1000000) / 1000000
  }

  async getSubAssemblyBOM(itemCode, bomId = null) {
    try {
      if (bomId) {
        return await this.getBOMDetails(bomId)
      }

      const [boms] = await this.db.execute(
        'SELECT * FROM bom WHERE item_code = ? AND is_active = 1 ORDER BY is_default DESC, created_at DESC LIMIT 1',
        [itemCode]
      )

      if (!boms || boms.length === 0) return null

      return await this.getBOMDetails(boms[0].bom_id)
    } catch (error) {
      console.warn(`Warning: Could not fetch sub-assembly BOM for ${itemCode}:`, error.message)
      return null
    }
  }

  async processSubAssemblyBOM(bomData, plannedQty, plan) {
    const { lines = [], operations = [], raw_materials = [] } = bomData

    for (const line of lines) {
      if (this.isSubAssembly(line)) {
        const nestedSubAsmCode = line.component_code || line.item_code
        const item = await this.getItemDetails(nestedSubAsmCode)
        const scrapPercentage = item ? parseFloat(item.loss_percentage || 0) : 0

        const bomQtyPerParent = parseFloat(line.quantity || line.qty || 1)
        const plannedQtyBeforeScrap = plannedQty * bomQtyPerParent

        const nestedPlannedQty = this.calculateQtyWithScrap(plannedQtyBeforeScrap, scrapPercentage)

        const nestedBomData = await this.getSubAssemblyBOM(nestedSubAsmCode, line.bom_no)

        plan.sub_assemblies.push({
          item_code: nestedSubAsmCode,
          item_name: line.component_description || line.item_name,
          parent_assembly_code: bomData.item_code,
          bom_qty_per_parent: bomQtyPerParent,
          parent_planned_qty: plannedQty,
          scrap_percentage: scrapPercentage,
          planned_qty_before_scrap: plannedQtyBeforeScrap,
          planned_qty: nestedPlannedQty,
          status: 'pending',
          bom_no: nestedBomData ? nestedBomData.bom_id : null
        })

        if (nestedBomData) {
          await this.processSubAssemblyBOM(nestedBomData, nestedPlannedQty, plan)
        }
      } else {
        this.addRawMaterialToPlan(line, plannedQty, plan, bomData.item_code)
      }
    }

    for (const rawMaterial of raw_materials) {
      this.addRawMaterialToPlan(rawMaterial, plannedQty, plan, bomData.item_code)
    }

    for (const operation of operations) {
      const operationTimePerUnit = parseFloat(operation.operation_time || 0)
      const totalTime = operationTimePerUnit * plannedQty
      const totalHours = totalTime / 60

      const existingOp = plan.operations.find(
        op => op.operation_name === operation.operation_name
      )

      if (existingOp) {
        existingOp.total_time += totalTime
        existingOp.total_hours += totalHours
        existingOp.sources.push({
          source_bom: bomData.item_code,
          operation_time_per_unit: operationTimePerUnit,
          planned_qty: plannedQty
        })
      } else {
        plan.operations.push({
          operation_name: operation.operation_name,
          workstation_type: operation.workstation_type,
          operation_time_per_unit: operationTimePerUnit,
          total_time: totalTime,
          total_hours: totalHours,
          hourly_rate: parseFloat(operation.hourly_rate || 0),
          total_cost: totalHours * parseFloat(operation.hourly_rate || 0),
          operation_type: operation.operation_type || 'SA',
          notes: operation.notes || '',
          sources: [{
            source_bom: bomData.item_code,
            operation_time_per_unit: operationTimePerUnit,
            planned_qty: plannedQty
          }]
        })
      }
    }
  }

  async savePlanToDatabase(salesOrderId, planData) {
    try {
      const planId = `PP-${Date.now()}`

      await this.db.execute(
        'INSERT INTO production_plan (plan_id, sales_order_id, status, plan_date, planned_by_id) VALUES (?, ?, ?, ?, ?)',
        [planId, salesOrderId, 'draft', new Date().toISOString().split('T')[0], null]
      )

      for (const fg of planData.finished_goods) {
        await this.db.execute(
          'INSERT INTO production_plan_fg (plan_id, item_code, item_name, planned_qty, bom_no) VALUES (?, ?, ?, ?, ?)',
          [planId, fg.item_code, fg.item_name, fg.planned_qty, planData.bom_id || fg.bom_no]
        )
      }

      for (const sa of planData.sub_assemblies) {
        // Automatically find BOM for sub-assembly if not present
        let saBomNo = sa.bom_no
        if (!saBomNo) {
          const subBom = await this.getSubAssemblyBOM(sa.item_code)
          if (subBom) saBomNo = subBom.bom_id
        }

        await this.db.execute(
          'INSERT INTO production_plan_sub_assembly (plan_id, item_code, item_name, required_qty, planned_qty, planned_qty_before_scrap, scrap_percentage, bom_no, schedule_date) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
          [planId, sa.item_code, sa.item_name, sa.planned_qty, sa.planned_qty, sa.planned_qty_before_scrap, sa.scrap_percentage, saBomNo, sa.schedule_date || null]
        )
      }

      for (const rm of planData.raw_materials) {
        await this.db.execute(
          'INSERT INTO production_plan_raw_material (plan_id, item_code, item_name, item_group, qty, rate) VALUES (?, ?, ?, ?, ?, ?)',
          [planId, rm.item_code, rm.item_name, rm.item_group, rm.total_qty, rm.rate]
        )
      }

      for (const op of [...planData.fg_operations, ...planData.operations]) {
        await this.db.execute(
          'INSERT INTO production_plan_operations (plan_id, operation_name, total_time_minutes, total_hours, hourly_rate, total_cost, operation_type) VALUES (?, ?, ?, ?, ?, ?, ?)',
          [planId, op.operation_name, op.total_time, op.total_hours || (op.total_time / 60), op.hourly_rate, op.total_cost, op.operation_type]
        )
      }

      return planId
    } catch (error) {
      throw error
    }
  }

  async createWorkOrdersFromPlan(planId, productionModel, productionPlanningModel) {
    try {
      const plan = await productionPlanningModel.getPlanById(planId)
      if (!plan) throw new Error('Plan not found')

      // Check for existing work orders to prevent duplicates
      const [existingWOs] = await this.db.execute(
        'SELECT COUNT(*) as count FROM work_order WHERE production_plan_id = ?',
        [planId]
      )
      
      if (existingWOs && existingWOs[0].count > 0) {
        throw new Error(`Work orders already exist for production plan ${planId}`)
      }

      const createdWorkOrders = []

      // 1. Create Work Orders for Sub-Assemblies
      if (plan.sub_assemblies && plan.sub_assemblies.length > 0) {
        for (const item of plan.sub_assemblies) {
          // Use a strictly chronological ID format similar to ProductionController
          const wo_id = `WO-${Date.now()}-${Math.floor(Math.random() * 1000)}`
          const plannedQty = parseFloat(item.planned_qty) || parseFloat(item.required_qty) || 0
          const woData = {
            wo_id,
            item_code: item.item_code,
            quantity: plannedQty,
            status: 'draft',
            production_plan_id: planId,
            bom_no: item.bom_no,
            planned_start_date: item.schedule_date || item.scheduled_date || plan.plan_date,
            notes: `Created from Production Plan: ${planId} (Sub-Assembly)`
          }

          await productionModel.createWorkOrder(woData)
          
          // Add items and operations from BOM
          if (item.bom_no) {
            const bomDetails = await productionModel.getBOMDetails(item.bom_no)
            
            // Add items
            if (bomDetails && bomDetails.rawMaterials && bomDetails.rawMaterials.length > 0) {
              for (const rm of bomDetails.rawMaterials) {
                await productionModel.addWorkOrderItem(wo_id, {
                  item_code: rm.item_code,
                  required_qty: (parseFloat(rm.qty) || 0) * plannedQty,
                  source_warehouse: rm.source_warehouse,
                  sequence: rm.sequence
                })
              }
            } else if (bomDetails && bomDetails.lines && bomDetails.lines.length > 0) {
              for (const line of bomDetails.lines) {
                await productionModel.addWorkOrderItem(wo_id, {
                  item_code: line.component_code,
                  required_qty: (parseFloat(line.quantity) || 0) * plannedQty,
                  sequence: line.sequence
                })
              }
            }

            // Add operations
            if (bomDetails && bomDetails.operations && bomDetails.operations.length > 0) {
              for (const op of bomDetails.operations) {
                await productionModel.addWorkOrderOperation(wo_id, {
                  operation_name: op.operation_name,
                  workstation: op.workstation_type,
                  operation_time: (parseFloat(op.operation_time) || 0) * plannedQty,
                  hourly_rate: op.hourly_rate,
                  operation_type: op.operation_type || 'SA',
                  operating_cost: op.operating_cost || 0,
                  sequence: op.sequence
                })
              }
            }
          }

          // Generate Job Cards
          await productionModel.generateJobCardsForWorkOrder(wo_id)
          
          createdWorkOrders.push(wo_id)
          // Add a tiny delay to ensure timestamps are unique for sorting
          await new Promise(resolve => setTimeout(resolve, 1))
        }
      }

      // 2. Create Work Orders for Finished Goods
      if (plan.fg_items && plan.fg_items.length > 0) {
        for (const item of plan.fg_items) {
          const wo_id = `WO-${Date.now()}-${Math.floor(Math.random() * 1000)}`
          const plannedQty = parseFloat(item.planned_qty) || parseFloat(item.qty) || parseFloat(item.quantity) || 0
          const woData = {
            wo_id,
            item_code: item.item_code,
            quantity: plannedQty,
            status: 'draft',
            sales_order_id: plan.sales_order_id,
            production_plan_id: planId,
            bom_no: item.bom_no,
            planned_start_date: item.planned_start_date || plan.plan_date,
            notes: `Created from Production Plan: ${planId}`
          }

          await productionModel.createWorkOrder(woData)
          
          // Add items and operations from BOM
          if (item.bom_no) {
            const bomDetails = await productionModel.getBOMDetails(item.bom_no)
            
            // Add items
            if (bomDetails && bomDetails.rawMaterials && bomDetails.rawMaterials.length > 0) {
              for (const rm of bomDetails.rawMaterials) {
                await productionModel.addWorkOrderItem(wo_id, {
                  item_code: rm.item_code,
                  required_qty: (parseFloat(rm.qty) || 0) * plannedQty,
                  source_warehouse: rm.source_warehouse,
                  sequence: rm.sequence
                })
              }
            } else if (bomDetails && bomDetails.lines && bomDetails.lines.length > 0) {
              for (const line of bomDetails.lines) {
                await productionModel.addWorkOrderItem(wo_id, {
                  item_code: line.component_code,
                  required_qty: (parseFloat(line.quantity) || 0) * plannedQty,
                  sequence: line.sequence
                })
              }
            }

            // Add operations
            if (bomDetails && bomDetails.operations && bomDetails.operations.length > 0) {
              for (const op of bomDetails.operations) {
                await productionModel.addWorkOrderOperation(wo_id, {
                  operation_name: op.operation_name,
                  workstation: op.workstation_type,
                  operation_time: (parseFloat(op.operation_time) || 0) * plannedQty,
                  hourly_rate: op.hourly_rate,
                  operation_type: op.operation_type || 'FG',
                  operating_cost: op.operating_cost || 0,
                  sequence: op.sequence
                })
              }
            }
          }

          // Generate Job Cards
          await productionModel.generateJobCardsForWorkOrder(wo_id)
          
          createdWorkOrders.push(wo_id)
          await new Promise(resolve => setTimeout(resolve, 1))
        }
      }

      // 3. Update Plan Status
      await productionPlanningModel.updatePlanStatus(planId, 'in_progress')

      return createdWorkOrders
    } catch (error) {
      console.error('Error in createWorkOrdersFromPlan:', error)
      throw error
    }
  }
}
