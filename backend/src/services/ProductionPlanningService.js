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

      // Auto-arrange sub-assemblies by dependency level
      if (plan.sub_assemblies && plan.sub_assemblies.length > 0) {
        try {
          plan.sub_assemblies = await this.autoArrangeSubAssembliesByDependency(plan.sub_assemblies)
        } catch (sortError) {
          console.warn('Warning: Could not auto-arrange sub-assemblies by dependency:', sortError.message)
          // Fallback to original order if sorting fails (e.g. circular dependency)
        }
      }

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
    const bomQuantity = parseFloat(bomData.quantity || 1)

    plan.finished_goods.push({
      item_code: bomData.item_code,
      item_name: bomData.product_name || bomData.item_name || bomData.description || bomData.item_code,
      planned_qty: fgQuantity,
      status: 'pending'
    })

    for (const line of lines) {
      const isSA = await this.isSubAssembly(line)
      if (isSA) {
        await this.processSubAssembly(line, fgQuantity / bomQuantity, plan, bomData.item_code)
      } else {
        this.addRawMaterialToPlan(line, fgQuantity, plan, bomData.item_code, bomQuantity)
      }
    }

    for (const rawMaterial of raw_materials) {
      const isSA = await this.isSubAssembly(rawMaterial)
      if (isSA) {
        await this.processSubAssembly(rawMaterial, fgQuantity / bomQuantity, plan, bomData.item_code)
      } else {
        this.addRawMaterialToPlan(rawMaterial, fgQuantity, plan, bomData.item_code, bomQuantity)
      }
    }

    for (const operation of operations) {
      const operationTimePerUnit = parseFloat(operation.operation_time || 0) / bomQuantity
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

  addRawMaterialToPlan(item, plannedQty, plan, sourceBomCode, bomQuantity = 1) {
    const itemCode = item.item_code || item.component_code
    const itemName = item.item_name || item.component_description || item.description || itemCode
    const itemGroup = item.item_group || ''
    const itemType = item.item_type || 'Raw Material'
    const qtyInBom = parseFloat(item.qty || item.quantity || 0)
    const qtyPerUnit = qtyInBom / bomQuantity
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

  async processSubAssembly(bomLine, parentPlannedQty, plan, parentCode = null, level = 1) {
    const subAsmCode = bomLine.component_code || bomLine.item_code
    const subAsmName = bomLine.component_description || bomLine.item_name
    const bomQtyPerParent = parseFloat(bomLine.quantity || bomLine.qty || 1)
    
    const item = await this.getItemDetails(subAsmCode)
    const scrapPercentage = item ? parseFloat(item.loss_percentage || 0) : 0

    const plannedQtyBeforeScrap = parentPlannedQty * bomQtyPerParent
    const plannedQty = this.calculateQtyWithScrap(plannedQtyBeforeScrap, scrapPercentage)

    const subBomData = await this.getSubAssemblyBOM(subAsmCode, bomLine.bom_no)

    this.addSubAssemblyToPlan(plan, {
      item_code: subAsmCode,
      item_name: subAsmName,
      parent_item_code: parentCode,
      bom_qty_per_parent: bomQtyPerParent,
      parent_planned_qty: parentPlannedQty,
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

  async autoArrangeSubAssemblies(planId) {
    try {
      const [plans] = await this.db.execute(
        'SELECT plan_date, expected_completion_date FROM production_plan WHERE plan_id = ?',
        [planId]
      )

      if (!plans || plans.length === 0) throw new Error(`Plan ${planId} not found`)
      const plan = plans[0]

      const [subAssemblies] = await this.db.execute(
        'SELECT * FROM production_plan_sub_assembly WHERE plan_id = ?',
        [planId]
      )

      if (!subAssemblies || subAssemblies.length === 0) return []

      const arranged = await this.autoArrangeSubAssembliesByDependency(subAssemblies)

      // Update scheduling dates
      const startDate = plan.plan_date ? new Date(plan.plan_date) : new Date()
      
      for (const sa of arranged) {
        const level = sa.explosion_level
        // Simple logic: Level 1 starts at startDate, Level 2 at startDate + (level-1) days
        // This ensures upstream (Level 1) is planned earlier than downstream (Level N)
        const scheduledDate = new Date(startDate)
        scheduledDate.setDate(startDate.getDate() + (level - 1))
        
        const formattedDate = scheduledDate.toISOString().split('T')[0]

        await this.db.execute(
          'UPDATE production_plan_sub_assembly SET explosion_level = ?, schedule_date = ? WHERE id = ?',
          [level, formattedDate, sa.id]
        )
        
        // Update local object to reflect changes in response
        sa.schedule_date = formattedDate
      }

      return arranged
    } catch (error) {
      console.error(`Error auto-arranging sub-assemblies for plan ${planId}:`, error)
      throw error
    }
  }

  async autoArrangeSubAssembliesByDependency(subAssemblies) {
    if (!subAssemblies || subAssemblies.length === 0) return []

    const dependencyGraph = new Map() // normalized item_code -> Set of its sub-assembly component normalized item_codes
    const allItemCodes = new Set(subAssemblies.map(sa => (sa.item_code || '').trim().toUpperCase()))

    // Build the dependency graph by looking at BOMs of all sub-assemblies in the plan
    for (const sa of subAssemblies) {
      const normalizedParentCode = (sa.item_code || '').trim().toUpperCase()
      if (!dependencyGraph.has(normalizedParentCode)) {
        dependencyGraph.set(normalizedParentCode, new Set())
        
        const bomId = sa.bom_no
        if (bomId) {
          const bomData = await this.getBOMDetails(bomId)
          if (bomData) {
            const allLines = [...(bomData.lines || []), ...(bomData.raw_materials || [])]
            for (const line of allLines) {
              const childCode = (line.component_code || line.item_code || '').trim().toUpperCase()
              
              // Robust check: Is this component actually a sub-assembly in the plan?
              if (childCode && allItemCodes.has(childCode) && childCode !== normalizedParentCode) {
                console.log(`[ProductionPlanningService] Dependency detected: ${normalizedParentCode} depends on ${childCode}`)
                dependencyGraph.get(normalizedParentCode).add(childCode)
              }
            }
          }
        }
      }
    }

    const levels = new Map() // normalized item_code -> level (1-based, Level 1 has no SA dependencies)
    const visiting = new Set()

    const calculateLevel = (itemCode) => {
      const normalizedCode = (itemCode || '').trim().toUpperCase()
      if (visiting.has(normalizedCode)) {
        throw new Error(`Circular dependency detected involving item ${normalizedCode}`)
      }
      if (levels.has(normalizedCode)) {
        return levels.get(normalizedCode)
      }

      visiting.add(normalizedCode)
      let maxChildLevel = 0;
      const dependencies = dependencyGraph.get(normalizedCode) || new Set()

      for (const depCode of dependencies) {
        maxChildLevel = Math.max(maxChildLevel, calculateLevel(depCode))
      }

      const currentLevel = maxChildLevel + 1
      levels.set(normalizedCode, currentLevel)
      visiting.delete(normalizedCode)
      return currentLevel
    }

    for (const normalizedCode of allItemCodes) {
      calculateLevel(normalizedCode)
    }

    // Now assign levels back to the sub-assemblies and sort them
    const arrangedSubAssemblies = subAssemblies.map(sa => ({
      ...sa,
      explosion_level: levels.get((sa.item_code || '').trim().toUpperCase()) || 1
    }))

    arrangedSubAssemblies.sort((a, b) => {
      if (a.explosion_level !== b.explosion_level) {
        return a.explosion_level - b.explosion_level
      }
      return (a.item_code || '').localeCompare(b.item_code || '')
    })

    return arrangedSubAssemblies
  }

  async validatePlanDependencies(subAssemblies) {
    if (!subAssemblies || subAssemblies.length === 0) return true

    const levels = new Map() // normalized item_code -> level
    const dates = new Map() // normalized item_code -> date object
    
    for (const sa of subAssemblies) {
      const normalizedCode = (sa.item_code || '').trim().toUpperCase()
      levels.set(normalizedCode, parseInt(sa.explosion_level || 0))
      if (sa.schedule_date) {
        dates.set(normalizedCode, new Date(sa.schedule_date))
      }
    }

    for (const sa of subAssemblies) {
      const normalizedParentCode = (sa.item_code || '').trim().toUpperCase()
      const bomId = sa.bom_no
      if (bomId) {
        const bomData = await this.getBOMDetails(bomId)
        if (bomData && (bomData.lines || bomData.raw_materials)) {
          const allLines = [...(bomData.lines || []), ...(bomData.raw_materials || [])]
          for (const line of allLines) {
            const childCode = (line.component_code || line.item_code || '').trim().toUpperCase()
            
            // If child is also in the plan, it must be at a lower level or earlier date
            if (childCode && levels.has(childCode) && childCode !== normalizedParentCode) {
              const parentLevel = levels.get(normalizedParentCode)
              const childLevel = levels.get(childCode)
              
              if (childLevel >= parentLevel && parentLevel !== 0) {
                throw new Error(`Invalid sequencing: ${sa.item_code} (Level ${parentLevel}) depends on ${childCode} (Level ${childLevel}). Dependencies must have a lower level.`)
              }

              const parentDate = dates.get(normalizedParentCode)
              const childDate = dates.get(childCode)
              if (parentDate && childDate && childDate > parentDate) {
                throw new Error(`Invalid scheduling: ${sa.item_code} scheduled on ${sa.schedule_date} depends on ${childCode} scheduled on ${childDate.toISOString().split('T')[0]}. Dependencies must be scheduled earlier or on the same day.`)
              }
            }
          }
        }
      }
    }

    return true
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
    const bomQuantity = parseFloat(bomData.quantity || 1)

    for (const line of lines) {
      const isSA = await this.isSubAssembly(line)
      if (isSA) {
        const nestedSubAsmCode = line.component_code || line.item_code
        const item = await this.getItemDetails(nestedSubAsmCode)
        const scrapPercentage = item ? parseFloat(item.loss_percentage || 0) : 0

        const bomQtyPerParent = parseFloat(line.quantity || line.qty || 1)
        const nestedPlannedQtyBeforeScrap = (plannedQty / bomQuantity) * bomQtyPerParent

        const nestedPlannedQty = this.calculateQtyWithScrap(nestedPlannedQtyBeforeScrap, scrapPercentage)

        const nestedBomData = await this.getSubAssemblyBOM(nestedSubAsmCode, line.bom_no)

        this.addSubAssemblyToPlan(plan, {
          item_code: nestedSubAsmCode,
          item_name: line.component_description || line.item_name,
          parent_item_code: bomData.item_code,
          bom_qty_per_parent: bomQtyPerParent,
          parent_planned_qty: plannedQty / bomQuantity,
          scrap_percentage: scrapPercentage,
          planned_qty_before_scrap: nestedPlannedQtyBeforeScrap,
          planned_qty: nestedPlannedQty,
          status: 'pending',
          bom_no: nestedBomData ? nestedBomData.bom_id : null,
          explosion_level: level
        })

        if (nestedBomData) {
          await this.processSubAssemblyBOM(nestedBomData, nestedPlannedQty, plan, level + 1)
        }
      } else {
        this.addRawMaterialToPlan(line, plannedQty, plan, bomData.item_code, bomQuantity)
      }
    }

    for (const rawMaterial of raw_materials) {
      const isSA = await this.isSubAssembly(rawMaterial)
      if (isSA) {
        const nestedSubAsmCode = rawMaterial.component_code || rawMaterial.item_code
        const item = await this.getItemDetails(nestedSubAsmCode)
        const scrapPercentage = item ? parseFloat(item.loss_percentage || 0) : 0

        const bomQtyPerParent = parseFloat(rawMaterial.quantity || rawMaterial.qty || 1)
        const nestedPlannedQtyBeforeScrap = (plannedQty / bomQuantity) * bomQtyPerParent

        const nestedPlannedQty = this.calculateQtyWithScrap(nestedPlannedQtyBeforeScrap, scrapPercentage)

        const nestedBomData = await this.getSubAssemblyBOM(nestedSubAsmCode, rawMaterial.bom_no)

        this.addSubAssemblyToPlan(plan, {
          item_code: nestedSubAsmCode,
          item_name: rawMaterial.component_description || rawMaterial.item_name || rawMaterial.description,
          parent_item_code: bomData.item_code,
          bom_qty_per_parent: bomQtyPerParent,
          parent_planned_qty: plannedQty / bomQuantity,
          scrap_percentage: scrapPercentage,
          planned_qty_before_scrap: nestedPlannedQtyBeforeScrap,
          planned_qty: nestedPlannedQty,
          status: 'pending',
          bom_no: nestedBomData ? nestedBomData.bom_id : null,
          explosion_level: level
        })

        if (nestedBomData) {
          await this.processSubAssemblyBOM(nestedBomData, nestedPlannedQty, plan, level + 1)
        }
      } else {
        this.addRawMaterialToPlan(rawMaterial, plannedQty, plan, bomData.item_code, bomQuantity)
      }
    }

    for (const operation of operations) {
      const operationTimePerBom = parseFloat(operation.operation_time || 0)
      const operationTimePerUnit = operationTimePerBom / bomQuantity
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

      // Define priority for keyword-based sorting (lower number = higher priority)
      const getPriority = (itemCode, itemName) => {
        const str = (itemCode + ' ' + itemName).toUpperCase()
        if (str.includes('RAW') || str.includes('CAST')) return 10
        if (str.includes('MACHIN')) return 20
        if (str.includes('FINISH') || str.includes('ASSY') || str.includes('ASSEMBL')) return 30
        return 25 // Default
      }

      // Sort sub-assemblies by dependency level (ascending) 
      // Level 1: No dependencies (Base items)
      // Level 2: Depends on Level 1, etc.
      // Final manufacturing flow is Level 1 -> Level N
      const sortedSubAssemblies = [...planData.sub_assemblies].sort((a, b) => {
        const levelDiff = (parseInt(a.explosion_level || 0)) - (parseInt(b.explosion_level || 0))
        if (levelDiff !== 0) return levelDiff

        // Same level, use keyword priority
        return getPriority(a.item_code, a.item_name) - getPriority(b.item_code, b.item_name)
      })

      for (const sa of sortedSubAssemblies) {
        // Automatically find BOM for sub-assembly if not present
        let saBomNo = sa.bom_no
        if (!saBomNo) {
          const subBom = await this.getSubAssemblyBOM(sa.item_code)
          if (subBom) saBomNo = subBom.bom_id
        }

        await this.db.execute(
          'INSERT INTO production_plan_sub_assembly (plan_id, item_code, item_name, parent_item_code, required_qty, planned_qty, planned_qty_before_scrap, scrap_percentage, bom_no, schedule_date, explosion_level) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
          [planId, sa.item_code, sa.item_name, sa.parent_item_code || sa.parent_assembly_code || sa.parent_code || null, sa.planned_qty, sa.planned_qty, sa.planned_qty_before_scrap, sa.scrap_percentage, saBomNo, sa.schedule_date || null, sa.explosion_level || 0]
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
      let globalOpCounter = 0
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
              operations: operationsToUse,
              starting_plan_sequence: globalOpCounter, // NEW: Track global sequence
              skipJobCardGeneration: true // Pass 1: Skip Job Card generation
            }

            console.log(`[ProductionPlanningService] Creating Work Order Header: ${woId} for Item: ${item.item_code} (Parent: ${parentWoId || 'None'})`)

            const createdIds = await productionModel.createWorkOrderRecursive(woData, userId || 1, false, true)
            
            // Increment global sequence by the number of operations in this WO
            globalOpCounter += operationsToUse.length;

            if (createdIds && createdIds.length > 0) {
              const actualWoId = createdIds[0]
              itemCodeToWoIdMap[item.item_code] = actualWoId
              item.generated_wo_id = actualWoId
              item.starting_plan_sequence = woData.starting_plan_sequence
              console.log(`[ProductionPlanningService] Successfully created WO ${actualWoId} for ${item.item_code} (Sequence: ${woData.starting_plan_sequence})`)
            }

            // Add a small delay to ensure unique timestamps and sequential creation
            await new Promise(resolve => setTimeout(resolve, 100))
          } catch (itemError) {
            console.error(`[ProductionPlanningService] Error creating work order for item ${item.item_code}:`, itemError)
          }
        }
      }

      const createdWorkOrders = []
      
      // Helper for priority-based sorting
      const getPriority = (itemCode, itemName) => {
        const str = (itemCode + ' ' + itemName).toUpperCase()
        if (str.includes('RAW') || str.includes('CAST')) return 10
        if (str.includes('MACHIN')) return 20
        if (str.includes('FINISH') || str.includes('ASSY') || str.includes('ASSEMBL')) return 30
        return 25 // Default
      }

      // 1. Process Sub-Assemblies FIRST in order of dependency level (Level 1 -> Level N)
      // Level 1 items have no dependencies in this plan and should be started first
      const sortedSubAsmList = [...(dbSubAsms || allSubAsms)].sort((a, b) => {
        const levelDiff = (parseInt(a.explosion_level || 0)) - (parseInt(b.explosion_level || 0))
        if (levelDiff !== 0) return levelDiff
        
        // Same level, use keyword priority
        return getPriority(a.item_code, a.item_name) - getPriority(b.item_code, b.item_name)
      })
      
      console.log(`[ProductionPlanningService] Starting Sub-Assembly batch... Count: ${sortedSubAsmList.length}`)
      await processBatch(sortedSubAsmList, false)

      // 2. Process Finished Goods LAST (Roots)
      console.log(`[ProductionPlanningService] Starting Finished Goods batch... Count: ${allFGItems.length}`)
      await processBatch(allFGItems, true)

      // Collect all generated IDs
      const allGeneratedIds = [...allFGItems, ...sortedSubAsmList]
        .map(item => item.generated_wo_id)
        .filter(id => !!id)

      // --- PASS 2: Link Dependencies ---
      console.log(`[ProductionPlanningService] PASS 2: Linking Work Order Dependencies...`)
      for (const item of [...sortedSubAsmList, ...allFGItems]) {
        const actualWoId = item.generated_wo_id
        const parentItemCode = item.parent_item_code || item.parent_assembly_code || item.parent_code
        
        if (actualWoId && parentItemCode) {
          const parentWoId = itemCodeToWoIdMap[parentItemCode]
          if (parentWoId) {
            console.log(`[ProductionPlanningService] Linking dependency and updating parent: ${parentWoId} -> ${actualWoId}`)
            const plannedQty = parseFloat(item.planned_qty) || parseFloat(item.qty) || parseFloat(item.quantity) || 0
            
            // 1. Add to work_order_dependency table (Primary dependency tracking)
            await productionModel.addWorkOrderDependency(parentWoId, actualWoId, item.item_code, plannedQty)
            
            // 2. Update parent_wo_id column in work_order table (Legacy/Reference support)
            await this.db.execute(
              'UPDATE work_order SET parent_wo_id = ? WHERE wo_id = ?',
              [parentWoId, actualWoId]
            )
          } else {
            console.warn(`[ProductionPlanningService] Could not find parent WO for ${item.item_code} (Parent code: ${parentItemCode})`)
          }
        }
      }

      // --- PASS 3: Generate Job Cards BOTTOM-UP (Deepest Level First) ---
      // This ensures child job cards exist when parent buffers are linked.
      console.log(`[ProductionPlanningService] PASS 3: Generating Job Cards Bottom-Up...`)
      
      const bottomUpList = [...(dbSubAsms || allSubAsms)].sort((a, b) => {
        const levelDiff = (parseInt(b.explosion_level || 0)) - (parseInt(a.explosion_level || 0))
        if (levelDiff !== 0) return levelDiff
        
        // Same level, use keyword priority
        return getPriority(a.item_code, a.item_name) - getPriority(b.item_code, b.item_name)
      })

      for (const item of bottomUpList) {
        if (item.generated_wo_id) {
          console.log(`[ProductionPlanningService] Pass 3: Generating Job Cards for Child WO ${item.generated_wo_id} (${item.item_code}) at Sequence ${item.starting_plan_sequence || 0}`)
          await productionModel.generateJobCardsForWorkOrder(item.generated_wo_id, userId || 1, item.starting_plan_sequence || 0)
        }
      }

      for (const item of allFGItems) {
        if (item.generated_wo_id) {
          console.log(`[ProductionPlanningService] Pass 3: Generating Job Cards for Root FG WO ${item.generated_wo_id} (${item.item_code}) at Sequence ${item.starting_plan_sequence || 0}`)
          await productionModel.generateJobCardsForWorkOrder(item.generated_wo_id, userId || 1, item.starting_plan_sequence || 0)
        }
      }

      // 4. Update Plan Status
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

  async syncPlansForSalesOrder(salesOrderId) {
    try {
      const [plans] = await this.db.execute(
        'SELECT plan_id FROM production_plan WHERE sales_order_id = ? AND status NOT IN ("completed", "cancelled")',
        [salesOrderId]
      )

      for (const plan of plans) {
        await this.regenerateProductionPlan(plan.plan_id)
      }
    } catch (error) {
      console.error('Error syncing plans for sales order:', error)
    }
  }

  async syncPlansForBOM(bomId) {
    try {
      const [plans] = await this.db.execute(
        'SELECT plan_id FROM production_plan WHERE bom_id = ? AND status NOT IN ("completed", "cancelled")',
        [bomId]
      )

      for (const plan of plans) {
        await this.regenerateProductionPlan(plan.plan_id)
      }
    } catch (error) {
      console.error('Error syncing plans for BOM:', error)
    }
  }

  async regenerateProductionPlan(planId) {
    try {
      // 1. Get existing plan details
      const [planRows] = await this.db.execute('SELECT * FROM production_plan WHERE plan_id = ?', [planId])
      if (!planRows.length) return

      const oldPlan = planRows[0]
      const salesOrderId = oldPlan.sales_order_id

      if (!salesOrderId) return

      // 2. Generate new plan data from the same Sales Order (which now has updated items/BOM)
      const newPlanData = await this.generateProductionPlanFromSalesOrder(salesOrderId)

      // 3. Update the production_plan record
      // We keep the same plan_id but refresh everything else
      
      // Clear old details (in a transaction for safety)
      const connection = await this.db.getConnection()
      try {
        await connection.beginTransaction()

        await connection.execute('DELETE FROM production_plan_fg WHERE plan_id = ?', [planId])
        await connection.execute('DELETE FROM production_plan_sub_assembly WHERE plan_id = ?', [planId])
        await connection.execute('DELETE FROM production_plan_raw_material WHERE plan_id = ?', [planId])
        await connection.execute('DELETE FROM production_plan_operations WHERE plan_id = ?', [planId])

        // 4. Save new data
        await this.saveProductionPlan(newPlanData, planId, connection)

        await connection.commit()
        console.log(`Successfully regenerated Production Plan ${planId}`)
        
        // 5. Trigger Work Order sync if they exist
        await this.syncWorkOrdersForPlan(planId)

      } catch (err) {
        await connection.rollback()
        throw err
      } finally {
        connection.release()
      }
    } catch (error) {
      console.error(`Error regenerating production plan ${planId}:`, error)
    }
  }

  async syncWorkOrdersForPlan(planId) {
    try {
      const [workOrders] = await this.db.execute(
        'SELECT wo_id, item_code, status FROM work_order WHERE production_plan_id = ? AND status NOT IN ("Completed", "Cancelled", "Closed")',
        [planId]
      )

      if (!workOrders.length) return

      // For existing work orders, we need to refresh their items and operations
      // This is a partial sync - if the quantity changed, we update it.
      // If the BOM changed, we might need more drastic measures.
      
      const [planFG] = await this.db.execute('SELECT * FROM production_plan_fg WHERE plan_id = ?', [planId])
      const [planSA] = await this.db.execute('SELECT * FROM production_plan_sub_assembly WHERE plan_id = ?', [planId])

      for (const wo of workOrders) {
        // Find matching item in plan
        const planItem = planFG.find(f => f.item_code === wo.item_code) || planSA.find(s => s.item_code === wo.item_code)
        
        if (planItem) {
          // Update Work Order quantity if it changed
          await this.db.execute(
            'UPDATE work_order SET quantity = ?, updated_at = NOW() WHERE wo_id = ?',
            [planItem.planned_qty, wo.wo_id]
          )

          // Refresh Items and Operations for this Work Order
          // We use ProductionModel's internal logic for this
          // (Assuming ProductionModel is available or we re-implement it)
          // For now, we'll implement a basic refresh
          await this.refreshWorkOrderFromBOM(wo.wo_id, planItem.bom_no, planItem.planned_qty)
        }
      }
    } catch (error) {
      console.error('Error syncing work orders for plan:', error)
    }
  }

  async refreshWorkOrderFromBOM(woId, bomNo, quantity) {
    try {
      // Clear old items and operations if WO is still in Draft/Ready
      const [wo] = await this.db.execute('SELECT status FROM work_order WHERE wo_id = ?', [woId])
      if (!wo.length || ['completed', 'cancelled', 'closed'].includes(wo[0].status.toLowerCase())) return

      // We only refresh if it's not started yet to avoid breaking WIP
      if (wo[0].status.toLowerCase() !== 'draft' && wo[0].status.toLowerCase() !== 'ready') return

      await this.db.execute('DELETE FROM work_order_item WHERE wo_id = ?', [woId])
      await this.db.execute('DELETE FROM work_order_operation WHERE wo_id = ?', [woId])

      if (!bomNo) return

      const bomDetails = await this.getBOMDetails(bomNo)
      if (!bomDetails) return

      // Re-add items
      for (const line of (bomDetails.lines || [])) {
        const itemQty = (parseFloat(line.quantity) || 0) * quantity
        await this.db.execute(
          'INSERT INTO work_order_item (wo_id, item_code, required_qty, consumed_qty, uom) VALUES (?, ?, ?, 0, ?)',
          [woId, line.component_code, itemQty, line.uom]
        )
      }

      // Re-add operations
      for (let i = 0; i < (bomDetails.operations || []).length; i++) {
        const op = bomDetails.operations[i]
        const opTime = parseFloat(op.operation_time || 0)
        const hourlyRate = parseFloat(op.hourly_rate || 0)
        const cost = (opTime / 60) * hourlyRate * quantity

        await this.db.execute(
          'INSERT INTO work_order_operation (wo_id, operation, sequence, workstation_type, time_in_minutes, hourly_rate, operating_cost, status) VALUES (?, ?, ?, ?, ?, ?, ?, "pending")',
          [woId, op.operation_name, i + 1, op.workstation_type, opTime * quantity, hourlyRate, cost]
        )
      }

      // Update Job Cards if they exist and are not started
      await this.syncJobCardsForWorkOrder(woId)

    } catch (error) {
      console.error(`Error refreshing Work Order ${woId}:`, error)
    }
  }

  async syncJobCardsForWorkOrder(woId) {
    try {
      const [jobCards] = await this.db.execute(
        'SELECT job_card_id, status, produced_quantity FROM job_card WHERE work_order_id = ? AND status IN ("draft", "ready", "open", "pending", "in-progress")',
        [woId]
      )

      if (!jobCards.length) return

      const [woOps] = await this.db.execute(
        'SELECT * FROM work_order_operation WHERE wo_id = ? ORDER BY sequence',
        [woId]
      )

      for (const jc of jobCards) {
        // Find matching operation
        const [jcDetails] = await this.db.execute('SELECT operation, operation_sequence FROM job_card WHERE job_card_id = ?', [jc.job_card_id])
        const op = woOps.find(o => o.operation === jcDetails[0].operation && o.sequence === jcDetails[0].operation_sequence)
        
        if (op) {
          const [wo] = await this.db.execute('SELECT quantity FROM work_order WHERE wo_id = ?', [woId])
          const woQty = parseFloat(wo[0]?.quantity || 1)
          const perUnitTime = (parseFloat(op.time_in_minutes) || 0) / woQty
          
          // Safety Check: For In-Progress cards, don't set target less than what's already produced
          const producedQty = parseFloat(jc.produced_quantity || 0)
          const targetQty = jc.status === 'in-progress' ? Math.max(woQty, producedQty) : woQty

          await this.db.execute(
            'UPDATE job_card SET planned_quantity = ?, operation_time = ?, operating_cost = ?, updated_at = NOW() WHERE job_card_id = ?',
            [targetQty, perUnitTime, op.operating_cost, jc.job_card_id]
          )
        }
      }
    } catch (error) {
      console.error('Error syncing job cards:', error)
    }
  }

  async saveProductionPlan(plan, planId, connection) {
    const db = connection || this.db
    
    // Save FG Items
    if (plan.finished_goods && Array.isArray(plan.finished_goods)) {
      for (const item of plan.finished_goods) {
        await db.execute(
          `INSERT INTO production_plan_fg 
           (plan_id, item_code, item_name, bom_no, planned_qty, uom, status)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [planId, item.item_code, item.item_name, plan.bom_id, item.planned_qty, item.uom || 'pcs', item.status || 'pending']
        )
      }
    }

    // Save Sub-Assemblies
    if (plan.sub_assemblies && Array.isArray(plan.sub_assemblies)) {
      for (const item of plan.sub_assemblies) {
        await db.execute(
          `INSERT INTO production_plan_sub_assembly 
           (plan_id, item_code, explosion_level, item_name, parent_item_code, bom_no, planned_qty, planned_qty_before_scrap, scrap_percentage, status)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [planId, item.item_code, item.explosion_level || 0, item.item_name, item.parent_item_code, item.bom_no, item.planned_qty, item.planned_qty_before_scrap, item.scrap_percentage, item.status || 'pending']
        )
      }
    }

    // Save Raw Materials
    if (plan.raw_materials && Array.isArray(plan.raw_materials)) {
      for (const item of plan.raw_materials) {
        await db.execute(
          `INSERT INTO production_plan_raw_material 
           (plan_id, item_code, item_name, item_type, item_group, plan_to_request_qty, qty_as_per_bom, rate, uom)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [planId, item.item_code, item.item_name, item.item_type, item.item_group, item.total_qty, item.qty_per_unit, item.rate, item.uom]
        )
      }
    }

    // Save Operations
    const allOperations = [
      ...(Array.isArray(plan.fg_operations) ? plan.fg_operations : []),
      ...(Array.isArray(plan.operations) ? plan.operations : [])
    ]

    if (allOperations.length > 0) {
      for (const op of allOperations) {
        await db.execute(
          'INSERT INTO production_plan_operations (plan_id, operation_name, workstation_type, total_time_minutes, total_hours, hourly_rate, total_cost, operation_type, execution_mode, vendor_id, vendor_rate_per_unit, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
          [
            planId, 
            op.operation_name || op.operation || '', 
            op.workstation_type || '', 
            op.total_time || 0, 
            op.total_hours || 0, 
            op.hourly_rate || 0, 
            op.total_cost || 0, 
            op.operation_type || 'SA', 
            op.execution_mode || 'IN_HOUSE', 
            op.vendor_id || null, 
            op.vendor_rate_per_unit || 0,
            op.notes || ''
          ]
        )
      }
    }
  }
}
