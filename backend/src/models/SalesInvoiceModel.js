import AccountsFinanceModel from './AccountsFinanceModel.js'

export class SalesInvoiceModel {
  constructor(db) {
    this.db = db
  }

  async create(data) {
    const invoice_id = `SINV-${Date.now()}`
    
    try {
      await this.db.execute(
        `INSERT INTO selling_invoice 
         (invoice_id, delivery_note_id, invoice_date, amount, due_date, tax_rate, invoice_type, status, created_by)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          invoice_id,
          data.delivery_note_id,
          data.invoice_date || new Date(),
          data.amount || 0,
          data.due_date || null,
          data.tax_rate || 0,
          data.invoice_type || 'standard',
          'draft',
          data.created_by || 'System'
        ]
      )

      return { invoice_id, status: 'created' }
    } catch (error) {
      throw new Error(`Failed to create sales invoice: ${error.message}`)
    }
  }

  async getById(invoice_id) {
    try {
      const [invoices] = await this.db.execute(
        `SELECT si.*, sc.name as customer_name, sc.customer_id, dn.sales_order_id
         FROM selling_invoice si
         JOIN selling_delivery_note dn ON si.delivery_note_id = dn.delivery_note_id
         JOIN selling_sales_order so ON dn.sales_order_id = so.sales_order_id
         JOIN selling_customer sc ON so.customer_id = sc.customer_id
         WHERE si.invoice_id = ?`,
        [invoice_id]
      )

      if (invoices.length === 0) return null
      return invoices[0]
    } catch (error) {
      throw new Error(`Failed to fetch sales invoice: ${error.message}`)
    }
  }

  async getAll(filters = {}) {
    try {
      let query = `SELECT si.*, sc.name as customer_name
                   FROM selling_invoice si
                   JOIN selling_delivery_note dn ON si.delivery_note_id = dn.delivery_note_id
                   JOIN selling_sales_order so ON dn.sales_order_id = so.sales_order_id
                   JOIN selling_customer sc ON so.customer_id = sc.customer_id
                   WHERE si.deleted_at IS NULL`
      const params = []

      if (filters.customer_id) {
        query += ` AND sc.customer_id = ?`
        params.push(filters.customer_id)
      }

      if (filters.status) {
        query += ` AND si.status = ?`
        params.push(filters.status)
      }

      query += ` ORDER BY si.created_at DESC`
      const [invoices] = await this.db.execute(query, params)
      return invoices
    } catch (error) {
      throw new Error(`Failed to fetch sales invoices: ${error.message}`)
    }
  }

  async submit(invoice_id, userId) {
    const connection = await this.db.getConnection()
    await connection.beginTransaction()

    try {
      const invoice = await this.getById(invoice_id)
      if (!invoice) throw new Error('Invoice not found')
      if (invoice.status !== 'draft') throw new Error('Only draft invoices can be submitted')

      const tax_amount = (Number(invoice.amount) * Number(invoice.tax_rate)) / 100
      const gross_amount = Number(invoice.amount) + tax_amount

      // Update invoice status
      await connection.execute(
        `UPDATE selling_invoice 
         SET status = 'issued', 
             updated_by = ?
         WHERE invoice_id = ?`,
        [userId || 'System', invoice_id]
      )

      // Record Ledger Entries
      const accountsModel = new AccountsFinanceModel(this.db)
      
      // Debit Customer (Increase Asset/Receivable)
      await accountsModel.recordLedgerEntry({
        transaction_date: invoice.invoice_date,
        account_type: 'customer',
        account_id: invoice.customer_id,
        debit: gross_amount,
        credit: 0,
        description: `Sales Invoice: ${invoice_id}`,
        reference_doctype: 'Sales Invoice',
        reference_id: invoice_id
      }, connection)

      // Credit Sales Revenue (Increase Income)
      await accountsModel.recordLedgerEntry({
        transaction_date: invoice.invoice_date,
        account_type: 'income',
        account_id: 'Sales Account',
        debit: 0,
        credit: gross_amount,
        description: `Sales Invoice: ${invoice_id}`,
        reference_doctype: 'Sales Invoice',
        reference_id: invoice_id
      }, connection)

      // Update Customer Balance
      await connection.execute(
        `UPDATE selling_customer SET balance = balance + ? WHERE customer_id = ?`,
        [gross_amount, invoice.customer_id]
      )

      await connection.commit()
      return { success: true, gross_amount }
    } catch (error) {
      await connection.rollback()
      throw new Error(`Failed to submit sales invoice: ${error.message}`)
    } finally {
      connection.release()
    }
  }

  async cancel(invoice_id, userId) {
    const connection = await this.db.getConnection()
    await connection.beginTransaction()

    try {
      const invoice = await this.getById(invoice_id)
      if (!invoice) throw new Error('Invoice not found')
      if (invoice.status !== 'issued') throw new Error('Only issued invoices can be cancelled')

      const tax_amount = (Number(invoice.amount) * Number(invoice.tax_rate)) / 100
      const gross_amount = Number(invoice.amount) + tax_amount

      await connection.execute(
        `UPDATE selling_invoice 
         SET status = 'cancelled', 
             updated_by = ?
         WHERE invoice_id = ?`,
        [userId || 'System', invoice_id]
      )

      // Reverse Ledger Entries
      const accountsModel = new AccountsFinanceModel(this.db)
      
      // Credit Customer (Decrease Receivable)
      await accountsModel.recordLedgerEntry({
        transaction_date: new Date(),
        account_type: 'customer',
        account_id: invoice.customer_id,
        debit: 0,
        credit: gross_amount,
        description: `Reversal of Sales Invoice: ${invoice_id}`,
        reference_doctype: 'Sales Invoice',
        reference_id: invoice_id
      }, connection)

      // Debit Sales Revenue (Decrease Income)
      await accountsModel.recordLedgerEntry({
        transaction_date: new Date(),
        account_type: 'income',
        account_id: 'Sales Account',
        debit: gross_amount,
        credit: 0,
        description: `Reversal of Sales Invoice: ${invoice_id}`,
        reference_doctype: 'Sales Invoice',
        reference_id: invoice_id
      }, connection)

      // Update Customer Balance (Reverse)
      await connection.execute(
        `UPDATE selling_customer SET balance = balance - ? WHERE customer_id = ?`,
        [gross_amount, invoice.customer_id]
      )

      await connection.commit()
      return { success: true }
    } catch (error) {
      await connection.rollback()
      throw new Error(`Failed to cancel sales invoice: ${error.message}`)
    } finally {
      connection.release()
    }
  }
}
