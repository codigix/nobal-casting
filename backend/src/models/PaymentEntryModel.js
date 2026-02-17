import AccountsFinanceModel from './AccountsFinanceModel.js'

export class PaymentEntryModel {
  constructor(db) {
    this.db = db
  }

  // ============= CUSTOMER PAYMENTS (RECEIVABLES) =============

  async createCustomerPayment(data) {
    const payment_id = `CPAY-${Date.now()}`
    
    try {
      await this.db.execute(
        `INSERT INTO customer_payment 
         (payment_id, customer_id, sales_order_id, payment_date, amount, payment_method, payment_reference, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          payment_id,
          data.customer_id,
          data.sales_order_id || null,
          data.payment_date || new Date(),
          data.amount || 0,
          data.payment_method || 'transfer',
          data.payment_reference || null,
          'pending'
        ]
      )

      return { payment_id, status: 'pending' }
    } catch (error) {
      throw new Error(`Failed to create customer payment: ${error.message}`)
    }
  }

  async getCustomerPaymentById(payment_id) {
    try {
      const [payments] = await this.db.execute(
        `SELECT cp.*, sc.name as customer_name
         FROM customer_payment cp
         JOIN selling_customer sc ON cp.customer_id = sc.customer_id
         WHERE cp.payment_id = ?`,
        [payment_id]
      )

      if (payments.length === 0) return null
      return payments[0]
    } catch (error) {
      throw new Error(`Failed to fetch customer payment: ${error.message}`)
    }
  }

  async submitCustomerPayment(payment_id, userId) {
    const connection = await this.db.getConnection()
    await connection.beginTransaction()

    try {
      const payment = await this.getCustomerPaymentById(payment_id)
      if (!payment) throw new Error('Payment not found')
      if (payment.status !== 'pending') throw new Error('Only pending payments can be submitted')

      // Update payment status
      await connection.execute(
        `UPDATE customer_payment 
         SET status = 'received', 
             updated_at = CURRENT_TIMESTAMP
         WHERE payment_id = ?`,
        [payment_id]
      )

      // Record Ledger Entries
      const accountsModel = new AccountsFinanceModel(this.db)
      
      // Debit Bank/Cash (Increase Asset)
      await accountsModel.recordLedgerEntry({
        transaction_date: payment.payment_date,
        account_type: 'asset', // Standardized to asset
        account_id: 'Bank Account',
        debit: payment.amount,
        credit: 0,
        description: `Customer Payment: ${payment_id} from ${payment.customer_name}`,
        reference_doctype: 'Customer Payment',
        reference_id: payment_id
      }, connection)

      // Credit Customer (Decrease Receivable Asset)
      await accountsModel.recordLedgerEntry({
        transaction_date: payment.payment_date,
        account_type: 'customer',
        account_id: payment.customer_id,
        debit: 0,
        credit: payment.amount,
        description: `Customer Payment: ${payment_id}`,
        reference_doctype: 'Customer Payment',
        reference_id: payment_id
      }, connection)

      // Update Customer Balance (Decrease)
      await connection.execute(
        `UPDATE selling_customer SET balance = balance - ? WHERE customer_id = ?`,
        [payment.amount, payment.customer_id]
      )

      await connection.commit()
      return { success: true }
    } catch (error) {
      await connection.rollback()
      throw new Error(`Failed to submit customer payment: ${error.message}`)
    } finally {
      connection.release()
    }
  }

  // ============= VENDOR PAYMENTS (PAYABLES) =============

  async createVendorPayment(data) {
    const payment_id = `VPAY-${Date.now()}`
    
    try {
      await this.db.execute(
        `INSERT INTO vendor_payment 
         (payment_id, vendor_id, purchase_order_id, payment_date, amount, payment_method, payment_reference, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          payment_id,
          data.vendor_id,
          data.purchase_order_id || null,
          data.payment_date || new Date(),
          data.amount || 0,
          data.payment_method || 'transfer',
          data.payment_reference || null,
          'pending'
        ]
      )

      return { payment_id, status: 'pending' }
    } catch (error) {
      throw new Error(`Failed to create vendor payment: ${error.message}`)
    }
  }

  async getVendorPaymentById(payment_id) {
    try {
      const [payments] = await this.db.execute(
        `SELECT vp.*, s.name as vendor_name
         FROM vendor_payment vp
         JOIN supplier s ON vp.vendor_id = s.supplier_id
         WHERE vp.payment_id = ?`,
        [payment_id]
      )

      if (payments.length === 0) return null
      return payments[0]
    } catch (error) {
      throw new Error(`Failed to fetch vendor payment: ${error.message}`)
    }
  }

  async submitVendorPayment(payment_id, userId) {
    const connection = await this.db.getConnection()
    await connection.beginTransaction()

    try {
      const payment = await this.getVendorPaymentById(payment_id)
      if (!payment) throw new Error('Payment not found')
      if (payment.status !== 'pending') throw new Error('Only pending payments can be submitted')

      // Update payment status
      await connection.execute(
        `UPDATE vendor_payment 
         SET status = 'paid', 
             updated_at = CURRENT_TIMESTAMP
         WHERE payment_id = ?`,
        [payment_id]
      )

      // Record Ledger Entries
      const accountsModel = new AccountsFinanceModel(this.db)
      
      // Debit Vendor (Decrease Liability)
      await accountsModel.recordLedgerEntry({
        transaction_date: payment.payment_date,
        account_type: 'vendor',
        account_id: payment.vendor_id,
        debit: payment.amount,
        credit: 0,
        description: `Vendor Payment: ${payment_id}`,
        reference_doctype: 'Vendor Payment',
        reference_id: payment_id
      }, connection)

      // Credit Bank/Cash (Decrease Asset)
      await accountsModel.recordLedgerEntry({
        transaction_date: payment.payment_date,
        account_type: 'asset', // Standardized to asset
        account_id: 'Bank Account',
        debit: 0,
        credit: payment.amount,
        description: `Vendor Payment: ${payment_id} to ${payment.vendor_name}`,
        reference_doctype: 'Vendor Payment',
        reference_id: payment_id
      }, connection)

      // Update Supplier Balance (Decrease)
      await connection.execute(
        `UPDATE supplier SET balance = balance - ? WHERE supplier_id = ?`,
        [payment.amount, payment.vendor_id]
      )

      await connection.commit()
      return { success: true }
    } catch (error) {
      await connection.rollback()
      throw new Error(`Failed to submit vendor payment: ${error.message}`)
    } finally {
      connection.release()
    }
  }
}
