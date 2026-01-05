import StockBalanceModel from './StockBalanceModel.js'
import StockLedgerModel from './StockLedgerModel.js'

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
      let query = 'SELECT mr.*, c.name as requested_by_name FROM material_request mr LEFT JOIN contact c ON mr.requested_by_id = c.contact_id WHERE 1=1'
      const params = []

      if (filters.status) {
        query += ' AND mr.status = ?'
        params.push(filters.status)
      }

      if (filters.department) {
        query += ' AND mr.department = ?'
        params.push(filters.department)
      }

      if (filters.search) {
        query += ' AND (mr.mr_id LIKE ? OR c.name LIKE ?)'
        const term = `%${filters.search}%`
        params.push(term, term)
      }

      query += ' ORDER BY mr.created_at DESC LIMIT 100'

      const [rows] = await db.execute(query, params)
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
        'SELECT mr.*, c.name as requested_by_name FROM material_request mr LEFT JOIN contact c ON mr.requested_by_id = c.contact_id WHERE mr.mr_id = ?',
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
        items = []
      } = mrData

      // Generate MR ID
      const mr_id = 'MR-' + Date.now()
      const request_date = new Date().toISOString().split('T')[0]

      // Insert MR with all fields
      await db.execute(
        `INSERT INTO material_request 
         (mr_id, series_no, transition_date, requested_by_id, department, purpose, 
          request_date, required_by_date, target_warehouse, source_warehouse, items_notes, status) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [mr_id, series_no || null, transition_date || null, requested_by_id || null, 
         department || null, purpose, request_date, required_by_date || null, 
         target_warehouse || null, source_warehouse || null, items_notes || '', 'draft']
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

      return await this.getById(db, mr_id)
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
    try {
      // Get MR details
      const [mrRows] = await db.execute('SELECT * FROM material_request WHERE mr_id = ?', [mrId])
      if (!mrRows.length) throw new Error('Material request not found')
      const request = mrRows[0]

      if (request.status !== 'draft') throw new Error('Only draft MRs can be approved')

      // Get items
      const [items] = await db.execute('SELECT * FROM material_request_item WHERE mr_id = ?', [mrId])

      // Check stock for Issue/Transfer
      const isStockTransaction = ['material_transfer', 'material_issue'].includes(request.purpose)
      
      // Use provided source warehouse or fall back to existing one
      const finalSourceWarehouse = sourceWarehouse || request.source_warehouse

      if (isStockTransaction && !finalSourceWarehouse) {
        throw new Error('Source warehouse is required for Material Transfer/Issue')
      }
      
      // Update source warehouse if provided and different
      if (sourceWarehouse && sourceWarehouse !== request.source_warehouse) {
        await db.execute(
          'UPDATE material_request SET source_warehouse = ? WHERE mr_id = ?',
          [sourceWarehouse, mrId]
        )
        request.source_warehouse = sourceWarehouse
      }

      // Update status
      await db.execute(
        'UPDATE material_request SET status = ?, updated_at = NOW() WHERE mr_id = ?',
        ['approved', mrId]
      )

      // Execute Stock Movements
      if (isStockTransaction) {
        const sourceWarehouseId = await this.getWarehouseId(db, finalSourceWarehouse)
        const targetWarehouseId = request.target_warehouse ? await this.getWarehouseId(db, request.target_warehouse) : null
        
        for (const item of items) {
          const qty = Number(item.qty)

          // Get current stock
          const sourceBalance = await StockBalanceModel.getByItemAndWarehouse(item.item_code, finalSourceWarehouse)
          const currentValuation = sourceBalance ? Number(sourceBalance.valuation_rate) : 0
          const currentQty = sourceBalance ? Number(sourceBalance.current_qty) : 0
          const availableQty = sourceBalance ? Number(sourceBalance.available_qty) : 0
          
          // Deduct only what's available (allow zero stock items)
          const qtyToDeduct = Math.min(qty, Math.max(0, currentQty))
          
          if (qtyToDeduct > 0) {
            // Deduct from Source
            await StockBalanceModel.upsert(item.item_code, sourceWarehouseId, {
              current_qty: currentQty - qtyToDeduct,
              reserved_qty: sourceBalance ? Number(sourceBalance.reserved_qty) : 0,
              valuation_rate: currentValuation,
              last_issue_date: new Date()
            })

            // Add Ledger Entry (OUT)
            await StockLedgerModel.create({
              item_code: item.item_code,
              warehouse_id: sourceWarehouseId,
              transaction_date: new Date(),
              transaction_type: request.purpose === 'material_transfer' ? 'Transfer' : 'Issue',
              qty_in: 0,
              qty_out: qtyToDeduct,
              valuation_rate: currentValuation,
              reference_doctype: 'Material Request',
              reference_name: mrId,
              remarks: `Approved Material Request ${mrId}`,
              created_by: approvedBy
            })

            // If Transfer, Add to Target
            if (request.purpose === 'material_transfer' && targetWarehouseId) {
              const targetBalance = await StockBalanceModel.getByItemAndWarehouse(item.item_code, request.target_warehouse)
              const targetQty = targetBalance ? Number(targetBalance.current_qty) : 0
              
              await StockBalanceModel.upsert(item.item_code, targetWarehouseId, {
                current_qty: targetQty + qtyToDeduct,
                reserved_qty: targetBalance ? Number(targetBalance.reserved_qty) : 0,
                valuation_rate: currentValuation,
                last_receipt_date: new Date()
              })

              // Add Ledger Entry (IN)
              await StockLedgerModel.create({
                item_code: item.item_code,
                warehouse_id: targetWarehouseId,
                transaction_date: new Date(),
                transaction_type: 'Transfer',
                qty_in: qtyToDeduct,
                qty_out: 0,
                valuation_rate: currentValuation,
                reference_doctype: 'Material Request',
                reference_name: mrId,
                remarks: `Incoming Transfer from MR ${mrId}`,
                created_by: approvedBy
              })
            }
          }
        }
      }

      return await this.getById(db, mrId)
    } catch (error) {
      throw new Error('Failed to approve material request: ' + error.message)
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

      return await this.getById(db, mrId)
    } catch (error) {
      throw new Error('Failed to reject material request: ' + error.message)
    }
  }

  /**
   * Convert MR to PO
   */
  static async convertToPO(db, mrId) {
    try {
      const [mr] = await db.execute('SELECT status FROM material_request WHERE mr_id = ?', [mrId])
      if (!mr.length) throw new Error('Material request not found')
      if (mr[0].status !== 'approved') throw new Error('Only approved MRs can be converted to PO')

      await db.execute(
        'UPDATE material_request SET status = ? WHERE mr_id = ?',
        ['converted', mrId]
      )

      return await this.getById(db, mrId)
    } catch (error) {
      throw new Error('Failed to convert material request: ' + error.message)
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
        'SELECT mr.*, c.name as requested_by_name, COUNT(mri.mr_item_id) as item_count FROM material_request mr LEFT JOIN contact c ON mr.requested_by_id = c.contact_id LEFT JOIN material_request_item mri ON mr.mr_id = mri.mr_id WHERE mr.status = "draft" GROUP BY mr.mr_id ORDER BY mr.created_at DESC'
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
        'SELECT mr.*, c.name as requested_by_name FROM material_request mr LEFT JOIN contact c ON mr.requested_by_id = c.contact_id WHERE mr.status = "approved" ORDER BY mr.required_by_date ASC'
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
}