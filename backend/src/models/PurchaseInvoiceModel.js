import AccountsFinanceModel from './AccountsFinanceModel.js'

export class PurchaseInvoiceModel {
  generateId() {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  }

  constructor(db) {
    this.db = db
  }

  async create(data) {
    const purchase_invoice_no = `INV-${Date.now()}`

    try {
      await this.db.execute(
        `INSERT INTO purchase_invoice 
         (purchase_invoice_no, supplier_id, po_no, grn_no, invoice_date, due_date, tax_template_id, 
          net_amount, tax_rate, tax_amount, gross_amount, notes, status, payment_status, created_by)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          purchase_invoice_no,
          data.supplier_id,
          data.po_no || null,
          data.grn_no || null,
          data.invoice_date || new Date(),
          data.due_date || null,
          data.tax_template_id || null,
          data.net_amount || 0,
          data.tax_rate || 0,
          data.tax_amount || 0,
          data.gross_amount || 0,
          data.notes || null,
          data.status || 'draft',
          data.payment_status || 'unpaid',
          data.created_by || 'System'
        ]
      )

      // Add items
      if (data.items && Array.isArray(data.items)) {
        for (const item of data.items) {
          await this.db.execute(
            `INSERT INTO purchase_invoice_item 
             (purchase_invoice_no, item_code, qty, rate)
             VALUES (?, ?, ?, ?)`,
            [
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

  async calculateNetAmount(purchase_invoice_no, connection = this.db) {
    try {
      const [rows] = await connection.execute(
        `SELECT SUM(qty * rate) as subtotal FROM purchase_invoice_item WHERE purchase_invoice_no = ?`,
        [purchase_invoice_no]
      )
      const subtotal = Number(rows[0]?.subtotal || 0)

      const [invoice] = await connection.execute(
        `SELECT tax_rate FROM purchase_invoice WHERE purchase_invoice_no = ?`,
        [purchase_invoice_no]
      )

      const taxRate = Number(invoice[0]?.tax_rate || 0)
      const tax_amount = (subtotal * taxRate) / 100

      return {
        subtotal,
        tax_amount,
        gross_amount: subtotal + tax_amount
      }
    } catch (error) {
      throw new Error(`Failed to calculate net amount: ${error.message}`)
    }
  }

  async submit(purchase_invoice_no, userId) {
    const connection = await this.db.getConnection()
    await connection.beginTransaction()

    try {
      // Get invoice details
      const invoice = await this.getById(purchase_invoice_no)
      if (!invoice) throw new Error('Invoice not found')
      if (invoice.status !== 'draft') throw new Error('Only draft invoices can be submitted')

      const { subtotal, tax_amount, gross_amount } = await this.calculateNetAmount(purchase_invoice_no, connection)

      // Update invoice status and totals
      await connection.execute(
        `UPDATE purchase_invoice 
         SET status = 'submitted', 
             tax_amount = ?, 
             net_amount = ?, 
             gross_amount = ?,
             updated_by = ?
         WHERE purchase_invoice_no = ?`,
        [tax_amount, subtotal, gross_amount, userId || 'System', purchase_invoice_no]
      )

      // Update PO status if all items are invoiced (simplified for now)
      if (invoice.po_no) {
        await connection.execute(
          `UPDATE purchase_order SET status = 'completed' WHERE po_no = ? AND status = 'to_receive'`,
          [invoice.po_no]
        )
      }

      // Record Ledger Entries
      const accountsModel = new AccountsFinanceModel(this.db)
      
      // Credit Vendor (Increase Liability)
      await accountsModel.recordLedgerEntry({
        transaction_date: invoice.invoice_date,
        account_type: 'vendor',
        account_id: invoice.supplier_id,
        debit: 0,
        credit: gross_amount,
        description: `Purchase Invoice: ${purchase_invoice_no}`,
        reference_doctype: 'Purchase Invoice',
        reference_id: purchase_invoice_no
      }, connection)

      // Debit Purchase Expense (Increase Expense)
      await accountsModel.recordLedgerEntry({
        transaction_date: invoice.invoice_date,
        account_type: 'expense',
        account_id: 'Purchase Account',
        debit: gross_amount,
        credit: 0,
        description: `Purchase Invoice: ${purchase_invoice_no}`,
        reference_doctype: 'Purchase Invoice',
        reference_id: purchase_invoice_no
      }, connection)

      // Update Supplier Balance
      await connection.execute(
        `UPDATE supplier SET balance = balance + ? WHERE supplier_id = ?`,
        [gross_amount, invoice.supplier_id]
      )

      await connection.commit()
      return { success: true, gross_amount }
    } catch (error) {
      await connection.rollback()
      throw new Error(`Failed to submit invoice: ${error.message}`)
    } finally {
      connection.release()
    }
  }

  async cancel(purchase_invoice_no, userId) {
    const connection = await this.db.getConnection()
    await connection.beginTransaction()

    try {
      const invoice = await this.getById(purchase_invoice_no)
      if (!invoice) throw new Error('Invoice not found')
      if (invoice.status !== 'submitted') throw new Error('Only submitted invoices can be cancelled')

      await connection.execute(
        `UPDATE purchase_invoice 
         SET status = 'cancelled', 
             updated_by = ?
         WHERE purchase_invoice_no = ?`,
        [userId || 'System', purchase_invoice_no]
      )

      // If it was linked to a PO, we might need to revert PO status
      if (invoice.po_no) {
        await connection.execute(
          `UPDATE purchase_order SET status = 'to_receive' WHERE po_no = ? AND status = 'completed'`,
          [invoice.po_no]
        )
      }

      // Reverse Ledger Entries
      const accountsModel = new AccountsFinanceModel(this.db)
      
      // Debit Vendor (Decrease Liability)
      await accountsModel.recordLedgerEntry({
        transaction_date: new Date(),
        account_type: 'vendor',
        account_id: invoice.supplier_id,
        debit: invoice.gross_amount,
        credit: 0,
        description: `Reversal of Purchase Invoice: ${purchase_invoice_no}`,
        reference_doctype: 'Purchase Invoice',
        reference_id: purchase_invoice_no
      }, connection)

      // Credit Purchase Expense (Decrease Expense)
      await accountsModel.recordLedgerEntry({
        transaction_date: new Date(),
        account_type: 'expense',
        account_id: 'Purchase Account',
        debit: 0,
        credit: invoice.gross_amount,
        description: `Reversal of Purchase Invoice: ${purchase_invoice_no}`,
        reference_doctype: 'Purchase Invoice',
        reference_id: purchase_invoice_no
      }, connection)

      // Update Supplier Balance (Reverse)
      await connection.execute(
        `UPDATE supplier SET balance = balance - ? WHERE supplier_id = ?`,
        [invoice.gross_amount, invoice.supplier_id]
      )

      await connection.commit()
      return { success: true }
    } catch (error) {
      await connection.rollback()
      throw new Error(`Failed to cancel invoice: ${error.message}`)
    } finally {
      connection.release()
    }
  }

  async markAsPaid(purchase_invoice_no) {
    try {
      await this.db.execute(
        `UPDATE purchase_invoice SET status = 'paid', payment_status = 'paid' WHERE purchase_invoice_no = ?`,
        [purchase_invoice_no]
      )
      return { success: true }
    } catch (error) {
      throw new Error(`Failed to mark invoice as paid: ${error.message}`)
    }
  }

  async delete(purchase_invoice_no) {
    try {
      const invoice = await this.getById(purchase_invoice_no)
      if (!invoice) throw new Error('Invoice not found')
      if (invoice.status !== 'draft') throw new Error('Only draft invoices can be deleted')

      await this.db.execute(`DELETE FROM purchase_invoice_item WHERE purchase_invoice_no = ?`, [purchase_invoice_no])
      await this.db.execute(`DELETE FROM purchase_invoice WHERE purchase_invoice_no = ?`, [purchase_invoice_no])
      return { success: true }
    } catch (error) {
      throw new Error(`Failed to delete invoice: ${error.message}`)
    }
  }
}
