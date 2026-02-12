class ProductionModel {
  constructor(db) {
    this.db = db
  }

  _formatMySQLDate(date) {
    if (!date) return null;
    const d = new Date(date);
    if (isNaN(d.getTime())) return null;
    return d.toISOString().slice(0, 19).replace('T', ' ');
  }

  async getWarehouseId(warehouseIdentifier) {
    if (!warehouseIdentifier) return null;
    
    if (Number.isInteger(Number(warehouseIdentifier)) && Number(warehouseIdentifier) > 0) {
      return Number(warehouseIdentifier);
    }
    
    try {
      const [rows] = await this.db.query(
        'SELECT id FROM warehouses WHERE warehouse_code = ? OR warehouse_name = ?',
        [warehouseIdentifier, warehouseIdentifier]
      );
      
      if (rows.length) return rows[0].id;
      
      // If we can't find it and it's not a numeric ID, throw a clear error 
      // instead of passing a string that will cause a database type mismatch
      if (!Number.isInteger(Number(warehouseIdentifier))) {
        throw new Error(`Warehouse '${warehouseIdentifier}' not found. Please ensure the warehouse name or code is correct.`);
      }
      
      return Number(warehouseIdentifier);
    } catch (error) {
      if (error.message.includes('not found')) throw error;
      console.error('Error resolving warehouse ID:', error);
      return warehouseIdentifier;
    }
  }

  // ============= OPERATIONS =============

  async createOperation(data) {
    try {
      const existing = await this.getOperationById(data.name)
      if (existing) {
        throw new Error(`Operation '${data.name}' already exists`)
      }
      
      await this.db.query(
        `INSERT INTO operation (name, operation_name, default_workstation, is_corrective_operation, create_job_card_based_on_batch_size, batch_size, quality_inspection_template, description, operation_type, hourly_rate)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [data.name, data.operation_name, data.default_workstation, data.is_corrective_operation, 
         data.create_job_card_based_on_batch_size, data.batch_size, data.quality_inspection_template, data.description, data.operation_type || 'IN_HOUSE', data.hourly_rate || 0]
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
      if (data.hourly_rate !== undefined) { fields.push('hourly_rate = ?'); values.push(data.hourly_rate) }

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
        `INSERT INTO work_order (wo_id, item_code, quantity, priority, notes, status, sales_order_id, production_plan_id, bom_no, planned_start_date, planned_end_date, actual_start_date, actual_end_date, expected_delivery_date, parent_wo_id, target_warehouse)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [data.wo_id, data.item_code, data.quantity, data.priority || 'medium', data.notes || '', data.status, data.sales_order_id || null, data.production_plan_id || data.plan_id || null, data.bom_no || null, 
         this._formatMySQLDate(data.planned_start_date), 
         this._formatMySQLDate(data.planned_end_date), 
         this._formatMySQLDate(data.actual_start_date), 
         this._formatMySQLDate(data.actual_end_date), 
         this._formatMySQLDate(data.expected_delivery_date),
         data.parent_wo_id || null,
         data.target_warehouse || null]
      )
      return { wo_id: data.wo_id, ...data }
    } catch (error) {
      throw error
    }
  }

  async createWorkOrderRecursive(data, createdBy = 1, recurse = true) {
    try {
      const { wo_id, item_code, quantity, bom_no, priority, notes, sales_order_id, production_plan_id, planned_start_date, planned_end_date, expected_delivery_date, parent_wo_id, target_warehouse } = data;
      
      // 1. Determine actual WO ID
      const finalWoId = wo_id || `WO-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
      
      // 2. Determine actual BOM
      let actualBomNo = bom_no;
      if (!actualBomNo) {
        const [boms] = await this.db.query(
          'SELECT bom_id FROM bom WHERE item_code = ? AND is_active = 1 ORDER BY is_default DESC, created_at DESC LIMIT 1',
          [item_code]
        );
        if (boms && boms.length > 0) {
          actualBomNo = boms[0].bom_id;
        }
      }

      // 3. Create the Work Order for the item itself FIRST (so it has the oldest timestamp)
      const workOrderData = {
        ...data,
        wo_id: finalWoId,
        bom_no: actualBomNo,
        status: 'Draft',
        parent_wo_id: parent_wo_id || null
      };

      await this.createWorkOrder(workOrderData);
      
      // Add a small delay to ensure unique timestamps and correct DESC sorting
      await new Promise(resolve => setTimeout(resolve, 100));

      const createdWorkOrderIds = [finalWoId];

      // 4. EXPLODE BOM to find and create sub-assemblies (ONLY IF recurse is true)
      // These will be created LAST, so they appear at the TOP in DESC sorting.
      if (actualBomNo && recurse) {
        const bomDetails = await this.getBOMDetails(actualBomNo);
        const lines = bomDetails?.lines || [];
        
        for (const line of lines) {
          const componentCode = line.component_code;
          
          // Check if this component has its own BOM (is a sub-assembly)
          const [compBoms] = await this.db.query(
            'SELECT bom_id FROM bom WHERE item_code = ? AND is_active = 1 LIMIT 1',
            [componentCode]
          );
          
          if (compBoms && compBoms.length > 0) {
            // It's a sub-assembly - Recursively create its Work Order
            const subAsmQty = (parseFloat(line.quantity) || 1) * quantity;
            
            console.log(`Creating recursive Sub-Assembly WO for ${componentCode} (Parent: ${item_code})`);
            const subWOs = await this.createWorkOrderRecursive({
              item_code: componentCode,
              quantity: subAsmQty,
              bom_no: compBoms[0].bom_id,
              priority: priority || 'medium',
              notes: `Auto-generated sub-assembly for parent: ${item_code}`,
              sales_order_id,
              production_plan_id,
              planned_start_date,
              planned_end_date,
              expected_delivery_date,
              parent_wo_id: finalWoId // PASSING PARENT WO ID
            }, createdBy, true);
            
            createdWorkOrderIds.push(...subWOs);
          }
        }
      }

      // 5. Automatically populate items and operations from BOM if not provided
      const bomDetails = actualBomNo ? await this.getBOMDetails(actualBomNo) : null;
      
      // Add items (prefer passed data.required_items)
      const itemsToUse = (data.required_items && Array.isArray(data.required_items) && data.required_items.length > 0)
        ? data.required_items
        : (bomDetails && bomDetails.lines)
          ? bomDetails.lines.map(line => ({
              item_code: line.component_code,
              required_qty: (parseFloat(line.quantity) || 0) * quantity
            }))
          : [];

      for (let i = 0; i < itemsToUse.length; i++) {
        const item = itemsToUse[i];
        await this.addWorkOrderItem(finalWoId, {
          ...item,
          sequence: i + 1
        });
      }

      // Add operations (prefer passed data.operations)
      const opsToUse = (data.operations && Array.isArray(data.operations) && data.operations.length > 0)
        ? data.operations
        : (bomDetails && bomDetails.operations)
          ? bomDetails.operations.map(op => {
              const vendorRate = parseFloat(op.vendor_rate_per_unit || 0);
              const opTime = parseFloat(op.operation_time || 0);
              const hRate = parseFloat(op.hourly_rate || 0);
              
              // Calculate operating cost based on execution mode
              let opCost = 0;
              if (op.execution_mode === 'OUTSOURCE') {
                opCost = vendorRate * quantity;
              } else {
                opCost = (opTime / 60) * hRate * quantity;
              }

              return {
                operation_name: op.operation_name,
                workstation: op.workstation_type,
                operation_time: op.operation_time,
                hourly_rate: op.hourly_rate,
                operating_cost: opCost,
                operation_type: op.operation_type || 'IN_HOUSE',
                execution_mode: op.execution_mode || 'IN_HOUSE',
                vendor_id: op.vendor_id || null,
                vendor_name: op.vendor_name || null,
                vendor_rate_per_unit: vendorRate,
                notes: op.notes || op.description || ''
              };
            })
          : [];

      for (let i = 0; i < opsToUse.length; i++) {
        const op = opsToUse[i];
        await this.addWorkOrderOperation(finalWoId, {
          ...op,
          sequence: i + 1
        });
      }

      // 6. Generate Job Cards
      await this.generateJobCardsForWorkOrder(finalWoId, createdBy);

      // 7. Material Allocation
      try {
        if (itemsToUse.length > 0) {
          const InventoryModel = (await import('./InventoryModel.js')).default;
          const inventoryModel = new InventoryModel(this.db);
          
          const allocationItems = itemsToUse.map(item => ({
            item_code: item.item_code,
            required_qty: item.required_qty,
            source_warehouse: item.source_warehouse || 'Main'
          }));
          
          await inventoryModel.allocateMaterialsForWorkOrder(finalWoId, allocationItems, createdBy);
        }
      } catch (allocError) {
        console.warn(`Material allocation skipped/failed for ${finalWoId}:`, allocError.message);
      }

      // return createdWorkOrderIds;
      return [...new Set(createdWorkOrderIds)];
    } catch (error) {
      console.error('Error in createWorkOrderRecursive:', error);
      throw error;
    }
  }

  async getWorkOrders(filters = {}) {
    try {
      let query = `
        SELECT 
          wo.*, 
          i.name as item_name,
          i.valuation_rate,
          COALESCE(wo.unit_cost, i.valuation_rate, 0) as unit_cost,
          COALESCE(wo.total_cost, i.valuation_rate * wo.quantity, 0) as total_cost,
          COALESCE(
            (SELECT accepted_quantity FROM job_card WHERE work_order_id = wo.wo_id ORDER BY operation_sequence DESC LIMIT 1),
            (SELECT quantity_produced FROM production_entry WHERE work_order_id = wo.wo_id ORDER BY created_at DESC LIMIT 1),
            0
          ) as produced_qty,
          (SELECT COALESCE(SUM(scrap_quantity), 0) FROM job_card WHERE work_order_id = wo.wo_id) as scrap_qty,
          (SELECT COALESCE(SUM(rejected_quantity), 0) FROM job_card WHERE work_order_id = wo.wo_id) as rejected_qty,
          (SELECT COUNT(*) FROM work_order WHERE parent_wo_id = wo.wo_id) as total_sub_assemblies,
          (SELECT COUNT(*) FROM work_order WHERE parent_wo_id = wo.wo_id AND status != 'completed') as incomplete_sub_assemblies,
          sso.customer_name,
          wo.parent_wo_id
        FROM work_order wo
        LEFT JOIN item i ON wo.item_code = i.item_code
        LEFT JOIN selling_sales_order sso ON wo.sales_order_id = sso.sales_order_id
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
      if (filters.production_plan_id) {
        query += ' AND wo.production_plan_id = ?'
        params.push(filters.production_plan_id)
      }
      if (filters.day) {
        query += ' AND DAY(wo.planned_start_date) = ?'
        params.push(filters.day)
      }
      if (filters.month) {
        query += ' AND MONTH(wo.planned_start_date) = ?'
        params.push(filters.month)
      }
      if (filters.year) {
        query += ' AND YEAR(wo.planned_start_date) = ?'
        params.push(filters.year)
      }

      query += ' ORDER BY wo.created_at ASC'

      const [workOrders] = await this.db.query(query, params)
      return (workOrders || []).map(wo => ({
        ...wo,
        quantity: parseFloat(wo.quantity) || 0,
        produced_qty: parseFloat(wo.produced_qty) || 0,
        scrap_qty: parseFloat(wo.scrap_qty) || 0,
        rejected_qty: parseFloat(wo.rejected_qty) || 0,
        unit_cost: parseFloat(wo.unit_cost) || 0,
        total_cost: parseFloat(wo.total_cost) || 0,
        valuation_rate: parseFloat(wo.valuation_rate) || 0
      }))
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
          COALESCE(wo.unit_cost, i.valuation_rate, 0) as unit_cost,
          COALESCE(wo.total_cost, i.valuation_rate * wo.quantity, 0) as total_cost,
          COALESCE(
            (SELECT accepted_quantity FROM job_card WHERE work_order_id = wo.wo_id ORDER BY operation_sequence DESC LIMIT 1),
            (SELECT quantity_produced FROM production_entry WHERE work_order_id = wo.wo_id ORDER BY created_at DESC LIMIT 1),
            0
          ) as produced_qty,
          (SELECT COALESCE(SUM(scrap_quantity), 0) FROM job_card WHERE work_order_id = wo.wo_id) as scrap_qty,
          (SELECT COALESCE(SUM(rejected_quantity), 0) FROM job_card WHERE work_order_id = wo.wo_id) as rejected_qty,
          (SELECT COUNT(*) FROM work_order WHERE parent_wo_id = wo.wo_id) as total_sub_assemblies,
          (SELECT COUNT(*) FROM work_order WHERE parent_wo_id = wo.wo_id AND status != 'completed') as incomplete_sub_assemblies,
          sso.customer_name
        FROM work_order wo
        LEFT JOIN item i ON wo.item_code = i.item_code
        LEFT JOIN selling_sales_order sso ON wo.sales_order_id = sso.sales_order_id
        WHERE wo.wo_id = ?`,
        [wo_id]
      )
      if (!workOrders || workOrders.length === 0) return null

      const workOrder = {
        ...workOrders[0],
        quantity: parseFloat(workOrders[0].quantity) || 0,
        produced_qty: parseFloat(workOrders[0].produced_qty) || 0,
        scrap_qty: parseFloat(workOrders[0].scrap_qty) || 0,
        rejected_qty: parseFloat(workOrders[0].rejected_qty) || 0,
        unit_cost: parseFloat(workOrders[0].unit_cost) || 0,
        total_cost: parseFloat(workOrders[0].total_cost) || 0,
        valuation_rate: parseFloat(workOrders[0].valuation_rate) || 0
      }
      let bom_id = workOrder.bom_no || workOrder.bom_id

      // If no BOM is linked, try to find the default BOM for this item
      if (!bom_id && workOrder.item_code) {
        const [defaultBoms] = await this.db.query(
          'SELECT bom_id FROM bom WHERE item_code = ? AND is_active = 1 ORDER BY is_default DESC, created_at DESC LIMIT 1',
          [workOrder.item_code]
        )
        if (defaultBoms && defaultBoms.length > 0) {
          bom_id = defaultBoms[0].bom_id
          workOrder.bom_no = bom_id
          // Optionally update the work order with this BOM if it's missing?
          // For now, just use it for fallback logic
        }
      }

      let [operations] = await this.db.query(
        'SELECT * FROM work_order_operation WHERE wo_id = ? ORDER BY sequence ASC',
        [wo_id]
      )
      
      // Fallback to BOM operations if work order operations are empty
      if ((!operations || operations.length === 0) && bom_id) {
        const [bomOps] = await this.db.query(
          `SELECT 
            operation_name,
            operation_name as operation, 
            workstation_type as workstation, 
            operation_time as time, 
            operation_time,
            hourly_rate,
            operating_cost,
            operation_type,
            execution_mode,
            vendor_id,
            vendor_rate_per_unit,
            notes,
            0 as completed_qty, 
            0 as process_loss_qty, 
            sequence 
           FROM bom_operation 
           WHERE bom_id = ? 
           ORDER BY sequence ASC`,
          [bom_id]
        )
        operations = bomOps
      }
      
      const [items] = await this.db.query(
        'SELECT * FROM work_order_item WHERE wo_id = ? ORDER BY sequence ASC',
        [wo_id]
      )

      // If items are empty, fallback to BOM items
      let woItems = items
      if ((!woItems || woItems.length === 0) && bom_id) {
        const [bomLines] = await this.db.query(
          `SELECT 
            component_code as item_code, 
            quantity as required_qty, 
            0 as transferred_qty, 
            0 as consumed_qty, 
            0 as returned_qty, 
            sequence,
            operation
           FROM bom_line 
           WHERE bom_id = ? 
           ORDER BY sequence ASC`,
          [bom_id]
        )
        woItems = bomLines
      }

      const mappedOperations = (operations || []).map(op => ({
        ...op,
        time: parseFloat(op.time) || parseFloat(op.operation_time) || 0,
        hourly_rate: parseFloat(op.hourly_rate) || 0,
        operating_cost: parseFloat(op.operating_cost) || 0,
        completed_qty: parseFloat(op.completed_qty) || 0,
        process_loss_qty: parseFloat(op.process_loss_qty) || 0
      }))

      const mappedItems = (woItems || []).map(item => ({
        ...item,
        required_qty: parseFloat(item.required_qty) || 0,
        transferred_qty: parseFloat(item.transferred_qty) || 0,
        consumed_qty: parseFloat(item.consumed_qty) || 0,
        returned_qty: parseFloat(item.returned_qty) || 0
      }))

      return {
        ...workOrder,
        operations: mappedOperations,
        items: mappedItems
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
      if (data.planned_start_date !== undefined) { fields.push('planned_start_date = ?'); values.push(this._formatMySQLDate(data.planned_start_date)) }
      if (data.planned_end_date !== undefined) { fields.push('planned_end_date = ?'); values.push(this._formatMySQLDate(data.planned_end_date)) }
      if (data.actual_start_date !== undefined) { fields.push('actual_start_date = ?'); values.push(this._formatMySQLDate(data.actual_start_date)) }
      if (data.actual_end_date !== undefined) { fields.push('actual_end_date = ?'); values.push(this._formatMySQLDate(data.actual_end_date)) }
      if (data.expected_delivery_date !== undefined) { fields.push('expected_delivery_date = ?'); values.push(this._formatMySQLDate(data.expected_delivery_date)) }

      if (fields.length === 0) return false

      values.push(wo_id)
      const query = `UPDATE work_order SET ${fields.join(', ')} WHERE wo_id = ?`
      await this.db.query(query, values)

      // Sync Job Cards if quantity changed
      if (data.quantity !== undefined) {
        await this.db.query(
          'UPDATE job_card SET planned_quantity = ? WHERE work_order_id = ?',
          [data.quantity, wo_id]
        )
      }

      // Sync Sales Order status if status or sales_order_id changed
      if (data.status || data.sales_order_id !== undefined) {
        const workOrder = await this.getWorkOrderById(wo_id)
        if (workOrder && workOrder.sales_order_id) {
          await this.syncSalesOrderStatus(workOrder.sales_order_id)
        }
      }

      return true
    } catch (error) {
      throw error
    }
  }

  async deleteWorkOrder(wo_id) {
    try {
      // 0. Reverse Material Allocations
      const [allocations] = await this.db.query(
        'SELECT item_code, warehouse_id, allocated_qty FROM material_allocation WHERE work_order_id = ?',
        [wo_id]
      )
      
      for (const alloc of allocations) {
        await this.db.query(
          'UPDATE stock_balance SET reserved_qty = GREATEST(0, reserved_qty - ?) WHERE item_code = ? AND warehouse_id = ?',
          [parseFloat(alloc.allocated_qty) || 0, alloc.item_code, alloc.warehouse_id]
        )
      }
      
      await this.db.query('DELETE FROM material_allocation WHERE work_order_id = ?', [wo_id])

      // 1. Delete Rejections via Production Entries
      const [prodEntries] = await this.db.query(
        'SELECT entry_id FROM production_entry WHERE work_order_id = ?',
        [wo_id]
      )

      if (prodEntries && prodEntries.length > 0) {
        const entryIds = prodEntries.map(pe => pe.entry_id)
        const entryPlaceholders = entryIds.map(() => '?').join(',')
        
        await this.db.query(
          `DELETE FROM rejection WHERE production_entry_id IN (${entryPlaceholders})`,
          entryIds
        )
        
        await this.db.query(
          'DELETE FROM production_entry WHERE work_order_id = ?',
          [wo_id]
        )
      }

      // 2. Delete Job Cards (with thorough cleanup)
      await this.deleteJobCardsByWorkOrder(wo_id)

      // 3. Delete Work Order Items and Operations
      await this.db.query('DELETE FROM work_order_item WHERE wo_id = ?', [wo_id])
      await this.db.query('DELETE FROM work_order_operation WHERE wo_id = ?', [wo_id])

      // 4. Delete the Work Order itself
      await this.db.query('DELETE FROM work_order WHERE wo_id = ?', [wo_id])
      
      return true
    } catch (error) {
      throw error
    }
  }

  async addWorkOrderItem(wo_id, item) {
    try {
      const requiredQty = parseFloat(item.required_qty) || parseFloat(item.required_quantity) || parseFloat(item.qty) || parseFloat(item.quantity) || 0
      
      await this.db.query(
        `INSERT INTO work_order_item (wo_id, item_code, source_warehouse, required_qty, transferred_qty, consumed_qty, returned_qty, sequence, operation)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [wo_id, item.item_code, item.source_warehouse || '', requiredQty, 
         parseFloat(item.transferred_qty) || 0, parseFloat(item.consumed_qty) || 0, parseFloat(item.returned_qty) || 0, item.sequence || 0, item.operation || null]
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
      const time = parseFloat(operation.operation_time) || parseFloat(operation.time) || 0
      const hourly_rate = parseFloat(operation.hourly_rate) || 0
      
      await this.db.query(
        `INSERT INTO work_order_operation (wo_id, operation, workstation, time, hourly_rate, operation_type, execution_mode, vendor_id, vendor_rate_per_unit, operating_cost, completed_qty, process_loss_qty, sequence)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [wo_id, operationName, workstation, time, hourly_rate,
         operation.operation_type || 'IN_HOUSE', operation.execution_mode || 'IN_HOUSE', operation.vendor_id || null, parseFloat(operation.vendor_rate_per_unit) || 0,
         parseFloat(operation.operating_cost) || 0,
         parseFloat(operation.completed_qty) || 0, parseFloat(operation.process_loss_qty) || 0, operation.sequence || 0]
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
      let query = `
        SELECT 
          pp.*, 
          i.name as bom_product_name, 
          b.item_code as bom_item_code 
        FROM production_plan pp
        LEFT JOIN bom b ON pp.bom_id = b.bom_id
        LEFT JOIN item i ON b.item_code = i.item_code
        WHERE 1=1
      `
      const params = []

      if (filters.status) {
        query += ' AND pp.status = ?'
        params.push(filters.status)
      }
      if (filters.week_number) {
        query += ' AND pp.week_number = ?'
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
      const [plans] = await this.db.query(`
        SELECT 
          pp.*, 
          i.name as bom_product_name, 
          b.item_code as bom_item_code 
        FROM production_plan pp
        LEFT JOIN bom b ON pp.bom_id = b.bom_id
        LEFT JOIN item i ON b.item_code = i.item_code
        WHERE pp.plan_id = ?
      `, [plan_id])
      
      if (!plans || plans.length === 0) return null
      
      const plan = plans[0]

      // Fetch FG Items
      const [fgItems] = await this.db.query(
        `SELECT pg.*, i.name as item_name, pg.bom_no 
         FROM production_plan_fg pg 
         LEFT JOIN item i ON pg.item_code = i.item_code 
         WHERE pg.plan_id = ?`,
        [plan_id]
      ).catch(() => [[]])

      // Fetch Sub-assemblies
      const [subAssemblies] = await this.db.query(
        `SELECT psa.*, i.name as item_name, psa.bom_no 
         FROM production_plan_sub_assembly psa 
         LEFT JOIN item i ON psa.item_code = i.item_code 
         WHERE psa.plan_id = ?
         ORDER BY psa.id ASC`,
        [plan_id]
      ).catch(() => [[]])

      // Fetch Raw Materials
      const [rawMaterials] = await this.db.query(
        `SELECT prm.*, i.name as item_name 
         FROM production_plan_raw_material prm 
         LEFT JOIN item i ON prm.item_code = i.item_code 
         WHERE prm.plan_id = ?`,
        [plan_id]
      ).catch(() => [[]])

      // Fetch Operations
      const [operations] = await this.db.query(
        `SELECT * FROM production_plan_operations 
         WHERE plan_id = ? 
         ORDER BY FIELD(operation_type, 'FG', 'SA', 'IN_HOUSE') ASC, id ASC`,
        [plan_id]
      ).catch(() => [[]])

      // Map data for consistency with ProductionPlanningModel
      const mappedSubAssemblies = (subAssemblies || []).map(item => ({
        ...item,
        planned_qty: parseFloat(item.planned_qty) || parseFloat(item.required_qty) || 0,
        required_qty: parseFloat(item.required_qty) || parseFloat(item.planned_qty) || 0,
        scheduled_date: item.schedule_date
      }))

      const mappedFGItems = (fgItems || []).map(item => ({
        ...item,
        planned_qty: parseFloat(item.planned_qty) || 0
      }))

      const mappedRawMaterials = (rawMaterials || []).map(item => ({
        ...item,
        qty: parseFloat(item.plan_to_request_qty) || parseFloat(item.qty) || 0
      }))

      let salesOrderId = plan.sales_order_id

      if (!salesOrderId && fgItems.length > 0) {
        salesOrderId = await this.findMatchingSalesOrder(fgItems)
        if (salesOrderId) {
          plan.sales_order_id = salesOrderId
          
          try {
            await this.db.query(
              `UPDATE production_plan SET sales_order_id = ? WHERE plan_id = ?`,
              [salesOrderId, plan_id]
            )
          } catch (err) {
            console.log('Note: Could not update sales_order_id in database:', err.message)
          }
        }
      }

      return {
        ...plan,
        fg_items: mappedFGItems,
        sub_assemblies: mappedSubAssemblies,
        raw_materials: mappedRawMaterials,
        operations: operations || []
      }
    } catch (error) {
      throw error
    }
  }

  async findMatchingSalesOrder(fgItems) {
    try {
      const [salesOrders] = await this.db.query(
        `SELECT sales_order_id, items FROM selling_sales_order WHERE deleted_at IS NULL`
      ).catch(() => [[], []])

      if (!salesOrders.length) return null

      // Loop through sales orders and check if items match
      for (const so of salesOrders) {
        try {
          const soItems = typeof so.items === 'string' ? JSON.parse(so.items) : (so.items || [])
          
          // Check if ALL FG items in the plan exist in this sales order
          const allItemsMatch = fgItems.every(planItem => {
            return soItems.some(soItem => 
              (soItem.item_code === planItem.item_code || soItem.item === planItem.item_code) &&
              parseFloat(soItem.qty || soItem.quantity) >= parseFloat(planItem.planned_qty)
            )
          })

          if (allItemsMatch) return so.sales_order_id
        } catch (e) {
          continue
        }
      }
      return null
    } catch (error) {
      return null
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
         parseFloat(data.quantity_produced) || 0, parseFloat(data.quantity_rejected) || 0, parseFloat(data.hours_worked) || 0, data.remarks]
      )
      return { entry_id, ...data }
    } catch (error) {
      throw error
    }
  }

  async getProductionEntries(filters = {}) {
    try {
      let query = `
        SELECT 
          pe.*, 
          wo.item_code, 
          i.name as item_name,
          mm.name as machine_name,
          om.name as operator_name
        FROM production_entry pe
        LEFT JOIN work_order wo ON pe.work_order_id = wo.wo_id
        LEFT JOIN item i ON wo.item_code = i.item_code
        LEFT JOIN machine_master mm ON pe.machine_id = mm.machine_id
        LEFT JOIN operator_master om ON pe.operator_id = om.operator_id
        WHERE 1=1
      `
      const params = []

      if (filters.entry_date) {
        query += ' AND DATE(pe.entry_date) = ?'
        params.push(filters.entry_date)
      }
      if (filters.machine_id) {
        query += ' AND pe.machine_id = ?'
        params.push(filters.machine_id)
      }
      if (filters.work_order_id) {
        query += ' AND pe.work_order_id = ?'
        params.push(filters.work_order_id)
      }

      const [entries] = await this.db.query(query, params)
      return (entries || []).map(entry => ({
        ...entry,
        quantity_produced: parseFloat(entry.quantity_produced) || 0,
        quantity_rejected: parseFloat(entry.quantity_rejected) || 0,
        hours_worked: parseFloat(entry.hours_worked) || 0
      }))
    } catch (error) {
      throw error
    }
  }

  // ============= REJECTIONS =============

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
      let query = 'SELECT b.*, i.name as product_name, i.item_group, i.standard_selling_rate FROM bom b LEFT JOIN item i ON b.item_code = i.item_code WHERE 1=1'
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
      const [bom] = await this.db.query(`
        SELECT b.*, i.name as product_name, i.standard_selling_rate
        FROM bom b
        LEFT JOIN item i ON b.item_code = i.item_code
        WHERE b.bom_id = ?
      `, [bom_id])
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
        SELECT brm.*, i.name as item_name, i.item_group 
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
      `SELECT brm.*, i.name as item_name, i.item_group FROM bom_raw_material brm LEFT JOIN item i ON brm.item_code = i.item_code WHERE brm.bom_id = ? ORDER BY brm.sequence`,
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
      const query = `INSERT INTO bom (
        bom_id, item_code, product_name, item_group, description, 
        quantity, uom, status, revision, is_active, is_default, 
        allow_alternative_item, auto_sub_assembly_rate, project, 
        cost_rate_based_on, valuation_rate_value, selling_rate, 
        currency, with_operations, process_loss_percentage, 
        transfer_material_against, routing, total_cost, 
        effective_date, created_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      
      await this.db.query(
        query,
        [
          data.bom_id, data.item_code, data.product_name, data.item_group, data.description,
          data.quantity || 1, data.uom, data.status || 'Draft', data.revision || 1,
          data.is_active !== undefined ? data.is_active : true,
          data.is_default !== undefined ? data.is_default : false,
          data.allow_alternative_item !== undefined ? data.allow_alternative_item : false,
          data.auto_sub_assembly_rate !== undefined ? data.auto_sub_assembly_rate : false,
          data.project || null,
          data.cost_rate_based_on || 'Valuation Rate',
          data.valuation_rate_value || 0,
          data.selling_rate || 0,
          data.currency || 'INR',
          data.with_operations !== undefined ? data.with_operations : false,
          data.process_loss_percentage || 0,
          data.transfer_material_against || 'Work Order',
          data.routing || null,
          data.total_cost || 0,
          data.effective_date || null,
          data.created_by
        ]
      )
      return data
    } catch (error) {
      throw error
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
        `INSERT INTO bom_line (bom_id, component_code, quantity, uom, rate, amount, component_description, component_type, sequence, notes, loss_percentage, scrap_qty, operation)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [bom_id, line.component_code, quantity, line.uom, rate, amount,
         line.component_name || line.component_description, line.type || line.component_type, line.sequence, line.notes, lossPercentage, scrapQty, line.operation]
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
      if (line.operation !== undefined) { fields.push('operation = ?'); values.push(line.operation) }
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
      if (data.description !== undefined) { fields.push('description = ?'); values.push(data.description) }
      if (data.quantity) { fields.push('quantity = ?'); values.push(data.quantity) }
      if (data.uom) { fields.push('uom = ?'); values.push(data.uom) }
      if (data.status) { fields.push('status = ?'); values.push(data.status) }
      if (data.revision) { fields.push('revision = ?'); values.push(data.revision) }
      if (data.effective_date !== undefined) { fields.push('effective_date = ?'); values.push(data.effective_date) }
      if (data.is_active !== undefined) { fields.push('is_active = ?'); values.push(data.is_active) }
      if (data.is_default !== undefined) { fields.push('is_default = ?'); values.push(data.is_default) }
      if (data.allow_alternative_item !== undefined) { fields.push('allow_alternative_item = ?'); values.push(data.allow_alternative_item) }
      if (data.auto_sub_assembly_rate !== undefined) { fields.push('auto_sub_assembly_rate = ?'); values.push(data.auto_sub_assembly_rate) }
      if (data.project !== undefined) { fields.push('project = ?'); values.push(data.project) }
      if (data.cost_rate_based_on) { fields.push('cost_rate_based_on = ?'); values.push(data.cost_rate_based_on) }
      if (data.valuation_rate_value !== undefined) { fields.push('valuation_rate_value = ?'); values.push(data.valuation_rate_value) }
      if (data.selling_rate !== undefined) { fields.push('selling_rate = ?'); values.push(data.selling_rate) }
      if (data.currency) { fields.push('currency = ?'); values.push(data.currency) }
      if (data.with_operations !== undefined) { fields.push('with_operations = ?'); values.push(data.with_operations) }
      if (data.process_loss_percentage !== undefined) { fields.push('process_loss_percentage = ?'); values.push(data.process_loss_percentage) }
      if (data.transfer_material_against) { fields.push('transfer_material_against = ?'); values.push(data.transfer_material_against) }
      if (data.routing !== undefined) { fields.push('routing = ?'); values.push(data.routing) }
      if (data.total_cost !== undefined) { fields.push('total_cost = ?'); values.push(data.total_cost) }

      if (fields.length === 0) return false

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
        `INSERT INTO bom_operation (bom_id, operation_name, workstation_type, operation_time, setup_time, hourly_rate, fixed_time, operating_cost, operation_type, execution_mode, vendor_id, vendor_rate_per_unit, sequence, notes)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [bom_id, operation.operation_name, operation.workstation_type, operation.operation_time, operation.setup_time || 0,
         operation.hourly_rate || 0, operation.fixed_time, operation.operating_cost || 0, operation.operation_type || 'IN_HOUSE', 
         operation.execution_mode || 'IN_HOUSE', operation.vendor_id || null, operation.vendor_rate_per_unit || 0, operation.sequence, operation.notes]
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

  async getJobCards(filters = {}) {
    const { status, search, work_order_id, day, month, year } = filters
    try {
      let query = `
        SELECT 
          jc.*, 
          wo.item_code, 
          i.name as item_name,
          mm.name as machine_name,
          om.name as operator_name
        FROM job_card jc
        LEFT JOIN work_order wo ON jc.work_order_id = wo.wo_id
        LEFT JOIN item i ON wo.item_code = i.item_code
        LEFT JOIN machine_master mm ON jc.machine_id = mm.machine_id
        LEFT JOIN operator_master om ON jc.operator_id = om.operator_id
        WHERE 1=1
      `
      const params = []

      if (status) {
        query += ' AND jc.status = ?'
        params.push(status)
      }
      if (search) {
        query += ' AND (jc.job_card_id LIKE ? OR jc.work_order_id LIKE ? OR i.name LIKE ?)'
        params.push(`%${search}%`, `%${search}%`, `%${search}%`)
      }
      if (work_order_id) {
        query += ' AND jc.work_order_id = ?'
        params.push(work_order_id)
      }
      if (day) {
        query += ' AND DAY(jc.scheduled_start_date) = ?'
        params.push(day)
      }
      if (month) {
        query += ' AND MONTH(jc.scheduled_start_date) = ?'
        params.push(month)
      }
      if (year) {
        query += ' AND YEAR(jc.scheduled_start_date) = ?'
        params.push(year)
      }

      query += ' ORDER BY jc.operation_sequence ASC, jc.created_at ASC'
      const [jobCards] = await this.db.query(query, params)
      return jobCards || []
    } catch (error) {
      throw error
    }
  }

  async getJobCardDetails(job_card_id) {
    try {
      const [jobCards] = await this.db.query(`
        SELECT 
          jc.*, 
          wo.item_code, 
          wo.quantity as sales_qty,
          i.name as item_name,
          mm.name as machine_name,
          om.name as operator_name
        FROM job_card jc
        LEFT JOIN work_order wo ON jc.work_order_id = wo.wo_id
        LEFT JOIN item i ON wo.item_code = i.item_code
        LEFT JOIN machine_master mm ON jc.machine_id = mm.machine_id
        LEFT JOIN operator_master om ON jc.operator_id = om.operator_id
        WHERE jc.job_card_id = ?
      `, [job_card_id])
      return jobCards && jobCards.length > 0 ? jobCards[0] : null
    } catch (error) {
      throw error
    }
  }

  async getNextJobCardId() {
    try {
      const [rows] = await this.db.query(
        "SELECT job_card_id FROM job_card WHERE job_card_id LIKE 'JC-%'"
      )
      
      let maxNum = 0
      rows.forEach(row => {
        const parts = row.job_card_id.split('-')
        if (parts.length >= 2) {
          const num = parseInt(parts[1])
          if (!isNaN(num) && num > maxNum) {
            maxNum = num
          }
        }
      })
      
      return `JC-${maxNum + 1}`
    } catch (error) {
      console.error('Error generating next job card ID:', error)
      return `JC-${Date.now()}` // Fallback
    }
  }

  async createJobCard(data) {
    try {
      // If job_card_id is not provided or is a temporary one, generate a sequential one
      if (!data.job_card_id || data.job_card_id.includes(Date.now().toString().substring(0, 5))) {
        data.job_card_id = await this.getNextJobCardId()
      }
      
      const statusNormalized = ((data.status || 'draft').toLowerCase().replace(/\s+/g, '-')).trim()
      await this.db.query(
        `INSERT INTO job_card (job_card_id, work_order_id, machine_id, operator_id, operation, operation_sequence, operation_type, execution_mode, vendor_id, vendor_rate_per_unit, subcontract_status, sent_qty, received_qty, accepted_qty, rejected_qty, planned_quantity, produced_quantity, rejected_quantity, accepted_quantity, scrap_quantity, operation_time, hourly_rate, operating_cost, scheduled_start_date, scheduled_end_date, actual_start_date, actual_end_date, status, created_by, notes)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [data.job_card_id, data.work_order_id, data.machine_id || null, data.operator_id || null, data.operation || null, data.operation_sequence || null,
         data.operation_type || 'IN_HOUSE', data.execution_mode || 'IN_HOUSE', data.vendor_id || null, parseFloat(data.vendor_rate_per_unit) || 0, data.subcontract_status || (data.execution_mode === 'OUTSOURCE' ? 'DRAFT' : null),
         data.sent_qty || 0, data.received_qty || 0, data.accepted_qty || 0, data.rejected_qty || 0,
         data.planned_quantity, data.produced_quantity || 0, data.rejected_quantity || 0, data.accepted_quantity || 0, data.scrap_quantity || 0,
         data.operation_time || 0, data.hourly_rate || 0, data.operating_cost || 0, 
         this._formatMySQLDate(data.scheduled_start_date), 
         this._formatMySQLDate(data.scheduled_end_date),
         this._formatMySQLDate(data.actual_start_date),
         this._formatMySQLDate(data.actual_end_date),
         statusNormalized, data.created_by, data.notes]
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

      // If cost calculation factors change but cost isn't explicitly provided, recalculate it
      if ((data.hourly_rate !== undefined || data.operation_time !== undefined) && data.operating_cost === undefined) {
        const [current] = await this.db.query('SELECT hourly_rate, operation_time FROM job_card WHERE job_card_id = ?', [job_card_id])
        if (current.length > 0) {
          const hRate = data.hourly_rate !== undefined ? data.hourly_rate : (current[0].hourly_rate || 0)
          const oTime = data.operation_time !== undefined ? data.operation_time : (current[0].operation_time || 0)
          // Cycle time is in minutes, hourly rate is per hour, so divide by 60
          data.operating_cost = (parseFloat(hRate) * parseFloat(oTime)) / 60
        }
      }

      if (data.operation) { fields.push('operation = ?'); values.push(data.operation) }
      if (data.operation_sequence) { fields.push('operation_sequence = ?'); values.push(data.operation_sequence) }
      if (data.status !== undefined) { 
        const statusValue = (data.status || '').toLowerCase().replace(/\s+/g, '-').trim()
        if (statusValue.length > 50) {
          throw new Error(`Status value too long: "${statusValue}" (${statusValue.length} characters, max 50 allowed)`)
        }
        fields.push('status = ?')
        values.push(statusValue)
      }
      if (data.operator_id) { fields.push('operator_id = ?'); values.push(data.operator_id) }
      if (data.machine_id) { fields.push('machine_id = ?'); values.push(data.machine_id) }
      if (data.execution_mode) { fields.push('execution_mode = ?'); values.push(data.execution_mode) }
      if (data.vendor_id !== undefined) { fields.push('vendor_id = ?'); values.push(data.vendor_id) }
      if (data.vendor_rate_per_unit !== undefined) { fields.push('vendor_rate_per_unit = ?'); values.push(data.vendor_rate_per_unit) }
      if (data.subcontract_status) { fields.push('subcontract_status = ?'); values.push(data.subcontract_status) }
      if (data.sent_qty !== undefined && data.sent_qty !== null) { fields.push('sent_qty = ?'); values.push(data.sent_qty) }
      if (data.received_qty !== undefined && data.received_qty !== null) { fields.push('received_qty = ?'); values.push(data.received_qty) }
      if (data.accepted_qty !== undefined && data.accepted_qty !== null) { fields.push('accepted_qty = ?'); values.push(data.accepted_qty) }
      if (data.rejected_qty !== undefined && data.rejected_qty !== null) { fields.push('rejected_qty = ?'); values.push(data.rejected_qty) }
      if (data.planned_quantity !== undefined && data.planned_quantity !== null) { fields.push('planned_quantity = ?'); values.push(data.planned_quantity) }
      if (data.produced_quantity !== undefined && data.produced_quantity !== null) { fields.push('produced_quantity = ?'); values.push(data.produced_quantity) }
      if (data.rejected_quantity !== undefined && data.rejected_quantity !== null) { fields.push('rejected_quantity = ?'); values.push(data.rejected_quantity) }
      if (data.accepted_quantity !== undefined && data.accepted_quantity !== null) { fields.push('accepted_quantity = ?'); values.push(data.accepted_quantity) }
      if (data.scrap_quantity !== undefined && data.scrap_quantity !== null) { fields.push('scrap_quantity = ?'); values.push(data.scrap_quantity) }
      if (data.scheduled_start_date) { fields.push('scheduled_start_date = ?'); values.push(this._formatMySQLDate(data.scheduled_start_date)) }
      if (data.scheduled_end_date) { fields.push('scheduled_end_date = ?'); values.push(this._formatMySQLDate(data.scheduled_end_date)) }
      if (data.actual_start_date) { fields.push('actual_start_date = ?'); values.push(this._formatMySQLDate(data.actual_start_date)) }
      if (data.actual_end_date) { fields.push('actual_end_date = ?'); values.push(this._formatMySQLDate(data.actual_end_date)) }
      if (data.notes) { fields.push('notes = ?'); values.push(data.notes) }
      if (data.hourly_rate !== undefined && data.hourly_rate !== null) { fields.push('hourly_rate = ?'); values.push(data.hourly_rate) }
      if (data.operation_time !== undefined && data.operation_time !== null) { fields.push('operation_time = ?'); values.push(data.operation_time) }
      if (data.operating_cost !== undefined && data.operating_cost !== null) { fields.push('operating_cost = ?'); values.push(data.operating_cost) }

      if (fields.length === 0) return false

      values.push(job_card_id)
      const query = `UPDATE job_card SET ${fields.join(', ')} WHERE job_card_id = ?`
      await this.db.query(query, values)

      // Sync quantities after update to ensure integrity
      await this._syncJobCardQuantities(job_card_id)

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

      const hasStarted = jobCards.some(card => {
        const status = (card.status || '').toLowerCase()
        return status === 'in-progress' || status === 'completed'
      })

      if (hasStarted) {
        const workOrder = await this.getWorkOrderById(work_order_id)
        const workOrderStatus = (workOrder?.status || '').toLowerCase()
        
        if (workOrderStatus !== 'in-progress' && workOrderStatus !== 'in_progress' && workOrderStatus !== 'completed') {
          await this.updateWorkOrder(work_order_id, { status: 'in_progress' })
          
          // Sync Sales Order status
          if (workOrder && workOrder.sales_order_id) {
            await this.syncSalesOrderStatus(workOrder.sales_order_id)
          }
          
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
        
        // NEW: Backflush inventory when work order is completed
        const workOrder = await this.getWorkOrderById(work_order_id)
        if (workOrder) {
          // Update item valuation rate with the actual unit cost from the work order
          if (workOrder.unit_cost > 0) {
            try {
              await this.db.query(
                'UPDATE item SET valuation_rate = ? WHERE item_code = ?',
                [workOrder.unit_cost, workOrder.item_code]
              );
              console.log(`Updated valuation rate for item ${workOrder.item_code} to ${workOrder.unit_cost} from WO ${work_order_id}`);
            } catch (itemUpdateError) {
              console.error(`Failed to update valuation rate for item ${workOrder.item_code}:`, itemUpdateError.message);
            }
          }

          try {
            await this.backflushInventory(work_order_id, workOrder.quantity, 1)
          } catch (backflushError) {
            console.error(`Backflushing failed for Work Order ${work_order_id}:`, backflushError.message)
          }
        }
        
        // Sync Sales Order status
        if (workOrder && workOrder.sales_order_id) {
          await this.syncSalesOrderStatus(workOrder.sales_order_id)
        }

        // NEW: Check if parent Work Order can now be set to 'ready'
        if (workOrder && workOrder.parent_wo_id) {
          const parentWoId = workOrder.parent_wo_id;
          const [incompleteChildren] = await this.db.query(
            'SELECT COUNT(*) as count FROM work_order WHERE parent_wo_id = ? AND status != ?',
            [parentWoId, 'completed']
          );

          if (incompleteChildren && incompleteChildren[0].count === 0) {
            // All sub-assemblies for the parent are completed!
            // Set the parent's first Job Card to 'ready'
            const [firstJobCard] = await this.db.query(
              'SELECT job_card_id FROM job_card WHERE work_order_id = ? ORDER BY operation_sequence ASC LIMIT 1',
              [parentWoId]
            );

            if (firstJobCard && firstJobCard.length > 0) {
              await this.db.query(
                "UPDATE job_card SET status = 'ready' WHERE job_card_id = ? AND status = 'draft'",
                [firstJobCard[0].job_card_id]
              );
              console.log(`Parent Work Order ${parentWoId} is now ready to start. First Job Card set to ready.`);
            }
          }
        }
        
        return true
      }

      return false
    } catch (error) {
      throw error
    }
  }

  async syncSalesOrderStatus(sales_order_id) {
    if (!sales_order_id) return false
    try {
      const [workOrders] = await this.db.query(
        'SELECT status FROM work_order WHERE sales_order_id = ?',
        [sales_order_id]
      )

      if (!workOrders || workOrders.length === 0) return false

      const statuses = workOrders.map(wo => (wo.status || '').toLowerCase())
      
      let newSOStatus = 'confirmed'

      const hasInProgress = statuses.some(s => s === 'in-progress' || s === 'in_progress')
      const hasCompleted = statuses.some(s => s === 'completed')
      const allCompleted = statuses.every(s => s === 'completed')
      const allDraft = statuses.every(s => s === 'draft')

      if (allCompleted && statuses.length > 0) {
        newSOStatus = 'complete'
      } else if (hasInProgress) {
        newSOStatus = 'production'
      } else if (statuses.length > 0) {
        newSOStatus = 'ready_for_production'
      }

      const [currentSO] = await this.db.query(
        'SELECT status, created_by FROM selling_sales_order WHERE sales_order_id = ?',
        [sales_order_id]
      )
      
      if (currentSO && currentSO.length > 0) {
        const currentStatus = (currentSO[0].status || '').toLowerCase()
        if (currentStatus !== newSOStatus) {
            const advancedStatuses = ['dispatched', 'delivered', 'cancelled']
            if (!advancedStatuses.includes(currentStatus)) {
                await this.db.query(
                    'UPDATE selling_sales_order SET status = ?, updated_at = NOW() WHERE sales_order_id = ?',
                    [newSOStatus, sales_order_id]
                )

                // Create notification for status change
                try {
                  const NotificationModel = (await import('./NotificationModel.js')).default
                  const creatorId = currentSO[0].created_by
                  
                  if (creatorId) {
                    await NotificationModel.create({
                      user_id: creatorId,
                      notification_type: 'SALES_ORDER_STATUS_UPDATE',
                      title: `Sales Order Status Updated: ${sales_order_id}`,
                      message: `Sales Order ${sales_order_id} has automatically transitioned to '${newSOStatus}' status.`,
                      reference_type: 'SALES_ORDER',
                      reference_id: sales_order_id
                    })
                  }
                } catch (notifyError) {
                  console.error('Failed to create notification for sales order status update:', notifyError)
                }

                return true
            }
        }
      }
      return false
    } catch (error) {
      console.error('Error syncing sales order status:', error)
      return false
    }
  }

  async ensureSubcontractWarehouse() {
    const [rows] = await this.db.query('SELECT id FROM warehouses WHERE warehouse_code = ?', ['SUBCONTRACT_WIP']);
    if (rows.length === 0) {
      const [result] = await this.db.query(
        `INSERT INTO warehouses (warehouse_code, warehouse_name, warehouse_type, is_active, created_by) 
         VALUES (?, ?, ?, TRUE, 1)`,
        ['SUBCONTRACT_WIP', 'Subcontracting WIP', 'Work in Progress']
      );
      return result.insertId;
    }
    return rows[0].id;
  }

  async handleSubcontractDispatch(job_card_id, user_id, dispatchItems = [], outward_challan_id = null) {
    let connection;
    try {
      connection = await this.db.getConnection();
      await connection.beginTransaction();

      const jobCard = await this.getJobCardDetails(job_card_id);
      if (!jobCard) throw new Error('Job card not found');
      if (jobCard.execution_mode !== 'OUTSOURCE') throw new Error('Job card is not an outsource operation');

      const workOrder = await this.getWorkOrderById(jobCard.work_order_id);
      const mainItemCode = workOrder.item_code;
      const mainQuantity = jobCard.planned_quantity;

      const subcontractWH = await this.ensureSubcontractWarehouse();
      
      const StockBalanceModel = (await import('./StockBalanceModel.js')).default;
      const StockLedgerModel = (await import('./StockLedgerModel.js')).default;

      // Items to move: either provided specific materials or the main item
      const itemsToMove = (dispatchItems && dispatchItems.length > 0) 
        ? dispatchItems 
        : [{ item_code: mainItemCode, release_qty: mainQuantity, source_warehouse: 'WH-WIP' }];

      for (const item of itemsToMove) {
        const itemCode = item.item_code;
        const quantity = parseFloat(item.release_qty || item.quantity || 0);
        
        if (quantity <= 0) continue;

        // Resolve source warehouse
        let sourceWHId = 5; // Default WIP
        if (item.source_warehouse) {
          sourceWHId = await this.getWarehouseId(item.source_warehouse);
        } else {
          const [sourceWHRows] = await connection.query('SELECT id FROM warehouses WHERE warehouse_code = ?', ['WH-WIP']);
          if (sourceWHRows.length > 0) sourceWHId = sourceWHRows[0].id;
        }

        // 1. Deduct from Source
        await StockBalanceModel.upsert(itemCode, sourceWHId, {
          current_qty: -quantity,
          is_increment: true
        }, connection);

        await StockLedgerModel.create({
          item_code: itemCode,
          warehouse_id: sourceWHId,
          transaction_date: new Date(),
          transaction_type: 'Subcontract Dispatch',
          qty_in: 0,
          qty_out: quantity,
          reference_doctype: 'Job Card',
          reference_name: job_card_id,
          remarks: `Dispatched to vendor for ${jobCard.operation}`,
          created_by: user_id || 1
        }, connection);

        // 2. Add to Subcontract WIP
        await StockBalanceModel.upsert(itemCode, subcontractWH, {
          current_qty: quantity,
          is_increment: true
        }, connection);

        await StockLedgerModel.create({
          item_code: itemCode,
          warehouse_id: subcontractWH,
          transaction_date: new Date(),
          transaction_type: 'Subcontract Dispatch',
          qty_in: quantity,
          qty_out: 0,
          reference_doctype: 'Job Card',
          reference_name: job_card_id,
          remarks: `Received at Subcontract WIP for ${jobCard.operation}`,
          created_by: user_id || 1
        }, connection);
      }

      // Record dispatch in job_card
      await connection.query(
        'UPDATE job_card SET sent_qty = ?, subcontract_status = ?, status = ?, outward_challan_id = ?, updated_at = NOW() WHERE job_card_id = ?',
        [mainQuantity, 'SENT_TO_VENDOR', 'in-progress', outward_challan_id, job_card_id]
      );

      await connection.commit();
      return true;
    } catch (error) {
      if (connection) await connection.rollback();
      throw error;
    } finally {
      if (connection) connection.release();
    }
  }

  async handleSubcontractReceipt(job_card_id, data, user_id) {
    try {
      const { received_qty, accepted_qty, rejected_qty } = data;
      const jobCard = await this.getJobCardDetails(job_card_id);
      if (!jobCard) throw new Error('Job card not found');

      if (parseFloat(accepted_qty) + parseFloat(rejected_qty) > parseFloat(received_qty)) {
        throw new Error('Accepted + Rejected quantity cannot exceed Received quantity');
      }
      if (parseFloat(received_qty) > (parseFloat(jobCard.sent_qty) - (parseFloat(jobCard.received_qty) || 0))) {
        throw new Error('Received quantity cannot exceed remaining Sent quantity');
      }

      const workOrder = await this.getWorkOrderById(jobCard.work_order_id);
      const itemCode = workOrder.item_code;
      const subcontractWH = await this.ensureSubcontractWarehouse();

      // Identify if it's the last operation
      const [opRows] = await this.db.query(
        'SELECT MAX(operation_sequence) as last_seq FROM job_card WHERE work_order_id = ?',
        [jobCard.work_order_id]
      );
      const isLastOp = jobCard.operation_sequence === opRows[0].last_seq;

      // Target Warehouse
      const [fgWHRows] = await this.db.query('SELECT id FROM warehouses WHERE warehouse_code = ?', ['WH-FG']);
      const [wipWHRows] = await this.db.query('SELECT id FROM warehouses WHERE warehouse_code = ?', ['WH-WIP']);
      const targetWH = isLastOp ? (fgWHRows[0]?.id || 1) : (wipWHRows[0]?.id || 5);

      const StockBalanceModel = (await import('./StockBalanceModel.js')).default;
      const StockLedgerModel = (await import('./StockLedgerModel.js')).default;

      // Stock Movement: SUBCONTRACT_WIP -> Target/Scrap
      // Deduct from Subcontract WIP
      await StockBalanceModel.upsert(itemCode, subcontractWH, {
        current_qty: -received_qty,
        is_increment: true
      }, this.db);

      await StockLedgerModel.create({
        item_code: itemCode,
        warehouse_id: subcontractWH,
        transaction_date: new Date(),
        transaction_type: 'Subcontract Receipt',
        qty_in: 0,
        qty_out: received_qty,
        reference_doctype: 'Job Card',
        reference_name: job_card_id,
        remarks: `Received back from vendor for ${jobCard.operation}`,
        created_by: user_id || 1
      }, this.db);

      // Add to Target (Accepted items)
      if (accepted_qty > 0) {
        await StockBalanceModel.upsert(itemCode, targetWH, {
          current_qty: accepted_qty,
          is_increment: true
        }, this.db);

        await StockLedgerModel.create({
          item_code: itemCode,
          warehouse_id: targetWH,
          transaction_date: new Date(),
          transaction_type: 'Subcontract Receipt',
          qty_in: accepted_qty,
          qty_out: 0,
          reference_doctype: 'Job Card',
          reference_name: job_card_id,
          remarks: `Accepted items from vendor for ${jobCard.operation}`,
          created_by: user_id || 1
        }, this.db);
      }

      // Add to Scrap (Rejected items)
      if (rejected_qty > 0) {
        const [scrapWHRows] = await this.db.query('SELECT id FROM warehouses WHERE warehouse_code = ?', ['WH-SCRAP']);
        const scrapWH = scrapWHRows[0]?.id || 4;

        await StockBalanceModel.upsert(itemCode, scrapWH, {
          current_qty: rejected_qty,
          is_increment: true
        }, this.db);

        await StockLedgerModel.create({
          item_code: itemCode,
          warehouse_id: scrapWH,
          transaction_date: new Date(),
          transaction_type: 'Subcontract Rejection',
          qty_in: rejected_qty,
          qty_out: 0,
          reference_doctype: 'Job Card',
          reference_name: job_card_id,
          remarks: `Rejected items from vendor for ${jobCard.operation}`,
          created_by: user_id || 1
        }, this.db);
      }

      const vendorRate = parseFloat(jobCard.vendor_rate_per_unit) || 0;
      const operatingCost = parseFloat(accepted_qty) * vendorRate;

      const newTotalReceived = (parseFloat(jobCard.received_qty) || 0) + parseFloat(received_qty);
      const isFullyReceived = newTotalReceived >= parseFloat(jobCard.sent_qty);

      await this.updateJobCard(job_card_id, {
        received_qty: newTotalReceived,
        accepted_qty: (parseFloat(jobCard.accepted_qty) || 0) + parseFloat(accepted_qty),
        rejected_qty: (parseFloat(jobCard.rejected_qty) || 0) + parseFloat(rejected_qty),
        produced_quantity: (parseFloat(jobCard.produced_quantity) || 0) + parseFloat(accepted_qty),
        operating_cost: (parseFloat(jobCard.operating_cost) || 0) + operatingCost,
        subcontract_status: isFullyReceived ? 'RECEIVED' : 'PARTIALLY_RECEIVED',
        status: isFullyReceived ? 'completed' : 'in-progress'
      });

      // Update next job card if this one is completed
      if (isFullyReceived) {
        await this._activateNextJobCard(jobCard.work_order_id, jobCard.operation_sequence, (parseFloat(jobCard.accepted_qty) || 0) + parseFloat(accepted_qty));
        await this.checkAndUpdateWorkOrderCompletion(jobCard.work_order_id);
      }

      return true;
    } catch (error) {
      throw error;
    }
  }

  async _activateNextJobCard(work_order_id, currentSequence, acceptedQty) {
    const [nextJobCards] = await this.db.query(
      'SELECT job_card_id FROM job_card WHERE work_order_id = ? AND operation_sequence > ? ORDER BY operation_sequence ASC LIMIT 1',
      [work_order_id, currentSequence]
    );

    if (nextJobCards && nextJobCards.length > 0) {
      await this.updateJobCard(nextJobCards[0].job_card_id, {
        status: 'ready',
        planned_quantity: acceptedQty
      });
    }
  }

  async deleteJobCard(job_card_id) {
    try {
      // Get work_order_id before deletion for status sync
      const [jc] = await this.db.query('SELECT work_order_id FROM job_card WHERE job_card_id = ?', [job_card_id])
      const work_order_id = jc.length > 0 ? jc[0].work_order_id : null

      // 1. Delete associated logs and entries
      await this.db.query('DELETE FROM time_log WHERE job_card_id = ?', [job_card_id])
      await this.db.query('DELETE FROM rejection_entry WHERE job_card_id = ?', [job_card_id])
      await this.db.query('DELETE FROM inward_challan WHERE job_card_id = ?', [job_card_id])
      await this.db.query('DELETE FROM downtime_entry WHERE job_card_id = ?', [job_card_id])
      await this.db.query("DELETE FROM inspection_result WHERE reference_type = 'Job Card' AND reference_id = ?", [job_card_id])
      
      // 2. Delete the Job Card itself
      await this.db.query('DELETE FROM job_card WHERE job_card_id = ?', [job_card_id])

      // 3. Sync Work Order and Sales Order status
      if (work_order_id) {
        await this.checkAndUpdateWorkOrderProgress(work_order_id)
        await this.checkAndUpdateWorkOrderCompletion(work_order_id)
      }

      return true
    } catch (error) {
      throw error
    }
  }

  async deleteJobCardsByWorkOrder(work_order_id) {
    try {
      // Get all job card IDs for this work order to clean up children
      const [jobCards] = await this.db.query('SELECT job_card_id FROM job_card WHERE work_order_id = ?', [work_order_id])
      
      for (const jc of jobCards) {
        await this.deleteJobCard(jc.job_card_id)
      }
      
      return true
    } catch (error) {
      throw error
    }
  }

  async generateJobCardsForWorkOrder(work_order_id, created_by = 1) {
    try {
      const workOrder = await this.getWorkOrderById(work_order_id)
      if (!workOrder) {
        throw new Error('Work order not found')
      }

      if (!workOrder.operations || workOrder.operations.length === 0) {
        console.log(`No operations found for Work Order ${work_order_id}. Skipping job card generation.`)
        return []
      }

      // If work order operations table is empty, save the operations we found (likely from BOM fallback)
      const [existingOps] = await this.db.query(
        'SELECT operation_id FROM work_order_operation WHERE wo_id = ?',
        [work_order_id]
      )
      
      if (!existingOps || existingOps.length === 0) {
        // Also update the work order itself with the BOM if it was found via fallback
        const [currentWO] = await this.db.query('SELECT bom_no FROM work_order WHERE wo_id = ?', [work_order_id])
        if (currentWO && currentWO.length > 0 && !currentWO[0].bom_no && workOrder.bom_no) {
          await this.db.query('UPDATE work_order SET bom_no = ? WHERE wo_id = ?', [workOrder.bom_no, work_order_id])
        }

        for (let i = 0; i < workOrder.operations.length; i++) {
          await this.addWorkOrderOperation(work_order_id, {
            ...workOrder.operations[i],
            sequence: workOrder.operations[i].sequence || (i + 1)
          })
        }
      }

      // Also save items if they are missing
      const [existingItems] = await this.db.query(
        'SELECT item_id FROM work_order_item WHERE wo_id = ?',
        [work_order_id]
      )

      if ((!existingItems || existingItems.length === 0) && workOrder.items && workOrder.items.length > 0) {
        for (let i = 0; i < workOrder.items.length; i++) {
          await this.addWorkOrderItem(work_order_id, {
            ...workOrder.items[i],
            sequence: workOrder.items[i].sequence || (i + 1)
          })
        }
      }

      // Check if job cards already exist for this work order to avoid duplicates
      const [existingJobCards] = await this.db.query(
        'SELECT job_card_id FROM job_card WHERE work_order_id = ?',
        [work_order_id]
      )
      
      if (existingJobCards && existingJobCards.length > 0) {
        console.log(`Job cards already exist for Work Order ${work_order_id}. Returning existing.`)
        return existingJobCards
      }

      const createdCards = []
      const plannedQty = parseFloat(workOrder.quantity) || parseFloat(workOrder.qty_to_manufacture) || 0

      let opSeq = 1
      let isFirst = true
      for (const operation of workOrder.operations) {
        // The user wants "JC - 1", "JC - 2" etc. for each Work Order.
        // To ensure global uniqueness (since job_card_id is PK), we use JC-[OpSeq]-[WorkOrderID]. 
        // We'll format it as "JC - [OpSeq] - [WorkOrderID]" so the readable part is at the beginning.
        
        const job_card_id = `JC - ${opSeq} - ${work_order_id}`
        
        const operationTime = parseFloat(operation.operation_time || operation.time || 0)
        const hourlyRate = parseFloat(operation.hourly_rate || 0)
        const baseOperatingCost = parseFloat(operation.operating_cost || 0)
        
        // If operating cost is missing but we have time and rate, calculate it per unit
        const effectiveCostPerUnit = baseOperatingCost > 0 
          ? baseOperatingCost 
          : (operationTime / 60) * hourlyRate

        const jobCardData = {
          job_card_id,
          work_order_id,
          operation: operation.operation_name || operation.name || operation.operation || '',
          operation_sequence: operation.sequence || opSeq,
          machine_id: operation.default_workstation || operation.workstation || operation.workstation_type || operation.machine_id || '',
          operator_id: null,
          planned_quantity: plannedQty,
          operation_time: operationTime,
          hourly_rate: hourlyRate,
          operating_cost: operation.execution_mode === 'OUTSOURCE' ? (operation.vendor_rate_per_unit * plannedQty) : (effectiveCostPerUnit * plannedQty), 
          operation_type: operation.operation_type || 'IN_HOUSE',
          execution_mode: operation.execution_mode || 'IN_HOUSE',
          vendor_rate_per_unit: operation.vendor_rate_per_unit || 0,
          vendor_id: operation.vendor_id || null,
          subcontract_status: operation.execution_mode === 'OUTSOURCE' ? 'DRAFT' : null,
          scheduled_start_date: null,
          scheduled_end_date: null,
          status: (isFirst && (parseInt(workOrder.incomplete_sub_assemblies) || 0) === 0) ? 'ready' : 'draft',
          created_by,
          notes: operation.notes || null
        }

        await this.createJobCard(jobCardData)
        createdCards.push(jobCardData)
        isFirst = false
        opSeq++
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
        'draft': ['ready', 'pending', 'in-progress', 'hold', 'completed', 'cancelled', 'sent-to-vendor'],
        'ready': ['pending', 'in-progress', 'hold', 'completed', 'cancelled', 'sent-to-vendor'],
        'sent-to-vendor': ['partially-received', 'received', 'completed', 'hold', 'cancelled'],
        'partially-received': ['received', 'completed', 'hold', 'cancelled'],
        'received': ['completed', 'hold', 'cancelled'],
        'in-progress': ['completed', 'hold', 'cancelled'],
        'hold': ['in-progress', 'completed', 'cancelled', 'sent-to-vendor', 'received'],
        'completed': ['completed'],
        'open': ['ready', 'pending', 'in-progress', 'hold', 'completed', 'cancelled', 'sent-to-vendor'],
        'pending': ['ready', 'in-progress', 'hold', 'completed', 'cancelled', 'sent-to-vendor'],
        'cancelled': ['cancelled']
      }

      const normalizeStatus = (status) => {
        if (!status) return ''
        return status.toLowerCase().replace(/\s+/g, '-').trim()
      }

      const currentStatusNormalized = normalizeStatus(jobCard.status)
      const newStatusNormalized = normalizeStatus(newStatus)
      const allowedNextStatuses = statusWorkflow[currentStatusNormalized] || []
      if (!allowedNextStatuses.includes(newStatusNormalized)) {
        const statusLabels = {
          'draft': 'Draft',
          'ready': 'Ready',
          'pending': 'Pending',
          'in-progress': 'In Progress',
          'hold': 'Hold',
          'completed': 'Completed',
          'cancelled': 'Cancelled',
          'open': 'Open'
        }
        const currentLabel = statusLabels[currentStatusNormalized] || jobCard.status
        const allowedLabels = allowedNextStatuses.map(s => statusLabels[s] || s)
        throw new Error(`Job Card Status Error: Cannot transition from "${currentLabel}" to "${statusLabels[newStatusNormalized] || newStatus}". Allowed next statuses: ${allowedLabels.join(', ')}. Please follow the proper workflow sequence.`)
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
        `INSERT INTO workstation (name, workstation_name, description, location, capacity_per_hour, rate_per_hour, is_active, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [data.name, data.workstation_name, data.description, data.location, data.capacity_per_hour, data.rate_per_hour || 0, data.is_active !== false, 'active']
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
      if (data.rate_per_hour !== undefined) { fields.push('rate_per_hour = ?'); values.push(data.rate_per_hour) }
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
      const targetDate = date || new Date().toISOString().split('T')[0]
      
      const [summary] = await this.db.query(
        `SELECT 
          (SELECT COUNT(*) FROM work_order WHERE DATE(created_at) = ?) as total_wo,
          (SELECT COUNT(*) FROM work_order WHERE status = 'completed' AND DATE(updated_at) = ?) as completed_wo,
          (SELECT COUNT(*) FROM work_order WHERE status = 'in-progress') as active_wo,
          (SELECT COUNT(*) FROM job_card WHERE DATE(created_at) = ?) as total_jc,
          (SELECT COALESCE(SUM(produced_quantity), 0) FROM job_card WHERE DATE(created_at) = ?) as total_produced,
          (SELECT COALESCE(SUM(accepted_quantity), 0) FROM job_card WHERE DATE(created_at) = ?) as total_accepted,
          (SELECT COALESCE(SUM(rejected_quantity + scrap_quantity), 0) FROM job_card WHERE DATE(created_at) = ?) as total_rejected,
          (SELECT COUNT(*) FROM rejection_entry WHERE DATE(created_at) = ?) as rejection_entries
        `,
        [targetDate, targetDate, targetDate, targetDate, targetDate, targetDate, targetDate, targetDate]
      )

      const s = summary[0] || {}
      const produced = parseFloat(s.total_produced) || 0
      const accepted = parseFloat(s.total_accepted) || 0
      const rejected = parseFloat(s.total_rejected) || 0
      
      const rejectionRate = produced > 0 ? (rejected / produced) * 100 : 0
      const efficiency = produced > 0 ? (accepted / produced) * 100 : 85

      return {
        date: targetDate,
        summary: {
          totalOrders: parseInt(s.total_wo) || 0,
          completedOrders: parseInt(s.completed_wo) || 0,
          inProgressOrders: parseInt(s.active_wo) || 0,
          totalJobCards: parseInt(s.total_jc) || 0,
          totalQuantityProduced: produced,
          totalQuantityAccepted: accepted,
          totalQuantityRejected: rejected,
          totalRejectionEntries: parseInt(s.rejection_entries) || 0
        },
        efficiency: parseFloat(efficiency.toFixed(2)),
        rejection_rate: parseFloat(rejectionRate.toFixed(2)),
        // Maintain backward compatibility for keys seen in older versions
        work_orders: { total: parseInt(s.total_wo) || 0, completed: parseInt(s.completed_wo) || 0 },
        job_cards: { total: parseInt(s.total_jc) || 0 },
        rejections: { total: parseInt(s.rejection_entries) || 0, total_qty: rejected }
      }
    } catch (error) {
      throw error
    }
  }

  async getMachineUtilization(dateFrom, dateTo) {
    try {
      const [machines] = await this.db.query(
        `SELECT 
          jc.machine_id,
          jc.machine_id as machine_name,
          COUNT(DISTINCT jc.job_card_id) as production_days,
          COALESCE(SUM(CASE WHEN jc.actual_end_date IS NOT NULL AND jc.actual_start_date IS NOT NULL 
                       THEN HOUR(TIMEDIFF(jc.actual_end_date, jc.actual_start_date)) 
                       ELSE 0 END), 0) as total_hours,
          COALESCE(SUM(jc.accepted_quantity), 0) as total_produced,
          CASE 
            WHEN DATEDIFF(?, ?) > 0 THEN ROUND((COALESCE(SUM(CASE WHEN jc.actual_end_date IS NOT NULL AND jc.actual_start_date IS NOT NULL 
                       THEN HOUR(TIMEDIFF(jc.actual_end_date, jc.actual_start_date)) 
                       ELSE 0 END), 0) / (DATEDIFF(?, ?) * 8)) * 100, 2)
            ELSE 0
          END as utilization_percent
         FROM job_card jc
         WHERE jc.machine_id IS NOT NULL AND DATE(jc.created_at) BETWEEN ? AND ?
         GROUP BY jc.machine_id`,
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
          jc.operator_id,
          jc.operator_id as operator_name,
          COUNT(DISTINCT jc.job_card_id) as production_days,
          CASE 
            WHEN DATEDIFF(?, ?) > 0 THEN ROUND(COALESCE(SUM(jc.accepted_quantity) / (DATEDIFF(?, ?) * 8), 0), 2)
            ELSE 0
          END as units_per_hour,
          COALESCE(SUM(jc.accepted_quantity), 0) as total_produced,
          CASE
            WHEN COALESCE(SUM(jc.accepted_quantity), 0) > 0 THEN ROUND((100 - (COALESCE(SUM(re.rejected_qty), 0) / COALESCE(SUM(jc.accepted_quantity), 1)) * 100), 2)
            ELSE 100
          END as quality_score
         FROM job_card jc
         LEFT JOIN rejection_entry re ON jc.job_card_id = re.job_card_id AND DATE(re.log_date) BETWEEN ? AND ?
         WHERE jc.operator_id IS NOT NULL AND DATE(jc.created_at) BETWEEN ? AND ?
         GROUP BY jc.operator_id`,
        [dateTo, dateFrom, dateTo, dateFrom, dateFrom, dateTo, dateFrom, dateTo]
      )
      return operators || []
    } catch (error) {
      throw error
    }
  }

  async recordRejection(data) {
    return this.createRejection(data);
  }

  async getRejectionAnalysis(dateFrom, dateTo) {
    try {
      const [analysis] = await this.db.query(
        `SELECT 
          rejection_reason,
          COUNT(*) as count,
          SUM(rejected_qty) as total_quantity,
          ROUND(AVG(rejected_qty), 2) as avg_quantity
         FROM rejection_entry
         WHERE log_date BETWEEN ? AND ?
         GROUP BY rejection_reason
         ORDER BY count DESC`,
        [dateFrom, dateTo]
      )
      return analysis || []
    } catch (error) {
      throw error
    }
  }

  /**
   * Backflush Inventory for a Work Order
   * Deducts raw materials from BOM and adds finished goods to stock
   * 
   * @param {string} workOrderId - The Work Order ID
   * @param {number} producedQty - Quantity of finished goods produced
   * @param {string} createdBy - User who performed the action
   * @returns {Promise<Object>} Results of backflushing
   */
  async backflushInventory(workOrderId, producedQty, createdBy = 1) {
    try {
      const StockBalanceModel = (await import('./StockBalanceModel.js')).default;
      const StockLedgerModel = (await import('./StockLedgerModel.js')).default;

      // 1. Get Work Order and BOM details
      const workOrder = await this.getWorkOrderById(workOrderId);
      if (!workOrder) {
        throw new Error(`Work Order ${workOrderId} not found`);
      }

      const fgItemCode = workOrder.item_code;
      const bomId = workOrder.bom_no || workOrder.bom_id;
      const woTotalQty = parseFloat(workOrder.quantity) || 1;

      if (!bomId) {
        console.warn(`No BOM linked to Work Order ${workOrderId}. Backflushing raw materials skipped.`);
      }

      const results = {
        componentsDeducted: [],
        fgAdded: null,
        errors: [],
        allocationFinalized: false
      };

      // 1.5 Check if Material Allocation exists (Step 1 of Documented Flow)
      const [allocations] = await this.db.query(
        'SELECT * FROM material_allocation WHERE work_order_id = ?',
        [workOrderId]
      );

      if (allocations && allocations.length > 0) {
        // If allocations exist, we use the InventoryModel logic to finalize them
        try {
          const InventoryModel = (await import('./InventoryModel.js')).default;
          const inventoryModel = new InventoryModel(this.db);
          
          // Before finalizing, we update allocation consumption from work_order_item 
          // to ensure any real-time tracking is captured
          for (const alloc of allocations) {
              const [woItem] = await this.db.query(
                'SELECT consumed_qty FROM work_order_item WHERE wo_id = ? AND item_code = ?',
                [workOrderId, alloc.item_code]
              );
              
              if (woItem.length > 0) {
                const currentConsumed = parseFloat(woItem[0].consumed_qty) || 0;
                await this.db.query(
                  'UPDATE material_allocation SET consumed_qty = ? WHERE allocation_id = ?',
                  [currentConsumed, alloc.allocation_id]
                );
              }
          }

          const finalized = await inventoryModel.finalizeWorkOrderMaterials(workOrderId, createdBy);
          results.allocationFinalized = true;
          results.componentsDeducted = finalized;
        } catch (finalizeErr) {
          console.error(`Failed to finalize allocations for ${workOrderId}:`, finalizeErr.message);
          results.errors.push(`Allocation Finalization: ${finalizeErr.message}`);
          // Fallback to direct deduction if finalization fails? 
          // Better not to risk double deduction, so we continue to direct deduction ONLY if results.componentsDeducted is empty
        }
      }

      // 2. Deduct Raw Materials (Components) - ONLY if not already handled by allocation finalization
      // AND NOT already handled by real-time deduction in _handleStockUpdates
      if (producedQty > 0 && results.componentsDeducted.length === 0) {
        // Check if any real-time consumption was already recorded
        const [consumedRows] = await this.db.query(
          'SELECT SUM(consumed_qty) as total_consumed FROM work_order_item WHERE wo_id = ?',
          [workOrderId]
        );
        const alreadyConsumed = parseFloat(consumedRows[0].total_consumed || 0) > 0;

        if (alreadyConsumed) {
          console.log(`Skipping direct backflush components for WO ${workOrderId} as real-time consumption exists.`);
        } else {
          // Prefer Work Order Items if they exist, as they have specific warehouse info
          let [components] = await this.db.query(
            `SELECT 
              item_code, 
              (required_qty / ?) as qty_per_unit,
              source_warehouse
             FROM work_order_item 
             WHERE wo_id = ?`,
            [woTotalQty, workOrderId]
          );

          // Fallback to BOM if Work Order items are missing
          if ((!components || components.length === 0) && bomId) {
            const [bomLines] = await this.db.query(
              `SELECT 
                component_code as item_code, 
                quantity as qty_per_unit,
                NULL as source_warehouse
               FROM bom_line 
               WHERE bom_id = ?`,
              [bomId]
            );
            components = bomLines;
          }

          for (const line of (components || [])) {
            try {
              const requiredQty = (parseFloat(line.qty_per_unit) || 0) * producedQty;
              if (requiredQty <= 0) continue;

              // Use provided warehouse or fallback to main (1)
              // Handle case where source_warehouse might be a name or ID
              const rawWarehouse = line.source_warehouse || 1;
              const warehouseId = await this.getWarehouseId(rawWarehouse);

              // Deduct from stock_balance
              await StockBalanceModel.upsert(line.item_code, warehouseId, {
                current_qty: -requiredQty,
                is_increment: true,
                last_issue_date: new Date()
              }, this.db);

              // Log in stock_ledger
              await StockLedgerModel.create({
                item_code: line.item_code,
                warehouse_id: warehouseId,
                transaction_date: new Date(),
                transaction_type: 'Manufacturing Issue',
                qty_in: 0,
                qty_out: requiredQty,
                reference_doctype: 'Work Order',
                reference_name: workOrderId,
                remarks: `Backflush deduction for ${producedQty} units of ${fgItemCode} (Fallback)`,
                created_by: createdBy
              }, this.db);

              results.componentsDeducted.push({
                item_code: line.item_code,
                qty: requiredQty,
                warehouse_id: warehouseId
              });
            } catch (err) {
              console.error(`Failed to backflush component ${line.item_code}:`, err.message);
              results.errors.push(`Component ${line.item_code}: ${err.message}`);
            }
          }
        }
      }

      // 3. Add Finished Good (FG) to Stock - ONLY if not already handled by Job Card flow
      if (producedQty > 0) {
        // Check if FG was already added by a Job Card (last operation)
        const [fgLedgerRows] = await this.db.query(
          "SELECT ledger_id FROM stock_ledger WHERE reference_doctype = 'Job Card' AND reference_name IN (SELECT job_card_id FROM job_card WHERE work_order_id = ?) AND transaction_type = 'Production'",
          [workOrderId]
        );
        
        if (fgLedgerRows.length > 0) {
          console.log(`Skipping direct FG addition for WO ${workOrderId} as it was already handled by Job Card production entry.`);
        } else {
          try {
            const fgWarehouseId = 5; // Default FG warehouse based on _handleStockUpdates

            await StockBalanceModel.upsert(fgItemCode, fgWarehouseId, {
              current_qty: producedQty,
              is_increment: true,
              last_receipt_date: new Date()
            }, this.db);

            await StockLedgerModel.create({
              item_code: fgItemCode,
              warehouse_id: fgWarehouseId,
              transaction_date: new Date(),
              transaction_type: 'Production Receipt',
              qty_in: producedQty,
              qty_out: 0,
              reference_doctype: 'Work Order',
              reference_name: workOrderId,
              remarks: `Production receipt for ${workOrderId} (Backflush Fallback)`,
              created_by: createdBy
            }, this.db);

            results.fgAdded = {
              item_code: fgItemCode,
              qty: producedQty,
              warehouse_id: fgWarehouseId
            };
          } catch (err) {
            console.error(`Failed to add FG ${fgItemCode} to stock:`, err.message);
            results.errors.push(`FG ${fgItemCode}: ${err.message}`);
          }
        }
      }

      return results;
    } catch (error) {
      console.error('Error in backflushInventory:', error);
      throw error;
    }
  }

  _formatDate(dateInput) {
    if (!dateInput) return null;
    
    // If it's already a simple YYYY-MM-DD string, return it
    if (typeof dateInput === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateInput)) {
      return dateInput;
    }
    
    const d = new Date(dateInput);
    if (isNaN(d.getTime())) return dateInput;
    
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  async _syncJobCardQuantities(jobCardId) {
    try {
      const normShift = (s) => String(s || '').trim().toUpperCase().replace(/^SHIFT\s+/, '');

      // 0. Get current job card details for stock delta calculation
      const [currentJC] = await this.db.query(
        'SELECT job_card_id, work_order_id, operation, operation_sequence, produced_quantity, accepted_quantity, rejected_quantity, scrap_quantity, hourly_rate, operation_time, operation_type FROM job_card WHERE job_card_id = ?',
        [jobCardId]
      );
      if (currentJC.length === 0) return;
      const jcDetails = currentJC[0];

      // 1. Get all time logs for this job card
      const [timeLogs] = await this.db.query(
        'SELECT completed_qty, rejected_qty, scrap_qty, shift, log_date, day_number, time_in_minutes FROM time_log WHERE job_card_id = ?',
        [jobCardId]
      );

      // 2. Get all rejection entries for this job card
      const [rejections] = await this.db.query(
        'SELECT rejected_qty, scrap_qty, accepted_qty, shift, log_date, day_number, status FROM rejection_entry WHERE job_card_id = ?',
        [jobCardId]
      );

      // 3. Get all inward challans for this job card
      const [challans] = await this.db.query(
        'SELECT quantity_received, quantity_accepted, quantity_rejected, received_date FROM inward_challan WHERE job_card_id = ?',
        [jobCardId]
      );

      // Group by date and shift to handle the "inferred production" logic
      const shifts = {};

      timeLogs.forEach(log => {
        const dateStr = this._formatDate(log.log_date);
        const dayNum = log.day_number || 1;
        const key = `day_${dayNum}_${normShift(log.shift)}`;
        if (!shifts[key]) shifts[key] = { produced: 0, rejected: 0, scrap: 0, rejectionProduced: 0, rejectionRejected: 0, rejectionScrap: 0, rejectionAccepted: 0, isInferred: false };
        shifts[key].produced += parseFloat(log.completed_qty) || 0;
        shifts[key].rejected += parseFloat(log.rejected_qty) || 0;
        shifts[key].scrap += parseFloat(log.scrap_qty) || 0;
      });

      rejections.forEach(rej => {
        const dateStr = this._formatDate(rej.log_date);
        const dayNum = rej.day_number || 1;
        const key = `day_${dayNum}_${normShift(rej.shift)}`;
        
        const rQty = parseFloat(rej.rejected_qty) || 0;
        const sQty = parseFloat(rej.scrap_qty) || 0;
        const aQty = parseFloat(rej.accepted_qty) || 0;
        const entryProduced = (aQty + rQty + sQty);

        if (!shifts[key]) {
          shifts[key] = { produced: 0, rejected: 0, scrap: 0, rejectionProduced: 0, rejectionRejected: 0, rejectionScrap: 0, rejectionAccepted: 0, isInferred: true };
        }
        
        // Quality entries contribute to PRODUCED regardless of status (production happened)
        // But they ONLY contribute to ACCEPTED/REJECTED/SCRAP totals when APPROVED
        shifts[key].rejectionProduced += entryProduced;

        if (rej.status === 'Approved') {
          shifts[key].rejectionRejected += rQty;
          shifts[key].rejectionScrap += sQty;
          shifts[key].rejectionAccepted += aQty;
        }
      });

      // --- IMPROVED AGGREGATION LOGIC TO PREVENT DOUBLE COUNTING ---
      // We calculate totals by taking the maximum between Time Logs and Rejection Entries 
      // PER SHIFT, then summing them up. This ensures that if Shift A has rejection entries
      // and Shift B has only time logs, both are correctly counted.
      
      let shiftTotalProduced = 0;
      let shiftTotalRejected = 0;
      let shiftTotalScrap = 0;
      let shiftTotalAccepted = 0;

      Object.values(shifts).forEach(s => {
        // Use the maximum of reported production (Time Logs) and inferred production from quality entries
        // This ensures the summary is mathematically correct if more items were inspected than logged.
        const shiftProduced = Math.max(s.produced, s.rejectionProduced);
        
        shiftTotalProduced += shiftProduced;
        shiftTotalRejected += Math.max(s.rejected, s.rejectionRejected);
        shiftTotalScrap += Math.max(s.scrap, s.rejectionScrap);
        
        // Accepted quantity only comes from Approved Quality Entries
        shiftTotalAccepted += s.rejectionAccepted;
      });

      // Add challan quantities (usually for outsourced operations)
      let totalChallanProduced = 0;
      let totalChallanRejected = 0;
      let totalChallanAccepted = 0;
      
      challans.forEach(challan => {
        const qReceived = parseFloat(challan.quantity_received) || 0;
        const qAccepted = parseFloat(challan.quantity_accepted) || 0;
        const qRejected = parseFloat(challan.quantity_rejected) || 0;

        totalChallanProduced += qReceived;
        totalChallanRejected += qRejected;
        totalChallanAccepted += qAccepted;
        
        if (qReceived === 0 && qAccepted > 0) {
          totalChallanProduced += qAccepted + qRejected;
        }
      });

      // Final Aggregation
      let totalProduced = shiftTotalProduced + totalChallanProduced;
      let totalRejected = shiftTotalRejected + totalChallanRejected;
      let totalScrap = shiftTotalScrap;
      
      // Enforce business rule: Strict Quality Gate
      // Accepted quantity ONLY comes from Approved Quality Entries (rejection_entry)
      // or from Inward Challans (for outsourced/received items).
      // This ensures the next stage receives ONLY what has been explicitly verified.
      let totalAccepted = shiftTotalAccepted + totalChallanAccepted;
      let totalLoss = totalRejected + totalScrap;

      // FALLBACK: If all log sources are empty but the job card has existing quantities, keep them
      // This protects against data loss for legacy job cards or manually updated ones
      if (timeLogs.length === 0 && rejections.length === 0 && challans.length === 0) {
        totalProduced = Math.max(totalProduced, parseFloat(jcDetails.produced_quantity) || 0);
        totalRejected = Math.max(totalRejected, parseFloat(jcDetails.rejected_quantity) || 0);
        totalScrap = Math.max(totalScrap, parseFloat(jcDetails.scrap_quantity) || 0);
        totalAccepted = Math.max(totalAccepted, parseFloat(jcDetails.accepted_quantity) || 0);
      }

      // --- CALCULATE ACTUAL OPERATING COST ---
      // Real-time cost calculation based on actual execution data
      let actualOperatingCost = 0;
      if (jcDetails.operation_type === 'OUTSOURCE') {
        // For outsourced operations, cost is typically based on accepted quantity (unit rate)
        actualOperatingCost = totalAccepted * (parseFloat(jcDetails.hourly_rate) || 0);
      } else {
        // For in-house, cost is based on actual time logged in time logs
        let totalMinutes = 0;
        timeLogs.forEach(log => {
          totalMinutes += parseFloat(log.time_in_minutes) || 0;
        });
        actualOperatingCost = (totalMinutes / 60) * (parseFloat(jcDetails.hourly_rate) || 0);
      }

      // 3. Update Job Card
      await this.db.query(
        `UPDATE job_card SET 
          produced_quantity = ?, 
          rejected_quantity = ?, 
          accepted_quantity = ?, 
          scrap_quantity = ?,
          operating_cost = ?,
          updated_at = NOW()
         WHERE job_card_id = ?`,
        [totalProduced, totalRejected, totalAccepted, totalScrap, actualOperatingCost, jobCardId]
      );

      // 4. Update Work Order Operation
      const [jcRows] = await this.db.query('SELECT work_order_id, operation, operation_sequence FROM job_card WHERE job_card_id = ?', [jobCardId]);
      if (jcRows.length > 0) {
        const jc = jcRows[0];
        // Note: Using accepted_quantity for completed_qty in work_order_operation
        await this.db.query(
          `UPDATE work_order_operation SET 
            completed_qty = ?, 
            process_loss_qty = ?
           WHERE wo_id = ? AND operation = ? AND sequence = ?`,
          [totalAccepted, totalLoss, jc.work_order_id, jc.operation, jc.operation_sequence]
        );

        // 4.1 Update NEXT Job Card's planned_quantity and status based on this stage's accepted_quantity
        // This ensures logical sequential flow across the entire manufacturing process
        if (totalAccepted > 0) {
          await this.db.query(
            `UPDATE job_card SET planned_quantity = ?, status = 'ready' 
             WHERE work_order_id = ? AND operation_sequence > ? AND status = 'draft'
             ORDER BY operation_sequence ASC LIMIT 1`,
            [totalAccepted, jc.work_order_id, jc.operation_sequence]
          );
        } else {
          await this.db.query(
            `UPDATE job_card SET planned_quantity = ? 
             WHERE work_order_id = ? AND operation_sequence > ? 
             ORDER BY operation_sequence ASC LIMIT 1`,
            [totalAccepted, jc.work_order_id, jc.operation_sequence]
          );
        }

        // Also update work order progress, completion and COST ROLL-UP
        await this.checkAndUpdateWorkOrderProgress(jc.work_order_id);
        await this.checkAndUpdateWorkOrderCompletion(jc.work_order_id);
        await this.rollUpJobCardCost(jobCardId);
      }

      // 5. Automatic Inventory Updates
      const deltaProduced = totalProduced - (parseFloat(jcDetails.produced_quantity) || 0);
      const deltaAccepted = totalAccepted - (parseFloat(jcDetails.accepted_quantity) || 0);
      const deltaRejected = totalRejected - (parseFloat(jcDetails.rejected_quantity) || 0);
      const deltaScrap = totalScrap - (parseFloat(jcDetails.scrap_quantity) || 0);

      if (deltaProduced !== 0 || deltaAccepted !== 0 || deltaRejected !== 0 || deltaScrap !== 0) {
        await this._handleStockUpdates(jcDetails, deltaProduced, deltaAccepted, deltaRejected, deltaScrap);
      }

      return { totalProduced, totalRejected, totalAccepted, totalScrap };
    } catch (error) {
      console.error('Error in _syncJobCardQuantities:', error);
      throw error;
    }
  }

  async _handleStockUpdates(jc, deltaProduced, deltaAccepted, deltaRejected, deltaScrap) {
    try {
      const StockBalanceModel = (await import('./StockBalanceModel.js')).default;
      const StockLedgerModel = (await import('./StockLedgerModel.js')).default;
      const wo_id = jc.work_order_id;

      // Helper to get warehouse ID by code
      const getWH = async (code, fallbackId) => {
        const [rows] = await this.db.query('SELECT id FROM warehouses WHERE warehouse_code = ?', [code]);
        return rows.length > 0 ? rows[0].id : fallbackId;
      };

      // 1. Get Work Order Details
      const [woRows] = await this.db.query('SELECT item_code, quantity FROM work_order WHERE wo_id = ?', [wo_id]);
      if (woRows.length === 0) return;
      const wo = woRows[0];
      const woTotalQty = parseFloat(wo.quantity) || 1;

      // 2. Identify if it's first or last operation
      const [opRows] = await this.db.query(
        'SELECT MIN(operation_sequence) as first_seq, MAX(operation_sequence) as last_seq FROM job_card WHERE work_order_id = ?',
        [wo_id]
      );
      
      const isFirstOp = jc.operation_sequence === opRows[0].first_seq || (!jc.operation_sequence && !opRows[0].first_seq);
      const isLastOp = jc.operation_sequence === opRows[0].last_seq || (!jc.operation_sequence && !opRows[0].last_seq);

      // 3. Handle Raw Material Consumption (on First Operation)
      if (isFirstOp && deltaProduced !== 0) {
        // Check if material_allocation exists for this work order
        const [allocations] = await this.db.query(
          'SELECT allocation_id, item_code FROM material_allocation WHERE work_order_id = ?',
          [wo_id]
        );
        const hasAllocations = allocations && allocations.length > 0;

        const [items] = await this.db.query('SELECT * FROM work_order_item WHERE wo_id = ?', [wo_id]);
        for (const item of items) {
          const consumptionQty = (deltaProduced / woTotalQty) * (parseFloat(item.required_qty) || 0);
          if (consumptionQty === 0) continue;

          // If allocations exist, we update the allocation record instead of direct stock deduction
          // This follows the Allocate -> Track -> Finalize flow to prevent double deduction
          if (hasAllocations) {
            await this.db.query(
              'UPDATE material_allocation SET consumed_qty = consumed_qty + ?, status = "partial" WHERE work_order_id = ? AND item_code = ?',
              [consumptionQty, wo_id, item.item_code]
            );
          } else {
            // FALLBACK: Direct deduction ONLY if no allocation system is active for this WO
            const rawWarehouse = await getWH('WH-RM', 2);

            await StockBalanceModel.upsert(item.item_code, rawWarehouse, {
              current_qty: -consumptionQty,
              is_increment: true,
              last_issue_date: new Date()
            }, this.db);

            await StockLedgerModel.create({
              item_code: item.item_code,
              warehouse_id: rawWarehouse,
              transaction_date: new Date(),
              transaction_type: 'Consumption',
              qty_in: consumptionQty < 0 ? Math.abs(consumptionQty) : 0,
              qty_out: consumptionQty > 0 ? consumptionQty : 0,
              reference_doctype: 'Job Card',
              reference_name: jc.job_card_id,
              remarks: `Direct Consumption for ${wo_id} (Operation: ${jc.operation})`,
              created_by: 1
            }, this.db);
          }

          // ALWAYS update consumed_qty in work_order_item for real-time COST ROLL-UP
          await this.db.query(
            'UPDATE work_order_item SET consumed_qty = consumed_qty + ? WHERE wo_id = ? AND item_code = ?',
            [consumptionQty, wo_id, item.item_code]
          );
        }
      }

      // 4. Handle Production (WIP vs Inventory)
      if (deltaAccepted !== 0) {
        const targetWarehouse = isLastOp ? await getWH('WH-FG', 1) : await getWH('WH-WIP', 5);
        
        await StockBalanceModel.upsert(wo.item_code, targetWarehouse, {
          current_qty: deltaAccepted,
          is_increment: true,
          last_receipt_date: new Date()
        }, this.db);

        await StockLedgerModel.create({
          item_code: wo.item_code,
          warehouse_id: targetWarehouse,
          transaction_date: new Date(),
          transaction_type: isLastOp ? 'Production' : 'WIP Movement',
          qty_in: deltaAccepted > 0 ? deltaAccepted : 0,
          qty_out: deltaAccepted < 0 ? Math.abs(deltaAccepted) : 0,
          reference_doctype: 'Job Card',
          reference_name: jc.job_card_id,
          remarks: `${isLastOp ? 'Finished' : 'Semi-finished'} production from ${wo_id} (Operation: ${jc.operation})`,
          created_by: 1
        }, this.db);
      }

      // 5. Handle Rejections (Move to SCRAP Yard)
      if (deltaRejected !== 0) {
        const rejectWarehouse = await getWH('WH-SCRAP', 4);
        await StockBalanceModel.upsert(wo.item_code, rejectWarehouse, {
          current_qty: deltaRejected,
          is_increment: true,
          last_receipt_date: new Date()
        }, this.db);

        await StockLedgerModel.create({
          item_code: wo.item_code,
          warehouse_id: rejectWarehouse,
          transaction_date: new Date(),
          transaction_type: 'Rejection',
          qty_in: deltaRejected > 0 ? deltaRejected : 0,
          qty_out: deltaRejected < 0 ? Math.abs(deltaRejected) : 0,
          reference_doctype: 'Job Card',
          reference_name: jc.job_card_id,
          remarks: `Rejected items from ${wo_id}`,
          created_by: 1
        }, this.db);
      }

      // 6. Handle Scrap (Move to SCRAP Yard)
      if (deltaScrap !== 0) {
        const scrapWarehouse = await getWH('WH-SCRAP', 4);
        await StockBalanceModel.upsert(wo.item_code, scrapWarehouse, {
          current_qty: deltaScrap,
          is_increment: true,
          last_receipt_date: new Date()
        }, this.db);

        await StockLedgerModel.create({
          item_code: wo.item_code,
          warehouse_id: scrapWarehouse,
          transaction_date: new Date(),
          transaction_type: 'Scrap',
          qty_in: deltaScrap > 0 ? deltaScrap : 0,
          qty_out: deltaScrap < 0 ? Math.abs(deltaScrap) : 0,
          reference_doctype: 'Job Card',
          reference_name: jc.job_card_id,
          remarks: `Scrap from ${wo_id}`,
          created_by: 1
        }, this.db);
      }

    } catch (error) {
      console.error('Error in _handleStockUpdates:', error);
      throw error;
    }
  }

  async _getMaxAllowedQuantity(jobCardId) {
    try {
      const jobCard = await this.getJobCardDetails(jobCardId);
      if (!jobCard) return 0;

      const [previousCards] = await this.db.query(
        'SELECT accepted_quantity, produced_quantity, rejected_quantity, scrap_quantity FROM job_card WHERE work_order_id = ? AND operation_sequence < ? ORDER BY operation_sequence DESC LIMIT 1',
        [jobCard.work_order_id, jobCard.operation_sequence || 0]
      );

      if (previousCards && previousCards.length > 0) {
        const prev = previousCards[0];
        const prevProduced = parseFloat(prev.produced_quantity) || 0;
        
        // If the previous operation has started producing, we cap by its accepted quantity
        if (prevProduced > 0) {
          return typeof prev.accepted_quantity !== 'undefined' && prev.accepted_quantity !== null
            ? parseFloat(prev.accepted_quantity)
            : (parseFloat(prev.produced_quantity) || 0) - (parseFloat(prev.rejected_quantity) || 0) - (parseFloat(prev.scrap_quantity) || 0);
        }
        // Fall through to planned_quantity if previous hasn't started yet
      }

      return parseFloat(jobCard.planned_quantity) || 0;
    } catch (error) {
      console.error('Error in _getMaxAllowedQuantity:', error);
      return 0;
    }
  }

  async createTimeLog(data) {
    try {
      data.log_date = this._formatDate(data.log_date || new Date());
      const maxAllowed = await this._getMaxAllowedQuantity(data.job_card_id);
      const currentJobCard = await this.getJobCardDetails(data.job_card_id);
      
      const newQty = parseFloat(data.completed_qty || 0);
      
      // Calculate potential increase. 
      const [existingTotals] = await this.db.query(
        `SELECT 
          COALESCE((SELECT SUM(completed_qty) FROM time_log WHERE job_card_id = ?), 0) as total_time_log_produced,
          COALESCE((SELECT SUM(accepted_qty + rejected_qty + scrap_qty) FROM rejection_entry WHERE job_card_id = ?), 0) as total_rejection_produced,
          COALESCE((SELECT SUM(quantity_received) FROM inward_challan WHERE job_card_id = ?), 0) as total_challan_produced`,
        [data.job_card_id, data.job_card_id, data.job_card_id]
      );
      
      const totalTimeLogProduced = parseFloat(existingTotals[0].total_time_log_produced);
      const totalRejectionProduced = parseFloat(existingTotals[0].total_rejection_produced);
      const totalChallanProduced = parseFloat(existingTotals[0].total_challan_produced);
      
      const currentTotalProduced = Math.max(totalTimeLogProduced + totalChallanProduced, totalRejectionProduced);
      const newTotalProduced = Math.max(totalTimeLogProduced + totalChallanProduced + newQty, totalRejectionProduced);
      
      const tolerance = 0.001; // 0.1% tolerance to allow for rounding errors only
      if (newTotalProduced > (maxAllowed * (1 + tolerance)) + 0.0001) {
        throw new Error(`Quantity Validation Error: Total production (${newTotalProduced.toFixed(2)}) would exceed planned quantity (${maxAllowed.toFixed(2)}). Please manage within planned units only.`);
      }

      // Check for overlapping time intervals for operator or workstation
      if (data.from_time && data.to_time && (data.employee_id || data.workstation_name)) {
        let overlapQuery = `SELECT * FROM time_log WHERE log_date = ? AND (`
        const overlapParams = [data.log_date]
        
        const resourceConditions = []
        if (data.employee_id) {
          resourceConditions.push('employee_id = ?')
          overlapParams.push(data.employee_id)
        }
        if (data.workstation_name) {
          resourceConditions.push('workstation_name = ?')
          overlapParams.push(data.workstation_name)
        }
        
        overlapQuery += resourceConditions.join(' OR ') + ') AND ('
        overlapQuery += `
          (from_time <= ? AND to_time > ?) OR
          (from_time < ? AND to_time >= ?) OR
          (? <= from_time AND ? > from_time)
        )`
        overlapParams.push(data.from_time, data.from_time, data.to_time, data.to_time, data.from_time, data.to_time)
        
        const [overlaps] = await this.db.query(overlapQuery, overlapParams);
        
        if (overlaps && overlaps.length > 0) {
          const conflict = overlaps[0];
          const resourceType = conflict.employee_id === data.employee_id ? 'Operator' : 'Workstation';
          throw new Error(`Time Overlap Error: ${resourceType} is already logged for ${conflict.from_time} - ${conflict.to_time} on ${data.log_date}.`);
        }
      }

      const timeLogId = `TL-${Date.now()}`
      const query = `INSERT INTO time_log (time_log_id, job_card_id, day_number, log_date, employee_id, operator_name, workstation_name, shift, from_time, to_time, time_in_minutes, completed_qty, accepted_qty, rejected_qty, scrap_qty, inhouse, outsource)
                     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      
      const normShift = (s) => String(s || '').trim().toUpperCase().replace(/^SHIFT\s+/, '') || 'A';

      await this.db.query(query, [
        timeLogId,
        data.job_card_id,
        data.day_number || 1,
        data.log_date || this._formatDate(new Date()),
        data.employee_id || null,
        data.operator_name || null,
        data.workstation_name || null,
        normShift(data.shift),
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

      // Sync quantities
      await this._syncJobCardQuantities(data.job_card_id);

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
      // Get job_card_id before deleting
      const [rows] = await this.db.query('SELECT job_card_id FROM time_log WHERE time_log_id = ?', [timeLogId]);
      
      await this.db.query('DELETE FROM time_log WHERE time_log_id = ?', [timeLogId])
      
      if (rows.length > 0) {
        await this._syncJobCardQuantities(rows[0].job_card_id);
      }
      
      return true
    } catch (error) {
      throw error
    }
  }

  async createRejection(data) {
    try {
      data.log_date = this._formatDate(data.log_date || new Date());
      const maxAllowed = await this._getMaxAllowedQuantity(data.job_card_id);
      const currentJobCard = await this.getJobCardDetails(data.job_card_id);
      
      // Calculate how much this entry would increase total production
      const [existingTotals] = await this.db.query(
        `SELECT 
          COALESCE((SELECT SUM(completed_qty) FROM time_log WHERE job_card_id = ?), 0) as total_time_log_produced,
          COALESCE((SELECT SUM(accepted_qty + rejected_qty + scrap_qty) FROM rejection_entry WHERE job_card_id = ?), 0) as total_rejection_produced,
          COALESCE((SELECT SUM(quantity_received) FROM inward_challan WHERE job_card_id = ?), 0) as total_challan_produced`,
        [data.job_card_id, data.job_card_id, data.job_card_id]
      );
      
      const totalTimeLogProduced = parseFloat(existingTotals[0].total_time_log_produced);
      const totalRejectionProduced = parseFloat(existingTotals[0].total_rejection_produced);
      const totalChallanProduced = parseFloat(existingTotals[0].total_challan_produced);
      
      const enteringProduced = (parseFloat(data.accepted_qty) || 0) + (parseFloat(data.rejected_qty) || 0) + (parseFloat(data.scrap_qty) || 0);
      
      const currentTotalProduced = Math.max(totalTimeLogProduced + totalChallanProduced, totalRejectionProduced);
      const newTotalProduced = Math.max(totalTimeLogProduced + totalChallanProduced, totalRejectionProduced + enteringProduced);
      
      const tolerance = 0.001; // 0.1% tolerance to allow for rounding errors only
      if (newTotalProduced > (maxAllowed * (1 + tolerance)) + 0.0001) {
        throw new Error(`Quantity Validation Error: Total production (${newTotalProduced.toFixed(2)}) would exceed planned quantity (${maxAllowed.toFixed(2)}). Please manage within planned units only.`);
      }

      const rejectionId = `REJ-${Date.now()}`
      const query = `INSERT INTO rejection_entry (rejection_id, job_card_id, day_number, log_date, shift, accepted_qty, rejection_reason, rejected_qty, scrap_qty, notes, status)
                     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      
      const normShift = (s) => String(s || '').trim().toUpperCase().replace(/^SHIFT\s+/, '') || 'A';

      await this.db.query(query, [
        rejectionId,
        data.job_card_id,
        data.day_number || 1,
        data.log_date || this._formatDate(new Date()),
        normShift(data.shift),
        data.accepted_qty || 0,
        data.rejection_reason || null,
        data.rejected_qty || 0,
        data.scrap_qty || 0,
        data.notes || null,
        'Pending'
      ])

      // Sync quantities
      await this._syncJobCardQuantities(data.job_card_id);

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
      // Get job_card_id before deleting
      const [rows] = await this.db.query('SELECT job_card_id FROM rejection_entry WHERE rejection_id = ?', [rejectionId]);
      
      await this.db.query('DELETE FROM rejection_entry WHERE rejection_id = ?', [rejectionId])
      
      if (rows.length > 0) {
        await this._syncJobCardQuantities(rows[0].job_card_id);
      }
      
      return true
    } catch (error) {
      throw error
    }
  }

  async approveRejection(rejectionId) {
    try {
      // Get job_card_id before updating
      const [rows] = await this.db.query('SELECT job_card_id FROM rejection_entry WHERE rejection_id = ?', [rejectionId]);
      if (rows.length === 0) throw new Error('Rejection entry not found');

      await this.db.query('UPDATE rejection_entry SET status = "Approved" WHERE rejection_id = ?', [rejectionId]);
      
      // Sync quantities now that it's approved
      await this._syncJobCardQuantities(rows[0].job_card_id);
      
      return true
    } catch (error) {
      throw error
    }
  }

  async createDowntime(data) {
    try {
      const downtimeId = `DT-${Date.now()}`
      const query = `INSERT INTO downtime_entry (downtime_id, job_card_id, day_number, log_date, shift, downtime_type, downtime_reason, from_time, to_time, duration_minutes)
                     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      
      const normShift = (s) => String(s || '').trim().toUpperCase().replace(/^SHIFT\s+/, '') || 'A';

      await this.db.query(query, [
        downtimeId,
        data.job_card_id,
        data.day_number || 1,
        data.log_date || this._formatDate(new Date()),
        normShift(data.shift),
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
        [jobCardId, eventTimestamp, workstation_id || null, employee_id || null, start_date || null, start_time || null, notes || null, created_by || 1]
      )

      await this.db.query(
        `UPDATE job_card SET actual_start_date = ?, status = 'in-progress', assigned_workstation_id = ?, operator_id = ?, inhouse = ?, outsource = ? WHERE job_card_id = ?`,
        [eventTimestamp, workstation_id || null, employee_id || null, inhouse ? 1 : 0, outsource ? 1 : 0, jobCardId]
      )

      // Sync Work Order and Sales Order status
      const jobCard = await this.getJobCardDetails(jobCardId)
      if (jobCard && jobCard.work_order_id) {
        await this.checkAndUpdateWorkOrderProgress(jobCard.work_order_id)
      }

      return { success: true, message: 'Operation started successfully' }
    } catch (error) {
      throw error
    }
  }

  async endOperation(jobCardId, data) {
    try {
      const { actual_end_date, next_operation_id, notes, created_by } = data

      // Ensure quantities and costs are synced one last time
      await this._syncJobCardQuantities(jobCardId);

      // Requirement 140: Quality entry is mandatory before Job Card completion
      const jobCard = await this.getJobCardDetails(jobCardId)
      if (!jobCard) {
        throw new Error('Job card not found')
      }

      // 1. Check if production has been recorded
      if (parseFloat(jobCard.produced_quantity || 0) <= 0) {
        throw new Error(`Quality Validation Error: Cannot complete Job Card ${jobCardId} without production quantity. Please log a Time Log or Rejection Entry first.`)
      }

      // 2. Check for mandatory Quality Inspection Result or Rejection Entry
      const [inspections] = await this.db.query(
        "SELECT inspection_id FROM inspection_result WHERE reference_type = 'Job Card' AND reference_id = ?",
        [jobCardId]
      )
      
      const [rejections] = await this.db.query(
        "SELECT rejection_id FROM rejection_entry WHERE job_card_id = ?",
        [jobCardId]
      )

      if ((!inspections || inspections.length === 0) && (!rejections || rejections.length === 0)) {
        // If no formal inspection and no rejection entries, we at least expect some accepted quantity to have been logged via Time Logs
        // but the prompt says "Quality entry is mandatory". 
        // We'll enforce that either an inspection or a rejection entry (which captures quality state) must exist.
        // If all pieces were accepted without rejections, a "Pass" inspection should be recorded.
        throw new Error(`Quality Validation Error: Quality entry is mandatory before Job Card completion. Please record an Inspection Result or a Rejection Entry for Job Card ${jobCardId}.`)
      }

      const eventTimestamp = new Date(actual_end_date).toISOString().replace('Z', '').replace('T', ' ')
      await this.db.query(
        `INSERT INTO operation_execution_log 
          (job_card_id, event_type, event_timestamp, notes, created_by)
         VALUES (?, 'END', ?, ?, ?)`,
        [jobCardId, eventTimestamp, notes || null, created_by || 1]
      )

      await this.db.query(
        `UPDATE job_card SET actual_end_date = ?, status = 'completed', next_operation_id = ? WHERE job_card_id = ?`,
        [eventTimestamp, next_operation_id || null, jobCardId]
      )

      // AUTO: Mark next assigned operation as "ready"
      if (next_operation_id) {
        await this.db.query(
          "UPDATE job_card SET status = 'ready' WHERE job_card_id = ? AND status IN ('open', 'draft', 'pending')",
          [next_operation_id]
        )
      } else {
        // Try to find the next sequential operation if not explicitly linked
        const [nextOps] = await this.db.query(
          "SELECT job_card_id FROM job_card WHERE work_order_id = ? AND operation_sequence > ? ORDER BY operation_sequence ASC LIMIT 1",
          [jobCard.work_order_id, jobCard.operation_sequence || 0]
        )
        if (nextOps && nextOps.length > 0) {
          await this.db.query(
            "UPDATE job_card SET status = 'ready' WHERE job_card_id = ? AND status IN ('open', 'draft', 'pending')",
            [nextOps[0].job_card_id]
          )
        }
      }

      // Sync Work Order and Sales Order status
      const jobCardCompleted = await this.getJobCardDetails(jobCardId)
      if (jobCardCompleted && jobCardCompleted.work_order_id) {
        await this.rollUpJobCardCost(jobCardId)
        await this.checkAndUpdateWorkOrderCompletion(jobCardCompleted.work_order_id)
      }

      return { success: true, message: 'Operation ended successfully' }
    } catch (error) {
      throw error
    }
  }

  async rollUpJobCardCost(jobCardId) {
    try {
      const jobCard = await this.getJobCardDetails(jobCardId);
      if (!jobCard || !jobCard.work_order_id) return;

      const woId = jobCard.work_order_id;

      // 1. Get all operating costs from completed Job Cards for this Work Order
      const [opCostRow] = await this.db.query(
        "SELECT SUM(operating_cost) as total_op_cost FROM job_card WHERE work_order_id = ?",
        [woId]
      );
      const totalOpCost = parseFloat(opCostRow[0].total_op_cost) || 0;

      // 2. Get total material cost (based on what's been consumed so far)
      const [matCostRow] = await this.db.query(
        `SELECT SUM(wi.consumed_qty * i.valuation_rate) as total_mat_cost 
         FROM work_order_item wi
         LEFT JOIN item i ON wi.item_code = i.item_code
         WHERE wi.wo_id = ?`,
        [woId]
      );
      const totalMatCost = parseFloat(matCostRow[0].total_mat_cost) || 0;

      const totalCost = totalOpCost + totalMatCost;

      // 3. Update Work Order
      const [wo] = await this.db.query("SELECT quantity FROM work_order WHERE wo_id = ?", [woId]);
      const quantity = wo.length > 0 ? (parseFloat(wo[0].quantity) || 1) : 1;
      const unitCost = totalCost / quantity;

      await this.db.query(
        "UPDATE work_order SET total_cost = ?, unit_cost = ? WHERE wo_id = ?",
        [totalCost, unitCost, woId]
      );

      return { totalCost, unitCost };
    } catch (error) {
      console.error(`Failed to roll up cost for job card ${jobCardId}:`, error);
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
    let connection;
    try {
      connection = await this.db.getConnection();
      await connection.beginTransaction();

      const challanNumber = `OC-${Date.now()}`;
      const query = `INSERT INTO outward_challan (challan_number, job_card_id, vendor_id, vendor_name, expected_return_date, notes, status, created_by, dispatch_quantity)
                     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`;
      const [result] = await connection.query(query, [
        challanNumber,
        data.job_card_id,
        data.vendor_id || null,
        data.vendor_name || null,
        data.expected_return_date || null,
        data.notes || null,
        'issued',
        data.created_by || null,
        data.dispatch_quantity || 0
      ]);

      const challanId = result.insertId;

      if (data.items && Array.isArray(data.items)) {
        for (const item of data.items) {
          await connection.query(
            `INSERT INTO outward_challan_item (challan_id, item_code, required_qty, release_qty, uom)
             VALUES (?, ?, ?, ?, ?)`,
            [challanId, item.item_code, item.required_qty || 0, item.release_qty || 0, item.uom || null]
          );
        }
      }

      await connection.commit();
      return { id: challanId, challan_number: challanNumber, ...data };
    } catch (error) {
      if (connection) await connection.rollback();
      throw error;
    } finally {
      if (connection) connection.release();
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
      const maxAllowed = await this._getMaxAllowedQuantity(data.job_card_id);
      const currentJobCard = await this.getJobCardDetails(data.job_card_id);
      
      const qReceived = parseFloat(data.quantity_received || 0);
      const qAccepted = parseFloat(data.quantity_accepted || 0);
      const qRejected = parseFloat(data.quantity_rejected || 0);

      let productionIncrease = qReceived;
      if (qReceived === 0 && qAccepted > 0) {
        // Infer production if received is 0 but accepted is > 0
        productionIncrease = qAccepted + qRejected;
      }

      const currentTotalProduced = parseFloat(currentJobCard?.produced_quantity || 0);

      if (currentTotalProduced + productionIncrease > maxAllowed + 0.0001) {
        throw new Error(`Quantity Validation Error: Total production from challan (${(currentTotalProduced + productionIncrease).toFixed(2)}) would exceed allowed quantity (${maxAllowed.toFixed(2)}) based on previous operation or plan.`);
      }

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

      // Sync quantities
      await this._syncJobCardQuantities(data.job_card_id);

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
      // Get old values first to calculate delta
      const [oldRows] = await this.db.query('SELECT * FROM inward_challan WHERE id = ?', [id]);
      if (oldRows.length === 0) throw new Error('Inward challan not found');
      const old = oldRows[0];

      const newReceived = data.quantity_received !== undefined ? parseFloat(data.quantity_received) : parseFloat(old.quantity_received || 0);
      const newAccepted = data.quantity_accepted !== undefined ? parseFloat(data.quantity_accepted) : parseFloat(old.quantity_accepted || 0);
      const newRejected = data.quantity_rejected !== undefined ? parseFloat(data.quantity_rejected) : parseFloat(old.quantity_rejected || 0);

      const oldProduced = parseFloat(old.quantity_received) || (parseFloat(old.quantity_accepted || 0) + parseFloat(old.quantity_rejected || 0));
      const newProduced = newReceived || (newAccepted + newRejected);
      const productionIncrease = newProduced - oldProduced;

      if (productionIncrease > 0) {
        const maxAllowed = await this._getMaxAllowedQuantity(old.job_card_id);
        const currentJobCard = await this.getJobCardDetails(old.job_card_id);
        const currentTotalProduced = parseFloat(currentJobCard?.produced_quantity || 0);

        if (currentTotalProduced + productionIncrease > maxAllowed + 0.0001) {
          throw new Error(`Quantity Validation Error: Update would exceed allowed quantity (${maxAllowed.toFixed(2)}) based on previous operation or plan.`);
        }
      }

      const updateFields = []
      const values = []
      
      for (const [key, value] of Object.entries(data)) {
        updateFields.push(`${key} = ?`)
        values.push(value)
      }
      
      values.push(id)
      
      const query = `UPDATE inward_challan SET ${updateFields.join(', ')}, updated_at = NOW() WHERE id = ?`
      await this.db.query(query, values)

      // Get job_card_id to sync
      const [rows] = await this.db.query('SELECT job_card_id FROM inward_challan WHERE id = ?', [id]);
      if (rows.length > 0) {
        await this._syncJobCardQuantities(rows[0].job_card_id);
      }

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
      await this.db.query('SET FOREIGN_KEY_CHECKS = 0')
      await this.db.query('DELETE FROM bom_line')
      await this.db.query('DELETE FROM bom_operation')
      await this.db.query('DELETE FROM bom_scrap')
      await this.db.query('DELETE FROM bom')
      await this.db.query('SET FOREIGN_KEY_CHECKS = 1')
    } catch (error) {
      await this.db.query('SET FOREIGN_KEY_CHECKS = 1')
      throw error
    }
  }

  async truncateWorkOrders() {
    try {
      await this.db.query('SET FOREIGN_KEY_CHECKS = 0')
      await this.db.query('DELETE FROM production_entry')
      await this.db.query('DELETE FROM job_card')
      await this.db.query('DELETE FROM work_order_item')
      await this.db.query('DELETE FROM work_order_operation')
      await this.db.query('DELETE FROM work_order')
      await this.db.query('SET FOREIGN_KEY_CHECKS = 1')
    } catch (error) {
      await this.db.query('SET FOREIGN_KEY_CHECKS = 1')
      throw error
    }
  }

  async truncateJobCards() {
    try {
      await this.db.query('SET FOREIGN_KEY_CHECKS = 0')
      await this.db.query('DELETE FROM job_card')
      await this.db.query('SET FOREIGN_KEY_CHECKS = 1')
    } catch (error) {
      await this.db.query('SET FOREIGN_KEY_CHECKS = 1')
      throw error
    }
  }

  async updateJobCardStatus(jobCardId, newStatus) {
    try {
      const normalizedStatus = ((newStatus || '').toLowerCase().replace(/\s+/g, '-')).trim()
      
      // NEW: Validation before starting a Job Card
      if (normalizedStatus === 'in-progress') {
        const [jc] = await this.db.query(
          'SELECT work_order_id, operation_sequence, operation FROM job_card WHERE job_card_id = ?',
          [jobCardId]
        );
        
        if (jc && jc.length > 0) {
          const { work_order_id, operation_sequence } = jc[0];
          
          // Check if it's the first operation
          const [firstOp] = await this.db.query(
            'SELECT MIN(operation_sequence) as min_seq FROM job_card WHERE work_order_id = ?',
            [work_order_id]
          );
          
          if (operation_sequence === firstOp[0].min_seq) {
            // 1. Check Sub-Assemblies
            const [childWOs] = await this.db.query(
              'SELECT wo_id, status, item_code FROM work_order WHERE parent_wo_id = ?',
              [work_order_id]
            );
            
            const incomplete = childWOs.filter(wo => (wo.status || '').toLowerCase() !== 'completed');
            if (incomplete.length > 0) {
              const items = incomplete.map(wo => `${wo.item_code} (${wo.wo_id})`).join(', ');
              throw new Error(`Cannot start Work Order. Sub-assemblies incomplete: ${items}`);
            }
            
            // 2. Check Material Allocation
            const [allocations] = await this.db.query(
              'SELECT item_code, status, allocated_qty FROM material_allocation WHERE work_order_id = ?',
              [work_order_id]
            );
            
            if (allocations && allocations.length > 0) {
              const [requiredItems] = await this.db.query(
                'SELECT item_code, required_qty FROM work_order_item WHERE wo_id = ?',
                [work_order_id]
              );
              
              const unallocated = requiredItems.filter(ri => 
                !allocations.find(a => a.item_code === ri.item_code)
              );
              
              if (unallocated.length > 0) {
                const itemCodes = unallocated.map(i => i.item_code).join(', ');
                throw new Error(`Cannot start Work Order. Some materials are not allocated: ${itemCodes}`);
              }
            }
          }
        }
      }

      await this.db.query(
        'UPDATE job_card SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE job_card_id = ?',
        [normalizedStatus, jobCardId]
      )

      // Sync quantities after status update
      await this._syncJobCardQuantities(jobCardId)

      const [jobCard] = await this.db.query(
        'SELECT work_order_id FROM job_card WHERE job_card_id = ?',
        [jobCardId]
      )

      if (!jobCard || jobCard.length === 0) {
        return
      }

      const workOrderId = jobCard[0].work_order_id

      if (normalizedStatus === 'in-progress' || normalizedStatus === 'pending') {
        await this.checkAndUpdateWorkOrderProgress(workOrderId)
      } else if (normalizedStatus === 'completed') {
        await this.checkAndUpdateWorkOrderCompletion(workOrderId)
      }

      const [workOrder] = await this.db.query(
        'SELECT sales_order_id, bom_no FROM work_order WHERE wo_id = ?',
        [workOrderId]
      )

      if (workOrder && workOrder.length > 0) {
        const salesOrderId = workOrder[0].sales_order_id
        const bomNo = workOrder[0].bom_no

        if (salesOrderId) {
          await this.syncSalesOrderStatus(salesOrderId)
        }

        const [productionPlans] = await this.db.query(
          'SELECT plan_id FROM production_plan WHERE sales_order_id = ?',
          [salesOrderId]
        )

        if (productionPlans && productionPlans.length > 0) {
          for (const plan of productionPlans) {
            await this.db.query(
              'UPDATE production_plan SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE plan_id = ?',
              [normalizedStatus, plan.plan_id]
            )
          }
        }

        // Update BOM status based on Job Card activity
        if (bomNo && (normalizedStatus === 'in-progress' || normalizedStatus === 'completed')) {
          await this.db.query(
            "UPDATE bom SET status = 'active', updated_at = CURRENT_TIMESTAMP WHERE bom_id = ? AND status != 'active'",
            [bomNo]
          )
        }
      }

      return { success: true, newStatus: normalizedStatus }
    } catch (error) {
      throw error
    }
  }

  async syncAllBOMStatuses() {
    try {
      // Find all BOMs that have at least one Job Card that is 'in-progress' or 'completed'
      const query = `
        UPDATE bom b
        SET b.status = 'active', b.updated_at = CURRENT_TIMESTAMP
        WHERE b.status != 'active'
        AND EXISTS (
          SELECT 1 
          FROM work_order wo
          JOIN job_card jc ON wo.wo_id = jc.work_order_id
          WHERE wo.bom_no = b.bom_id
          AND jc.status IN ('in-progress', 'completed')
        )
      `
      const [result] = await this.db.query(query)
      return { success: true, affectedRows: result.affectedRows }
    } catch (error) {
      throw error
    }
  }
}

export default ProductionModel
