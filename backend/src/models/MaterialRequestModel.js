import StockBalanceModel from './StockBalanceModel.js'
import StockLedgerModel from './StockLedgerModel.js'
import { PeriodClosingModel } from './PeriodClosingModel.js'
import StockMovementModel from './StockMovementModel.js'

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
    
    if (rows.length) return rows[0].id
    
    // If we can't find it and it's not a numeric ID, throw a clear error
    if (!Number.isInteger(Number(warehouseIdentifier))) {
      throw new Error(`Warehouse '${warehouseIdentifier}' not found. Please ensure the warehouse name or code is correct.`)
    }
    
    return Number(warehouseIdentifier)
  }

  /**
   * Get all material requests
   */
  static async getAll(db, filters = {}) {
    try {
      let query = `
        SELECT mr.*, 
               COALESCE(
                 NULLIF(CONCAT_WS(' ', em.first_name, em.last_name), ' '), 
                 NULLIF(em.first_name, ''),
                 NULLIF(c.name, ''), 
                 NULLIF(u.full_name, ''), 
                 mr.requested_by_id
               ) as requested_by_name, 
               (SELECT GROUP_CONCAT(po_no) FROM purchase_order WHERE mr_id = mr.mr_id AND status != 'cancelled') as linked_po_no,
               (SELECT GROUP_CONCAT(status) FROM purchase_order WHERE mr_id = mr.mr_id AND status != 'cancelled') as po_status,
               sso.project_name,
               COALESCE(
                 i_resolved.name,
                 pp_fg.item_name, 
                 pp_sa.item_name, 
                 jc_wo.item_name, 
                 i_bom.name, 
                 mr.items_notes
               ) as finished_goods_name,
               sw.warehouse_name as source_warehouse_name,
               tw.warehouse_name as target_warehouse_name
        FROM material_request mr 
        LEFT JOIN warehouses sw ON mr.source_warehouse = CAST(sw.id AS CHAR) COLLATE utf8mb4_unicode_ci OR mr.source_warehouse = sw.warehouse_code COLLATE utf8mb4_unicode_ci OR mr.source_warehouse = sw.warehouse_name COLLATE utf8mb4_unicode_ci
        LEFT JOIN warehouses tw ON mr.target_warehouse = CAST(tw.id AS CHAR) COLLATE utf8mb4_unicode_ci OR mr.target_warehouse = tw.warehouse_code COLLATE utf8mb4_unicode_ci OR mr.target_warehouse = tw.warehouse_name COLLATE utf8mb4_unicode_ci
        LEFT JOIN employee_master em ON mr.requested_by_id = em.employee_id
        LEFT JOIN contact c ON mr.requested_by_id = c.contact_id 
        LEFT JOIN users u ON mr.requested_by_id = CAST(u.user_id AS CHAR) COLLATE utf8mb4_unicode_ci OR mr.requested_by_id = u.full_name
        LEFT JOIN production_plan pp ON mr.production_plan_id = pp.plan_id
        LEFT JOIN selling_sales_order sso ON pp.sales_order_id = sso.sales_order_id
        LEFT JOIN bom b ON pp.bom_id = b.bom_id
        LEFT JOIN item i_bom ON b.item_code = i_bom.item_code
        LEFT JOIN (
          SELECT plan_id, ANY_VALUE(item_code) as item_code, ANY_VALUE(item_name) as item_name FROM production_plan_fg GROUP BY plan_id
        ) pp_fg ON mr.production_plan_id = pp_fg.plan_id
        LEFT JOIN (
          SELECT plan_id, ANY_VALUE(item_code) as item_code, ANY_VALUE(item_name) as item_name FROM production_plan_sub_assembly GROUP BY plan_id
        ) pp_sa ON mr.production_plan_id = pp_sa.plan_id
        LEFT JOIN (
          SELECT jc.mr_id, ANY_VALUE(wo.item_code) as item_code, ANY_VALUE(i.name) as item_name 
          FROM job_card jc 
          JOIN work_order wo ON jc.work_order_id = wo.wo_id
          JOIN item i ON wo.item_code = i.item_code
          WHERE jc.mr_id IS NOT NULL
          GROUP BY jc.mr_id
        ) jc_wo ON mr.mr_id = jc_wo.mr_id
        LEFT JOIN item i_resolved ON i_resolved.item_code = COALESCE(
          pp_fg.item_code,
          pp_sa.item_code,
          jc_wo.item_code,
          b.item_code,
          TRIM(REGEXP_REPLACE(REGEXP_SUBSTR(mr.items_notes, 'Item: [^\\n\\r]+'), 'Item: ', ''))
        )
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
        query += ' AND (mr.mr_id LIKE ? OR c.name LIKE ? OR sso.project_name LIKE ?)'
        const term = `%${filters.search}%`
        params.push(term, term, term)
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
                COALESCE(
                  NULLIF(CONCAT_WS(' ', em.first_name, em.last_name), ' '), 
                  NULLIF(em.first_name, ''),
                  NULLIF(c.name, ''), 
                  NULLIF(u.full_name, ''), 
                  mr.requested_by_id
                ) as requested_by_name, 
                (SELECT GROUP_CONCAT(po_no) FROM purchase_order WHERE mr_id = mr.mr_id AND status != 'cancelled') as linked_po_no,
                (SELECT GROUP_CONCAT(status) FROM purchase_order WHERE mr_id = mr.mr_id AND status != 'cancelled') as po_status,
                sso.project_name,
                COALESCE(
                  i_resolved.name,
                  pp_fg.item_name, 
                  pp_sa.item_name, 
                  jc_wo.item_name, 
                  i_bom.name, 
                  mr.items_notes
                ) as finished_goods_name,
                sw.warehouse_name as source_warehouse_name,
                tw.warehouse_name as target_warehouse_name
         FROM material_request mr 
         LEFT JOIN warehouses sw ON mr.source_warehouse = CAST(sw.id AS CHAR) COLLATE utf8mb4_unicode_ci OR mr.source_warehouse = sw.warehouse_code COLLATE utf8mb4_unicode_ci OR mr.source_warehouse = sw.warehouse_name COLLATE utf8mb4_unicode_ci
         LEFT JOIN warehouses tw ON mr.target_warehouse = CAST(tw.id AS CHAR) COLLATE utf8mb4_unicode_ci OR mr.target_warehouse = tw.warehouse_code COLLATE utf8mb4_unicode_ci OR mr.target_warehouse = tw.warehouse_name COLLATE utf8mb4_unicode_ci
         LEFT JOIN employee_master em ON mr.requested_by_id = em.employee_id
         LEFT JOIN contact c ON mr.requested_by_id = c.contact_id 
         LEFT JOIN users u ON mr.requested_by_id = CAST(u.user_id AS CHAR) COLLATE utf8mb4_unicode_ci OR mr.requested_by_id = u.full_name
         LEFT JOIN production_plan pp ON mr.production_plan_id = pp.plan_id
         LEFT JOIN selling_sales_order sso ON pp.sales_order_id = sso.sales_order_id
         LEFT JOIN bom b ON pp.bom_id = b.bom_id
         LEFT JOIN item i_bom ON b.item_code = i_bom.item_code
         LEFT JOIN (
           SELECT plan_id, ANY_VALUE(item_code) as item_code, ANY_VALUE(item_name) as item_name FROM production_plan_fg GROUP BY plan_id
         ) pp_fg ON mr.production_plan_id = pp_fg.plan_id
         LEFT JOIN (
           SELECT plan_id, ANY_VALUE(item_code) as item_code, ANY_VALUE(item_name) as item_name FROM production_plan_sub_assembly GROUP BY plan_id
         ) pp_sa ON mr.production_plan_id = pp_sa.plan_id
         LEFT JOIN (
           SELECT jc.mr_id, ANY_VALUE(wo.item_code) as item_code, ANY_VALUE(i.name) as item_name 
           FROM job_card jc 
           JOIN work_order wo ON jc.work_order_id = wo.wo_id
           JOIN item i ON wo.item_code = i.item_code
           WHERE jc.mr_id IS NOT NULL
           GROUP BY jc.mr_id
         ) jc_wo ON mr.mr_id = jc_wo.mr_id
         LEFT JOIN item i_resolved ON i_resolved.item_code = COALESCE(
           pp_fg.item_code,
           pp_sa.item_code,
           jc_wo.item_code,
           b.item_code,
           TRIM(REGEXP_REPLACE(REGEXP_SUBSTR(mr.items_notes, 'Item: [^\\n\\r]+'), 'Item: ', ''))
         )
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
            'INSERT INTO material_request_item (mr_item_id, mr_id, item_code, qty, requested_qty, uom, purpose) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [mr_item_id, mr_id, item.item_code || null, item.qty || 0, item.requested_qty || null, item.uom || '', item.purpose || null]
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
            'INSERT INTO material_request_item (mr_item_id, mr_id, item_code, qty, requested_qty, uom, purpose) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [mr_item_id, mrId, item.item_code, item.qty, item.requested_qty || null, item.uom, item.purpose]
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
  static async approve(db, mrId, approvedBy, sourceWarehouse = null, itemsToProcess = null) {
    const connection = await db.getConnection()
    try {
      await connection.beginTransaction()

      // Get MR details
      const [mrRows] = await connection.execute('SELECT * FROM material_request WHERE mr_id = ?', [mrId])
      if (!mrRows.length) throw new Error('Material request not found')
      const request = mrRows[0]

      if (request.status !== 'draft' && request.status !== 'pending' && request.status !== 'approved' && request.status !== 'partial' && request.status !== 'completed') {
        throw new Error(`Only draft, pending, approved, partial or completed material requests can be processed. Current status: ${request.status}`)
      }

      // Get items
      let [items] = await connection.execute('SELECT * FROM material_request_item WHERE mr_id = ?', [mrId])
      
      // If itemsToProcess is provided, filter the items to be processed
      let itemWarehouseMap = {}
      if (itemsToProcess) {
        if (Array.isArray(itemsToProcess)) {
          if (typeof itemsToProcess[0] === 'object' && itemsToProcess[0] !== null) {
            // Array of objects [{ item_code, warehouse_id, qty }]
            itemsToProcess.forEach(itp => {
              itemWarehouseMap[itp.item_code] = {
                warehouse_id: itp.warehouse_id,
                qty: itp.qty
              }
            })
            items = items.filter(item => itemWarehouseMap[item.item_code])
          } else {
            // Array of strings [item_code1, item_code2]
            items = items.filter(item => itemsToProcess.includes(item.item_code))
          }
        } else if (typeof itemsToProcess === 'object') {
          // Object { [item_code]: warehouse_id }
          itemWarehouseMap = itemsToProcess
          items = items.filter(item => {
            const entry = itemWarehouseMap[item.item_code]
            return entry !== undefined
          })
        }
      }

      if (items.length === 0 && itemsToProcess) {
        throw new Error('No valid items selected for processing')
      }

      // Check stock for Issue/Transfer/Purchase (Direct stock release)
      const isStockTransaction = ['material_transfer', 'material_issue', 'purchase'].includes(request.purpose?.toLowerCase())
      
      // Use provided source warehouse or fall back to existing one
      const finalSourceWarehouse = sourceWarehouse || request.source_warehouse

      if (isStockTransaction && !finalSourceWarehouse && Object.keys(itemWarehouseMap).length === 0) {
        throw new Error('Source warehouse is required for Material Transfer/Issue')
      }
      
      // STOCK CHECK for Issue/Transfer
      if (isStockTransaction) {
        for (const item of items) {
          const requestedQtyLimit = item.requested_qty ? Number(item.requested_qty) : Number(item.qty)
          const pendingQty = requestedQtyLimit - Number(item.issued_qty || 0)
          if (pendingQty <= 0) continue // Already issued up to request level

          // Use per-item warehouse if available, otherwise use common source warehouse
          const entry = itemWarehouseMap[item.item_code]
          const itemWarehouse = entry?.warehouse_id || entry || finalSourceWarehouse
          const specifiedQty = entry?.qty !== undefined ? Number(entry.qty) : null

          if (!itemWarehouse) {
            throw new Error(`Warehouse is missing for item ${item.item_code}`)
          }
          const itemWarehouseId = await this.getWarehouseId(connection, itemWarehouse)

          const balance = await StockBalanceModel.getByItemAndWarehouse(item.item_code, itemWarehouseId, connection)
          const availableQty = balance ? Number(balance.available_qty || balance.current_qty || 0) : 0
          
          if (availableQty <= 0) {
            // If no stock at all for an item that was explicitly requested to be processed
            if (itemsToProcess) {
              throw new Error(`No stock available for item ${item.item_code} in warehouse ${itemWarehouse}.`)
            }
            continue // Skip if part of a bulk approval and not available
          }

          // Check if specified quantity is available
          if (specifiedQty !== null && specifiedQty > availableQty) {
            throw new Error(`Insufficient stock for item ${item.item_code} in warehouse ${itemWarehouse}. Requested: ${specifiedQty}, Available: ${availableQty}`)
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

      // Process Stock Movements
      if (isStockTransaction) {
        // Check for period closing lock - use transition date or request date
        const lockDate = request.transition_date || request.request_date || new Date()
        await PeriodClosingModel.checkLock(connection, lockDate)

        const targetWarehouseId = request.target_warehouse ? await this.getWarehouseId(connection, request.target_warehouse) : null
        
        for (const item of items) {
          const requestedQtyLimit = item.requested_qty ? Number(item.requested_qty) : Number(item.qty)
          const pendingQty = requestedQtyLimit - Number(item.issued_qty || 0)
          if (pendingQty <= 0) continue

          // Use per-item warehouse if available, otherwise use common source warehouse
          const entry = itemWarehouseMap[item.item_code]
          const itemWarehouse = entry?.warehouse_id || entry || finalSourceWarehouse
          const specifiedQty = entry?.qty !== undefined ? Number(entry.qty) : null
          
          const itemWarehouseId = await this.getWarehouseId(connection, itemWarehouse)

          const sourceBalance = await StockBalanceModel.getByItemAndWarehouse(item.item_code, itemWarehouseId, connection)
          const availableQty = sourceBalance ? Number(sourceBalance.available_qty || sourceBalance.current_qty || 0) : 0
          
          if (availableQty <= 0) continue

          // Calculate quantity to issue:
          // Use specifiedQty if provided, otherwise issue up to pendingQty but not more than available
          let qtyToIssue = Math.min(pendingQty, availableQty)
          if (specifiedQty !== null) {
            qtyToIssue = Math.min(specifiedQty, availableQty)
          }

          if (qtyToIssue <= 0) continue

          // Get item's valuation method
          const [itemRows] = await connection.query('SELECT valuation_method FROM item WHERE item_code = ?', [item.item_code])
          const method = itemRows.length > 0 ? itemRows[0].valuation_method : 'FIFO'

          // Calculate correct valuation rate for this specific issue
          const issueRate = await StockLedgerModel.getValuationRate(
            item.item_code, 
            itemWarehouseId, 
            qtyToIssue, 
            method, 
            connection
          )
          
          // Deduct from Source
          await StockBalanceModel.upsert(item.item_code, itemWarehouseId, {
            current_qty: -qtyToIssue,
            is_increment: true,
            last_issue_date: new Date()
          }, connection)

          // Add Ledger Entry (OUT)
          await StockLedgerModel.create({
            item_code: item.item_code,
            warehouse_id: itemWarehouseId,
            transaction_date: new Date(),
            transaction_type: request.purpose?.toLowerCase() === 'material_transfer' ? 'Transfer' : 'Issue',
            qty_in: 0,
            qty_out: qtyToIssue,
            valuation_rate: issueRate,
            reference_doctype: 'Material Request',
            reference_name: mrId,
            remarks: `Partial Release Material Request ${mrId}`,
            created_by: approvedBy
          }, connection)

          // Create Stock Movement entry for visibility in Inventory Dashboard
          try {
            const movement_type = request.purpose?.toLowerCase() === 'material_transfer' ? 'TRANSFER' : 'OUT'
            const transaction_no = await StockMovementModel.generateTransactionNo(connection)
            
            await connection.execute(
              `INSERT INTO stock_movements (
                transaction_no, item_code, warehouse_id, source_warehouse_id, target_warehouse_id, 
                movement_type, quantity, reference_type, reference_name, notes, status, created_by, approved_by, approved_at
              ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
              [
                transaction_no, 
                item.item_code, 
                movement_type === 'OUT' ? itemWarehouseId : null,
                movement_type === 'TRANSFER' ? itemWarehouseId : null,
                movement_type === 'TRANSFER' ? targetWarehouseId : null,
                movement_type,
                qtyToIssue,
                'Material Request',
                mrId,
                `Material Release for ${mrId}`,
                'Approved',
                approvedBy,
                approvedBy
              ]
            )
          } catch (smError) {
            console.error('Failed to create stock movement entry:', smError)
            // Continue processing as this is for visibility and shouldn't block the actual stock update
          }

          // Update issued_qty and status in material_request_item
          const newIssuedQty = Number(item.issued_qty || 0) + qtyToIssue
          const itemStatus = newIssuedQty >= Number(item.qty) ? 'completed' : 'partial'
          
          await connection.execute(
            'UPDATE material_request_item SET issued_qty = ?, status = ? WHERE mr_item_id = ?',
            [newIssuedQty, itemStatus, item.mr_item_id]
          )

          // If Transfer, Add to Target
          if (request.purpose?.toLowerCase() === 'material_transfer' && targetWarehouseId) {
            await StockBalanceModel.upsert(item.item_code, targetWarehouseId, {
              current_qty: qtyToIssue,
              is_increment: true,
              incoming_rate: issueRate,
              last_receipt_date: new Date()
            }, connection)

            await StockLedgerModel.create({
              item_code: item.item_code,
              warehouse_id: targetWarehouseId,
              transaction_date: new Date(),
              transaction_type: 'Transfer',
              qty_in: qtyToIssue,
              qty_out: 0,
              valuation_rate: issueRate,
              reference_doctype: 'Material Request',
              reference_name: mrId,
              remarks: `Incoming Transfer from MR ${mrId}`,
              created_by: approvedBy
            }, connection)
          }
        }
      }

      // Re-fetch items to check overall MR status
      const [updatedItems] = await connection.execute('SELECT * FROM material_request_item WHERE mr_id = ?', [mrId])
      const allCompleted = updatedItems.every(item => item.status === 'completed')
      const anyIssued = updatedItems.some(item => Number(item.issued_qty) > 0)

      // Determine overall status
      let finalStatus = request.status
      if (allCompleted) {
        finalStatus = 'completed'
      } else if (anyIssued) {
        finalStatus = 'partial'
      } else if (isStockTransaction) {
        finalStatus = 'approved'
      } else {
        finalStatus = 'approved'
      }

      await connection.execute(
        'UPDATE material_request SET status = ?, updated_at = NOW() WHERE mr_id = ?',
        [finalStatus, mrId]
      )

      // Update Production Plan Material Status
      const plan_id = request.production_plan_id || (request.series_no && request.series_no.startsWith('PLAN-') ? request.series_no.replace('PLAN-', '') : null)
      if (plan_id) {
        let pprmStatus = 'pending'
        if (allCompleted) {
          pprmStatus = isStockTransaction ? 'issued' : 'approved'
        } else if (anyIssued || finalStatus === 'partial') {
          pprmStatus = isStockTransaction ? 'partially_issued' : 'approved'
        } else if (finalStatus === 'approved') {
          pprmStatus = 'approved'
        }

        if (pprmStatus !== 'pending') {
          await connection.execute(
            'UPDATE production_plan_raw_material SET material_status = ? WHERE plan_id = ? AND mr_id = ?',
            [pprmStatus, plan_id, mrId]
          )
        }
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
      // We keep it as "approved" so it can be used for material release after PO receipt
      await connection.query(
        'UPDATE material_request SET status = ?, purpose = "purchase", updated_at = NOW() WHERE mr_id = ?',
        ['approved', mrId]
      )

      await connection.commit()
      
      // Return the newly created PO info along with MR
      return {
        mr_id: mrId,
        po_no: po_no,
        status: 'approved'
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
      if (!['draft', 'pending', 'rejected', 'cancelled'].includes(mr[0].status)) {
        throw new Error('Can only delete draft, pending, rejected or cancelled material requests')
      }

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
        `SELECT mr.*, sso.project_name
         FROM material_request mr 
         LEFT JOIN production_plan pp ON mr.production_plan_id = pp.plan_id
         LEFT JOIN selling_sales_order sso ON pp.sales_order_id = sso.sales_order_id
         WHERE mr.department = ? ORDER BY mr.created_at DESC`,
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
                COALESCE(mri_agg.item_count, 0) as item_count,
                sso.project_name,
                COALESCE(pp_fg.item_name, jc_wo.item_name) as finished_goods_name
         FROM material_request mr 
         LEFT JOIN contact c ON mr.requested_by_id = c.contact_id 
         LEFT JOIN users u ON mr.requested_by_id = CAST(u.user_id AS CHAR) COLLATE utf8mb4_unicode_ci OR mr.requested_by_id = u.full_name
         LEFT JOIN production_plan pp ON mr.production_plan_id = pp.plan_id
         LEFT JOIN selling_sales_order sso ON pp.sales_order_id = sso.sales_order_id
         LEFT JOIN (
           SELECT plan_id, ANY_VALUE(item_name) as item_name FROM production_plan_fg GROUP BY plan_id
         ) pp_fg ON mr.production_plan_id = pp_fg.plan_id
         LEFT JOIN (
           SELECT jc.mr_id, ANY_VALUE(i.name) as item_name 
           FROM job_card jc 
           JOIN work_order wo ON jc.work_order_id = wo.wo_id
           JOIN item i ON wo.item_code = i.item_code
           WHERE jc.mr_id IS NOT NULL
           GROUP BY jc.mr_id
         ) jc_wo ON mr.mr_id = jc_wo.mr_id
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
                COALESCE(c.name, u.full_name, mr.requested_by_id) as requested_by_name,
                sso.project_name,
                COALESCE(pp_fg.item_name, jc_wo.item_name) as finished_goods_name
         FROM material_request mr 
         LEFT JOIN contact c ON mr.requested_by_id = c.contact_id 
         LEFT JOIN users u ON mr.requested_by_id = CAST(u.user_id AS CHAR) COLLATE utf8mb4_unicode_ci OR mr.requested_by_id = u.full_name
         LEFT JOIN production_plan pp ON mr.production_plan_id = pp.plan_id
         LEFT JOIN selling_sales_order sso ON pp.sales_order_id = sso.sales_order_id
         LEFT JOIN (
           SELECT plan_id, ANY_VALUE(item_name) as item_name FROM production_plan_fg GROUP BY plan_id
         ) pp_fg ON mr.production_plan_id = pp_fg.plan_id
         LEFT JOIN (
           SELECT jc.mr_id, ANY_VALUE(i.name) as item_name 
           FROM job_card jc 
           JOIN work_order wo ON jc.work_order_id = wo.wo_id
           JOIN item i ON wo.item_code = i.item_code
           WHERE jc.mr_id IS NOT NULL
           GROUP BY jc.mr_id
         ) jc_wo ON mr.mr_id = jc_wo.mr_id
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
