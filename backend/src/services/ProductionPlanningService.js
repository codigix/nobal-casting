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
        `SELECT bl.*, i.item_group, i.item_type 
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
        `SELECT brm.*, i.item_group, i.item_type 
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
    const itemType = (line.item_type || '').toLowerCase()
    return itemGroup === 'consumable' || itemType === 'consumable'
  }

  async isSubAssembly(line) {
    if (!line) return false

    if (this.isConsumable(line)) return false

    const itemCode = line.component_code || line.item_code || ''
    const itemGroup = (line.item_group || '').toLowerCase().replace(/[-\s]/g, '').trim()
    const fgType = (line.component_type || line.fg_sub_assembly || '').toLowerCase().replace(/[-\s]/g, '').trim()
    
    const isSAGroup = itemGroup === 'subassemblies' || itemGroup === 'subassembly' || itemGroup === 'intermediates' || itemGroup.includes('subassembly') || itemGroup.includes('sub-assembly')
    const isSAType = fgType.includes('subassembly') || fgType.includes('sub-assembly')
    const isSACode = itemCode.toUpperCase().startsWith('SA-') || itemCode.toUpperCase().startsWith('SA') || itemCode.toUpperCase().includes('SUBASM')
    
    if (isSAGroup || isSAType || isSACode) return true

    // Robust check: Does it have its own BOM? 
    // This ensures items that don't follow naming conventions are still treated as sub-assemblies
    try {
      const [boms] = await this.db.execute(
        'SELECT bom_id FROM bom WHERE item_code = ? AND is_active = 1 LIMIT 1',
        [itemCode]
      )
      return boms && boms.length > 0
    } catch (error) {
      console.warn(`Warning: Error checking BOM for ${itemCode}:`, error.message)
      return false
    }
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
      const isSA = await this.isSubAssembly(line)
      if (isSA) {
        await this.processSubAssembly(line, fgQuantity, plan, bomData.item_code)
      } else {
        this.addRawMaterialToPlan(line, fgQuantity, plan, bomData.item_code)
      }
    }

    for (const rawMaterial of raw_materials) {
      const isSA = await this.isSubAssembly(rawMaterial)
      if (isSA) {
        await this.processSubAssembly(rawMaterial, fgQuantity, plan, bomData.item_code)
      } else {
        this.addRawMaterialToPlan(rawMaterial, fgQuantity, plan, bomData.item_code)
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
        notes: operation.notes || '',
        execution_mode: operation.execution_mode || 'IN_HOUSE',
        vendor_id: operation.vendor_id || null,
        vendor_rate_per_unit: parseFloat(operation.vendor_rate_per_unit || 0)
      })
    }
  }

  addRawMaterialToPlan(item, plannedQty, plan, sourceBomCode) {
    const itemCode = item.item_code || item.component_code
    const itemName = item.item_name || item.component_description || item.description || itemCode
    const itemGroup = item.item_group || ''
    const itemType = item.item_type || 'Raw Material'
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
        item_type: itemType,
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

  addSubAssemblyToPlan(plan, item) {
    // Disable consolidation to support serial manufacturing workflow
    // Every occurrence in the BOM tree now becomes a unique row in the production plan
    plan.sub_assemblies.push(item)
  }

  async processSubAssembly(bomLine, fgQuantity, plan, parentCode = null, level = 1) {
    const subAsmCode = bomLine.component_code || bomLine.item_code
    const subAsmName = bomLine.component_description || bomLine.item_name
    const bomQtyPerFg = parseFloat(bomLine.quantity || bomLine.qty || 1)
    
    const item = await this.getItemDetails(subAsmCode)
    const scrapPercentage = item ? parseFloat(item.loss_percentage || 0) : 0

    const plannedQtyBeforeScrap = fgQuantity * bomQtyPerFg
    const plannedQty = this.calculateQtyWithScrap(plannedQtyBeforeScrap, scrapPercentage)

    const subBomData = await this.getSubAssemblyBOM(subAsmCode, bomLine.bom_no)

    this.addSubAssemblyToPlan(plan, {
      item_code: subAsmCode,
      item_name: subAsmName,
      parent_item_code: parentCode,
      bom_qty_per_fg: bomQtyPerFg,
      fg_quantity: fgQuantity,
      scrap_percentage: scrapPercentage,
      planned_qty_before_scrap: plannedQtyBeforeScrap,
      planned_qty: plannedQty,
      status: 'pending',
      bom_no: subBomData ? subBomData.bom_id : null,
      explosion_level: level
    })

    if (subBomData) {
      await this.processSubAssemblyBOM(subBomData, plannedQty, plan, level + 1)
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
        const bom = await this.getBOMDetails(bomId)
        if (bom) return bom
        // If specific BOM ID not found, fallback to default/active BOM
        console.warn(`Warning: Specific BOM ${bomId} not found for ${itemCode}, falling back to default.`)
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

  async processSubAssemblyBOM(bomData, plannedQty, plan, level = 1) {
    const { lines = [], operations = [], raw_materials = [] } = bomData

    for (const line of lines) {
      const isSA = await this.isSubAssembly(line)
      if (isSA) {
        const nestedSubAsmCode = line.component_code || line.item_code
        const item = await this.getItemDetails(nestedSubAsmCode)
        const scrapPercentage = item ? parseFloat(item.loss_percentage || 0) : 0

        const bomQtyPerParent = parseFloat(line.quantity || line.qty || 1)
        const plannedQtyBeforeScrap = plannedQty * bomQtyPerParent

        const nestedPlannedQty = this.calculateQtyWithScrap(plannedQtyBeforeScrap, scrapPercentage)

        const nestedBomData = await this.getSubAssemblyBOM(nestedSubAsmCode, line.bom_no)

        this.addSubAssemblyToPlan(plan, {
          item_code: nestedSubAsmCode,
          item_name: line.component_description || line.item_name,
          parent_item_code: bomData.item_code,
          bom_qty_per_parent: bomQtyPerParent,
          parent_planned_qty: plannedQty,
          scrap_percentage: scrapPercentage,
          planned_qty_before_scrap: plannedQtyBeforeScrap,
          planned_qty: nestedPlannedQty,
          status: 'pending',
          bom_no: nestedBomData ? nestedBomData.bom_id : null,
          explosion_level: level
        })

        if (nestedBomData) {
          await this.processSubAssemblyBOM(nestedBomData, nestedPlannedQty, plan, level + 1)
        }
      } else {
        this.addRawMaterialToPlan(line, plannedQty, plan, bomData.item_code)
      }
    }

    for (const rawMaterial of raw_materials) {
      const isSA = await this.isSubAssembly(rawMaterial)
      if (isSA) {
        const nestedSubAsmCode = rawMaterial.component_code || rawMaterial.item_code
        const item = await this.getItemDetails(nestedSubAsmCode)
        const scrapPercentage = item ? parseFloat(item.loss_percentage || 0) : 0

        const bomQtyPerParent = parseFloat(rawMaterial.quantity || rawMaterial.qty || 1)
        const plannedQtyBeforeScrap = plannedQty * bomQtyPerParent

        const nestedPlannedQty = this.calculateQtyWithScrap(plannedQtyBeforeScrap, scrapPercentage)

        const nestedBomData = await this.getSubAssemblyBOM(nestedSubAsmCode, rawMaterial.bom_no)

        this.addSubAssemblyToPlan(plan, {
          item_code: nestedSubAsmCode,
          item_name: rawMaterial.component_description || rawMaterial.item_name || rawMaterial.description,
          parent_item_code: bomData.item_code,
          bom_qty_per_parent: bomQtyPerParent,
          parent_planned_qty: plannedQty,
          scrap_percentage: scrapPercentage,
          planned_qty_before_scrap: plannedQtyBeforeScrap,
          planned_qty: nestedPlannedQty,
          status: 'pending',
          bom_no: nestedBomData ? nestedBomData.bom_id : null,
          explosion_level: level
        })

        if (nestedBomData) {
          await this.processSubAssemblyBOM(nestedBomData, nestedPlannedQty, plan, level + 1)
        }
      } else {
        this.addRawMaterialToPlan(rawMaterial, plannedQty, plan, bomData.item_code)
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
        existingOp.total_cost += totalHours * parseFloat(operation.hourly_rate || 0)
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
          execution_mode: operation.execution_mode || 'IN_HOUSE',
          vendor_id: operation.vendor_id || null,
          vendor_rate_per_unit: parseFloat(operation.vendor_rate_per_unit || 0),
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
          'INSERT INTO production_plan_sub_assembly (plan_id, item_code, item_name, parent_item_code, required_qty, planned_qty, planned_qty_before_scrap, scrap_percentage, bom_no, schedule_date, explosion_level) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
          [planId, sa.item_code, sa.item_name, sa.parent_item_code || sa.parent_assembly_code || null, sa.planned_qty, sa.planned_qty, sa.planned_qty_before_scrap, sa.scrap_percentage, saBomNo, sa.schedule_date || null, sa.explosion_level || 0]
        )
      }

      for (const rm of planData.raw_materials) {
        await this.db.execute(
          'INSERT INTO production_plan_raw_material (plan_id, item_code, item_name, item_group, plan_to_request_qty, rate) VALUES (?, ?, ?, ?, ?, ?)',
          [planId, rm.item_code, rm.item_name, rm.item_group, rm.total_qty, rm.rate]
        )
      }

      for (const op of [...planData.operations, ...planData.fg_operations]) {
        await this.db.execute(
          'INSERT INTO production_plan_operations (plan_id, operation_name, total_time_minutes, total_hours, hourly_rate, total_cost, operation_type, execution_mode, vendor_id, vendor_rate_per_unit) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
          [planId, op.operation_name, op.total_time, op.total_hours || (op.total_time / 60), op.hourly_rate, op.total_cost, op.operation_type, op.execution_mode || 'IN_HOUSE', op.vendor_id || null, op.vendor_rate_per_unit || 0]
        )
      }

      return planId
    } catch (error) {
      throw error
    }
  }

  async createWorkOrdersFromPlan(planId, productionModel, productionPlanningModel, options = {}, userId = null) {
    try {
      console.log(`[ProductionPlanningService] Creating Work Orders for Plan: ${planId}`)
      const plan = await productionPlanningModel.getPlanById(planId)
      if (!plan) throw new Error('Plan not found')

      // Check for existing work orders
      const [existingWOs] = await this.db.execute(
        'SELECT COUNT(*) as count FROM work_order WHERE production_plan_id = ?',
        [planId]
      )
      
      if (existingWOs && existingWOs[0].count > 0) {
        throw new Error(`Work orders already exist for production plan ${planId}`)
      }

      const bodySubAsms = options.sub_assemblies || options.sub_assembly_items || []
      const dbSubAsms = plan.sub_assemblies || plan.sub_assembly_items || []
      const allSubAsms = bodySubAsms.length > 0 ? bodySubAsms : dbSubAsms

      const bodyFGItems = options.fg_items || options.finished_goods || []
      const dbFGItems = plan.fg_items || plan.finished_goods || []
      const allFGItems = bodyFGItems.length > 0 ? bodyFGItems : dbFGItems

      // Fallback: If no FG items found in tables, use the plan header's BOM as the FG item
      if (allFGItems.length === 0 && plan.bom_id) {
        allFGItems.push({
          item_code: plan.bom_item_code || plan.item_code,
          item_name: plan.bom_product_name || plan.product_name,
          planned_qty: plan.planned_qty || 1,
          bom_no: plan.bom_id,
          id: `HEADER-${plan.plan_id}`
        })
      }

      // Use a unified map to track ALL created work orders (both FG and SA)
      // This ensures nested sub-assemblies correctly find their parents
      const itemCodeToWoIdMap = {}
      let woCounter = 0
      const batchTimestamp = Date.now()

      const processBatch = async (batch, isFG = false) => {
        if (!batch || batch.length === 0) return

        console.log(`[ProductionPlanningService] Processing batch of ${batch.length} items (isFG: ${isFG}) for Plan: ${planId}`)

        for (const item of batch) {
          try {
            const plannedQty = parseFloat(item.planned_qty) || parseFloat(item.qty) || parseFloat(item.quantity) || 0
            if (plannedQty <= 0) {
              console.warn(`[ProductionPlanningService] Skipping item ${item.item_code} with zero or invalid quantity: ${plannedQty}`)
              continue
            }

            // Determine parent WO ID
            let parentWoId = null
            const parentItemCode = item.parent_item_code || item.parent_assembly_code || item.parent_code
            
            if (parentItemCode) {
              parentWoId = itemCodeToWoIdMap[parentItemCode]
              if (!parentWoId) {
                // Fallback for direct children of FG if map uses a different key format
                console.warn(`[ProductionPlanningService] Parent item ${parentItemCode} not found in WO map for child ${item.item_code}`)
              }
            }

            // Generate a deterministic ID if it's an FG or if we want better tracking
            const woId = isFG 
              ? `WO-FG-${batchTimestamp}-${++woCounter}`
              : `WO-SA-${batchTimestamp}-${++woCounter}`

            // Fetch operations for this item (BOM or overridden in plan)
            let operationsToUse = []
            const itemBomNo = item.bom_no || item.bom_id || (isFG ? plan.bom_id : null)
            
            if (itemBomNo) {
              const bomDetails = await productionModel.getBOMDetails(itemBomNo)
              if (bomDetails && bomDetails.operations) {
                operationsToUse = bomDetails.operations.map(op => {
                  const planOpOverride = (plan.operations || []).find(pop => pop.operation_name === op.operation_name)
                  const executionMode = planOpOverride?.execution_mode || op.execution_mode || 'IN_HOUSE'
                  const vendorRate = parseFloat(planOpOverride?.vendor_rate_per_unit || op.vendor_rate_per_unit || 0)
                  const opTime = parseFloat(op.operation_time || 0)
                  const hRate = parseFloat(op.hourly_rate || 0)
                  
                  let opCost = 0
                  if (executionMode === 'OUTSOURCE') {
                    opCost = vendorRate * plannedQty
                  } else {
                    opCost = (opTime / 60) * hRate * plannedQty
                  }
                  
                  return {
                    operation_name: op.operation_name,
                    workstation: op.workstation_type,
                    operation_time: op.operation_time,
                    hourly_rate: op.hourly_rate,
                    operating_cost: opCost,
                    operation_type: op.operation_type || (isFG ? 'FG' : 'SA'),
                    execution_mode: executionMode,
                    vendor_id: planOpOverride?.vendor_id || op.vendor_id || null,
                    vendor_rate_per_unit: vendorRate,
                    notes: op.notes || op.description || ''
                  }
                })
              }
            }

            const woData = {
              wo_id: woId,
              item_code: item.item_code,
              quantity: plannedQty,
              status: 'Draft',
              priority: isFG ? 'Medium' : 'High',
              sales_order_id: plan.sales_order_id || item.sales_order_id || options.sales_order_id || null,
              production_plan_id: planId,
              bom_no: itemBomNo,
              planned_start_date: item.planned_start_date || item.schedule_date || item.scheduled_date || plan.plan_date || new Date(),
              expected_delivery_date: item.expected_delivery_date || plan.expected_delivery_date,
              parent_wo_id: parentWoId,
              target_warehouse: item.target_warehouse || item.fg_warehouse || null,
              notes: `Auto-generated from Production Plan ${planId}${isFG ? ' (Finished Good)' : ' (Sub-Assembly)'}`,
              operations: operationsToUse
            }

            console.log(`[ProductionPlanningService] Creating Work Order: ${woId} for Item: ${item.item_code} (Parent: ${parentWoId || 'None'})`)

            const createdIds = await productionModel.createWorkOrderRecursive(woData, userId || 1, false, true)
            
            if (createdIds && createdIds.length > 0) {
              const actualWoId = createdIds[0]
              itemCodeToWoIdMap[item.item_code] = actualWoId
              item.generated_wo_id = actualWoId
              console.log(`[ProductionPlanningService] Successfully created WO ${actualWoId} for ${item.item_code}`)
              
              if (parentWoId) {
                console.log(`[ProductionPlanningService] Linking dependency: ${parentWoId} -> ${actualWoId}`)
                await productionModel.addWorkOrderDependency(parentWoId, actualWoId, item.item_code, plannedQty)
              }
            }

            // Add a small delay to ensure unique timestamps and sequential creation
            await new Promise(resolve => setTimeout(resolve, 100))
          } catch (itemError) {
            console.error(`[ProductionPlanningService] Error creating work order for item ${item.item_code}:`, itemError)
          }
        }
      }

      const createdWorkOrders = []
      
      // 1. Process Finished Goods FIRST (Roots)
      console.log(`[ProductionPlanningService] Starting Finished Goods batch... Count: ${allFGItems.length}`)
      await processBatch(allFGItems, true)

      // 2. Process Sub-Assemblies in order of explosion level
      // Note: We use dbSubAsms but we need to ensure they match allSubAsms used in previous logic
      const sortedSubAsmList = [...(dbSubAsms || allSubAsms)].sort((a, b) => 
        (parseInt(a.explosion_level || 0)) - (parseInt(b.explosion_level || 0))
      )
      
      console.log(`[ProductionPlanningService] Starting Sub-Assembly batch... Count: ${sortedSubAsmList.length}`)
      await processBatch(sortedSubAsmList, false)

      // Collect all generated IDs
      const allGeneratedIds = [...allFGItems, ...sortedSubAsmList]
        .map(item => item.generated_wo_id)
        .filter(id => !!id)

      // 3. Update Plan Status
      console.log(`[ProductionPlanningService] Updating plan status for ${planId} to 'in_progress'`)
      await productionPlanningModel.updatePlanStatus(planId, 'in_progress')

      // 4. Sync Sales Order Status
      if (plan.sales_order_id) {
        console.log(`[ProductionPlanningService] Syncing Sales Order status for ${plan.sales_order_id}`)
        await productionModel.syncSalesOrderStatus(plan.sales_order_id)
      }

      // 5. Notifications
      try {
        const NotificationModel = (await import('../models/NotificationModel.js')).default
        if (userId) {
          await NotificationModel.create({
            user_id: userId,
            notification_type: 'WORK_ORDER_GENERATED',
            title: 'Production Plan Implementation Started',
            message: `Generated ${allGeneratedIds.length} work orders from Production Plan ${planId}.`,
            reference_type: 'ProductionPlan',
            reference_id: planId
          })
        }
      } catch (notifError) {
        console.warn('Notification failed:', notifError.message)
      }

      return [...new Set(allGeneratedIds)]
    } catch (error) {
      console.error('Error in createWorkOrdersFromPlan:', error)
      throw error
    }
  }

  async getSalesOrderHierarchy(salesOrderId) {
    try {
      // 1. Fetch Sales Order
      const [soRows] = await this.db.execute(
        'SELECT sales_order_id, customer_name, status, delivery_date, total_value FROM selling_sales_order WHERE sales_order_id = ?',
        [salesOrderId]
      )
      if (!soRows.length) throw new Error('Sales Order not found')
      const so = soRows[0]

      // 2. Fetch Production Plans
      const [ppRows] = await this.db.execute(
        'SELECT plan_id, status, plan_date, bom_id FROM production_plan WHERE sales_order_id = ?',
        [salesOrderId]
      )

      const plans = []
      for (const pp of ppRows) {
        // 3. Fetch Work Orders for each Plan
        const [woRows] = await this.db.execute(
          'SELECT wo_id, item_code, quantity, status, planned_start_date, expected_delivery_date FROM work_order WHERE production_plan_id = ?',
          [pp.plan_id]
        )

        const workOrders = []
        for (const wo of woRows) {
          // 4. Fetch Job Cards for each Work Order
          const [jcRows] = await this.db.execute(
            'SELECT job_card_id, operation, machine_id, operator_id, planned_quantity, produced_quantity, status, actual_start_date, actual_end_date FROM job_card WHERE work_order_id = ?',
            [wo.wo_id]
          )

          workOrders.push({
            ...wo,
            type: 'work_order',
            children: jcRows.map(jc => ({ ...jc, type: 'job_card' }))
          })
        }

        plans.push({
          ...pp,
          type: 'production_plan',
          children: workOrders
        })
      }

      return {
        ...so,
        type: 'sales_order',
        children: plans
      }
    } catch (error) {
      console.error('Error in getSalesOrderHierarchy:', error)
      throw error
    }
  }
}
