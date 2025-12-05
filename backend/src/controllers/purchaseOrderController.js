import { PurchaseOrderModel } from '../models/PurchaseOrderModel.js'
import { v4 as uuidv4 } from 'uuid'
import notificationService from '../services/notificationService.js'

export async function createPurchaseOrder(req, res) {
  try {
    const db = req.app.locals.db
    const model = new PurchaseOrderModel(db)

    const result = await model.create(req.body)

    if (req.body.due_date && req.body.payment_amount) {
      const reminderId = uuidv4()
      await model.createPaymentReminder(
        reminderId,
        result.po_no,
        req.body.supplier_id,
        req.body.due_date,
        req.body.payment_amount
      )

      await notificationService.sendPaymentReminder({
        po_no: result.po_no,
        supplier_name: req.body.supplier_name || 'Supplier',
        payment_amount: req.body.payment_amount,
        due_date: req.body.due_date,
        accountingEmails: req.body.accounting_emails || ['accounts@company.com']
      })
    }

    res.status(201).json({ success: true, data: result })
  } catch (error) {
    res.status(400).json({ success: false, error: error.message })
  }
}

export async function getPurchaseOrder(req, res) {
  try {
    const db = req.app.locals.db
    const model = new PurchaseOrderModel(db)

    const po = await model.getById(req.params.po_no)
    if (!po) {
      return res.status(404).json({ success: false, error: 'Purchase Order not found' })
    }

    res.json({ success: true, data: po })
  } catch (error) {
    res.status(400).json({ success: false, error: error.message })
  }
}

export async function listPurchaseOrders(req, res) {
  try {
    const db = req.app.locals.db
    const model = new PurchaseOrderModel(db)

    const filters = {
      supplier_id: req.query.supplier_id,
      status: req.query.status,
      order_date_from: req.query.order_date_from,
      order_date_to: req.query.order_date_to,
      limit: parseInt(req.query.limit) || 50,
      offset: parseInt(req.query.offset) || 0
    }

    const pos = await model.getAll(filters)
    res.json({ success: true, data: pos })
  } catch (error) {
    res.status(400).json({ success: false, error: error.message })
  }
}

export async function updatePurchaseOrder(req, res) {
  try {
    const db = req.app.locals.db
    const model = new PurchaseOrderModel(db)

    const result = await model.update(req.params.po_no, req.body)
    res.json({ success: true, data: result })
  } catch (error) {
    res.status(400).json({ success: false, error: error.message })
  }
}

export async function submitPurchaseOrder(req, res) {
  try {
    const db = req.app.locals.db
    const model = new PurchaseOrderModel(db)

    const result = await model.submit(req.params.po_no)
    res.json({ success: true, data: result })
  } catch (error) {
    res.status(400).json({ success: false, error: error.message })
  }
}

export async function deletePurchaseOrder(req, res) {
  try {
    const db = req.app.locals.db
    const model = new PurchaseOrderModel(db)

    const result = await model.delete(req.params.po_no)
    res.json({ success: true, data: result })
  } catch (error) {
    res.status(400).json({ success: false, error: error.message })
  }
}

export async function getPaymentReminders(req, res) {
  try {
    const db = req.app.locals.db
    const model = new PurchaseOrderModel(db)

    const filters = {
      status: req.query.status,
      po_no: req.query.po_no
    }

    const reminders = await model.getPaymentReminders(filters)
    res.json({ success: true, data: reminders })
  } catch (error) {
    res.status(400).json({ success: false, error: error.message })
  }
}

export async function sendPaymentReminder(req, res) {
  try {
    const { po_no, payment_amount, due_date, supplier_name, accounting_emails } = req.body

    const result = await notificationService.sendPaymentReminder({
      po_no,
      supplier_name,
      payment_amount,
      due_date,
      accountingEmails: accounting_emails || ['accounts@company.com']
    })

    if (result.success) {
      const db = req.app.locals.db
      const model = new PurchaseOrderModel(db)

      const reminders = await model.getPaymentReminders({ po_no })
      if (reminders.length > 0) {
        await model.updateReminderStatus(reminders[0].reminder_id, 'sent')
      }
    }

    res.json({ success: result.success, data: result })
  } catch (error) {
    res.status(400).json({ success: false, error: error.message })
  }
}

export async function updateReminderStatus(req, res) {
  try {
    const db = req.app.locals.db
    const model = new PurchaseOrderModel(db)
    const { reminder_id, status } = req.body

    const result = await model.updateReminderStatus(reminder_id, status)
    res.json({ success: true, data: result })
  } catch (error) {
    res.status(400).json({ success: false, error: error.message })
  }
}