import StockBalanceModel from './StockBalanceModel.js'
import StockLedgerModel from './StockLedgerModel.js'
import { PeriodClosingModel } from './PeriodClosingModel.js'

export class MaterialRequestModel {
  /**
   * Resolve warehouse code to warehouse ID
   */
  static async getWarehouseId(db, warehouseIdentifier) {
    if (!warehouseIdentifier) return null
    
    if (Number.isInteger(Number(warehouseIdentifier))) {
      return Number(warehouseIdentifier)
    }
    
    const [rows] = await db.execute(
      'SELECT id FROM warehouses WHERE warehouse_code = ? OR warehouse_name = ?',
      [warehouseIdentifier, warehouseIdentifier]
    )
    
    return rows.length ? rows[0].id : warehouseIdentifier
  }

  /**
   * Get all material requests
   */
  static async getAll(db, filters = {}) {
    try {
      let query = `
        SELECT mr.*, 
               COALESCE(CONCAT_WS(' ', em.first_name, em.last_name), c.name, u.full_name, mr.requested_by_id) as requested_by_name, 
               po.po_no as linked_po_no, po.status as po_status
        FROM material_request mr 
        LEFT JOIN employee_master em ON mr.requested_by_id = em.employee_id
        LEFT JOIN contact c ON mr.requested_by_id = c.contact_id 
        LEFT JOIN users u ON mr.requested_by_id = CAST(u.user_id AS CHAR) COLLATE utf8mb4_0900_ai_ci OR mr.requested_by_id = u.full_name
        LEFT JOIN purchase_order po ON mr.mr_id = po.mr_id AND po.status != 'cancelled'
        WHERE 1=1`
      const params = []

      if (filters.status) {
        query += ' AND mr.status = ?'
        params.push(filters.status)
      }

      if (filters.department) {
        query += ' AND mr.department = ?'
        params.push(filters.department)
      }

      if (filters.production_plan_id) {
        query += ' AND mr.production_plan_id = ?'
        params.push(filters.production_plan_id)
      }

      if (filters.search) {
        query += ' AND (mr.mr_id LIKE ? OR c.name LIKE ?)'
        const term = `%${filters.search}%`
        params.push(term, term)
      }

      query += ' ORDER BY mr.created_at DESC LIMIT 100'

      const [rows] = await db.execute(query, params)
      
      if (rows.length === 0) {
        return rows
      }

      const mrIds = rows.map(r => r.mr_id)
      const placeholders = mrIds.map(() => '?').join(',')
      const [itemRows] = await db.execute(
        `SELECT mri.*, i.name as item_name, i.uom, i.item_group 
         FROM material_request_item mri 
         LEFT JOIN item i ON mri.item_code = i.item_code 
         WHERE mri.mr_id IN (${placeholders})`,
        mrIds
      )

      const itemsByMrId = {}
      itemRows.forEach(item => {
        if (!itemsByMrId[item.mr_id]) {
          itemsByMrId[item.mr_id] = []
        }
        itemsByMrId[item.mr_id].push(item)
      })

      rows.forEach(row => {
        row.items = itemsByMrId[row.mr_id] || []
      })

      return rows
    } catch (error) {
      throw new Error('Failed to fetch material requests: ' + error.message)
    }
  }

  /**
   * Get material request by ID with items
   */
  static async getById(db, mrId) {
    try {
      const [mrRows] = await db.execute(
        `SELECT mr.*, 
                COALESCE(CONCAT_WS(' ', em.first_name, em.last_name), c.name, u.full_name, mr.requested_by_id) as requested_by_name, 
                po.po_no as linked_po_no, po.status as po_status
         FROM material_request mr 
         LEFT JOIN employee_master em ON mr.requested_by_id = em.employee_id
         LEFT JOIN contact c ON mr.requested_by_id = c.contact_id 
         LEFT JOIN users u ON mr.requested_by_id = CAST(u.user_id AS CHAR) COLLATE utf8mb4_0900_ai_ci OR mr.requested_by_id = u.full_name
         LEFT JOIN purchase_order po ON mr.mr_id = po.mr_id AND po.status != 'cancelled'
         WHERE mr.mr_id = ?`,
        [mrId]
      )

      if (!mrRows.length) return null

      const mr = mrRows[0]

      // Get items for this MR
      const [itemRows] = await db.execute(
        `SELECT mri.*, i.name as item_name, i.uom, i.item_group 
         FROM material_request_item mri 
         LEFT JOIN item i ON mri.item_code = i.item_code 
         WHERE mri.mr_id = ?`,
        [mrId]
      )

      return {
        ...mr,
        items: itemRows
      }
    } catch (error) {
      throw new Error('Failed to fetch material request: ' + error.message)
    }
  }

  /**
   * Create new material request
   */
  static async create(db, mrData) {
    try {
      const {
        series_no = '',
        transition_date = null,
        requested_by_id = '',
        department = '',
        purpose = 'purchase',
        required_by_date = null,
        target_warehouse = null,
        source_warehouse = null,
        items_notes = '',
        status = 'draft',
        production_plan_id = null,
        created_by = null,
        items = []
      } = mrData

      // Generate MR ID
      const mr_id = 'MR-' + Date.now()
      const request_date = new Date().toISOString().split('T')[0]

      // Insert MR with all fields
      await db.execute(
        `INSERT INTO material_request 
         (mr_id, series_no, transition_date, requested_by_id, department, purpose, 
          request_date, required_by_date, target_warehouse, source_warehouse, items_notes, status, production_plan_id, created_by) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [mr_id, series_no || null, transition_date || null, requested_by_id || null, 
         department || null, purpose, request_date, required_by_date || null, 
         target_warehouse || null, source_warehouse || null, items_notes || '', status || 'draft', production_plan_id || null, created_by]
      )

      // Insert items
      if (items.length > 0) {
        for (const item of items) {
          const mr_item_id = 'MRI-' + Date.now() + '-' + Math.random()
          await db.execute(
            'INSERT INTO material_request_item (mr_item_id, mr_id, item_code, qty, uom, purpose) VALUES (?, ?, ?, ?, ?, ?)',
            [mr_item_id, mr_id, item.item_code || null, item.qty || 0, item.uom || '', item.purpose || null]
          )
        }
      }

      const createdMR = await this.getById(db, mr_id)

      try {
        await this.createNotifications(db, createdMR, 'MATERIAL_REQUEST_NEW', mrData.department)
      } catch (notifError) {
        console.log('Notification creation failed (non-critical):', notifError.message)
      }

      return createdMR
    } catch (error) {
      throw new Error('Failed to create material request: ' + error.message)
    }
  }

  /**
   * Update material request
   */
  static async update(db, mrId, mrData) {
    try {
      const {
        department,
        required_by_date,
        purpose,
        items = []
      } = mrData

      // Check status - can only update if draft
      const [existingMR] = await db.execute(
        'SELECT status FROM material_request WHERE mr_id = ?',
        [mrId]
      )

      if (!existingMR.length) {
        throw new Error('Material request not found')
      }

      if (existingMR[0].status !== 'draft') {
        throw new Error('Cannot update material request with status: ' + existingMR[0].status)
      }

      // Update MR
      await db.execute(
        'UPDATE material_request SET department = ?, required_by_date = ? WHERE mr_id = ?',
        [department, required_by_date, mrId]
      )

      // Update items if provided
      if (items.length > 0) {
        // Delete existing items
        await db.execute('DELETE FROM material_request_item WHERE mr_id = ?', [mrId])

        // Insert new items
        for (const item of items) {
          const mr_item_id = 'MRI-' + Date.now() + '-' + Math.random()
          await db.execute(
            'INSERT INTO material_request_item (mr_item_id, mr_id, item_code, qty, uom, purpose) VALUES (?, ?, ?, ?, ?, ?)',
            [mr_item_id, mrId, item.item_code, item.qty, item.uom, item.purpose]
          )
        }
      }

      return await this.getById(db, mrId)
    } catch (error) {
      throw new Error('Failed to update material request: ' + error.message)
    }
  }

  /**
   * Approve material request
   */
  static async approve(db, mrId, approvedBy, sourceWarehouse = null) {
    const connection = await db.getConnection()
    try {
      await connection.beginTransaction()

      // Get MR details
      const [mrRows] = await connection.execute('SELECT * FROM material_request WHERE mr_id = ?', [mrId])
      if (!mrRows.length) throw new Error('Material request not found')
      const request = mrRows[0]

      // Allow idempotent approval - if already approved or completed, just return
      if (request.status === 'approved' || request.status === 'completed') {
        await connection.rollback()
        connection.release()
        return await this.getById(db, mrId)
      }

      if (request.status !== 'draft' && request.status !== 'pending') {
        throw new Error(`Only draft or pending material requests can be approved. Current status: ${request.status}`)
      }

      // Get items
      const [items] = await connection.execute('SELECT * FROM material_request_item WHERE mr_id = ?', [mrId])

      // Check stock for Issue/Transfer
      const isStockTransaction = ['material_transfer', 'material_issue'].includes(request.purpose)
      
      // Use provided source warehouse or fall back to existing one
      const finalSourceWarehouse = sourceWarehouse || request.source_warehouse

      if (isStockTransaction && !finalSourceWarehouse) {
        throw new Error('Source warehouse is required for Material Transfer/Issue')
      }
      
      const sourceWarehouseId = isStockTransaction ? await this.getWarehouseId(connection, finalSourceWarehouse) : null

      // STRICT STOCK CHECK for Issue/Transfer
      if (isStockTransaction) {
        for (const item of items) {
          const balance = await StockBalanceModel.getByItemAndWarehouse(item.item_code, sourceWarehouseId, connection)
          const availableQty = balance ? Number(balance.available_qty || balance.current_qty || 0) : 0
          if (availableQty < Number(item.qty)) {
            throw new Error(`Insufficient stock for item ${item.item_code} in warehouse ${finalSourceWarehouse}. Required: ${item.qty}, Available: ${availableQty}`)
          }
        }
      }

      // Update source warehouse if provided and different
      if (sourceWarehouse && sourceWarehouse !== request.source_warehouse) {
        await connection.execute(
          'UPDATE material_request SET source_warehouse = ? WHERE mr_id = ?',
          [sourceWarehouse, mrId]
        )
        request.source_warehouse = sourceWarehouse
      }

      // Update status
      const finalStatus = isStockTransaction ? 'completed' : 'approved'
      await connection.execute(
        'UPDATE material_request SET status = ?, updated_at = NOW() WHERE mr_id = ?',
        [finalStatus, mrId]
      )

      console.log(`[MR Approval] Updating production plan material status for MR ${mrId}`)

      // Update Production Plan Material Status
      // Prefer formal production_plan_id, fall back to series_no parsing
      const plan_id = request.production_plan_id || (request.series_no && request.series_no.startsWith('PLAN-') ? request.series_no.replace('PLAN-', '') : null)
      
      if (plan_id) {
        console.log(`[MR Approval] Found plan_id: ${plan_id}`)

        try {
          const pprmStatus = isStockTransaction ? 'issued' : 'approved'
          await connection.execute(
            `UPDATE production_plan_raw_material 
             SET material_status = ? 
             WHERE plan_id = ? AND mr_id = ?`,
            [pprmStatus, plan_id, mrId]
          )
          console.log(`[MR Approval] Production plan material status updated to '${pprmStatus}'`)
        } catch (error) {
          console.error(`[MR Approval] Error updating production plan material status:`, error.message)
        }
      }

      // Execute Stock Movements
      if (isStockTransaction) {
        // Check for period closing lock - use transition date or request date
        const lockDate = request.transition_date || request.request_date || new Date()
        await PeriodClosingModel.checkLock(connection, lockDate)

        console.log(`[MR Approval] Processing stock movements for MR ${mrId}, purpose: ${request.purpose}`)
        const targetWarehouseId = request.target_warehouse ? await this.getWarehouseId(connection, request.target_warehouse) : null
        
        console.log(`[MR Approval] Source Warehouse ID: ${sourceWarehouseId}, Target: ${targetWarehouseId}`)
        
        for (const item of items) {
          const qty = Number(item.qty)

          // Get current stock
          const sourceBalance = await StockBalanceModel.getByItemAndWarehouse(item.item_code, sourceWarehouseId, connection)
          const currentValuation = sourceBalance ? Number(sourceBalance.valuation_rate) : 0
          const currentQty = sourceBalance ? Number(sourceBalance.current_qty) : 0
          
          console.log(`[MR Approval] Item ${item.item_code}: Requested ${qty}, Current Stock ${currentQty}`)
          
          // Deduct from Source
          console.log(`[MR Approval] Updating stock balance for ${item.item_code}`)
          await StockBalanceModel.upsert(item.item_code, sourceWarehouseId, {
            current_qty: currentQty - qty,
            reserved_qty: sourceBalance ? Number(sourceBalance.reserved_qty) : 0,
            valuation_rate: currentValuation,
            last_issue_date: new Date()
          }, connection)

          // Add Ledger Entry (OUT)
          console.log(`[MR Approval] Creating ledger entry for ${item.item_code}`)
          const ledgerData = {
            item_code: item.item_code,
            warehouse_id: sourceWarehouseId,
            transaction_date: new Date(),
            transaction_type: request.purpose === 'material_transfer' ? 'Transfer' : 'Issue',
            qty_in: 0,
            qty_out: qty,
            valuation_rate: currentValuation,
            reference_doctype: 'Material Request',
            reference_name: mrId,
            remarks: `Approved Material Request ${mrId}`,
            created_by: approvedBy
          }
          console.log(`[MR Approval] Ledger data:`, ledgerData)
          await StockLedgerModel.create(ledgerData, connection)
          console.log(`[MR Approval] Ledger entry created successfully`)

          // If Transfer, Add to Target
          if (request.purpose === 'material_transfer' && targetWarehouseId) {
            // Add to Target using is_increment to trigger moving average valuation if needed
            await StockBalanceModel.upsert(item.item_code, targetWarehouseId, {
              current_qty: qty,
              is_increment: true,
              incoming_rate: currentValuation, // Transfer at source valuation
              last_receipt_date: new Date()
            }, connection)

            // Add Ledger Entry (IN)
            await StockLedgerModel.create({
              item_code: item.item_code,
              warehouse_id: targetWarehouseId,
              transaction_date: new Date(),
              transaction_type: 'Transfer',
              qty_in: qty,
              qty_out: 0,
              valuation_rate: currentValuation,
              reference_doctype: 'Material Request',
              reference_name: mrId,
              remarks: `Incoming Transfer from MR ${mrId}`,
              created_by: approvedBy
            }, connection)
          }
        }
        console.log(`[MR Approval] Stock movements completed for MR ${mrId}`)
      } else {
        console.log(`[MR Approval] Not a stock transaction (purpose: ${request.purpose}), skipping stock movements`)
      }

      await connection.commit()
      const approvedMR = await this.getById(db, mrId)

      try {
        await this.createNotifications(connection, approvedMR, 'MATERIAL_REQUEST_APPROVED', request.department)
      } catch (notifError) {
        console.log('Notification creation failed (non-critical):', notifError.message)
      }

      return approvedMR
    } catch (error) {
      await connection.rollback()
      throw new Error('Failed to approve material request: ' + error.message)
    } finally {
      connection.release()
    }
  }

  /**
   * Reject material request
   */
  static async reject(db, mrId, rejectionReason) {
    try {
      const [mr] = await db.execute('SELECT status FROM material_request WHERE mr_id = ?', [mrId])
      if (!mr.length) throw new Error('Material request not found')
      if (mr[0].status !== 'draft' && mr[0].status !== 'approved') {
        throw new Error('Cannot reject MR with status: ' + mr[0].status)
      }

      await db.execute(
        'UPDATE material_request SET status = ?, updated_at = NOW() WHERE mr_id = ?',
        ['cancelled', mrId]
      )

      const rejectedMR = await this.getById(db, mrId)

      try {
        await this.createNotifications(db, rejectedMR, 'MATERIAL_REQUEST_REJECTED', mr[0].department)
      } catch (notifError) {
        console.log('Notification creation failed (non-critical):', notifError.message)
      }

      return rejectedMR
    } catch (error) {
      throw new Error('Failed to reject material request: ' + error.message)
    }
  }

  /**
   * Submit material request (set status to pending)
   */
  static async submit(db, mrId) {
    try {
      const [mrRows] = await db.execute('SELECT status FROM material_request WHERE mr_id = ?', [mrId])
      if (!mrRows.length) throw new Error('Material request not found')
      
      if (mrRows[0].status !== 'draft') {
        throw new Error('Only draft material requests can be submitted')
      }

      await db.execute(
        'UPDATE material_request SET status = ?, updated_at = NOW() WHERE mr_id = ?',
        ['pending', mrId]
      )
      return await this.getById(db, mrId)
    } catch (error) {
      throw new Error('Failed to submit material request: ' + error.message)
    }
  }

  /**
   * Convert MR to PO
   */
  static async convertToPO(db, mrId) {
    const connection = await db.getConnection()
    try {
      await connection.beginTransaction()

      // Get MR details
      const [mrRows] = await connection.query('SELECT * FROM material_request WHERE mr_id = ?', [mrId])
      if (!mrRows.length) throw new Error('Material request not found')
      const mr = mrRows[0]

      if (mr.status !== 'approved' && mr.status !== 'pending') {
        throw new Error('Only approved or pending MRs can be converted to PO')
      }

      // Get items
      const [items] = await connection.query(
        'SELECT mri.*, i.name as item_name FROM material_request_item mri LEFT JOIN item i ON mri.item_code = i.item_code WHERE mri.mr_id = ?',
        [mrId]
      )

      if (items.length === 0) throw new Error('No items found in Material Request')

      const po_no = `PO-${Date.now()}`
      const order_date = new Date().toISOString().split('T')[0]

      // Create PO header
      // We don't have a supplier yet, so it will be null or needs to be provided
      // Usually MR conversion to PO might need a supplier choice, but for now we create a draft PO
      await connection.query(
        `INSERT INTO purchase_order 
         (po_no, supplier_id, order_date, expected_date, currency, total_value, status, remarks)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [po_no, null, order_date, mr.required_by_date, 'INR', 0, 'draft', `Generated from Material Request: ${mrId}`]
      )

      // Create PO items
      for (const item of items) {
        const po_item_id = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
        
        // Try to insert with po_item_id, fallback if column doesn't exist
        try {
          await connection.query(
            `INSERT INTO purchase_order_item 
             (po_item_id, po_no, item_code, qty, uom, rate, schedule_date)
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [po_item_id, po_no, item.item_code, item.qty, item.uom, 0, mr.required_by_date]
          )
        } catch (itemError) {
          if (itemError.message.includes('po_item_id')) {
            await connection.query(
              `INSERT INTO purchase_order_item 
               (po_no, item_code, qty, uom, rate, schedule_date)
               VALUES (?, ?, ?, ?, ?, ?)`,
              [po_no, item.item_code, item.qty, item.uom, 0, mr.required_by_date]
            )
          } else {
            throw itemError
          }
        }
      }

      // Update MR status and purpose
      // If it was a stock transaction, it's now a purchase transaction since we're creating a PO
      await connection.query(
        'UPDATE material_request SET status = ?, purpose = "purchase", updated_at = NOW() WHERE mr_id = ?',
        ['converted', mrId]
      )

      await connection.commit()
      
      // Return the newly created PO info along with MR
      return {
        mr_id: mrId,
        po_no: po_no,
        status: 'converted'
      }
    } catch (error) {
      await connection.rollback()
      throw new Error('Failed to convert material request: ' + error.message)
    } finally {
      connection.release()
    }
  }

  /**
   * Update source warehouse for material request
   */
  static async updateSourceWarehouse(db, mrId, sourceWarehouse) {
    try {
      const [mr] = await db.execute('SELECT status FROM material_request WHERE mr_id = ?', [mrId])
      if (!mr.length) throw new Error('Material request not found')
      if (mr[0].status !== 'draft') throw new Error('Can only update draft material requests')

      await db.execute(
        'UPDATE material_request SET source_warehouse = ?, updated_at = NOW() WHERE mr_id = ?',
        [sourceWarehouse, mrId]
      )

      return true
    } catch (error) {
      throw new Error('Failed to update source warehouse: ' + error.message)
    }
  }

  /**
   * Delete material request
   */
  static async delete(db, mrId) {
    try {
      const [mr] = await db.execute('SELECT status FROM material_request WHERE mr_id = ?', [mrId])
      if (!mr.length) throw new Error('Material request not found')
      if (mr[0].status !== 'draft') throw new Error('Can only delete draft material requests')

      // Delete items first
      await db.execute('DELETE FROM material_request_item WHERE mr_id = ?', [mrId])

      // Delete MR
      await db.execute('DELETE FROM material_request WHERE mr_id = ?', [mrId])

      return true
    } catch (error) {
      throw new Error('Failed to delete material request: ' + error.message)
    }
  }

  /**
   * Get material requests by department
   */
  static async getByDepartment(db, department) {
    try {
      const [rows] = await db.execute(
        'SELECT * FROM material_request WHERE department = ? ORDER BY created_at DESC',
        [department]
      )
      return rows
    } catch (error) {
      throw new Error('Failed to fetch MRs by department: ' + error.message)
    }
  }

  /**
   * Get pending material requests (for approval)
   */
  static async getPending(db) {
    try {
      const [rows] = await db.execute(
        `SELECT mr.*, 
                COALESCE(c.name, u.full_name, mr.requested_by_id) as requested_by_name, 
                COALESCE(mri_agg.item_count, 0) as item_count 
         FROM material_request mr 
         LEFT JOIN contact c ON mr.requested_by_id = c.contact_id 
         LEFT JOIN users u ON mr.requested_by_id = CAST(u.user_id AS CHAR) COLLATE utf8mb4_0900_ai_ci OR mr.requested_by_id = u.full_name
         LEFT JOIN (
            SELECT mr_id, COUNT(mr_item_id) as item_count
            FROM material_request_item
            GROUP BY mr_id
         ) mri_agg ON mr.mr_id = mri_agg.mr_id 
         WHERE mr.status = "draft" 
         ORDER BY mr.created_at DESC`
      )
      return rows
    } catch (error) {
      throw new Error('Failed to fetch pending MRs: ' + error.message)
    }
  }

  /**
   * Get approved material requests (for RFQ creation)
   */
  static async getApproved(db) {
    try {
      const [rows] = await db.execute(
        `SELECT mr.*, 
                COALESCE(c.name, u.full_name, mr.requested_by_id) as requested_by_name 
         FROM material_request mr 
         LEFT JOIN contact c ON mr.requested_by_id = c.contact_id 
         LEFT JOIN users u ON mr.requested_by_id = CAST(u.user_id AS CHAR) COLLATE utf8mb4_0900_ai_ci OR mr.requested_by_id = u.full_name
         WHERE mr.status = "approved" 
         ORDER BY mr.required_by_date ASC`
      )
      return rows
    } catch (error) {
      throw new Error('Failed to fetch approved MRs: ' + error.message)
    }
  }

  /**
   * Get unique departments
   */
  static async getDepartments(db) {
    try {
      const [rows] = await db.execute(
        'SELECT DISTINCT department FROM material_request WHERE department IS NOT NULL ORDER BY department'
      )
      return rows.map(r => r.department)
    } catch (error) {
      throw new Error('Failed to fetch departments: ' + error.message)
    }
  }

  static async createGRNFromRequest(db, mrId) {
    const connection = await db.getConnection()
    try {
      await connection.beginTransaction()

      const [mrRows] = await connection.query('SELECT * FROM material_request WHERE mr_id = ?', [mrId])
      if (!mrRows.length) throw new Error('Material request not found')
      const mr = mrRows[0]

      const [itemRows] = await connection.query('SELECT * FROM material_request_item WHERE mr_id = ?', [mrId])

      const grnNo = `GRN-${Date.now()}`

      const [result] = await connection.query(
        `INSERT INTO grn_requests (grn_no, po_no, supplier_id, supplier_name, receipt_date, status, total_items, material_request_id)
         VALUES (?, ?, ?, ?, ?, 'pending', ?, ?)`,
        [grnNo, '', '', mr.requested_by_name || 'Internal', new Date(), itemRows.length, mrId]
      )

      const grnRequestId = result.insertId

      for (const item of itemRows) {
        await connection.query(
          `INSERT INTO grn_request_items (grn_request_id, item_code, item_name, po_qty, received_qty, batch_no, warehouse_name)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [grnRequestId, item.item_code, item.item_name, item.qty, 0, '', mr.source_warehouse || '']
        )
      }

      await connection.commit()
      return { grn_no: grnNo, id: grnRequestId }
    } catch (error) {
      await connection.rollback()
      throw new Error('Failed to create GRN from request: ' + error.message)
    } finally {
      connection.release()
    }
  }

  static async createNotifications(db, materialRequest, notificationType, department) {
    try {
      const NotificationModel = (await import('./NotificationModel.js')).default

      let title, message

      if (notificationType === 'MATERIAL_REQUEST_NEW') {
        title = `New Material Request: ${materialRequest.mr_id}`
        message = `Material request from ${department} department for ${materialRequest.items?.length || 0} items`
      } else if (notificationType === 'MATERIAL_REQUEST_APPROVED') {
        title = `Material Request Approved: ${materialRequest.mr_id}`
        message = `Material request from ${department} department has been approved`
      } else if (notificationType === 'MATERIAL_REQUEST_REJECTED') {
        title = `Material Request Rejected: ${materialRequest.mr_id}`
        message = `Material request from ${department} department has been rejected`
      } else if (notificationType === 'MATERIAL_ARRIVED') {
        title = `Material Arrived: ${materialRequest.mr_id}`
        message = `Materials for your request ${materialRequest.mr_id} have arrived and been approved by inventory`
      }

      let targetUsers = []

      if (notificationType === 'MATERIAL_REQUEST_NEW') {
        const [users] = await db.execute(
          `SELECT DISTINCT user_id FROM users WHERE department = 'Purchase' AND is_active = 1`
        )
        targetUsers = users.map(u => u.user_id)
      } else if (notificationType === 'MATERIAL_REQUEST_APPROVED') {
        const [users] = await db.execute(
          `SELECT DISTINCT user_id FROM users WHERE department = ? AND is_active = 1`,
          [department]
        )
        targetUsers = users.map(u => u.user_id)
      } else if (notificationType === 'MATERIAL_REQUEST_REJECTED') {
        const [users] = await db.execute(
          `SELECT DISTINCT user_id FROM users WHERE department = ? AND is_active = 1`,
          [department]
        )
        targetUsers = users.map(u => u.user_id)
      } else if (notificationType === 'MATERIAL_ARRIVED') {
        // Notify the creator specifically if we have their user_id
        if (materialRequest.created_by && !isNaN(materialRequest.created_by)) {
          targetUsers = [parseInt(materialRequest.created_by)]
        } else {
          // Fallback to notifying the whole department if no specific creator is identified
          const [users] = await db.execute(
            `SELECT DISTINCT user_id FROM users WHERE department = ? AND is_active = 1`,
            [department]
          )
          targetUsers = users.map(u => u.user_id)
        }
      }

      if (targetUsers.length > 0) {
        await NotificationModel.notifyUsers(targetUsers, {
          notification_type: notificationType,
          title,
          message,
          reference_type: 'MaterialRequest',
          reference_id: materialRequest.id
        })
      }
    } catch (error) {
      throw new Error(`Failed to create notifications: ${error.message}`)
    }
  }
}
