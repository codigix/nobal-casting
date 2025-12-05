import { v4 as uuidv4 } from 'uuid'

export class PurchaseInvoiceModel {
  constructor(db) {
    this.db = db
  }

  async create(data) {
    const purchase_invoice_no = `INV-${Date.now()}`

    try {
      let taxes_amount = 0

      // Calculate taxes if template provided
      if (data.tax_template_id) {
        const [taxes] = await this.db.execute(
          `SELECT SUM(rate) as total_rate FROM tax_item WHERE template_id = ?`,
          [data.tax_template_id]
        )
        // Simplified: taxes_amount would be calculated on items total
        taxes_amount = 0
      }

      await this.db.execute(
        `INSERT INTO purchase_invoice 
         (purchase_invoice_no, supplier_id, po_no, grn_no, invoice_date, due_date, tax_template_id, taxes_amount, status, created_by_id)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          purchase_invoice_no,
          data.supplier_id,
          data.po_no,
          data.grn_no,
          data.invoice_date || new Date(),
          data.due_date,
          data.tax_template_id,
          taxes_amount,
          'draft',
          data.created_by_id
        ]
      )

      // Add items
      if (data.items && Array.isArray(data.items)) {
        for (const item of data.items) {
          await this.db.execute(
            `INSERT INTO purchase_invoice_item 
             (invoice_item_id, purchase_invoice_no, item_code, qty, rate)
             VALUES (?, ?, ?, ?, ?)`,
            [
              uuidv4(),
              purchase_invoice_no,
              item.item_code,
              item.qty,
              item.rate
            ]
          )
        }
      }

      return { purchase_invoice_no, status: 'created' }
    } catch (error) {
      throw new Error(`Failed to create invoice: ${error.message}`)
    }
  }

  async getById(purchase_invoice_no) {
    try {
      const [invoices] = await this.db.execute(
        `SELECT pi.*, s.name as supplier_name, s.gstin
         FROM purchase_invoice pi
         JOIN supplier s ON pi.supplier_id = s.supplier_id
         WHERE pi.purchase_invoice_no = ?`,
        [purchase_invoice_no]
      )

      if (invoices.length === 0) return null

      const [items] = await this.db.execute(
        `SELECT pii.*, i.name as item_name
         FROM purchase_invoice_item pii
         JOIN item i ON pii.item_code = i.item_code
         WHERE pii.purchase_invoice_no = ?`,
        [purchase_invoice_no]
      )

      return { ...invoices[0], items }
    } catch (error) {
      throw new Error(`Failed to fetch invoice: ${error.message}`)
    }
  }

  async getAll(filters = {}) {
    try {
      let query = `SELECT pi.*, s.name as supplier_name
                   FROM purchase_invoice pi
                   JOIN supplier s ON pi.supplier_id = s.supplier_id
                   WHERE 1=1`
      const params = []

      if (filters.supplier_id) {
        query += ` AND pi.supplier_id = ?`
        params.push(filters.supplier_id)
      }

      if (filters.status) {
        query += ` AND pi.status = ?`
        params.push(filters.status)
      }

      if (filters.invoice_date_from) {
        query += ` AND pi.invoice_date >= ?`
        params.push(filters.invoice_date_from)
      }

      if (filters.invoice_date_to) {
        query += ` AND pi.invoice_date <= ?`
        params.push(filters.invoice_date_to)
      }

      // Add search filter for invoice number, supplier name, or invoice reference
      if (filters.search) {
        query += ` AND (pi.purchase_invoice_no LIKE ? OR s.name LIKE ? OR pi.po_no LIKE ?)`
        const searchTerm = `%${filters.search}%`
        params.push(searchTerm, searchTerm, searchTerm)
      }

      const limit = filters.limit || 50
      const offset = filters.offset || 0
      query += ` ORDER BY pi.created_at DESC LIMIT ${limit} OFFSET ${offset}`

      const [invoices] = await this.db.execute(query, params)
      return invoices
    } catch (error) {
      throw new Error(`Failed to fetch invoices: ${error.message}`)
    }
  }

  async calculateNetAmount(purchase_invoice_no) {
    try {
      const [result] = await this.db.execute(
        `SELECT SUM(qty * rate) as subtotal FROM purchase_invoice_item WHERE purchase_invoice_no = ?`,
        [purchase_invoice_no]
      )
      const subtotal = result[0]?.subtotal || 0

      // Get invoice to check tax template
      const [invoice] = await this.db.execute(
        `SELECT tax_template_id FROM purchase_invoice WHERE purchase_invoice_no = ?`,
        [purchase_invoice_no]
      )

      let tax_amount = 0
      if (invoice[0]?.tax_template_id) {
        const [taxInfo] = await this.db.execute(
          `SELECT SUM(rate) as total_rate FROM tax_item WHERE template_id = ?`,
          [invoice[0].tax_template_id]
        )
        const taxRate = taxInfo[0]?.total_rate || 0
        tax_amount = (subtotal * taxRate) / 100
      }

      return {
        subtotal,
        tax_amount,
        net_amount: subtotal + tax_amount
      }
    } catch (error) {
      throw new Error(`Failed to calculate net amount: ${error.message}`)
    }
  }

  async submit(purchase_invoice_no) {
    try {
      const { subtotal, tax_amount, net_amount } = await this.calculateNetAmount(purchase_invoice_no)

      await this.db.execute(
        `UPDATE purchase_invoice SET status = 'submitted', taxes_amount = ?, net_amount = ? WHERE purchase_invoice_no = ?`,
        [tax_amount, net_amount, purchase_invoice_no]
      )

      return { success: true, net_amount }
    } catch (error) {
      throw new Error(`Failed to submit invoice: ${error.message}`)
    }
  }

  async markAsPaid(purchase_invoice_no) {
    try {
      await this.db.execute(
        `UPDATE purchase_invoice SET status = 'paid' WHERE purchase_invoice_no = ?`,
        [purchase_invoice_no]
      )
      return { success: true }
    } catch (error) {
      throw new Error(`Failed to mark invoice as paid: ${error.message}`)
    }
  }

  async delete(purchase_invoice_no) {
    try {
      await this.db.execute(`DELETE FROM purchase_invoice_item WHERE purchase_invoice_no = ?`, [purchase_invoice_no])
      await this.db.execute(`DELETE FROM purchase_invoice WHERE purchase_invoice_no = ?`, [purchase_invoice_no])
      return { success: true }
    } catch (error) {
      throw new Error(`Failed to delete invoice: ${error.message}`)
    }
  }
}