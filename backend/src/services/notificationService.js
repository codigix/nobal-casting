let nodemailer = null
let nodemailerInitialized = false

async function initializeNodemailer() {
  if (nodemailerInitialized) return nodemailer
  
  try {
    const mod = await import('nodemailer')
    nodemailer = mod.default || mod
    nodemailerInitialized = true
  } catch (e) {
    console.warn('[WARNING] nodemailer not installed. Email notifications will be logged to console instead.')
    nodemailerInitialized = true
  }
  
  return nodemailer
}

export class NotificationService {
  constructor() {
    this.transporter = null
    this.initialized = false
  }

  async ensureInitialized() {
    if (this.initialized) return
    
    const mod = await initializeNodemailer()
    
    if (!mod) {
      this.initialized = true
      return
    }

    try {
      this.transporter = mod.createTransport({
        host: process.env.MAIL_HOST || 'localhost',
        port: process.env.MAIL_PORT || 587,
        secure: process.env.MAIL_SECURE === 'true',
        auth: process.env.MAIL_USER
          ? {
              user: process.env.MAIL_USER,
              pass: process.env.MAIL_PASSWORD
            }
          : undefined,
        tls: {
          rejectUnauthorized: false
        }
      })
    } catch (err) {
      console.warn('[WARNING] Failed to initialize mail transporter:', err.message)
    }
    
    this.initialized = true
  }

  async sendPaymentReminder(reminderData) {
    try {
      await this.ensureInitialized()

      const {
        po_no,
        supplier_name,
        payment_amount,
        due_date,
        accountingEmails = ['accounts@company.com']
      } = reminderData

      const formattedDueDate = new Date(due_date).toLocaleDateString('en-IN')
      const formattedAmount = new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR'
      }).format(payment_amount)

      const htmlContent = `
        <h2>Payment Reminder</h2>
        <p>Dear Accounts Department,</p>
        <p>This is a payment reminder for the following purchase order:</p>
        <table style="border-collapse: collapse; width: 100%; margin: 20px 0;">
          <tr style="background-color: #f5f5f5;">
            <td style="padding: 10px; border: 1px solid #ddd;"><strong>PO Number</strong></td>
            <td style="padding: 10px; border: 1px solid #ddd;">${po_no}</td>
          </tr>
          <tr>
            <td style="padding: 10px; border: 1px solid #ddd;"><strong>Supplier</strong></td>
            <td style="padding: 10px; border: 1px solid #ddd;">${supplier_name}</td>
          </tr>
          <tr style="background-color: #f5f5f5;">
            <td style="padding: 10px; border: 1px solid #ddd;"><strong>Payment Amount</strong></td>
            <td style="padding: 10px; border: 1px solid #ddd;">${formattedAmount}</td>
          </tr>
          <tr>
            <td style="padding: 10px; border: 1px solid #ddd;"><strong>Due Date</strong></td>
            <td style="padding: 10px; border: 1px solid #ddd; color: #d32f2f; font-weight: bold;">${formattedDueDate}</td>
          </tr>
        </table>
        <p style="color: #666; font-size: 0.9em;">Please ensure payment is processed by the due date to maintain good supplier relationships.</p>
        <p>Best regards,<br/>ERP System</p>
      `

      const mailOptions = {
        from: process.env.MAIL_FROM || 'erp@company.com',
        to: accountingEmails.join(', '),
        subject: `Payment Reminder - PO ${po_no} for ${supplier_name}`,
        html: htmlContent,
        text: `Payment Reminder\n\nPO Number: ${po_no}\nSupplier: ${supplier_name}\nPayment Amount: ${formattedAmount}\nDue Date: ${formattedDueDate}`
      }

      if (this.transporter) {
        const result = await this.transporter.sendMail(mailOptions)
        console.log(`[EMAIL SENT] Payment reminder for PO ${po_no} to ${accountingEmails.join(', ')}`)
        return { success: true, messageId: result.messageId }
      } else {
        console.log('[MOCK EMAIL] Payment Reminder:', mailOptions)
        return { success: true, messageId: 'mock-id', mock: true }
      }
    } catch (error) {
      console.error('Error sending payment reminder:', error)
      return { success: false, error: error.message }
    }
  }

  async sendDuePaymentAlert(reminderData) {
    try {
      await this.ensureInitialized()

      const {
        po_no,
        supplier_name,
        payment_amount,
        days_overdue,
        accountingEmails = ['accounts@company.com']
      } = reminderData

      const formattedAmount = new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR'
      }).format(payment_amount)

      const htmlContent = `
        <h2 style="color: #d32f2f;">PAYMENT OVERDUE - URGENT</h2>
        <p>Dear Accounts Department,</p>
        <p style="color: #d32f2f; font-weight: bold;">The following payment is now overdue by ${days_overdue} day(s):</p>
        <table style="border-collapse: collapse; width: 100%; margin: 20px 0;">
          <tr style="background-color: #ffebee;">
            <td style="padding: 10px; border: 1px solid #ef5350;"><strong>PO Number</strong></td>
            <td style="padding: 10px; border: 1px solid #ef5350;">${po_no}</td>
          </tr>
          <tr>
            <td style="padding: 10px; border: 1px solid #ef5350;"><strong>Supplier</strong></td>
            <td style="padding: 10px; border: 1px solid #ef5350;">${supplier_name}</td>
          </tr>
          <tr style="background-color: #ffebee;">
            <td style="padding: 10px; border: 1px solid #ef5350;"><strong>Payment Amount</strong></td>
            <td style="padding: 10px; border: 1px solid #ef5350; font-weight: bold;">${formattedAmount}</td>
          </tr>
          <tr>
            <td style="padding: 10px; border: 1px solid #ef5350;"><strong>Days Overdue</strong></td>
            <td style="padding: 10px; border: 1px solid #ef5350; color: #d32f2f; font-weight: bold;">${days_overdue}</td>
          </tr>
        </table>
        <p style="color: #d32f2f;">Please process this payment immediately to avoid any issues with the supplier.</p>
        <p>Best regards,<br/>ERP System</p>
      `

      const mailOptions = {
        from: process.env.MAIL_FROM || 'erp@company.com',
        to: accountingEmails.join(', '),
        subject: `URGENT - Overdue Payment for PO ${po_no} (${days_overdue} days)`,
        html: htmlContent
      }

      if (this.transporter) {
        const result = await this.transporter.sendMail(mailOptions)
        console.log(`[EMAIL SENT] Overdue payment alert for PO ${po_no} to ${accountingEmails.join(', ')}`)
        return { success: true, messageId: result.messageId }
      } else {
        console.log('[MOCK EMAIL] Overdue Payment Alert:', mailOptions)
        return { success: true, messageId: 'mock-id', mock: true }
      }
    } catch (error) {
      console.error('Error sending overdue payment alert:', error)
      return { success: false, error: error.message }
    }
  }

  async sendPaymentConfirmation(confirmationData) {
    try {
      await this.ensureInitialized()

      const {
        po_no,
        supplier_name,
        payment_amount,
        payment_date,
        supplier_email,
        accountingEmails = ['accounts@company.com']
      } = confirmationData

      const formattedAmount = new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR'
      }).format(payment_amount)

      const formattedDate = new Date(payment_date).toLocaleDateString('en-IN')

      const htmlContent = `
        <h2 style="color: #4caf50;">Payment Confirmation</h2>
        <p>Dear Accounts Team,</p>
        <p>Payment has been successfully processed for the following purchase order:</p>
        <table style="border-collapse: collapse; width: 100%; margin: 20px 0;">
          <tr style="background-color: #f5f5f5;">
            <td style="padding: 10px; border: 1px solid #ddd;"><strong>PO Number</strong></td>
            <td style="padding: 10px; border: 1px solid #ddd;">${po_no}</td>
          </tr>
          <tr>
            <td style="padding: 10px; border: 1px solid #ddd;"><strong>Supplier</strong></td>
            <td style="padding: 10px; border: 1px solid #ddd;">${supplier_name}</td>
          </tr>
          <tr style="background-color: #f5f5f5;">
            <td style="padding: 10px; border: 1px solid #ddd;"><strong>Amount Paid</strong></td>
            <td style="padding: 10px; border: 1px solid #ddd;">${formattedAmount}</td>
          </tr>
          <tr>
            <td style="padding: 10px; border: 1px solid #ddd;"><strong>Payment Date</strong></td>
            <td style="padding: 10px; border: 1px solid #ddd;">${formattedDate}</td>
          </tr>
        </table>
        <p>Best regards,<br/>ERP System</p>
      `

      const mailOptions = {
        from: process.env.MAIL_FROM || 'erp@company.com',
        to: accountingEmails.join(', '),
        subject: `Payment Confirmation - PO ${po_no}`,
        html: htmlContent
      }

      if (this.transporter) {
        const result = await this.transporter.sendMail(mailOptions)
        console.log(`[EMAIL SENT] Payment confirmation for PO ${po_no} to ${accountingEmails.join(', ')}`)
        return { success: true, messageId: result.messageId }
      } else {
        console.log('[MOCK EMAIL] Payment Confirmation:', mailOptions)
        return { success: true, messageId: 'mock-id', mock: true }
      }
    } catch (error) {
      console.error('Error sending payment confirmation:', error)
      return { success: false, error: error.message }
    }
  }
}

export default new NotificationService()
