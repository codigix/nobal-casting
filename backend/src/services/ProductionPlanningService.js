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
        'SELECT * FROM bom WHERE bom_id = ?',
        [bomId]
      )

      if (!boms || boms.length === 0) return null

      const bom = boms[0]

      const [bomLines] = await this.db.execute(
        'SELECT * FROM bom_line WHERE bom_id = ? ORDER BY sequence',
        [bomId]
      )

      const [bomOperations] = await this.db.execute(
        'SELECT * FROM bom_operation WHERE bom_id = ? ORDER BY sequence',
        [bomId]
      )

      const [bomRawMaterials] = await this.db.execute(
        'SELECT * FROM bom_raw_material WHERE bom_id = ? ORDER BY sequence',
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

  isSubAssembly(line) {
    if (!line) return false

    const fgType = (line.component_type || line.fg_sub_assembly || '').toLowerCase()
    const itemGroup = (line.item_group || '').toLowerCase()

    const subAsmPatterns = ['subassembly', 'sub-assembly', 'subassemblies', 'assembly']
    
    return subAsmPatterns.some(pattern => 
      fgType.includes(pattern) || itemGroup.includes(pattern)
    )
  }

  async processFinishedGoodsBOM(bomData, fgQuantity, plan) {
    const { lines = [], operations = [] } = bomData

    plan.finished_goods.push({
      item_code: bomData.item_code,
      item_name: bomData.item_name || bomData.description,
      planned_qty: fgQuantity,
      status: 'pending'
    })

    for (const line of lines) {
      if (this.isSubAssembly(line)) {
        await this.processSubAssembly(line, fgQuantity, plan)
      }
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

  async processSubAssembly(bomLine, fgQuantity, plan) {
    const subAsmCode = bomLine.component_code || bomLine.item_code
    const subAsmName = bomLine.component_description || bomLine.item_name
    const bomQtyPerFg = parseFloat(bomLine.quantity || bomLine.qty || 1)
    
    const item = await this.getItemDetails(subAsmCode)
    const scrapPercentage = item ? parseFloat(item.loss_percentage || 0) : 0

    const plannedQtyBeforeScrap = fgQuantity * bomQtyPerFg
    const plannedQty = this.calculateQtyWithScrap(plannedQtyBeforeScrap, scrapPercentage)

    plan.sub_assemblies.push({
      item_code: subAsmCode,
      item_name: subAsmName,
      bom_qty_per_fg: bomQtyPerFg,
      fg_quantity: fgQuantity,
      scrap_percentage: scrapPercentage,
      planned_qty_before_scrap: plannedQtyBeforeScrap,
      planned_qty: plannedQty,
      status: 'pending'
    })

    const subBomData = await this.getSubAssemblyBOM(subAsmCode)
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

  async getSubAssemblyBOM(itemCode) {
    try {
      const [boms] = await this.db.execute(
        'SELECT * FROM bom WHERE item_code = ? LIMIT 1',
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

        plan.sub_assemblies.push({
          item_code: nestedSubAsmCode,
          item_name: line.component_description || line.item_name,
          parent_assembly_code: bomData.item_code,
          bom_qty_per_parent: bomQtyPerParent,
          parent_planned_qty: plannedQty,
          scrap_percentage: scrapPercentage,
          planned_qty_before_scrap: plannedQtyBeforeScrap,
          planned_qty: nestedPlannedQty,
          status: 'pending'
        })

        const nestedBomData = await this.getSubAssemblyBOM(nestedSubAsmCode)
        if (nestedBomData) {
          await this.processSubAssemblyBOM(nestedBomData, nestedPlannedQty, plan)
        }
      }
    }

    for (const rawMaterial of raw_materials) {
      if (rawMaterial.item_group === 'Consumable') continue

      const rmQtyPerUnit = parseFloat(rawMaterial.qty || rawMaterial.quantity || 0)
      const totalRmQty = rmQtyPerUnit * plannedQty

      const existingRm = plan.raw_materials.find(
        rm => rm.item_code === rawMaterial.item_code
      )

      if (existingRm) {
        existingRm.total_qty += totalRmQty
        existingRm.sources.push({
          source_bom: bomData.item_code,
          qty_per_unit: rmQtyPerUnit,
          planned_qty: plannedQty
        })
      } else {
        plan.raw_materials.push({
          item_code: rawMaterial.item_code,
          item_name: rawMaterial.item_name,
          item_group: rawMaterial.item_group,
          uom: rawMaterial.uom,
          qty_per_unit: rmQtyPerUnit,
          total_qty: totalRmQty,
          rate: parseFloat(rawMaterial.rate || 0),
          total_amount: totalRmQty * parseFloat(rawMaterial.rate || 0),
          sources: [{
            source_bom: bomData.item_code,
            qty_per_unit: rmQtyPerUnit,
            planned_qty: plannedQty
          }]
        })
      }
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
          'INSERT INTO production_plan_fg (plan_id, item_code, item_name, planned_qty) VALUES (?, ?, ?, ?)',
          [planId, fg.item_code, fg.item_name, fg.planned_qty]
        )
      }

      for (const sa of planData.sub_assemblies) {
        await this.db.execute(
          'INSERT INTO production_plan_sub_assembly (plan_id, item_code, item_name, planned_qty, planned_qty_before_scrap, scrap_percentage) VALUES (?, ?, ?, ?, ?, ?)',
          [planId, sa.item_code, sa.item_name, sa.planned_qty, sa.planned_qty_before_scrap, sa.scrap_percentage]
        )
      }

      for (const rm of planData.raw_materials) {
        await this.db.execute(
          'INSERT INTO production_plan_raw_material (plan_id, item_code, item_name, item_group, qty, rate) VALUES (?, ?, ?, ?, ?, ?)',
          [planId, rm.item_code, rm.item_name, rm.item_group, rm.total_qty, rm.rate]
        )
      }

      for (const op of [...planData.operations, ...planData.fg_operations]) {
        await this.db.execute(
          'INSERT INTO production_plan_operations (plan_id, operation_name, total_time_minutes, total_hours, hourly_rate, total_cost) VALUES (?, ?, ?, ?, ?, ?)',
          [planId, op.operation_name, op.total_time, op.total_hours || (op.total_time / 60), op.hourly_rate, op.total_cost]
        )
      }

      return planId
    } catch (error) {
      throw error
    }
  }
}
