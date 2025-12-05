import { v4 as uuidv4 } from 'uuid'

export class PurchaseReceiptModel {
  constructor(db) {
    this.db = db
  }

  async create(data) {
    const grn_no = `GRN-${Date.now()}`

    try {
      await this.db.execute(
        `INSERT INTO purchase_receipt 
         (grn_no, po_no, supplier_id, receipt_date, status)
         VALUES (?, ?, ?, ?, ?)`,
        [
          grn_no,
          data.po_no || null,
          data.supplier_id || null,
          data.receipt_date || new Date(),
          'draft'
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
              uuidv4(),
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
         JOIN supplier s ON pr.supplier_id = s.supplier_id
         LEFT JOIN purchase_order po ON pr.po_no = po.po_no
         WHERE pr.grn_no = ?`,
        [grn_no]
      )

      if (grns.length === 0) return null

      const [items] = await this.db.execute(
        `SELECT pri.*, i.name as item_name
         FROM purchase_receipt_item pri
         LEFT JOIN item i ON pri.item_code = i.item_code
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
      let query = `SELECT pr.*, s.name as supplier_name, COUNT(pri.grn_item_id) as item_count
                   FROM purchase_receipt pr
                   JOIN supplier s ON pr.supplier_id = s.supplier_id
                   LEFT JOIN purchase_receipt_item pri ON pr.grn_no = pri.grn_no
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
      query += ` GROUP BY pr.grn_no ORDER BY pr.created_at DESC LIMIT ${limit} OFFSET ${offset}`

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
      // Get all items
      const [items] = await this.db.execute(
        `SELECT grn_item_id, item_code, accepted_qty, warehouse_code FROM purchase_receipt_item WHERE grn_no = ?`,
        [grn_no]
      )

      // Update stock for each item
      for (const item of items) {
        await this.updateStock(item.item_code, item.warehouse_code, item.accepted_qty, 'GRN', grn_no)
      }

      // Update GRN status
      await this.db.execute(
        `UPDATE purchase_receipt SET status = 'accepted' WHERE grn_no = ?`,
        [grn_no]
      )

      return { success: true, items_processed: items.length }
    } catch (error) {
      throw new Error(`Failed to accept GRN: ${error.message}`)
    }
  }

  async updateStock(item_code, warehouse_code, qty, voucher_type, voucher_no) {
    try {
      // Check if stock record exists
      const [existing] = await this.db.execute(
        `SELECT stock_id FROM stock WHERE item_code = ? AND warehouse_code = ?`,
        [item_code, warehouse_code]
      )

      if (existing.length > 0) {
        // Update existing stock
        await this.db.execute(
          `UPDATE stock SET qty_on_hand = qty_on_hand + ? WHERE item_code = ? AND warehouse_code = ?`,
          [qty, item_code, warehouse_code]
        )
      } else {
        // Create new stock record
        await this.db.execute(
          `INSERT INTO stock (stock_id, item_code, warehouse_code, qty_on_hand, qty_available)
           VALUES (?, ?, ?, ?, ?)`,
          [uuidv4(), item_code, warehouse_code, qty, qty]
        )
      }

      // Add to stock ledger
      await this.db.execute(
        `INSERT INTO stock_ledger (ledger_id, item_code, warehouse_code, voucher_type, voucher_no, qty_change)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [uuidv4(), item_code, warehouse_code, voucher_type, voucher_no, qty]
      )

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