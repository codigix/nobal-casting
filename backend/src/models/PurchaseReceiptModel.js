import { PeriodClosingModel } from './PeriodClosingModel.js'
import StockBalanceModel from './StockBalanceModel.js'
import StockLedgerModel from './StockLedgerModel.js'

export class PurchaseReceiptModel {
  generateId() {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  }
  constructor(db) {
    this.db = db
  }

  /**
   * Resolve warehouse code to warehouse ID
   */
  async getWarehouseId(warehouseIdentifier) {
    if (!warehouseIdentifier) return null
    
    if (Number.isInteger(Number(warehouseIdentifier))) {
      return Number(warehouseIdentifier)
    }
    
    const [rows] = await this.db.execute(
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

  async create(data) {
    const grn_no = `GRN-${Date.now()}`

    try {
      const supplierId = data.supplier_id !== undefined ? data.supplier_id : null
      const mrId = data.mr_id || null
      
      await this.db.execute(
        `INSERT INTO purchase_receipt 
         (grn_no, po_no, mr_id, supplier_id, receipt_date, status, notes)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          grn_no,
          data.po_no || null,
          mrId,
          supplierId,
          data.receipt_date || new Date(),
          'draft',
          data.notes || null
        ]
      )

      // Add items
      if (data.items && Array.isArray(data.items)) {
        for (const item of data.items) {
          await this.db.execute(
            `INSERT INTO purchase_receipt_item 
             (grn_item_id, grn_no, item_code, received_qty, accepted_qty, warehouse_code, batch_no, quality_inspection_required)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              this.generateId(),
              grn_no,
              item.item_code || null,
              item.received_qty || 0,
              item.accepted_qty || 0,
              item.warehouse_code || null,
              item.batch_no || null,
              item.quality_inspection_required !== false
            ]
          )
        }
      }

      return { grn_no, status: 'created' }
    } catch (error) {
      throw new Error(`Failed to create GRN: ${error.message}`)
    }
  }

  async getById(grn_no) {
    try {
      const [grns] = await this.db.execute(
        `SELECT pr.*, s.name as supplier_name, po.po_no
         FROM purchase_receipt pr
         LEFT JOIN supplier s ON pr.supplier_id = s.supplier_id
         LEFT JOIN purchase_order po ON pr.po_no = po.po_no
         WHERE pr.grn_no = ?`,
        [grn_no]
      )

      if (grns.length === 0) return null

      const [items] = await this.db.execute(
        `SELECT pri.*, i.name as item_name, poi.rate
         FROM purchase_receipt_item pri
         LEFT JOIN item i ON pri.item_code = i.item_code
         JOIN purchase_receipt pr ON pri.grn_no = pr.grn_no
         LEFT JOIN purchase_order_item poi ON pr.po_no = poi.po_no AND pri.item_code = poi.item_code
         WHERE pri.grn_no = ?`,
        [grn_no]
      )

      return { ...grns[0], items }
    } catch (error) {
      throw new Error(`Failed to fetch GRN: ${error.message}`)
    }
  }

  async getAll(filters = {}) {
    try {
      let query = `SELECT pr.*, s.name as supplier_name, COALESCE(pri_agg.item_count, 0) as item_count
                   FROM purchase_receipt pr
                   LEFT JOIN supplier s ON pr.supplier_id = s.supplier_id
                   LEFT JOIN (
                      SELECT grn_no, COUNT(grn_item_id) as item_count
                      FROM purchase_receipt_item
                      GROUP BY grn_no
                   ) pri_agg ON pr.grn_no = pri_agg.grn_no
                   WHERE 1=1`
      const params = []

      if (filters.supplier_id) {
        query += ` AND pr.supplier_id = ?`
        params.push(filters.supplier_id)
      }

      if (filters.status) {
        query += ` AND pr.status = ?`
        params.push(filters.status)
      }

      if (filters.po_no) {
        query += ` AND pr.po_no = ?`
        params.push(filters.po_no)
      }

      const limit = filters.limit || 50
      const offset = filters.offset || 0
      query += ` ORDER BY pr.created_at DESC LIMIT ${limit} OFFSET ${offset}`

      const [grns] = await this.db.execute(query, params)
      return grns
    } catch (error) {
      throw new Error(`Failed to fetch GRNs: ${error.message}`)
    }
  }

  async updateItem(itemId, data) {
    try {
      const updateFields = []
      const params = []

      if (data.accepted_qty !== undefined) {
        updateFields.push(`accepted_qty = ?`)
        params.push(data.accepted_qty)
      }

      if (data.rejected_qty !== undefined) {
        updateFields.push(`rejected_qty = ?`)
        params.push(data.rejected_qty)
      }

      if (updateFields.length === 0) return { success: true }

      updateFields.push(`quality_inspection_required = false`)
      params.push(itemId)

      const query = `UPDATE purchase_receipt_item SET ${updateFields.join(', ')} WHERE grn_item_id = ?`
      const [result] = await this.db.execute(query, params)

      return { affectedRows: result.affectedRows }
    } catch (error) {
      throw new Error(`Failed to update GRN item: ${error.message}`)
    }
  }

  async accept(grn_no) {
    try {
      // Get the GRN details to check for MR link
      const grn = await this.getById(grn_no)
      if (!grn) throw new Error('GRN not found')

      // Get all items with their purchase rates from PO and receipt date
      const [items] = await this.db.execute(
        `SELECT pri.*, poi.rate as purchase_rate, pr.receipt_date 
         FROM purchase_receipt_item pri
         JOIN purchase_receipt pr ON pri.grn_no = pr.grn_no
         LEFT JOIN purchase_order_item poi ON pr.po_no = poi.po_no AND pri.item_code = poi.item_code
         WHERE pri.grn_no = ?`,
        [grn_no]
      )

      // Update stock for each item
      for (const item of items) {
        const received = Number(item.received_qty || 0)
        const accepted = Number(item.accepted_qty || 0)
        const rejected = Number(item.rejected_qty || 0)
        const hold = received - accepted - rejected
        const rate = Number(item.purchase_rate || 0)
        const receipt_date = item.receipt_date || new Date()

        // 1. Move accepted quantity to the designated warehouse (default: ACCEPTED)
        if (accepted > 0) {
          const targetWarehouse = item.warehouse_code || 'ACCEPTED'
          await this.updateStock(item.item_code, targetWarehouse, accepted, 'GRN-Accepted', grn_no, rate, receipt_date)
        }

        // 2. Move rejected quantity to REJECTED warehouse
        if (rejected > 0) {
          await this.updateStock(item.item_code, 'REJECTED', rejected, 'GRN-Rejected', grn_no, rate, receipt_date)
        }

        // 3. Move remaining to HOLD warehouse
        if (hold > 0) {
          await this.updateStock(item.item_code, 'HOLD', hold, 'GRN-Hold', grn_no, rate, receipt_date)
        }
      }

      // Update GRN status
      await this.db.execute(
        `UPDATE purchase_receipt SET status = 'accepted' WHERE grn_no = ?`,
        [grn_no]
      )

      // Update linked Material Request if exists
      if (grn.mr_id) {
        // Fetch MR purpose
        const [mrRows] = await this.db.execute(
          'SELECT purpose FROM material_request WHERE mr_id = ?',
          [grn.mr_id]
        )
        
        if (mrRows.length > 0 && mrRows[0].purpose === 'purchase') {
          await this.db.execute(
            `UPDATE material_request SET status = 'completed' WHERE mr_id = ?`,
            [grn.mr_id]
          )
        }
      }

      return { success: true, items_processed: items.length }
    } catch (error) {
      throw new Error(`Failed to accept GRN: ${error.message}`)
    }
  }

  async updateStock(item_code, warehouse_code, qty, voucher_type, voucher_no, purchase_rate = 0, transaction_date = new Date()) {
    try {
      // Check for period closing lock
      await PeriodClosingModel.checkLock(this.db, transaction_date)

      // Resolve warehouse code to ID
      const warehouse_id = await this.getWarehouseId(warehouse_code)

      // Update Stock Balance using the new unified upsert logic with Moving Average
      await StockBalanceModel.upsert(item_code, warehouse_id, {
        current_qty: qty,
        is_increment: true,
        incoming_rate: purchase_rate,
        last_receipt_date: transaction_date
      }, this.db)

      // Add to unified Stock Ledger
      await StockLedgerModel.create({
        item_code: item_code,
        warehouse_id: warehouse_id,
        transaction_date: transaction_date,
        transaction_type: voucher_type === 'GRN-Accepted' ? 'Purchase Receipt' : 'Other',
        qty_in: qty,
        qty_out: 0,
        valuation_rate: purchase_rate, // This is the incoming rate; ledger will calculate balance
        reference_doctype: 'Purchase Receipt',
        reference_name: voucher_no,
        remarks: `${voucher_type} for GRN ${voucher_no}`,
        created_by: 1 // Should be passed if available
      }, this.db)

      return { success: true }
    } catch (error) {
      throw new Error(`Failed to update stock: ${error.message}`)
    }
  }

  async reject(grn_no) {
    try {
      await this.db.execute(
        `UPDATE purchase_receipt SET status = 'rejected' WHERE grn_no = ?`,
        [grn_no]
      )
      return { success: true }
    } catch (error) {
      throw new Error(`Failed to reject GRN: ${error.message}`)
    }
  }

  async delete(grn_no) {
    try {
      await this.db.execute(`DELETE FROM purchase_receipt_item WHERE grn_no = ?`, [grn_no])
      await this.db.execute(`DELETE FROM purchase_receipt WHERE grn_no = ?`, [grn_no])
      return { success: true }
    } catch (error) {
      throw new Error(`Failed to delete GRN: ${error.message}`)
    }
  }
}