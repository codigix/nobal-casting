class InventoryModel {
  constructor(db) {
    this.db = db
  }

  // ============================================================================
  // STEP 1: ALLOCATE MATERIALS (When Work Order is Created)
  // ============================================================================
  async allocateMaterialsForWorkOrder(wo_id, materials, createdBy = 'system') {
    try {
      const allocations = []

      for (let material of materials) {
        const {
          item_code,
          item_name,
          required_qty,
          source_warehouse,
          uom
        } = material

        // Check stock availability
        const [stockCheck] = await this.db.query(
          `SELECT sb.id, sb.current_qty, sb.available_qty, w.id as warehouse_id, w.warehouse_code
           FROM stock_balance sb
           LEFT JOIN warehouses w ON sb.warehouse_id = w.id
           WHERE sb.item_id = (SELECT id FROM items WHERE item_code = ?)
           AND (w.warehouse_code = ? OR w.warehouse_name = ?)`,
          [item_code, source_warehouse, source_warehouse]
        )

        if (!stockCheck || stockCheck.length === 0) {
          throw new Error(`Material ${item_code} not found in warehouse ${source_warehouse}`)
        }

        const stock = stockCheck[0]
        if (stock.current_qty < required_qty) {
          throw new Error(
            `Insufficient stock for ${item_code}. Available: ${stock.current_qty}, Required: ${required_qty}`
          )
        }

        // Create allocation record
        const [result] = await this.db.query(
          `INSERT INTO material_allocation 
           (work_order_id, item_code, item_name, warehouse_id, warehouse_code, 
            allocated_qty, status, created_by)
           VALUES (?, ?, ?, ?, ?, ?, 'pending', ?)`,
          [wo_id, item_code, item_name, stock.warehouse_id, stock.warehouse_code || source_warehouse, required_qty, createdBy]
        )

        allocations.push({
          allocation_id: result.insertId,
          work_order_id: wo_id,
          item_code,
          allocated_qty: required_qty
        })

        // Update reserved quantity in stock_balance
        await this.db.query(
          `UPDATE stock_balance 
           SET reserved_qty = reserved_qty + ?
           WHERE id = ?`,
          [required_qty, stock.id]
        )

        // Log allocation
        await this.logMaterialDeduction(
          wo_id,
          null,
          item_code,
          stock.warehouse_id,
          'allocate',
          required_qty,
          stock.current_qty,
          stock.current_qty - required_qty,
          'Material Allocation for Work Order',
          createdBy
        )
      }

      return allocations
    } catch (error) {
      throw error
    }
  }

  // ============================================================================
  // STEP 2: TRACK MATERIAL CONSUMPTION (During Job Card Execution)
  // ============================================================================
  async trackMaterialConsumption(
    job_card_id,
    work_order_id,
    materials,
    tracked_by = 'system'
  ) {
    try {
      const consumptions = []

      for (let material of materials) {
        const {
          item_code,
          item_name,
          warehouse_id,
          operation_name,
          planned_qty,
          consumed_qty,
          wasted_qty,
          waste_reason
        } = material

        // Create consumption record
        const [result] = await this.db.query(
          `INSERT INTO job_card_material_consumption 
           (job_card_id, work_order_id, item_code, item_name, warehouse_id, 
            operation_name, planned_qty, consumed_qty, wasted_qty, waste_reason, 
            status, tracked_by, tracked_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'completed', ?, NOW())`,
          [
            job_card_id,
            work_order_id,
            item_code,
            item_name,
            warehouse_id,
            operation_name,
            planned_qty,
            consumed_qty,
            wasted_qty,
            waste_reason,
            tracked_by
          ]
        )

        consumptions.push({
          consumption_id: result.insertId,
          job_card_id,
          item_code,
          consumed_qty,
          wasted_qty
        })

        // Update material allocation
        await this.db.query(
          `UPDATE material_allocation 
           SET consumed_qty = consumed_qty + ?,
               wasted_qty = wasted_qty + ?,
               status = 'partial'
           WHERE work_order_id = ? AND item_code = ?`,
          [consumed_qty, wasted_qty, work_order_id, item_code]
        )
      }

      return consumptions
    } catch (error) {
      throw error
    }
  }

  // ============================================================================
  // STEP 3: FINALIZE MATERIAL DEDUCTION (When Work Order is Completed)
  // ============================================================================
  async finalizeWorkOrderMaterials(work_order_id, finalized_by = 'system') {
    try {
      // Get all allocations for this work order
      const [allocations] = await this.db.query(
        `SELECT * FROM material_allocation WHERE work_order_id = ?`,
        [work_order_id]
      )

      if (!allocations || allocations.length === 0) {
        throw new Error('No materials allocated for this work order')
      }

      const updates = []

      for (let alloc of allocations) {
        // Calculate final deduction
        const finalDeductionQty = alloc.consumed_qty + alloc.wasted_qty
        const returnQty = alloc.allocated_qty - finalDeductionQty

        // Get stock info
        const [stockInfo] = await this.db.query(
          `SELECT sb.id, sb.current_qty, sb.reserved_qty
           FROM stock_balance sb
           WHERE sb.item_id = (SELECT id FROM items WHERE item_code = ?)
           AND sb.warehouse_id = ?`,
          [alloc.item_code, alloc.warehouse_id]
        )

        if (stockInfo && stockInfo.length > 0) {
          const stock = stockInfo[0]

          // Deduct final quantity from current_qty and update reserved_qty
          const newReservedQty = Math.max(0, stock.reserved_qty - alloc.allocated_qty)
          const newCurrentQty = stock.current_qty - finalDeductionQty

          await this.db.query(
            `UPDATE stock_balance 
             SET current_qty = ?,
                 reserved_qty = ?
             WHERE id = ?`,
            [newCurrentQty, newReservedQty, stock.id]
          )

          // Log final deduction in stock ledger
          await this.db.query(
            `INSERT INTO stock_ledger 
             (item_id, warehouse_id, transaction_date, transaction_type, 
              qty_out, balance_qty, reference_doctype, reference_name, remarks, created_by)
             VALUES (
               (SELECT id FROM items WHERE item_code = ?),
               ?,
               NOW(),
               'Manufacturing Issue',
               ?,
               ?,
               'Work Order',
               ?,
               CONCAT('Consumed: ', ?, ', Wasted: ', ?),
               ?
             )`,
            [
              alloc.item_code,
              alloc.warehouse_id,
              finalDeductionQty,
              newCurrentQty,
              work_order_id,
              alloc.consumed_qty,
              alloc.wasted_qty,
              finalized_by
            ]
          )

          // Log in material deduction log
          await this.logMaterialDeduction(
            work_order_id,
            null,
            alloc.item_code,
            alloc.warehouse_id,
            'consume',
            finalDeductionQty,
            stock.current_qty,
            newCurrentQty,
            `Final deduction: Consumed ${alloc.consumed_qty}, Wasted ${alloc.wasted_qty}`,
            finalized_by
          )

          // If there's return quantity, track it
          if (returnQty > 0) {
            await this.returnMaterialToInventory(
              work_order_id,
              null,
              alloc.item_code,
              alloc.warehouse_id,
              returnQty,
              'Unused material return',
              finalized_by
            )
          }
        }

        // Mark allocation as completed
        await this.db.query(
          `UPDATE material_allocation 
           SET status = 'completed',
               returned_qty = ?,
               completed_at = NOW()
           WHERE allocation_id = ?`,
          [returnQty, alloc.allocation_id]
        )

        updates.push({
          allocation_id: alloc.allocation_id,
          item_code: alloc.item_code,
          consumed_qty: alloc.consumed_qty,
          wasted_qty: alloc.wasted_qty,
          returned_qty: returnQty
        })
      }

      return updates
    } catch (error) {
      throw error
    }
  }

  // ============================================================================
  // STEP 4: RETURN MATERIALS (If not used)
  // ============================================================================
  async returnMaterialToInventory(
    work_order_id,
    job_card_id,
    item_code,
    warehouse_id,
    return_qty,
    reason = 'Unused material',
    returned_by = 'system'
  ) {
    try {
      // Get current stock
      const [stockInfo] = await this.db.query(
        `SELECT sb.id, sb.current_qty, sb.reserved_qty
         FROM stock_balance sb
         WHERE sb.item_id = (SELECT id FROM items WHERE item_code = ?)
         AND sb.warehouse_id = ?`,
        [item_code, warehouse_id]
      )

      if (!stockInfo || stockInfo.length === 0) {
        throw new Error(`Stock record not found for ${item_code}`)
      }

      const stock = stockInfo[0]
      const newCurrentQty = stock.current_qty + return_qty
      const newReservedQty = Math.max(0, stock.reserved_qty - return_qty)

      // Update stock_balance
      await this.db.query(
        `UPDATE stock_balance 
         SET current_qty = ?,
             reserved_qty = ?
         WHERE id = ?`,
        [newCurrentQty, newReservedQty, stock.id]
      )

      // Log return in stock ledger
      await this.db.query(
        `INSERT INTO stock_ledger 
         (item_id, warehouse_id, transaction_date, transaction_type, 
          qty_in, balance_qty, reference_doctype, reference_name, remarks, created_by)
         VALUES (
           (SELECT id FROM items WHERE item_code = ?),
           ?,
           NOW(),
           'Manufacturing Return',
           ?,
           ?,
           'Work Order',
           ?,
           ?,
           ?
         )`,
        [
          item_code,
          warehouse_id,
          return_qty,
          newCurrentQty,
          work_order_id,
          reason,
          returned_by
        ]
      )

      // Log in material deduction log
      await this.logMaterialDeduction(
        work_order_id,
        job_card_id,
        item_code,
        warehouse_id,
        'return',
        return_qty,
        stock.current_qty,
        newCurrentQty,
        reason,
        returned_by
      )

      return {
        returned_qty: return_qty,
        new_balance: newCurrentQty
      }
    } catch (error) {
      throw error
    }
  }

  // ============================================================================
  // AUDIT LOG
  // ============================================================================
  async logMaterialDeduction(
    work_order_id,
    job_card_id,
    item_code,
    warehouse_id,
    transaction_type,
    quantity,
    before_qty,
    after_qty,
    notes,
    created_by
  ) {
    try {
      await this.db.query(
        `INSERT INTO material_deduction_log 
         (work_order_id, job_card_id, item_code, warehouse_id, transaction_type, 
          quantity, before_qty, after_qty, notes, created_by)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          work_order_id,
          job_card_id,
          item_code,
          warehouse_id,
          transaction_type,
          quantity,
          before_qty,
          after_qty,
          notes,
          created_by
        ]
      )
    } catch (error) {
      console.error('Failed to log material deduction:', error)
    }
  }

  // ============================================================================
  // REPORTS & QUERIES
  // ============================================================================
  async getMaterialAllocationForWorkOrder(wo_id) {
    try {
      const [allocations] = await this.db.query(
        `SELECT 
           allocation_id,
           work_order_id,
           item_code,
           item_name,
           allocated_qty,
           consumed_qty,
           returned_qty,
           wasted_qty,
           (allocated_qty - consumed_qty - returned_qty - wasted_qty) as pending_qty,
           status,
           allocated_at,
           completed_at
         FROM material_allocation
         WHERE work_order_id = ?
         ORDER BY allocated_at DESC`,
        [wo_id]
      )
      return allocations || []
    } catch (error) {
      throw error
    }
  }

  async getMaterialWasteReport(wo_id) {
    try {
      const [report] = await this.db.query(
        `SELECT 
           item_code,
           item_name,
           allocated_qty,
           consumed_qty,
           wasted_qty,
           ROUND((wasted_qty / allocated_qty * 100), 2) as waste_percentage,
           status
         FROM material_allocation
         WHERE work_order_id = ?
         AND allocated_qty > 0`,
        [wo_id]
      )
      return report || []
    } catch (error) {
      throw error
    }
  }

  async getMaterialDeductionAuditLog(work_order_id) {
    try {
      const [logs] = await this.db.query(
        `SELECT 
           log_id,
           transaction_type,
           item_code,
           quantity,
           before_qty,
           after_qty,
           notes,
           created_by,
           created_at
         FROM material_deduction_log
         WHERE work_order_id = ?
         ORDER BY created_at DESC`,
        [work_order_id]
      )
      return logs || []
    } catch (error) {
      throw error
    }
  }
}

export default InventoryModel
