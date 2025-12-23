import { ProductionPlanningModel } from '../models/ProductionPlanningModel.js'

export class ProductionPlanningController {
  constructor(model) {
    this.model = model
  }

  async createPlan(req, res) {
    try {
      const { plan_id, company, posting_date, planned_by_id, naming_series, sales_order_id, status } = req.body

      if (!posting_date) {
        return res.status(400).json({ success: false, error: 'Posting date is required' })
      }

      const result = await this.model.createPlan({
        plan_id,
        company,
        posting_date,
        planned_by_id,
        naming_series,
        sales_order_id,
        status
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
      const { naming_series, company, posting_date, sales_order_id, status, fg_items, sub_assemblies, raw_materials } = req.body

      if (!plan_id) {
        return res.status(400).json({ success: false, error: 'Plan ID is required' })
      }

      await this.model.updatePlanHeader(plan_id, {
        naming_series,
        company,
        posting_date,
        sales_order_id,
        status
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
      const { plan_id, items } = req.body

      if (!plan_id || !items || !Array.isArray(items)) {
        return res.status(400).json({ success: false, error: 'Invalid plan_id or items' })
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
      const { plan_id, items } = req.body

      if (!plan_id || !items || !Array.isArray(items)) {
        return res.status(400).json({ success: false, error: 'Invalid plan_id or items' })
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
      const { plan_id, items } = req.body

      if (!plan_id || !items || !Array.isArray(items)) {
        return res.status(400).json({ success: false, error: 'Invalid plan_id or items' })
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
      res.json({ success: true, message: 'Production plan submitted' })
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
}
