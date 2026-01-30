import { ProductionPlanningModel } from '../models/ProductionPlanningModel.js'
import { ProductionPlanningService } from '../services/ProductionPlanningService.js'
import ProductionModel from '../models/ProductionModel.js'

export class ProductionPlanningController {
  constructor(model, db) {
    this.model = model
    this.db = db
    this.service = new ProductionPlanningService(db)
    this.productionModel = new ProductionModel(db)
  }

  async createPlan(req, res) {
    try {
      const { plan_id, company, planned_by_id, naming_series, sales_order_id, status, bom_id, plan_date, week_number } = req.body

      const result = await this.model.createPlan({
        plan_id,
        company,
        planned_by_id,
        naming_series,
        sales_order_id,
        status,
        bom_id,
        plan_date,
        week_number
      })

      res.status(201).json({ success: true, data: result })
    } catch (error) {
      console.error('Error creating production plan:', error)
      res.status(500).json({ success: false, error: error.message })
    }
  }

  async updatePlan(req, res) {
    try {
      const { plan_id } = req.params
      const { naming_series, company, sales_order_id, status, bom_id, plan_date, week_number, planned_by_id, fg_items, sub_assemblies, raw_materials } = req.body

      if (!plan_id) {
        return res.status(400).json({ success: false, error: 'Plan ID is required' })
      }

      await this.model.updatePlanHeader(plan_id, {
        naming_series,
        company,
        sales_order_id,
        status,
        bom_id,
        plan_date,
        week_number,
        planned_by_id
      })

      if (fg_items && Array.isArray(fg_items)) {
        await this.model.clearFGItems(plan_id)
        for (const item of fg_items) {
          await this.model.addFGItem(plan_id, item)
        }
      }

      if (sub_assemblies && Array.isArray(sub_assemblies)) {
        await this.model.clearSubAssemblyItems(plan_id)
        for (const item of sub_assemblies) {
          await this.model.addSubAssemblyItem(plan_id, item)
        }
      }

      if (raw_materials && Array.isArray(raw_materials)) {
        await this.model.clearRawMaterialItems(plan_id)
        for (const item of raw_materials) {
          await this.model.addRawMaterialItem(plan_id, item)
        }
      }

      res.json({ success: true, message: 'Production plan updated successfully' })
    } catch (error) {
      console.error('Error updating production plan:', error)
      res.status(500).json({ success: false, error: error.message })
    }
  }

  async getPlan(req, res) {
    try {
      const { plan_id } = req.params
      const plan = await this.model.getPlanById(plan_id)

      if (!plan) {
        return res.status(404).json({ success: false, error: 'Production plan not found' })
      }

      res.json({ success: true, data: plan })
    } catch (error) {
      console.error('Error fetching production plan:', error)
      res.status(500).json({ success: false, error: error.message })
    }
  }

  async getAllPlans(req, res) {
    try {
      const plans = await this.model.getAllPlans()
      res.json({ success: true, data: plans })
    } catch (error) {
      console.error('Error fetching production plans:', error)
      res.status(500).json({ success: false, error: error.message })
    }
  }

  async getByItemCode(req, res) {
    try {
      const { itemCode } = req.params
      
      if (!itemCode) {
        return res.status(400).json({ success: false, error: 'Item code is required' })
      }

      const result = await this.model.getPlanByItemCode(itemCode)
      
      if (!result) {
        return res.json({ success: true, data: null })
      }

      res.json({ success: true, data: result })
    } catch (error) {
      console.error('Error fetching production plan by item code:', error)
      res.status(500).json({ success: false, error: error.message })
    }
  }

  async addFGItems(req, res) {
    try {
      const { plan_id } = req.params
      const body = req.body
      const items = body.items ? (Array.isArray(body.items) ? body.items : [body.items]) : [body]

      if (!plan_id) {
        return res.status(400).json({ success: false, error: 'Plan ID is required' })
      }

      if (!items || items.length === 0) {
        return res.status(400).json({ success: false, error: 'At least one item is required' })
      }

      for (const item of items) {
        await this.model.addFGItem(plan_id, item)
      }

      res.json({ success: true, message: 'FG items added' })
    } catch (error) {
      console.error('Error adding FG items:', error)
      res.status(500).json({ success: false, error: error.message })
    }
  }

  async addSubAssemblyItems(req, res) {
    try {
      const { plan_id } = req.params
      const body = req.body
      const items = body.items ? (Array.isArray(body.items) ? body.items : [body.items]) : [body]

      if (!plan_id) {
        return res.status(400).json({ success: false, error: 'Plan ID is required' })
      }

      if (!items || items.length === 0) {
        return res.status(400).json({ success: false, error: 'At least one item is required' })
      }

      for (const item of items) {
        await this.model.addSubAssemblyItem(plan_id, item)
      }

      res.json({ success: true, message: 'Sub-assembly items added' })
    } catch (error) {
      console.error('Error adding sub-assembly items:', error)
      res.status(500).json({ success: false, error: error.message })
    }
  }

  async addRawMaterialItems(req, res) {
    try {
      const { plan_id } = req.params
      const body = req.body
      const items = body.items ? (Array.isArray(body.items) ? body.items : [body.items]) : [body]

      if (!plan_id) {
        return res.status(400).json({ success: false, error: 'Plan ID is required' })
      }

      if (!items || items.length === 0) {
        return res.status(400).json({ success: false, error: 'At least one item is required' })
      }

      for (const item of items) {
        await this.model.addRawMaterialItem(plan_id, item)
      }

      res.json({ success: true, message: 'Raw material items added' })
    } catch (error) {
      console.error('Error adding raw material items:', error)
      res.status(500).json({ success: false, error: error.message })
    }
  }

  async deleteFGItem(req, res) {
    try {
      const { id } = req.params
      await this.model.deleteFGItem(id)
      res.json({ success: true, message: 'FG item deleted' })
    } catch (error) {
      console.error('Error deleting FG item:', error)
      res.status(500).json({ success: false, error: error.message })
    }
  }

  async deleteSubAssemblyItem(req, res) {
    try {
      const { id } = req.params
      await this.model.deleteSubAssemblyItem(id)
      res.json({ success: true, message: 'Sub-assembly item deleted' })
    } catch (error) {
      console.error('Error deleting sub-assembly item:', error)
      res.status(500).json({ success: false, error: error.message })
    }
  }

  async deleteRawMaterialItem(req, res) {
    try {
      const { id } = req.params
      await this.model.deleteRawMaterialItem(id)
      res.json({ success: true, message: 'Raw material item deleted' })
    } catch (error) {
      console.error('Error deleting raw material item:', error)
      res.status(500).json({ success: false, error: error.message })
    }
  }

  async submitPlan(req, res) {
    try {
      const { plan_id } = req.params
      
      await this.model.updatePlanStatus(plan_id, 'submitted')
      
      let mrId = null
      try {
        mrId = await this.model.createMaterialRequest(plan_id)
      } catch (mrError) {
        console.error('Warning: Could not create material request:', mrError.message)
      }
      
      res.json({ 
        success: true, 
        message: 'Production plan submitted',
        data: { material_request_id: mrId }
      })
    } catch (error) {
      console.error('Error submitting production plan:', error)
      res.status(500).json({ success: false, error: error.message })
    }
  }

  async deletePlan(req, res) {
    try {
      const { plan_id } = req.params
      await this.model.deletePlan(plan_id)
      res.json({ success: true, message: 'Production plan deleted' })
    } catch (error) {
      console.error('Error deleting production plan:', error)
      res.status(500).json({ success: false, error: error.message })
    }
  }

  async truncatePlans(req, res) {
    try {
      await this.model.truncatePlans()
      res.json({ success: true, message: 'All production plans truncated successfully' })
    } catch (error) {
      console.error('Error truncating production plans:', error)
      res.status(500).json({ success: false, error: error.message })
    }
  }

  async generateFromSalesOrder(req, res) {
    try {
      const { sales_order_id } = req.params

      if (!sales_order_id) {
        return res.status(400).json({ success: false, error: 'Sales Order ID is required' })
      }

      const plan = await this.service.generateProductionPlanFromSalesOrder(sales_order_id)

      const planId = await this.service.savePlanToDatabase(sales_order_id, plan)

      res.status(201).json({ 
        success: true, 
        message: 'Production plan generated successfully',
        data: {
          plan_id: planId,
          ...plan
        }
      })
    } catch (error) {
      console.error('Error generating production plan from sales order:', error)
      res.status(500).json({ success: false, error: error.message })
    }
  }

  async createWorkOrders(req, res) {
    try {
      const { plan_id } = req.params

      if (!plan_id) {
        return res.status(400).json({ success: false, error: 'Plan ID is required' })
      }

      const result = await this.service.createWorkOrdersFromPlan(
        plan_id, 
        this.productionModel, 
        this.model
      )

      res.json({ 
        success: true, 
        message: 'Work orders and job cards generated successfully',
        data: { work_orders: result }
      })
    } catch (error) {
      console.error('Error creating work orders from plan:', error)
      res.status(500).json({ success: false, error: error.message })
    }
  }
}
